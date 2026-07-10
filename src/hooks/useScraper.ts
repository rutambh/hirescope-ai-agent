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
  const activeSearchIdRef = useRef<string | null>(null);

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
    const store = useSearchStore.getState();
    if (activeSearchIdRef.current) {
      store.updateActiveSearch(activeSearchIdRef.current, { phase: 'error' });
      activeSearchIdRef.current = null;
    }
  }, [cleanupIntervals]);

  const setWebViewRef = useCallback((_ref: any) => {
    domainScraper.setWebViewRef(_ref);
  }, [domainScraper]);

  const isCancelled = useCallback((): boolean => {
    if (globalCancelFlag) return true;
    return false;
  }, []);

  const runScrape = useCallback(async () => {
    const searchStore = useSearchStore.getState();
    const latestSearch = searchStore.activeSearches[searchStore.activeSearches.length - 1];
    if (!latestSearch) {
      logger.warn('Scraper', 'runScrape called with no active searches');
      return;
    }

    const searchId = latestSearch.id;
    activeSearchIdRef.current = searchId;
    const filters = latestSearch.filters;

    globalCancelFlag = false;
    logger.phase('start', `Researching ${filters.company} - ${filters.role} in ${filters.country}`);
    startTimeRef.current = Date.now();
    const totalDurationMs = APP_CONFIG.totalTimeoutMs;

    cleanupIntervals();
    progressIntervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - startTimeRef.current;
      const remainingSecs = Math.max(0, Math.floor((totalDurationMs - elapsedMs) / 1000));
      const progress = Math.min(90, Math.floor((elapsedMs / totalDurationMs) * 100));
      useSearchStore.getState().updateActiveSearch(searchId, {
        estimatedSecondsRemaining: remainingSecs,
        progressPercent: progress,
      });
    }, 1000);

    try {
      // ── Phase 1: URL Discovery ────────────────────────────────────────────
      useSearchStore.getState().updateActiveSearch(searchId, { phase: 'searching' });

      const deadline = startTimeRef.current + APP_CONFIG.totalTimeoutMs;

      let discoveredUrls: string[] = [];
      try {
        logger.phase('searching', `Discovering URLs for ${filters.company} - ${filters.role}`);
        discoveredUrls = await domainScraper.discoverUrls(
          filters.company, filters.role, filters.country, filters.experience, deadline
        );
      } catch (err) {
        logger.error('Discovery', 'URL discovery failed', err);
      }

      useSearchStore.getState().updateActiveSearch(searchId, { urlsDiscovered: discoveredUrls.length });
      logger.info('Discovery', `URLs after filtering: ${discoveredUrls.length}`);

      if (isCancelled()) {
        cleanupIntervals();
        useSearchStore.getState().updateActiveSearch(searchId, { phase: 'error' });
        return;
      }

      // ── Phase 2: Page Scraping ────────────────────────────────────────────
      useSearchStore.getState().updateActiveSearch(searchId, { phase: 'extracting' });

      const maxDomains = useAppStore.getState().maxDomainsToScrape;
      const urlsToProcess = discoveredUrls.slice(0, maxDomains);
      let successCount = 0;
      let totalQuality = 0;

      for (let i = 0; i < urlsToProcess.length; i++) {
        if (isCancelled()) {
          cleanupIntervals();
          useSearchStore.getState().updateActiveSearch(searchId, { phase: 'error' });
          return;
        }
        if (Date.now() >= deadline) {
          logger.warn('Scraper', 'Total timeout reached during page scraping, stopping early');
          break;
        }

        const url = urlsToProcess[i];
        let result = { text: '', quality: 0 };

        try {
          result = await domainScraper.scrapeUrl(url);
        } catch { }

        if (isCancelled()) {
          cleanupIntervals();
          useSearchStore.getState().updateActiveSearch(searchId, { phase: 'error' });
          return;
        }

        // Retry once if empty or low quality
        if (!result.text || result.quality < 2) {
          await delay(300 + Math.random() * 400);
          if (isCancelled()) {
            cleanupIntervals();
            useSearchStore.getState().updateActiveSearch(searchId, { phase: 'error' });
            return;
          }
          try {
            const retry = await domainScraper.scrapeUrl(url);
            if (retry.text.length > result.text.length) result = retry;
          } catch { }
        }

        if (isCancelled()) {
          cleanupIntervals();
          useSearchStore.getState().updateActiveSearch(searchId, { phase: 'error' });
          return;
        }

        if (result.text.length > 100) {
          const currentSearch = useSearchStore.getState().activeSearches.find(s => s.id === searchId);
          useSearchStore.getState().updateActiveSearch(searchId, {
            rawDataPoints: [
              ...(currentSearch?.rawDataPoints ?? []),
              {
                source: url,
                rawText: result.text,
                timestamp: new Date().toISOString(),
                success: true,
              },
            ],
          });
          successCount++;
          totalQuality += result.quality;
          logger.scrapeSuccess(url, result.text.length);
        } else {
          logger.scrapeFail(url, result.text ? `too short (${result.text.length}c)` : 'empty');
        }

        useSearchStore.getState().updateActiveSearch(searchId, { urlsProcessed: i + 1 });

        // Random delay between pages to avoid rate limiting
        if (i < urlsToProcess.length - 1) {
          await delay(200 + Math.random() * 400);
        }
      }

      const avgQuality = successCount > 0 ? Math.round(totalQuality / successCount) : 0;
      logger.phase('extracting', `Scraped ${successCount}/${urlsToProcess.length} pages (avg quality: ${avgQuality})`);
      if (isCancelled()) {
        cleanupIntervals();
        useSearchStore.getState().updateActiveSearch(searchId, { phase: 'error' });
        return;
      }

      // ── Phase 3: Data Extraction ──────────────────────────────────────────
      cleanupIntervals();
      useSearchStore.getState().updateActiveSearch(searchId, { progressPercent: 92 });

      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const currentSearch = useSearchStore.getState().activeSearches.find(s => s.id === searchId);
      const rawDataPoints = currentSearch?.rawDataPoints ?? [];
      const successPoints = rawDataPoints.filter(p => p.success);

      logger.phase('summary', `Processing ${successPoints.length} pages`);

      let finalResults;
      const aiAvailable = await aiModel.checkModelFile();

      if (aiAvailable) {
        logger.phase('ai-extract', 'Running SLM extraction on all pages');
        useSearchStore.getState().updateActiveSearch(searchId, { phase: 'ai-extract' });
        const rawTexts = successPoints.map(p => p.rawText);
        const slmResult = await aiModel.extractFromPages(rawTexts, filters, deadline);
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

      useSearchStore.getState().updateActiveSearch(searchId, { progressPercent: 96 });

      // ── Phase 4: AI Enhancement (optional summary) ────────────────────────
      if (aiAvailable) {
        logger.phase('ai-enhance', 'Running AI enhancement summary');
        useSearchStore.getState().updateActiveSearch(searchId, { phase: 'ai-enhance' });
        try {
          const enhResult = await aiModel.runEnhancement(finalResults, filters, deadline);
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
      useSearchStore.getState().updateActiveSearch(searchId, { progressPercent: 100 });

      // Save to history
      const record: SearchRecord = {
        id: `search_${Date.now()}`,
        timestamp: new Date().toISOString(),
        filters,
        results: finalResults,
      };
      console.log('useScraper: Scraping complete. Saving search record to history store for:', filters.company, '-', filters.role);
      useHistoryStore.getState().addSearch(record);

      // ── Cleanup: remove from active searches ────────────────────────────
      useSearchStore.getState().removeActiveSearch(searchId);
      activeSearchIdRef.current = null;

      triggerSearchCompleteNotification(filters.company, filters.role, filters.country);

    } catch (err: any) {
      logger.error('Scraper', 'Fatal error', err);
      cleanupIntervals();
      useSearchStore.getState().updateActiveSearch(searchId, { phase: 'error' });
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
