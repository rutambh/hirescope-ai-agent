// src/store/historyStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SearchRecord } from '../types';
import { APP_CONFIG } from '../constants/config';

type HistoryStore = {
  searches: SearchRecord[];
  addSearch: (record: SearchRecord) => void;
  deleteSearch: (id: string) => void;
  clearAll: () => void;
};

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set) => ({
      searches: [],

      addSearch: (record) => set((state) => {
        const currentSearches = Array.isArray(state.searches) ? state.searches : [];
        // Filter out duplicate if it somehow exists
        const filtered = currentSearches.filter((s) => s.id !== record.id);
        
        // Add new to beginning of history list (most recent first)
        const updated = [record, ...filtered];
        
        // Evict oldest elements if we exceed the limit
        if (updated.length > APP_CONFIG.maxHistoryItems) {
          updated.pop();
        }
        
        console.log('useHistoryStore: addSearch called. New record ID:', record.id, 'Total searches now:', updated.length);
        return { searches: updated };
      }),

      deleteSearch: (id) => set((state) => ({
        searches: state.searches.filter((s) => s.id !== id)
      })),

      clearAll: () => set({ searches: [] }),
    }),
    {
      name: 'hirescope-history-store',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: (state) => {
        console.log('useHistoryStore: hydration starting');
        return (state, error) => {
          if (error) {
            console.error('useHistoryStore: hydration failed', error);
          } else {
            console.log('useHistoryStore: hydration complete. Loaded searches count:', state?.searches?.length || 0);
          }
        };
      }
    }
  )
);
