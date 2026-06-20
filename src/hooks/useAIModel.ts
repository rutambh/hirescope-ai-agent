import { useCallback, useRef } from 'react';
import * as FileSystem from 'expo-file-system';
import { useAIModelStore } from '../store/aiModelStore';
import { APP_CONFIG } from '../constants/config';
import {
  buildExtractionPrompt, buildEnhancementPrompt,
  buildEnhancementInput, parseExtractionJson,
} from '../utils/aiEnhancer';
import { FinalResults, SearchFilters } from '../types';
import { logger } from '../utils/logger';

const MODEL_DIR = `${FileSystem.documentDirectory}models/`;
const MODEL_PATH = `${MODEL_DIR}model.gguf`;

let llamaModule: any = null;
try {
  llamaModule = require('llama.rn');
} catch {
  // llama.rn not installed
}

export function useAIModel() {
  const store = useAIModelStore();
  const downloadResumableRef = useRef<FileSystem.DownloadResumable | null>(null);
  const inferenceContextRef = useRef<any>(null);
  const downloadCancelledRef = useRef<boolean>(false);

  const ensureModelDir = async () => {
    const info = await FileSystem.getInfoAsync(MODEL_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(MODEL_DIR, { intermediates: true });
    }
  };

  // ─── Download ─────────────────────────────────────────────────────────────

  const downloadModel = useCallback(async () => {
    try {
      downloadCancelledRef.current = false;
      await ensureModelDir();
      store.setStatus('downloading');

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
          APP_CONFIG.modelDownloadUrl, MODEL_PATH, {}, onProgress, resumeUri
        );
      } else {
        downloadResumable = FileSystem.createDownloadResumable(
          APP_CONFIG.modelDownloadUrl, MODEL_PATH, {}, onProgress
        );
      }

      downloadResumableRef.current = downloadResumable;
      const result = await downloadResumable.downloadAsync();
      if (downloadCancelledRef.current) return;
      if (!result || !result.uri) throw new Error('Download returned no file URI');

      store.setProgress(currentBytes > 0 ? currentBytes : stableTotalBytes, stableTotalBytes, 0);
      store.setStatus('validating');
      await validateModel();
      store.setInstalled(APP_CONFIG.modelVersion);
    } catch (err: any) {
      if (downloadCancelledRef.current) return;
      if (err?.message?.includes('cancelled')) store.resetDownload();
      else store.setError(err?.message ?? 'Download failed');
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

  const resumeDownload = useCallback(async () => { await downloadModel(); }, [downloadModel]);

  const cancelDownload = useCallback(async () => {
    downloadCancelledRef.current = true;
    if (downloadResumableRef.current) {
      try { await downloadResumableRef.current.cancelAsync(); } catch { }
      downloadResumableRef.current = null;
    }
    try { await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true }); } catch { }
    store.resetDownload();
  }, [store]);

  const validateModel = useCallback(async (): Promise<void> => {
    const info = await FileSystem.getInfoAsync(MODEL_PATH);
    if (!info.exists) throw new Error('Model file not found after download');
    const fileSizeBytes = (info as any).size ?? 0;
    if (fileSizeBytes < 100 * 1024 * 1024) {
      await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
      throw new Error('Model file too small — possibly corrupted');
    }
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

  const deleteModel = useCallback(async () => {
    try {
      if (inferenceContextRef.current) {
        try { await inferenceContextRef.current.release(); } catch { }
        inferenceContextRef.current = null;
      }
      await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
      store.resetAll();
    } catch (err: any) {
      store.setError(err?.message ?? 'Delete failed');
    }
  }, [store]);

  // ─── Init Context ─────────────────────────────────────────────────────────

  const ensureContext = useCallback(async (nCtx = 4096) => {
    if (!llamaModule) throw new Error('llama.rn not available');
    const info = await FileSystem.getInfoAsync(MODEL_PATH);
    if (!info.exists) throw new Error('Model file not found');
    if (!inferenceContextRef.current) {
      inferenceContextRef.current = await llamaModule.initLlama({
        model: MODEL_PATH,
        n_ctx: nCtx,
        n_threads: 4,
      });
    }
    return inferenceContextRef.current;
  }, []);

  // ─── SLM Extraction: Raw pages → Structured data ──────────────────────────

  const extractFromPages = useCallback(async (
    rawTexts: string[],
    filters: SearchFilters
  ): Promise<{ results: FinalResults; rawPrompt: string; rawResponse: string } | null> => {
    if (store.status !== 'installed') return null;
    if (!llamaModule) return null;
    if (rawTexts.length === 0) return null;

    try {
      const ctx = await ensureContext(8192);
      const allText = rawTexts.join('\n\n--- NEXT PAGE ---\n\n');
      const prompt = buildExtractionPrompt(allText, filters, rawTexts.length);

      const result = await ctx.completion({
        prompt,
        n_predict: 2048,
        temperature: 0.1,
        top_p: 0.9,
        stop: ['\n\n\n'],
      });

      const text = (result as any)?.text?.trim();
      const rawResponse = text || '';

      if (!text || text.length < 10) {
        logger.warn('AI Extraction', 'Model returned empty or too-short response');
        return null;
      }

      const extracted = parseExtractionJson(text);
      if (!extracted) {
        logger.warn('AI Extraction', 'Failed to parse JSON from model output — returning raw response for debugging');
        // Return partial data so the details view can show what the model actually said
        return {
          results: {
            rating: null, salaryMin: null, salaryMax: null,
            hikeMinPercent: null, hikeMaxPercent: null,
            positives: [], negatives: [],
            sourcesCount: 0, domainsScraped: rawTexts.length,
            confidence: 'minimal', timeElapsedSeconds: 0,
            aiPrompt: prompt, aiRawResponse: rawResponse,
          },
          rawPrompt: prompt,
          rawResponse,
        };
      }

      logger.info('AI Extraction', `Extracted: rating=${extracted.rating}, salary=${extracted.salaryMin}-${extracted.salaryMax}, pros=${extracted.pros.length}, cons=${extracted.cons.length}`);

      // Compute hike percentages
      const current = filters.currentSalary;
      let hikeMin: number | null = null;
      let hikeMax: number | null = null;
      if (current > 0) {
        if (extracted.salaryMin !== null) hikeMin = Math.max(0, Math.round(((extracted.salaryMin - current) / current) * 100));
        if (extracted.salaryMax !== null) hikeMax = Math.max(0, Math.round(((extracted.salaryMax - current) / current) * 100));
      }

      const sourceCount = rawTexts.filter(t => t.length > 100).length;
      const confidence: FinalResults['confidence'] =
        sourceCount >= 15 ? 'high' : sourceCount >= 8 ? 'medium' : sourceCount >= 3 ? 'low' : 'minimal';

      return {
        results: {
          rating: extracted.rating,
          salaryMin: extracted.salaryMin,
          salaryMax: extracted.salaryMax,
          hikeMinPercent: hikeMin,
          hikeMaxPercent: hikeMax,
          positives: extracted.pros.slice(0, 10),
          negatives: extracted.cons.slice(0, 10),
          sourcesCount: sourceCount,
          domainsScraped: rawTexts.length,
          confidence,
          timeElapsedSeconds: 0,
          aiPrompt: prompt,
          aiRawResponse: rawResponse,
        },
        rawPrompt: prompt,
        rawResponse,
      };
    } catch (err: any) {
      logger.warn('AI Extraction', `Failed: ${err?.message}`);
      if (inferenceContextRef.current) {
        try { await inferenceContextRef.current.release(); } catch { }
        inferenceContextRef.current = null;
      }
      return null;
    }
  }, [store, ensureContext]);

  // ─── Enhancement: Structured data → Natural language summary ──────────────

  const runEnhancement = useCallback(async (
    results: FinalResults,
    filters: SearchFilters
  ): Promise<{ text: string; rawPrompt: string; rawResponse: string } | null> => {
    if (store.status !== 'installed') return null;
    if (!llamaModule) return null;

    try {
      const ctx = await ensureContext(2048);
      const input = buildEnhancementInput(results, filters);
      const prompt = buildEnhancementPrompt(input);

      const inferenceResult = await ctx.completion({
        prompt,
        n_predict: 512,
        temperature: 0.2,
        top_p: 0.85,
        stop: ['\n\n', 'Data:', 'Company:', 'Location:'],
      });

      const text = (inferenceResult as any)?.text?.trim();
      if (!text || text.length <= 10) return null;

      return {
        text,
        rawPrompt: prompt,
        rawResponse: text,
      };
    } catch (err: any) {
      logger.warn('AI Enhancement', `Failed: ${err?.message}`);
      if (inferenceContextRef.current) {
        try { await inferenceContextRef.current.release(); } catch { }
        inferenceContextRef.current = null;
      }
      return null;
    }
  }, [store, ensureContext]);

  const checkModelFile = useCallback(async (): Promise<boolean> => {
    try {
      const info = await FileSystem.getInfoAsync(MODEL_PATH);
      return info.exists && ((info as any).size ?? 0) > 100 * 1024 * 1024;
    } catch { return false; }
  }, []);

  return {
    status: store.status,
    downloadedBytes: store.downloadedBytes,
    totalBytes: store.totalBytes,
    speedBytesPerSec: store.speedBytesPerSec,
    errorMessage: store.errorMessage,
    installedVersion: store.installedVersion,
    downloadModel,
    pauseDownload,
    resumeDownload,
    cancelDownload,
    deleteModel,
    extractFromPages,
    runEnhancement,
    checkModelFile,
  };
}
