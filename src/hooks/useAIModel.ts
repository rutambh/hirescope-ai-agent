// src/hooks/useAIModel.ts
//
// Manages the optional on-device Qwen 2.5 0.5B GGUF model lifecycle:
// download (with pause/resume/cancel), validation, inference.
//
// Uses expo-file-system for download management.
// Uses llama.rn for GGUF inference.
//
// IMPORTANT: If the model is not installed or inference fails for ANY reason,
// this hook returns null and the caller falls back to Summary Engine output.

import { useCallback, useRef } from 'react';
import * as FileSystem from 'expo-file-system';
import { useAIModelStore } from '../store/aiModelStore';
import { APP_CONFIG } from '../constants/config';
import { buildAIPrompt, buildAIInput } from '../utils/aiEnhancer';
import { FinalResults, SearchFilters } from '../types';

const MODEL_DIR = `${FileSystem.documentDirectory}models/`;
const MODEL_PATH = `${MODEL_DIR}model.gguf`;

// Lazy import llama.rn — fails gracefully if not available
let llamaModule: any = null;
try {
  llamaModule = require('llama.rn');
} catch {
  // llama.rn not installed — AI enhancement will be unavailable
}

export function useAIModel() {
  const store = useAIModelStore();
  const downloadResumableRef = useRef<FileSystem.DownloadResumable | null>(null);
  const speedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastBytesRef = useRef<number>(0);
  const inferenceContextRef = useRef<any>(null);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const ensureModelDir = async () => {
    const info = await FileSystem.getInfoAsync(MODEL_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });
    }
  };

  const startSpeedTracking = (getDownloaded: () => number) => {
    lastBytesRef.current = getDownloaded();
    speedTimerRef.current = setInterval(() => {
      const current = getDownloaded();
      const speed = current - lastBytesRef.current;
      lastBytesRef.current = current;
      store.setProgress(current, store.totalBytes, Math.max(0, speed));
    }, 1000);
  };

  const stopSpeedTracking = () => {
    if (speedTimerRef.current) {
      clearInterval(speedTimerRef.current);
      speedTimerRef.current = null;
    }
  };

  // ─── Download ─────────────────────────────────────────────────────────────

  const downloadModel = useCallback(async () => {
    try {
      await ensureModelDir();
      store.setStatus('downloading');
      store.setProgress(0, APP_CONFIG.modelExpectedSizeMb * 1024 * 1024, 0);

      let currentBytes = 0;

      const onProgress = (progress: FileSystem.DownloadProgressData) => {
        currentBytes = progress.totalBytesWritten;
        const total = progress.totalBytesExpectedToWrite;
        store.setProgress(currentBytes, total > 0 ? total : APP_CONFIG.modelExpectedSizeMb * 1024 * 1024, 0);
      };

      const resumeUri = store.resumeUri;
      let downloadResumable: FileSystem.DownloadResumable;

      if (resumeUri) {
        // Resume from saved snapshot
        downloadResumable = new FileSystem.DownloadResumable(
          APP_CONFIG.modelDownloadUrl,
          MODEL_PATH,
          {},
          onProgress,
          resumeUri
        );
      } else {
        downloadResumable = FileSystem.createDownloadResumable(
          APP_CONFIG.modelDownloadUrl,
          MODEL_PATH,
          {},
          onProgress
        );
      }

      downloadResumableRef.current = downloadResumable;
      startSpeedTracking(() => currentBytes);

      const result = await downloadResumable.downloadAsync();
      stopSpeedTracking();

      if (!result || !result.uri) {
        throw new Error('Download returned no file URI');
      }

      // Validate
      store.setStatus('validating');
      await validateModel();

      store.setInstalled(APP_CONFIG.modelVersion);
    } catch (err: any) {
      stopSpeedTracking();
      if (err?.message?.includes('cancelled')) {
        // User cancelled — reset silently
        store.resetDownload();
      } else {
        store.setError(err?.message ?? 'Download failed');
      }
    }
  }, [store]);

  const pauseDownload = useCallback(async () => {
    if (!downloadResumableRef.current) return;
    try {
      stopSpeedTracking();
      const snapshot = await downloadResumableRef.current.pauseAsync();
      store.setResumeUri(snapshot?.url ?? null);
      store.setStatus('paused');
    } catch (err: any) {
      store.setError(err?.message ?? 'Pause failed');
    }
  }, [store]);

  const resumeDownload = useCallback(async () => {
    await downloadModel();
  }, [downloadModel]);

  const cancelDownload = useCallback(async () => {
    if (downloadResumableRef.current) {
      try {
        await downloadResumableRef.current.cancelAsync();
      } catch {
        // ignore
      }
      downloadResumableRef.current = null;
    }
    stopSpeedTracking();
    // Delete partial file
    try {
      await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
    } catch {
      // ignore
    }
    store.resetDownload();
  }, [store]);

  // ─── Validation ──────────────────────────────────────────────────────────

  const validateModel = useCallback(async (): Promise<void> => {
    const info = await FileSystem.getInfoAsync(MODEL_PATH);
    if (!info.exists) {
      throw new Error('Model file not found after download');
    }

    // Size sanity check: must be at least 100 MB
    const fileSizeBytes = (info as any).size ?? 0;
    if (fileSizeBytes < 100 * 1024 * 1024) {
      await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
      throw new Error('Model file too small — possibly corrupted');
    }

    // If a checksum is configured, verify it
    if (APP_CONFIG.modelExpectedChecksum) {
      const Crypto = await import('expo-crypto');
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        await FileSystem.readAsStringAsync(MODEL_PATH, { encoding: 'base64' }),
        { encoding: Crypto.CryptoEncoding.HEX }
      );
      if (hash !== APP_CONFIG.modelExpectedChecksum) {
        await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
        throw new Error('Model checksum mismatch — file corrupted');
      }
    }
  }, []);

  // ─── Delete ──────────────────────────────────────────────────────────────

  const deleteModel = useCallback(async () => {
    try {
      if (inferenceContextRef.current) {
        try { await inferenceContextRef.current.release(); } catch { /* ignore */ }
        inferenceContextRef.current = null;
      }
      await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
      store.resetAll();
    } catch (err: any) {
      store.setError(err?.message ?? 'Delete failed');
    }
  }, [store]);

  // ─── Inference ───────────────────────────────────────────────────────────

  const runEnhancement = useCallback(async (
    results: FinalResults,
    filters: SearchFilters
  ): Promise<string | null> => {
    // Guard: model not available
    if (store.status !== 'installed') return null;
    if (!llamaModule) return null;

    const modelInfo = await FileSystem.getInfoAsync(MODEL_PATH);
    if (!modelInfo.exists) {
      store.resetAll();
      return null;
    }

    try {
      // Initialize context if not already loaded
      if (!inferenceContextRef.current) {
        inferenceContextRef.current = await llamaModule.initLlama({
          model: MODEL_PATH,
          n_ctx: 512,
          n_threads: 2,
        });
      }

      const input = buildAIInput(results, filters);
      const prompt = buildAIPrompt(input);

      // Run with timeout
      const inferencePromise = inferenceContextRef.current.completion({
        prompt,
        n_predict: 150,
        temperature: 0.3,
        top_p: 0.9,
        stop: ['\n\n', 'Data:', 'Company:'],
      });

      const timeoutPromise = new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Inference timeout')), APP_CONFIG.aiInferenceTimeoutMs)
      );

      const result = await Promise.race([inferencePromise, timeoutPromise]);
      const text = (result as any)?.text?.trim();
      return text && text.length > 10 ? text : null;
    } catch (err: any) {
      console.warn('AI enhancement failed (fallback to Summary Engine):', err?.message);
      // Release context on error to free memory
      if (inferenceContextRef.current) {
        try { await inferenceContextRef.current.release(); } catch { /* ignore */ }
        inferenceContextRef.current = null;
      }
      return null;
    }
  }, [store]);

  // ─── Model File Check ─────────────────────────────────────────────────────

  const checkModelFile = useCallback(async (): Promise<boolean> => {
    try {
      const info = await FileSystem.getInfoAsync(MODEL_PATH);
      return info.exists && ((info as any).size ?? 0) > 100 * 1024 * 1024;
    } catch {
      return false;
    }
  }, []);

  return {
    // State (from store)
    status: store.status,
    downloadedBytes: store.downloadedBytes,
    totalBytes: store.totalBytes,
    speedBytesPerSec: store.speedBytesPerSec,
    errorMessage: store.errorMessage,
    installedVersion: store.installedVersion,

    // Actions
    downloadModel,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    deleteModel,
    runEnhancement,
    checkModelFile,
  };
}
