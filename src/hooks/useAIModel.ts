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
  const inferenceContextRef = useRef<any>(null);
  const downloadCancelledRef = useRef<boolean>(false);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const ensureModelDir = async () => {
    const info = await FileSystem.getInfoAsync(MODEL_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });
    }
  };

  // Speed is calculated inside the throttled onProgress callback
  // to avoid race conditions between two separate update sources.

  // ─── Download ─────────────────────────────────────────────────────────────

  const downloadModel = useCallback(async () => {
    try {
      downloadCancelledRef.current = false;
      await ensureModelDir();
      store.setStatus('downloading');

      // Initialize total bytes upfront — stable reference prevents flickering
      const stableTotalBytes = APP_CONFIG.modelExpectedSizeMb * 1024 * 1024;
      store.setProgress(0, stableTotalBytes, 0);

      let currentBytes = 0;
      let lastUpdateTime = 0;
      let lastBytesForSpeed = 0;
      const THROTTLE_MS = 300;

      const onProgress = (progress: FileSystem.DownloadProgressData) => {
        currentBytes = progress.totalBytesWritten;
        const now = Date.now();
        const elapsed = now - lastUpdateTime;
        if (elapsed < THROTTLE_MS) return;

        const bytesDelta = currentBytes - lastBytesForSpeed;
        const speed = elapsed > 0 ? Math.round((bytesDelta / elapsed) * 1000) : 0;

        lastUpdateTime = now;
        lastBytesForSpeed = currentBytes;

        const total = progress.totalBytesExpectedToWrite;
        store.setProgress(currentBytes, total > 0 ? total : stableTotalBytes, Math.max(0, speed));
      };

      const resumeUri = store.resumeUri;
      let downloadResumable: FileSystem.DownloadResumable;

      if (resumeUri) {
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

      const result = await downloadResumable.downloadAsync();

      // If download was paused/cancelled, don't proceed with validation
      if (downloadCancelledRef.current) return;

      if (!result || !result.uri) {
        throw new Error('Download returned no file URI');
      }

      // Final progress capture before validation
      store.setProgress(currentBytes > 0 ? currentBytes : stableTotalBytes, stableTotalBytes, 0);
      store.setStatus('validating');
      await validateModel();

      store.setInstalled(APP_CONFIG.modelVersion);
    } catch (err: any) {
      // If we intentionally paused/cancelled, ignore the error silently
      if (downloadCancelledRef.current) return;
      if (err?.message?.includes('cancelled')) {
        store.resetDownload();
      } else {
        store.setError(err?.message ?? 'Download failed');
      }
    }
  }, [store]);

  const pauseDownload = useCallback(async () => {
    if (!downloadResumableRef.current) return;
    downloadCancelledRef.current = true;
    try {
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
    downloadCancelledRef.current = true;
    if (downloadResumableRef.current) {
      try {
        await downloadResumableRef.current.cancelAsync();
      } catch {
        // ignore
      }
      downloadResumableRef.current = null;
    }
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
          n_ctx: 1024,         // Larger context for richer summaries
          n_threads: 4,         // Better utilization on modern devices
        });
      }

      const input = buildAIInput(results, filters);
      const prompt = buildAIPrompt(input);

      // Run with timeout
      const inferencePromise = inferenceContextRef.current.completion({
        prompt,
        n_predict: 300,        // More tokens for a thorough summary
        temperature: 0.2,      // Lower temperature for more factual output
        top_p: 0.85,
        stop: ['\n\n', 'Data:', 'Company:', 'Location:'],
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
