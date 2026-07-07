import { useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useSearchStore } from '../store/searchStore';
import { useHistoryStore } from '../store/historyStore';
import { useDomainScraper, cancelAllFetches } from './useDomainScraper';
import { useNotification } from './useNotification';
import { useAIModel } from './useAIModel';
import { mergeAllResults } from '../utils/merger';
import { APP_CONFIG } from '../constants/config';
import { RawDataPoint, SearchRecord } from '../types';
import { logger } from '../utils/logger';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Module-level cancel flag — shared across all hook instances
let globalCancelFlag = false;

export function setCancelFlag() {
  globalCancelFlag = true;
  cancelAllFetches();
}

export function useScraper() {
  const domainScraper = useDomainScraper();
  const { triggerSearchCompleteNotification } = useNotification();
  const aiModel = useAIModel();

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Keep a ref to the latest filters for the cancel check
  const filtersRef = useRef(useSearchStore.getState().activeFilters);

  useEffect(() => {
    const sub = useSearchStore.subscribe((state) => {
      filtersRef.current = state.activeFilters;
    });
    return () => sub();
  }, []);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  const cleanupIntervals = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    setCancelFlag();
    cleanupIntervals();
    useSearchStore.getState().cancelSearch();
  }, [cleanupIntervals]);

  const setWebViewRef = useCallback((_ref: any) => {
    domainScraper.setWebViewRef(_ref);
  }, [domainScraper]);

  const isCancelled = useCallback((): boolean => {
    if (globalCancelFlag) return true;
    if (useSearchStore.getState().activePhase === 'idle') return true;
    return false;
  }, []);

  const runScrape = useCallback(async () => {
    const searchStore = useSearchStore.getState();
    const filters = searchStore.activeFilters;
    if (!filters) {
      logger.warn('Scraper', 'runScrape called with no active filters');
      return;
    }

    globalCancelFlag = false;
    logger.phase('start', `Researching ${filters.company} - ${filters.role} in ${filters.country}`);
    startTimeRef.current = Date.now();
    const totalDurationMs = APP_CONFIG.totalTimeoutMs;

    cleanupIntervals();
    progressIntervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - startTimeRef.current;
      const remainingSecs = Math.max(0, Math.floor((totalDurationMs - elapsedMs) / 1000));
      useSearchStore.getState().setActiveEstimatedSecondsRemaining(remainingSecs);
      useSearchStore.getState().setActiveProgress(Math.min(90, Math.floor((elapsedMs / totalDurationMs) * 100)));
    }, 1000);

    try {
      // ── Phase 1: URL Discovery ────────────────────────────────────────────
      useSearchStore.getState().setActivePhase('searching');

      let discoveredUrls: string[] = [];
      try {
        logger.phase('searching', `Discovering URLs for ${filters.company} - ${filters.role}`);
        discoveredUrls = await domainScraper.discoverUrls(
          filters.company, filters.role, filters.country
        );
      } catch (err) {
        logger.error('Discovery', 'URL discovery failed', err);
      }

      useSearchStore.getState().setActiveUrlsDiscovered(discoveredUrls.length);
      logger.info('Discovery', `URLs after filtering: ${discoveredUrls.length}`);

      if (isCancelled()) { cleanupIntervals(); return; }

      // ── Phase 2: Page Scraping ────────────────────────────────────────────
      useSearchStore.getState().setActivePhase('extracting');

      const maxDomains = useAppStore.getState().maxDomainsToScrape;
      const urlsToProcess = discoveredUrls.slice(0, maxDomains);
      let successCount = 0;

      for (let i = 0; i < urlsToProcess.length; i++) {
        if (isCancelled()) { cleanupIntervals(); return; }

        const url = urlsToProcess[i];
        let pageText = '';

        try {
          pageText = await domainScraper.scrapeUrl(url);
        } catch { }

        // Retry once if too short
        if (pageText.length < 100) {
          await delay(300 + Math.random() * 400);
          try { pageText = await domainScraper.scrapeUrl(url); } catch { }
        }

        if (pageText.length > 100) {
          useSearchStore.getState().addActiveRawDataPoint({
            source: url, rawText: pageText,
            timestamp: new Date().toISOString(), success: true,
          });
          successCount++;
          logger.scrapeSuccess(url, pageText.length);
        } else {
          logger.scrapeFail(url, pageText ? `too short (${pageText.length}c)` : 'empty');
        }

        useSearchStore.getState().setActiveUrlsProcessed(i + 1);

        // Random delay between pages to avoid rate limiting
        if (i < urlsToProcess.length - 1) {
          await delay(200 + Math.random() * 400);
        }
      }

      logger.phase('extracting', `Scraped ${successCount}/${urlsToProcess.length} pages`);
      if (isCancelled()) { cleanupIntervals(); return; }

      // ── Phase 3: Data Extraction ──────────────────────────────────────────
      cleanupIntervals();
      useSearchStore.getState().setActiveProgress(92);

      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const rawDataPoints = useSearchStore.getState().activeRawDataPoints;
      const successPoints = rawDataPoints.filter(p => p.success);

      logger.phase('summary', `Processing ${successPoints.length} pages`);

      let finalResults;
      const aiAvailable = await aiModel.checkModelFile();

      if (aiAvailable) {
        logger.phase('ai-extract', 'Running SLM extraction on all pages');
        useSearchStore.getState().setActivePhase('ai-extract');
        const rawTexts = successPoints.map(p => p.rawText);
        const slmResult = await aiModel.extractFromPages(rawTexts, filters);
        if (slmResult) {
          finalResults = {
            ...slmResult.results,
            timeElapsedSeconds: elapsedSeconds,
            rawUrls: discoveredUrls,
            aiPrompt: slmResult.rawPrompt,
            aiRawResponse: slmResult.rawResponse,
          };
          logger.info('Scraper', 'SLM extraction successful');
        } else {
          logger.warn('Scraper', 'SLM failed — falling back to Summary Engine');
          finalResults = {
            ...mergeAllResults(filters, rawDataPoints, elapsedSeconds),
            rawUrls: discoveredUrls,
          };
        }
      } else {
        logger.phase('summary', 'No AI model — using deterministic Summary Engine');
        finalResults = {
          ...mergeAllResults(filters, rawDataPoints, elapsedSeconds),
          rawUrls: discoveredUrls,
        };
      }

      useSearchStore.getState().setActiveProgress(96);

      // ── Phase 4: AI Enhancement (optional summary) ────────────────────────
      if (aiAvailable) {
        logger.phase('ai-enhance', 'Running AI enhancement summary');
        useSearchStore.getState().setActivePhase('ai-enhance');
        try {
          const enhResult = await aiModel.runEnhancement(finalResults, filters);
          if (enhResult) {
            finalResults = {
              ...finalResults,
              aiEnhancedSummary: enhResult.text,
              aiPrompt: finalResults.aiPrompt
                ? `${finalResults.aiPrompt}\n\n--- ENHANCEMENT PROMPT ---\n\n${enhResult.rawPrompt}`
                : enhResult.rawPrompt,
              aiRawResponse: finalResults.aiRawResponse
                ? `${finalResults.aiRawResponse}\n\n--- ENHANCEMENT RESPONSE ---\n\n${enhResult.rawResponse}`
                : enhResult.rawResponse,
            };
          }
        } catch (err) {
          logger.aiEnhance(`failed: ${err}`);
        }
      }

      // ── Phase 5: Complete ─────────────────────────────────────────────────
      logger.phase('complete', `Finished in ${elapsedSeconds}s`);
      useSearchStore.getState().setActiveProgress(100);
      useSearchStore.getState().completeSearch(finalResults);

      // Save to history
      const record: SearchRecord = {
        id: `search_${Date.now()}`,
        timestamp: new Date().toISOString(),
        filters,
        results: finalResults,
      };
      console.log('useScraper: Scraping complete. Saving search record to history store for:', filters.company, '-', filters.role);
      useHistoryStore.getState().addSearch(record);

      // ── Cleanup: wipe all raw data from memory ────────────────────────────
      useSearchStore.getState().cancelSearch();

      triggerSearchCompleteNotification(filters.company, filters.role, filters.country);

    } catch (err: any) {
      logger.error('Scraper', 'Fatal error', err);
      cleanupIntervals();
      useSearchStore.getState().setActivePhase('error');
    }
  }, [domainScraper, aiModel, cleanupIntervals, triggerSearchCompleteNotification, isCancelled]);

  return {
    runScrape,
    handleCancel,
    setWebViewRef,
    handleMessage: domainScraper.handleMessage,
    onLoadEnd: domainScraper.onLoadEnd,
  };
}
