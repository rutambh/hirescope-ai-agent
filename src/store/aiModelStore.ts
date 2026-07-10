// src/store/aiModelStore.ts
// Persisted state for the optional on-device AI model.
// Tracks download progress, install status, errors.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIModelStatus } from '../types';

type AIModelStore = {
  status: AIModelStatus;
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  errorMessage: string | null;
  installedVersion: string | null;
  // Persisted download resumable URI (for pause/resume)
  resumeUri: string | null;
  // Whether the first-load download prompt has been dismissed
  promptDismissed: boolean;

  setStatus: (status: AIModelStatus) => void;
  setProgress: (downloadedBytes: number, totalBytes: number, speedBytesPerSec: number) => void;
  setError: (message: string) => void;
  setInstalled: (version: string) => void;
  setResumeUri: (uri: string | null) => void;
  dismissPrompt: () => void;
  resetDownload: () => void;
  resetAll: () => void;
};

export const useAIModelStore = create<AIModelStore>()(
  persist(
    (set) => ({
      status: 'not_installed',
      downloadedBytes: 0,
      totalBytes: 0,
      speedBytesPerSec: 0,
      errorMessage: null,
      installedVersion: null,
      resumeUri: null,
      promptDismissed: false,

      setStatus: (status) => set({ status }),

      setProgress: (downloadedBytes, totalBytes, speedBytesPerSec) =>
        set({ downloadedBytes, totalBytes, speedBytesPerSec }),

      setError: (message) =>
        set({ status: 'error', errorMessage: message }),

      setInstalled: (version) =>
        set({
          status: 'installed',
          errorMessage: null,
          installedVersion: version,
          resumeUri: null,
        }),

      setResumeUri: (uri) => set({ resumeUri: uri }),

      dismissPrompt: () => set({ promptDismissed: true }),

      resetDownload: () =>
        set({
          status: 'not_installed',
          downloadedBytes: 0,
          totalBytes: 0,
          speedBytesPerSec: 0,
          errorMessage: null,
          resumeUri: null,
        }),

      resetAll: () =>
        set({
          status: 'not_installed',
          downloadedBytes: 0,
          totalBytes: 0,
          speedBytesPerSec: 0,
          errorMessage: null,
          installedVersion: null,
          resumeUri: null,
        }),
    }),
    {
      name: 'hirescope-ai-model-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these fields (not transient speed/progress)
      partialize: (state) => ({
        status: state.status,
        installedVersion: state.installedVersion,
        resumeUri: state.resumeUri,
        downloadedBytes: state.downloadedBytes,
        totalBytes: state.totalBytes,
        promptDismissed: state.promptDismissed,
      }),
    }
  )
);
