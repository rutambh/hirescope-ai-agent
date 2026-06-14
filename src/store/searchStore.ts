// src/store/searchStore.ts
import { create } from 'zustand';
import { SearchFilters, RawDataPoint, FinalResults } from '../types';

type SearchPhase = 'idle' | 'searching' | 'extracting' | 'complete' | 'error';

type SearchState = {
  // Viewer state (for displaying results on the results screen)
  filters: SearchFilters | null;
  finalResults: FinalResults | null;

  // Active background search state
  activeFilters: SearchFilters | null;
  activePhase: SearchPhase;
  activeProgressPercent: number;
  activeEstimatedSecondsRemaining: number;
  activeUrlsDiscovered: number;
  activeUrlsProcessed: number;
  activeRawDataPoints: RawDataPoint[];
  activeScraperUrl: string | null;

  // Setters/actions for viewer state
  setFilters: (filters: SearchFilters | null) => void;
  setFinalResults: (results: FinalResults | null) => void;
  completeSearch: (results: FinalResults) => void;
  resetViewer: () => void;

  // Setters/actions for active search state
  setActiveFilters: (filters: SearchFilters | null) => void;
  startSearch: () => void;
  addActiveRawDataPoint: (point: RawDataPoint) => void;
  setActivePhase: (phase: SearchPhase) => void;
  setActiveProgress: (percent: number) => void;
  setActiveEstimatedSecondsRemaining: (seconds: number) => void;
  setActiveUrlsDiscovered: (count: number) => void;
  setActiveUrlsProcessed: (count: number) => void;
  setActiveScraperUrl: (url: string | null) => void;
  cancelSearch: () => void;
  reset: () => void;
};

export const useSearchStore = create<SearchState>((set) => ({
  // Viewer state defaults
  filters: null,
  finalResults: null,

  // Active search state defaults
  activeFilters: null,
  activePhase: 'idle',
  activeProgressPercent: 0,
  activeEstimatedSecondsRemaining: 0,
  activeUrlsDiscovered: 0,
  activeUrlsProcessed: 0,
  activeRawDataPoints: [],
  activeScraperUrl: null,

  // Viewer setters
  setFilters: (filters) => set({ filters }),
  setFinalResults: (finalResults) => set({ finalResults }),
  completeSearch: (finalResults) => set((state) => ({
    finalResults,
    // When final results are set, load the corresponding active search filters for viewing
    filters: state.activeFilters,
    activePhase: 'complete',
    activeProgressPercent: 100,
  })),
  resetViewer: () => set({
    filters: null,
    finalResults: null,
  }),

  // Active search setters
  setActiveFilters: (activeFilters) => set({ activeFilters }),

  startSearch: () => set({
    activePhase: 'searching',
    activeProgressPercent: 0,
    activeEstimatedSecondsRemaining: 8 * 60,
    activeUrlsDiscovered: 0,
    activeUrlsProcessed: 0,
    activeRawDataPoints: [],
    activeScraperUrl: null,
  }),

  addActiveRawDataPoint: (point) => set((state) => ({
    activeRawDataPoints: [...state.activeRawDataPoints, point],
  })),

  setActivePhase: (activePhase) => set({ activePhase }),
  setActiveProgress: (activeProgressPercent) => set({ activeProgressPercent }),
  setActiveEstimatedSecondsRemaining: (activeEstimatedSecondsRemaining) => set({ activeEstimatedSecondsRemaining }),
  setActiveUrlsDiscovered: (activeUrlsDiscovered) => set({ activeUrlsDiscovered }),
  setActiveUrlsProcessed: (activeUrlsProcessed) => set({ activeUrlsProcessed }),
  setActiveScraperUrl: (activeScraperUrl) => set({ activeScraperUrl }),

  cancelSearch: () => set({
    activePhase: 'idle',
    activeProgressPercent: 0,
    activeEstimatedSecondsRemaining: 0,
    activeUrlsDiscovered: 0,
    activeUrlsProcessed: 0,
    activeRawDataPoints: [],
    activeScraperUrl: null,
  }),

  reset: () => set({
    filters: null,
    finalResults: null,
    activeFilters: null,
    activePhase: 'idle',
    activeProgressPercent: 0,
    activeEstimatedSecondsRemaining: 0,
    activeUrlsDiscovered: 0,
    activeUrlsProcessed: 0,
    activeRawDataPoints: [],
    activeScraperUrl: null,
  }),
}));
