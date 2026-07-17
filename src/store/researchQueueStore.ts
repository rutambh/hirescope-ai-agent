// src/store/researchQueueStore.ts
//
// Persisted store to manage the active search URL queue, partial raw data points,
// and scraping state. This allows the research engine to resume progress after
// background suspensions or process kills.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchFilters, RawDataPoint } from '../types';
import { useSearchStore } from './searchStore';

export type QueueItem = {
  url: string;
  status: 'pending' | 'in-progress' | 'done' | 'failed';
  errorReason?: string;
};

export type ResearchQueueState = {
  activeSearchId: string | null;
  filters: SearchFilters | null;
  queue: QueueItem[];
  rawDataPoints: RawDataPoint[];
  phase: 'idle' | 'searching' | 'extracting' | 'ai-extract' | 'ai-enhance' | 'complete' | 'error';
  progressPercent: number;
  estimatedSecondsRemaining: number;
  isPaused: boolean;
  urlsDiscovered: number;
  urlsProcessed: number;
  startTime: number; // timestamp in ms

  // Actions
  startNewQueue: (id: string, filters: SearchFilters) => void;
  setDiscoveredUrls: (urls: string[]) => void;
  updateItemStatus: (url: string, status: QueueItem['status'], errorReason?: string) => void;
  addRawDataPoint: (point: RawDataPoint) => void;
  updateProgress: (progressPercent: number, estimatedSecondsRemaining: number) => void;
  updatePhase: (phase: ResearchQueueState['phase']) => void;
  setPaused: (isPaused: boolean) => void;
  clearQueue: () => void;
  syncToSearchStore: () => void;
};

export const useResearchQueueStore = create<ResearchQueueState>()(
  persist(
    (set, get) => {
      // Helper to update the in-memory searchStore
      const sync = (state: Partial<ResearchQueueState>) => {
        const activeSearchId = state.activeSearchId ?? get().activeSearchId;
        const filters = state.filters ?? get().filters;
        const phase = state.phase ?? get().phase;
        const progressPercent = state.progressPercent ?? get().progressPercent;
        const estimatedSecondsRemaining = state.estimatedSecondsRemaining ?? get().estimatedSecondsRemaining;
        const urlsDiscovered = state.urlsDiscovered ?? get().urlsDiscovered;
        const urlsProcessed = state.urlsProcessed ?? get().urlsProcessed;
        const rawDataPoints = state.rawDataPoints ?? get().rawDataPoints;

        if (activeSearchId && filters) {
          const searchStore = useSearchStore.getState();
          const existing = searchStore.activeSearches.find(s => s.id === activeSearchId);
          
          // Strip rawText from rawDataPoints for UI performance
          const uiDataPoints = rawDataPoints.map(p => ({
            source: p.source,
            timestamp: p.timestamp,
            success: p.success,
          }));

          if (existing) {
            searchStore.updateActiveSearch(activeSearchId, {
              phase: phase as any,
              progressPercent,
              estimatedSecondsRemaining,
              urlsDiscovered,
              urlsProcessed,
              rawDataPoints: uiDataPoints as any,
            });
          } else {
            // Re-populate active search on startup/rehydration
            searchStore.addActiveSearch(activeSearchId, filters);
            searchStore.updateActiveSearch(activeSearchId, {
              phase: phase as any,
              progressPercent,
              estimatedSecondsRemaining,
              urlsDiscovered,
              urlsProcessed,
              rawDataPoints: uiDataPoints as any,
            });
          }
        }
      };

      return {
        activeSearchId: null,
        filters: null,
        queue: [],
        rawDataPoints: [],
        phase: 'idle',
        progressPercent: 0,
        estimatedSecondsRemaining: 10 * 60,
        isPaused: false,
        urlsDiscovered: 0,
        urlsProcessed: 0,
        startTime: 0,

        startNewQueue: (id, filters) => {
          const newState = {
            activeSearchId: id,
            filters,
            queue: [],
            rawDataPoints: [],
            phase: 'searching' as const,
            progressPercent: 0,
            estimatedSecondsRemaining: 15 * 60,
            isPaused: false,
            urlsDiscovered: 0,
            urlsProcessed: 0,
            startTime: Date.now(),
          };
          set(newState);
          sync(newState);
        },

        setDiscoveredUrls: (urls) => {
          const queueItems: QueueItem[] = urls.map(url => ({
            url,
            status: 'pending',
          }));
          const newState = {
            queue: queueItems,
            urlsDiscovered: urls.length,
            phase: 'extracting' as const,
          };
          set(newState);
          sync(newState);
        },

        updateItemStatus: (url, status, errorReason) => {
          const currentQueue = get().queue;
          const updatedQueue = currentQueue.map(item =>
            item.url === url ? { ...item, status, errorReason } : item
          );
          const urlsProcessed = updatedQueue.filter(item => item.status !== 'pending' && item.status !== 'in-progress').length;
          const newState = {
            queue: updatedQueue,
            urlsProcessed,
          };
          set(newState);
          sync(newState);
        },

        addRawDataPoint: (point) => {
          const updatedPoints = [...get().rawDataPoints, point];
          const newState = {
            rawDataPoints: updatedPoints,
          };
          set(newState);
          sync(newState);
        },

        updateProgress: (progressPercent, estimatedSecondsRemaining) => {
          const newState = {
            progressPercent,
            estimatedSecondsRemaining,
          };
          set(newState);
          sync(newState);
        },

        updatePhase: (phase) => {
          const newState = { phase };
          set(newState);
          sync(newState);
        },

        setPaused: (isPaused) => {
          set({ isPaused });
        },

        clearQueue: () => {
          const activeSearchId = get().activeSearchId;
          if (activeSearchId) {
            useSearchStore.getState().removeActiveSearch(activeSearchId);
          }
          set({
            activeSearchId: null,
            filters: null,
            queue: [],
            rawDataPoints: [],
            phase: 'idle',
            progressPercent: 0,
            estimatedSecondsRemaining: 0,
            isPaused: false,
            urlsDiscovered: 0,
            urlsProcessed: 0,
            startTime: 0,
          });
        },

        syncToSearchStore: () => {
          sync({});
        },
      };
    },
    {
      name: 'hirescope-research-queue-store',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => {
        return (state, error) => {
          if (!error && state && state.activeSearchId) {
            // Rehydrate searchStore with the active search
            state.syncToSearchStore();
          }
        };
      },
    }
  )
);
