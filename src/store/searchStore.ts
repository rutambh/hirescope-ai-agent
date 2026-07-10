// src/store/searchStore.ts
import { create } from 'zustand';
import { SearchFilters, RawDataPoint, FinalResults } from '../types';

type SearchPhase = 'idle' | 'searching' | 'extracting' | 'ai-extract' | 'ai-enhance' | 'complete' | 'error';

type ActiveSearch = {
  id: string;
  filters: SearchFilters;
  phase: SearchPhase;
  progressPercent: number;
  estimatedSecondsRemaining: number;
  urlsDiscovered: number;
  urlsProcessed: number;
  rawDataPoints: RawDataPoint[];
  scraperUrl: string | null;
};

type SearchState = {
  // Viewer state (for displaying results on the results screen)
  filters: SearchFilters | null;
  finalResults: FinalResults | null;

  // Active background searches (up to 2 concurrent)
  activeSearches: ActiveSearch[];

  // Setters/actions for viewer state
  setFilters: (filters: SearchFilters | null) => void;
  setFinalResults: (results: FinalResults | null) => void;
  completeSearch: (results: FinalResults) => void;
  resetViewer: () => void;

  // Setters/actions for active search state
  addActiveSearch: (id: string, filters: SearchFilters) => void;
  removeActiveSearch: (id: string) => void;
  updateActiveSearch: (id: string, updates: Partial<Omit<ActiveSearch, 'id' | 'filters'>>) => void;
  getActiveSearch: (id: string) => ActiveSearch | undefined;
  canStartNewSearch: () => boolean;
  getActiveSearchCount: () => number;
};

export const useSearchStore = create<SearchState>((set, get) => ({
  // Viewer state defaults
  filters: null,
  finalResults: null,

  // Active search state defaults
  activeSearches: [],

  // Viewer setters
  setFilters: (filters) => set({ filters }),
  setFinalResults: (finalResults) => set({ finalResults }),
  completeSearch: (finalResults) => set((state) => ({
    finalResults,
    filters: state.activeSearches[0]?.filters ?? null,
  })),
  resetViewer: () => set({
    filters: null,
    finalResults: null,
  }),

  // Active search setters
  addActiveSearch: (id, filters) => set((state) => ({
    activeSearches: [
      ...state.activeSearches,
      {
        id,
        filters,
        phase: 'searching',
        progressPercent: 0,
        estimatedSecondsRemaining: 15 * 60,
        urlsDiscovered: 0,
        urlsProcessed: 0,
        rawDataPoints: [],
        scraperUrl: null,
      },
    ],
  })),

  removeActiveSearch: (id) => set((state) => ({
    activeSearches: state.activeSearches.filter((s) => s.id !== id),
  })),

  updateActiveSearch: (id, updates) => set((state) => ({
    activeSearches: state.activeSearches.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    ),
  })),

  getActiveSearch: (id) => get().activeSearches.find((s) => s.id === id),

  canStartNewSearch: () => get().activeSearches.length < 1,

  getActiveSearchCount: () => get().activeSearches.length,
}));
