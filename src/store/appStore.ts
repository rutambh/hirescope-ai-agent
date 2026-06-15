// src/store/appStore.ts
// Thin global store for app-wide settings (theme).
// Replaces the theme slice that was previously in engineStore.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

type AppStore = {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  maxDomainsToScrape: number;
  setMaxDomainsToScrape: (val: number) => void;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      maxDomainsToScrape: 50,
      setMaxDomainsToScrape: (maxDomainsToScrape) => set({ maxDomainsToScrape }),
    }),
    {
      name: 'hirescope-app-store',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
