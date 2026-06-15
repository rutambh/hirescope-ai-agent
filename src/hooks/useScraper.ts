// src/hooks/useScraper.ts
//
// Master orchestrator for the V5 search pipeline:
//
//   Phase 1 (searching):  Multi-query URL discovery across DDG/Brave/Bing
//   Phase 2 (extracting): Serial page scraping up to target URL count
//   Phase 3 (summary):    Deterministic Summary Engine (always runs)
//   Phase 4 (AI):         Optional on-device Qwen enhancement (fails gracefully)
//
// Search never fails. Summary Engine is always the primary result.

import { useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useSearchStore } from '../store/searchStore';
import { useHistoryStore } from '../store/historyStore';
import { useDomainScraper } from './useDomainScraper';
import { useNotification } from './useNotification';
import { useAIModel } from './useAIModel';
import { mergeAllResults } from '../utils/merger';
import { APP_CONFIG } from '../constants/config';
import { RawDataPoint, SearchRecord } from '../types';
import { logger } from '../utils/logger';

export function useScraper() {
  const domainScraper = useDomainScraper();
  const { triggerSearchCompleteNotification } = useNotification();
  const aiModel = useAIModel();

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelRequestedRef = useRef<boolean>(false);
  const startTimeRef = useRef<number>(0);
  const webViewRefRef = useRef<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const setWebViewRef = useCallback((ref: any) => {
    webViewRefRef.current = ref;
    domainScraper.setWebViewRef(ref);
  }, [domainScraper]);

  const cleanupIntervals = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const handleCancel = useCallback(() => {
    cancelRequestedRef.current = true;
    cleanupIntervals();
    useSearchStore.getState().cancelSearch();
  }, [cleanupIntervals]);

  const runScrape = useCallback(async () => {
    const searchStore = useSearchStore.getState();
    const filters = searchStore.activeFilters;
    if (!filters) {
      logger.warn('Scraper', 'runScrape called with no active filters');
      return;
    }
    logger.phase('start', `Researching ${filters.company} - ${filters.role} in ${filters.country}`);

    cancelRequestedRef.current = false;
    startTimeRef.current = Date.now();
    const totalDurationMs = APP_CONFIG.totalTimeoutMs;

    // Progress ticker
    cleanupIntervals();
    progressIntervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - startTimeRef.current;
      const remainingSecs = Math.max(0, Math.floor((totalDurationMs - elapsedMs) / 1000));
      useSearchStore.getState().setActiveEstimatedSecondsRemaining(remainingSecs);
      const percent = Math.min(90, Math.floor((elapsedMs / totalDurationMs) * 100));
      useSearchStore.getState().setActiveProgress(percent);
    }, 1000);

    try {
      // ── Phase 1: URL Discovery ────────────────────────────────────────────
      useSearchStore.getState().setActivePhase('searching');

      let discoveredUrls: string[] = [];
      try {
        const location = [filters.country, filters.state, filters.district].filter(Boolean).join(' ');
        logger.phase('searching', `Discovering URLs for ${filters.company} - ${filters.role} in ${location}`);
        discoveredUrls = await domainScraper.discoverUrls(
          filters.company,
          filters.role,
          filters.country,
          filters.state,
          filters.district
        );
      } catch (err) {
        logger.error('Discovery', 'URL discovery failed', err);
      }

      useSearchStore.getState().setActiveUrlsDiscovered(discoveredUrls.length);
      logger.info('Discovery', `URLs after filtering: ${discoveredUrls.length}`);

      if (cancelRequestedRef.current) { cleanupIntervals(); return; }

      // ── Phase 2: Page Extraction ──────────────────────────────────────────
      useSearchStore.getState().setActivePhase('extracting');

      const maxDomains = useAppStore.getState().maxDomainsToScrape;
      const urlsToProcess = discoveredUrls.slice(0, maxDomains);
      let successCount = 0;

      for (let i = 0; i < urlsToProcess.length; i++) {
        if (cancelRequestedRef.current) { cleanupIntervals(); return; }

        const url = urlsToProcess[i];
        let pageText = '';

        // First attempt
        try {
          pageText = await domainScraper.scrapeUrl(url);
        } catch (err) {
          logger.scrapeFail(url, `first attempt failed, retrying`);
          // One retry for transient failures
          try {
            pageText = await domainScraper.scrapeUrl(url);
          } catch (err2) {
            logger.scrapeFail(url, `retry also failed`);
          }
        }

        if (pageText && pageText.length > 100) {
          const point: RawDataPoint = {
            source: url,
            rawText: pageText,
            timestamp: new Date().toISOString(),
            success: true,
          };
          useSearchStore.getState().addActiveRawDataPoint(point);
          successCount++;
          logger.scrapeSuccess(url, pageText.length);
        } else {
          logger.scrapeFail(url, pageText ? `too short (${pageText.length}c)` : 'empty response');
        }

        useSearchStore.getState().setActiveUrlsProcessed(i + 1);
      }

      logger.phase('extracting', `Scraped ${successCount}/${urlsToProcess.length} pages successfully`);

      if (cancelRequestedRef.current) { cleanupIntervals(); return; }

      // ── Phase 3: Summary Engine (deterministic, always runs) ──────────────
      cleanupIntervals();
      useSearchStore.getState().setActiveProgress(95);

      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const currentState = useSearchStore.getState();
      const rawDataPoints = currentState.activeRawDataPoints;

      const successPoints = rawDataPoints.filter(p => p.success);
      if (successPoints.length < APP_CONFIG.maxUrlsMinimum) {
        logger.warn('Scraper', `Only ${successPoints.length} pages scraped — below minimum (${APP_CONFIG.maxUrlsMinimum}). Results may be sparse.`);
      }

      logger.phase('summary', `Merging ${successPoints.length} data points via Summary Engine`);
      let finalResults = mergeAllResults(filters, rawDataPoints, elapsedSeconds);
      logger.info('Scraper', `Summary Engine complete`, {
        rating: finalResults.rating,
        salaryMin: finalResults.salaryMin,
        salaryMax: finalResults.salaryMax,
        sourcesCount: finalResults.sourcesCount,
        confidence: finalResults.confidence,
      });

      // ── Phase 4: AI Enhancement (optional, fails gracefully) ──────────────
      const aiAvailable = await aiModel.checkModelFile();
      if (aiAvailable) {
        logger.phase('ai-enhance', 'Running on-device AI enhancement');
        try {
          const enhanced = await aiModel.runEnhancement(finalResults, filters);
          if (enhanced) {
            finalResults = { ...finalResults, aiEnhancedSummary: enhanced };
            logger.aiEnhance('completed successfully');
          } else {
            logger.aiEnhance('returned empty output');
          }
        } catch (err) {
          logger.aiEnhance(`failed: ${err}`);
        }
      } else {
        logger.aiEnhance('model not installed, skipping');
      }

      logger.phase('complete', `Research finished in ${elapsedSeconds}s`);
      useSearchStore.getState().completeSearch(finalResults);

      // Save to history
      const record: SearchRecord = {
        id: `search_${Date.now()}`,
        timestamp: new Date().toISOString(),
        filters,
        results: finalResults,
      };
      useHistoryStore.getState().addSearch(record);

      // Local notification
      triggerSearchCompleteNotification(filters.company, filters.role, filters.country);

    } catch (err: any) {
      console.error('Scraper fatal error:', err);
      cleanupIntervals();
      useSearchStore.getState().setActivePhase('error');
    }
  }, [domainScraper, aiModel, cleanupIntervals, triggerSearchCompleteNotification]);

  return {
    runScrape,
    handleCancel,
    setWebViewRef,
    handleMessage: domainScraper.handleMessage,
    onLoadEnd: domainScraper.onLoadEnd,
  };
}
