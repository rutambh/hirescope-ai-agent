import { useRef, useCallback, useEffect } from 'react';
import { AppState } from 'react-native';
import { useAppStore } from '../store/appStore';
import { useSearchStore } from '../store/searchStore';
import { useHistoryStore } from '../store/historyStore';
import { useDomainHealthStore } from '../store/domainHealthStore';
import { useDomainScraper, setCancelFlag, isCancelled, resetCancelFlag } from './useDomainScraper';
import { useNotification } from './useNotification';
import { useAIModel } from './useAIModel';
import { mergeAllResults } from '../utils/merger';
import { APP_CONFIG } from '../constants/config';
import { RawDataPoint, SearchRecord } from '../types';
import { logger } from '../utils/logger';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useResearchQueueStore } from '../store/researchQueueStore';
import {
  startResearchService,
  stopResearchService,
  updateResearchNotification,
} from '../native/researchService';

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Module-level guard to prevent concurrent execution of the scraping loop
let isScrapeRunning = false;

export function useScraper() {
  const domainScraper = useDomainScraper();
  const { 
    triggerSearchCompleteNotification,
    triggerProgressNotification,
    dismissProgressNotification
  } = useNotification();
  const aiModel = useAIModel();

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const activeSearchIdRef = useRef<string | null>(null);

  // Refs for tracking progress notification updates and throttling
  const lastNotifiedProgressRef = useRef<number>(-1);
  const lastNotifiedPhaseRef = useRef<string>('');
  const lastNotifiedTimeRef = useRef<number>(0);

  const cleanupIntervals = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  }, []);

  const dismissProgress = useCallback(async () => {
    await dismissProgressNotification();
  }, [dismissProgressNotification]);

  const handleCancel = useCallback(() => {
    setCancelFlag();
    cleanupIntervals();
    const store = useSearchStore.getState();
    if (activeSearchIdRef.current) {
      store.updateActiveSearch(activeSearchIdRef.current, { phase: 'error' });
      activeSearchIdRef.current = null;
    }
    useResearchQueueStore.getState().clearQueue();
    try {
      deactivateKeepAwake('hirescope-research');
    } catch (e) {}
    stopResearchService();
    dismissProgress();
  }, [cleanupIntervals, dismissProgress]);

  const resumeScrape = useCallback(() => {
    const queueStore = useResearchQueueStore.getState();
    if (queueStore.activeSearchId && queueStore.isPaused) {
      queueStore.setPaused(false);
      logger.info('Scraper', `Manually resumed search: ${queueStore.activeSearchId}`);
      // BackgroundScraper's useEffect will notice isPaused: false and trigger runScrape()
    }
  }, []);

  const setWebViewRef = useCallback((_ref: any) => {
    domainScraper.setWebViewRef(_ref);
  }, [domainScraper]);

  const updateNotification = useCallback((phase: string, progress: number, statusText?: string) => {
    const now = Date.now();
    const latestSearch = useSearchStore.getState().activeSearches.find(s => s.id === activeSearchIdRef.current);
    if (!latestSearch) return;

    const { company, role } = latestSearch.filters;

    const phaseChanged = phase !== lastNotifiedPhaseRef.current;
    const progressChangedSignificant = Math.abs(progress - lastNotifiedProgressRef.current) >= 5;
    const timePassedSignificant = now - lastNotifiedTimeRef.current >= 5000;

    if (phaseChanged || progressChangedSignificant || timePassedSignificant) {
      lastNotifiedPhaseRef.current = phase;
      lastNotifiedProgressRef.current = progress;
      lastNotifiedTimeRef.current = now;

      triggerProgressNotification(company, role, phase, progress, statusText);

      if (phaseChanged) {
        updateResearchNotification('HireScope — researching', `${company}: ${phase}`);
      }
    }
  }, [triggerProgressNotification]);

  const runScrape = useCallback(async () => {
    if (isScrapeRunning) {
      logger.warn('Scraper', 'runScrape called but scraping loop is already active. Ignoring.');
      return;
    }

    const searchStore = useSearchStore.getState();
    const latestSearch = searchStore.activeSearches[searchStore.activeSearches.length - 1];
    if (!latestSearch) {
      logger.warn('Scraper', 'runScrape called with no active searches');
      return;
    }

    const searchId = latestSearch.id;
    activeSearchIdRef.current = searchId;
    const filters = latestSearch.filters;

    isScrapeRunning = true;

    // Reset notification tracker refs
    lastNotifiedProgressRef.current = -1;
    lastNotifiedPhaseRef.current = '';
    lastNotifiedTimeRef.current = 0;

    resetCancelFlag();
    logger.phase('start', `Researching ${filters.company} - ${filters.role} in ${filters.country}`);

    startResearchService(
      'HireScope — researching',
      `Researching ${filters.company} (${filters.role})`
    );

    const queueStore = useResearchQueueStore.getState();
    if (queueStore.activeSearchId !== searchId) {
      // It's a brand new search run. Initialize the persisted queue.
      queueStore.startNewQueue(searchId, filters);
    } else {
      logger.info('Scraper', `Resuming search ${searchId} from phase: ${queueStore.phase}`);
    }

    // Initialize/sync local timing from queue store
    startTimeRef.current = queueStore.startTime > 0 ? queueStore.startTime : Date.now();
    const totalDurationMs = APP_CONFIG.totalTimeoutMs;

    cleanupIntervals();
    progressIntervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - startTimeRef.current;
      const remainingSecs = Math.max(0, Math.floor((totalDurationMs - elapsedMs) / 1000));
      
      const currentSearch = useSearchStore.getState().activeSearches.find(s => s.id === searchId);
      const currentProgress = currentSearch?.progressPercent ?? 0;
      
      useSearchStore.getState().updateActiveSearch(searchId, {
        estimatedSecondsRemaining: remainingSecs,
      });
      useResearchQueueStore.getState().updateProgress(currentProgress, remainingSecs);

      const updatedSearch = useSearchStore.getState().activeSearches.find(s => s.id === searchId);
      if (updatedSearch) {
        updateNotification(updatedSearch.phase, updatedSearch.progressPercent);
      }
    }, 5000);

    const isDeep = filters.researchMode === 'deep';
    const keepScreenOn = useAppStore.getState().keepScreenOnDefault;
    let keepAwakeActivated = false;

    try {
      if (isDeep && keepScreenOn) {
        try {
          await activateKeepAwakeAsync('hirescope-research');
          keepAwakeActivated = true;
          logger.info('Scraper', 'Keep screen awake activated for Deep Research');
        } catch (e) {
          logger.error('Scraper', 'Failed to activate keep awake', e);
        }
      }

      // ── Phase 1: URL Discovery (Skip if already populated) ────────────────
      const deadline = startTimeRef.current + APP_CONFIG.totalTimeoutMs;
      const isNarrow = filters.researchMode === 'narrow';
      const discoveryTimeout = isNarrow ? 60000 : APP_CONFIG.totalTimeoutMs; // 1m for Narrow
      const discoveryDeadline = startTimeRef.current + discoveryTimeout;

      if (useResearchQueueStore.getState().queue.length === 0) {
        useSearchStore.getState().updateActiveSearch(searchId, { phase: 'searching' });
        useResearchQueueStore.getState().updatePhase('searching');
        updateNotification('searching', 0);

        let discoveredUrls: string[] = [];
        try {
          logger.phase('searching', `Discovering URLs for ${filters.company} - ${filters.role}`);
          discoveredUrls = await domainScraper.discoverUrls(
            filters.company, filters.role, filters.countryCode === 'WW' ? '' : filters.country, filters.overall ? undefined : filters.experience, discoveryDeadline, filters.researchMode
          );
        } catch (err) {
          logger.error('Discovery', 'URL discovery failed', err);
        }

        useSearchStore.getState().updateActiveSearch(searchId, { urlsDiscovered: discoveredUrls.length });
        logger.info('Discovery', `URLs after filtering: ${discoveredUrls.length}`);

        if (isCancelled() || useResearchQueueStore.getState().isPaused) {
          cleanupIntervals();
          if (isCancelled()) {
            useSearchStore.getState().updateActiveSearch(searchId, { phase: 'error' });
            useResearchQueueStore.getState().clearQueue();
          }
          await dismissProgress();
          return;
        }

        const maxDomains = useAppStore.getState().maxDomainsToScrape;
        const urlsToProcess = discoveredUrls.slice(0, maxDomains);
        useResearchQueueStore.getState().setDiscoveredUrls(urlsToProcess);
      }

      // ── Phase 2: Page Scraping ────────────────────────────────────────────
      useSearchStore.getState().updateActiveSearch(searchId, { phase: 'extracting' });
      useResearchQueueStore.getState().updatePhase('extracting');

      const freshQueueState = useResearchQueueStore.getState();
      const urlsToProcess = freshQueueState.queue;
      const totalUrls = urlsToProcess.length;

      updateNotification('extracting', freshQueueState.progressPercent || 10, `Processing queue...`);

      const scrapingStartTime = Date.now();
      const scrapingTimeout = isNarrow ? 120000 : (APP_CONFIG.totalTimeoutMs - (scrapingStartTime - startTimeRef.current)); // 2m for Narrow
      const scrapingDeadline = scrapingStartTime + scrapingTimeout;

      while (true) {
        if (isCancelled() || useResearchQueueStore.getState().isPaused) {
          break;
        }
        if (Date.now() >= scrapingDeadline) {
          logger.warn('Scraper', 'Scraping timeout reached, stopping early');
          break;
        }

        // Fetch fresh queue list to find the next pending item
        const currentQueue = useResearchQueueStore.getState().queue;
        const nextPending = currentQueue.find(item => item.status === 'pending');
        if (!nextPending) {
          break; // All URLs in the queue are done or failed
        }

        const url = nextPending.url;
        useResearchQueueStore.getState().updateItemStatus(url, 'in-progress');

        let result = { text: '', quality: 0 };
        try {
          result = await domainScraper.scrapeUrl(url, filters.researchMode);
        } catch { }

        if (isCancelled() || useResearchQueueStore.getState().isPaused) {
          // Re-evaluate in-progress item back to pending
          useResearchQueueStore.getState().updateItemStatus(url, 'pending');
          break;
        }

        // Retry once if empty or low quality
        if (!result.text || result.quality < 2) {
          await delay(300 + Math.random() * 400);
          if (isCancelled() || useResearchQueueStore.getState().isPaused) {
            useResearchQueueStore.getState().updateItemStatus(url, 'pending');
            break;
          }
          try {
            const retry = await domainScraper.scrapeUrl(url, filters.researchMode);
            if (retry.text.length > result.text.length) result = retry;
          } catch { }
        }

        if (isCancelled() || useResearchQueueStore.getState().isPaused) {
          useResearchQueueStore.getState().updateItemStatus(url, 'pending');
          break;
        }

        if (result.text.length > 100) {
          const rawPoint: RawDataPoint = {
            source: url,
            rawText: result.text,
            timestamp: new Date().toISOString(),
            success: true,
          };
          useResearchQueueStore.getState().addRawDataPoint(rawPoint);
          useResearchQueueStore.getState().updateItemStatus(url, 'done');
          logger.scrapeSuccess(url, result.text.length);
        } else {
          useResearchQueueStore.getState().updateItemStatus(url, 'failed', `too short (${result.text.length}c)`);
          logger.scrapeFail(url, result.text ? `too short (${result.text.length}c)` : 'empty');
        }

        // Update progress percentage
        const updatedState = useResearchQueueStore.getState();
        const doneCount = updatedState.urlsProcessed;
        const progress = totalUrls > 0 ? 10 + Math.floor((doneCount / totalUrls) * 80) : 10;
        const elapsedMs = Date.now() - updatedState.startTime;
        const remainingSecs = Math.max(0, Math.floor((totalDurationMs - elapsedMs) / 1000));

        useResearchQueueStore.getState().updateProgress(progress, remainingSecs);
        updateNotification('extracting', progress, `Scraping page ${doneCount} of ${totalUrls}`);

        // Random delay between pages to avoid rate limiting
        if (doneCount < totalUrls) {
          await delay(200 + Math.random() * 400);
        }
      }

      // Check if loop was exited due to a pause or cancel
      const finalQueueState = useResearchQueueStore.getState();
      const hasPending = finalQueueState.queue.some(item => item.status === 'pending');
      
      if (isCancelled() || finalQueueState.isPaused || hasPending) {
        cleanupIntervals();
        if (isCancelled()) {
          useSearchStore.getState().updateActiveSearch(searchId, { phase: 'error' });
          useResearchQueueStore.getState().clearQueue();
        }
        await dismissProgress();
        return;
      }

      // ── Phase 3: Data Extraction ──────────────────────────────────────────
      cleanupIntervals();
      useSearchStore.getState().updateActiveSearch(searchId, { progressPercent: 92 });
      useResearchQueueStore.getState().updateProgress(92, 20);
      updateNotification('summary', 92, 'Extracting data');

      const rawDataPoints = useResearchQueueStore.getState().rawDataPoints;
      const successPoints = rawDataPoints.filter(p => p.success);

      logger.phase('summary', `Processing ${successPoints.length} pages`);

      let finalResults;
      const aiAvailable = await aiModel.checkModelFile();

      if (aiAvailable) {
        logger.phase('ai-extract', 'Running SLM extraction on all pages');
        useSearchStore.getState().updateActiveSearch(searchId, { phase: 'ai-extract' });
        useResearchQueueStore.getState().updatePhase('ai-extract');
        updateNotification('ai-extract', 92);
        
        const rawTexts = successPoints.map(p => p.rawText);
        const slmResult = await aiModel.extractFromPages(rawTexts, filters, deadline);
        if (slmResult) {
          finalResults = {
            ...slmResult.results,
            timeElapsedSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
            rawUrls: urlsToProcess.map(item => item.url),
            aiPrompt: slmResult.rawPrompt,
            aiRawResponse: slmResult.rawResponse,
          };
          logger.info('Scraper', 'SLM extraction successful');
        } else {
          logger.warn('Scraper', 'SLM failed — falling back to Summary Engine');
          finalResults = {
            ...mergeAllResults(filters, rawDataPoints, Math.floor((Date.now() - startTimeRef.current) / 1000)),
            rawUrls: urlsToProcess.map(item => item.url),
          };
        }
      } else {
        logger.phase('summary', 'No AI model — using deterministic Summary Engine');
        finalResults = {
          ...mergeAllResults(filters, rawDataPoints, Math.floor((Date.now() - startTimeRef.current) / 1000)),
          rawUrls: urlsToProcess.map(item => item.url),
        };
      }

      useSearchStore.getState().updateActiveSearch(searchId, { progressPercent: 96 });
      useResearchQueueStore.getState().updateProgress(96, 10);

      // ── Phase 4: AI Enhancement (optional summary) ────────────────────────
      if (aiAvailable) {
        logger.phase('ai-enhance', 'Running AI enhancement summary');
        useSearchStore.getState().updateActiveSearch(searchId, { phase: 'ai-enhance' });
        useResearchQueueStore.getState().updatePhase('ai-enhance');
        updateNotification('ai-enhance', 96);
        
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
      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      logger.phase('complete', `Finished in ${elapsedSeconds}s`);
      useSearchStore.getState().updateActiveSearch(searchId, { progressPercent: 100 });
      useResearchQueueStore.getState().updateProgress(100, 0);

      // Save to history
      const record: SearchRecord = {
        id: `search_${Date.now()}`,
        timestamp: new Date().toISOString(),
        filters,
        results: finalResults,
      };
      console.log('useScraper: Scraping complete. Saving search record to history store for:', filters.company, '-', filters.role);
      useHistoryStore.getState().addSearch(record);

      // Surface final results in the viewer store so the Results screen has data
      useSearchStore.getState().completeSearch(finalResults);

      // Increment domain health search counter
      useDomainHealthStore.getState().incrementSearchCounter();

      // Clear the work queue since it's fully complete
      useResearchQueueStore.getState().clearQueue();
      activeSearchIdRef.current = null;

      await dismissProgress();
      triggerSearchCompleteNotification(filters.company, filters.role, filters.country);

    } catch (err: any) {
      logger.error('Scraper', 'Fatal error', err);
      cleanupIntervals();
      useSearchStore.getState().updateActiveSearch(searchId, { phase: 'error' });
      await dismissProgress();
    } finally {
      isScrapeRunning = false;
      if (keepAwakeActivated) {
        try {
          deactivateKeepAwake('hirescope-research');
          logger.info('Scraper', 'Keep screen awake deactivated');
        } catch (e) {
          logger.error('Scraper', 'Failed to deactivate keep awake', e);
        }
      }
      stopResearchService();
    }
  }, [domainScraper, aiModel, cleanupIntervals, triggerSearchCompleteNotification, updateNotification, dismissProgress]);

  // AppState Listener for background auto-pause and foreground auto-resume
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      const queueStore = useResearchQueueStore.getState();
      if (!queueStore.activeSearchId) return;

      if (nextAppState === 'background' || nextAppState === 'inactive') {
        logger.info('AppState', 'App backgrounded. Pausing research queue.');
        queueStore.setPaused(true);
        cleanupIntervals();
        
        const latestSearch = useSearchStore.getState().activeSearches.find(s => s.id === queueStore.activeSearchId);
        if (latestSearch) {
          updateNotification(latestSearch.phase, latestSearch.progressPercent, 'Paused — waiting for app in foreground');
        }
      } else if (nextAppState === 'active') {
        logger.info('AppState', 'App returned to active. Resuming research queue.');
        if (queueStore.isPaused) {
          queueStore.setPaused(false);
          runScrape();
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [cleanupIntervals, updateNotification, runScrape]);

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, []);

  return {
    runScrape,
    handleCancel,
    resumeScrape,
    setWebViewRef,
    handleMessage: domainScraper.handleMessage,
    onLoadEnd: domainScraper.onLoadEnd,
  };
}
