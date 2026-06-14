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
    if (!filters) return;

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
        discoveredUrls = await domainScraper.discoverUrls(
          filters.company,
          filters.role,
          filters.country,
          filters.state,
          filters.district
        );
      } catch (err) {
        console.warn('URL discovery failed:', err);
      }

      useSearchStore.getState().setActiveUrlsDiscovered(discoveredUrls.length);
      console.log(`[Scraper] Discovered ${discoveredUrls.length} URLs`);

      if (cancelRequestedRef.current) { cleanupIntervals(); return; }

      // ── Phase 2: Page Extraction ──────────────────────────────────────────
      useSearchStore.getState().setActivePhase('extracting');

      const maxDomains = useAppStore.getState().maxDomainsToScrape;
      const urlsToProcess = discoveredUrls.slice(0, maxDomains);
      let successCount = 0;

      for (let i = 0; i < urlsToProcess.length; i++) {
        if (cancelRequestedRef.current) { cleanupIntervals(); return; }

        const url = urlsToProcess[i];
        try {
          const pageText = await domainScraper.scrapeUrl(url);
          if (pageText && pageText.length > 100) {
            const point: RawDataPoint = {
              source: url,
              rawText: pageText,
              timestamp: new Date().toISOString(),
              success: true,
            };
            useSearchStore.getState().addActiveRawDataPoint(point);
            successCount++;
          }
        } catch (err) {
          console.warn(`Scrape failed for ${url}:`, err);
        }

        useSearchStore.getState().setActiveUrlsProcessed(i + 1);
      }

      console.log(`[Scraper] Successfully scraped ${successCount}/${urlsToProcess.length} pages`);

      if (cancelRequestedRef.current) { cleanupIntervals(); return; }

      // ── Phase 3: Summary Engine (deterministic, always runs) ──────────────
      cleanupIntervals();
      useSearchStore.getState().setActiveProgress(95);

      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const currentState = useSearchStore.getState();
      const rawDataPoints = currentState.activeRawDataPoints;

      const successPoints = rawDataPoints.filter(p => p.success);
      if (successPoints.length < APP_CONFIG.maxUrlsMinimum) {
        console.warn(`Only ${successPoints.length} pages scraped — below minimum. Proceeding anyway.`);
      }

      let finalResults = mergeAllResults(filters, rawDataPoints, elapsedSeconds);

      // ── Phase 4: AI Enhancement (optional, fails gracefully) ──────────────
      const aiAvailable = await aiModel.checkModelFile();
      if (aiAvailable) {
        try {
          const enhanced = await aiModel.runEnhancement(finalResults, filters);
          if (enhanced) {
            finalResults = { ...finalResults, aiEnhancedSummary: enhanced };
          }
        } catch {
          // AI enhancement failed — results are still complete without it
        }
      }

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
