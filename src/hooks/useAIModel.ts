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

// ─── Data Chunking for Large Page Sets ──────────────────────────────────────────

const MAX_CHUNK_CHARS = 25000; // Safe limit per chunk for context window

function chunkTexts(texts: string[]): string[] {
  const chunks: string[] = [];
  let currentChunk = '';
  let currentSize = 0;

  for (const text of texts) {
    if (currentSize + text.length > MAX_CHUNK_CHARS && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = '';
      currentSize = 0;
    }
    currentChunk += (currentChunk ? '\n\n--- PAGE ---\n\n' : '') + text;
    currentSize += text.length;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
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
    if (fileSizeBytes < 50 * 1024 * 1024) {
      await FileSystem.deleteAsync(MODEL_PATH, { idempotent: true });
      throw new Error('Model file too small — possibly corrupted');
    }
    if (APP_CONFIG.modelExpectedChecksum) {
      const Crypto = await import('expo-crypto');
      // For large files, read in chunks to avoid memory issues
      const fileInfo = await FileSystem.getInfoAsync(MODEL_PATH);
      const fileSize = (fileInfo as any).size ?? 0;
      if (fileSize > 100 * 1024 * 1024) {
        // Skip checksum for very large files to avoid memory issues
        logger.warn('AI Model', 'Skipping checksum for large file (>100MB)');
        return;
      }
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
      const ctx = await ensureContext(12288);

      // Chunk texts if too large
      const chunks = chunkTexts(rawTexts);
      let allExtracted: {
        rating: number | null;
        salaryMin: number | null;
        salaryMax: number | null;
        pros: string[];
        cons: string[];
        snippets: string[];
        salarySources: number;
        ratingSources: number;
      } = {
        rating: null, salaryMin: null, salaryMax: null,
        pros: [], cons: [], snippets: [],
        salarySources: 0, ratingSources: 0,
      };

      let allPrompts: string[] = [];
      let allResponses: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const prompt = buildExtractionPrompt(chunk, filters, rawTexts.length);
        allPrompts.push(prompt);

        const result = await ctx.completion({
          prompt,
          n_predict: 3072,
          temperature: 0.1,
          top_p: 0.9,
          stop: ['\n\n\n'],
        });

        const text = (result as any)?.text?.trim() || '';
        allResponses.push(text);

        if (text.length < 10) continue;

        const extracted = parseExtractionJson(text);
        if (!extracted) continue;

        // Merge extracted data
        if (extracted.rating !== null) {
          if (allExtracted.rating === null) {
            allExtracted.rating = extracted.rating;
          } else {
            // Average ratings across chunks
            allExtracted.rating = Math.round(((allExtracted.rating + extracted.rating) / 2) * 10) / 10;
          }
          allExtracted.ratingSources = (allExtracted.ratingSources || 0) + (extracted.ratingSources || 1);
        }

        if (extracted.salaryMin !== null) {
          if (allExtracted.salaryMin === null || extracted.salaryMin < allExtracted.salaryMin) {
            allExtracted.salaryMin = extracted.salaryMin;
          }
        }
        if (extracted.salaryMax !== null) {
          if (allExtracted.salaryMax === null || extracted.salaryMax > allExtracted.salaryMax) {
            allExtracted.salaryMax = extracted.salaryMax;
          }
        }
        allExtracted.salarySources = (allExtracted.salarySources || 0) + (extracted.salarySources || 0);

        // Merge pros/cons (deduplicate)
        for (const pro of extracted.pros) {
          if (!allExtracted.pros.includes(pro)) {
            allExtracted.pros.push(pro);
          }
        }
        for (const con of extracted.cons) {
          if (!allExtracted.cons.includes(con)) {
            allExtracted.cons.push(con);
          }
        }
        for (const snippet of extracted.snippets) {
          if (!allExtracted.snippets.includes(snippet)) {
            allExtracted.snippets.push(snippet);
          }
        }
      }

      // Truncate to limits
      allExtracted.pros = allExtracted.pros.slice(0, 10);
      allExtracted.cons = allExtracted.cons.slice(0, 10);
      allExtracted.snippets = allExtracted.snippets.slice(0, 5);

      const rawPrompt = allPrompts.join('\n\n--- CHUNK SEPARATOR ---\n\n');
      const rawResponse = allResponses.join('\n\n--- CHUNK RESPONSE ---\n\n');

      if (!allExtracted.rating && !allExtracted.salaryMin && allExtracted.pros.length === 0) {
        logger.warn('AI Extraction', 'No useful data extracted from any chunk');
        return null;
      }

      logger.info('AI Extraction', `Extracted: rating=${allExtracted.rating}, salary=${allExtracted.salaryMin}-${allExtracted.salaryMax}, pros=${allExtracted.pros.length}, cons=${allExtracted.cons.length}`);

      // Compute hike percentages
      const current = filters.currentSalary;
      let hikeMin: number | null = null;
      let hikeMax: number | null = null;
      if (current > 0) {
        if (allExtracted.salaryMin !== null) hikeMin = Math.max(0, Math.round(((allExtracted.salaryMin - current) / current) * 100));
        if (allExtracted.salaryMax !== null) hikeMax = Math.max(0, Math.round(((allExtracted.salaryMax - current) / current) * 100));
      }

      const sourceCount = rawTexts.filter(t => t.length > 100).length;
      const confidence: FinalResults['confidence'] =
        sourceCount >= 15 ? 'high' : sourceCount >= 8 ? 'medium' : sourceCount >= 3 ? 'low' : 'minimal';

      return {
        results: {
          rating: allExtracted.rating,
          salaryMin: allExtracted.salaryMin,
          salaryMax: allExtracted.salaryMax,
          hikeMinPercent: hikeMin,
          hikeMaxPercent: hikeMax,
          positives: allExtracted.pros,
          negatives: allExtracted.cons,
          sourcesCount: sourceCount,
          domainsScraped: rawTexts.length,
          confidence,
          timeElapsedSeconds: 0,
          aiPrompt: rawPrompt,
          aiRawResponse: rawResponse,
        },
        rawPrompt,
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
      const ctx = await ensureContext(4096);
      const input = buildEnhancementInput(results, filters);
      const prompt = buildEnhancementPrompt(input);

      const inferenceResult = await ctx.completion({
        prompt,
        n_predict: 768,
        temperature: 0.2,
        top_p: 0.85,
        stop: ['\n\n', 'DATA:', 'Company:', 'Location:'],
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
      return info.exists && ((info as any).size ?? 0) > 50 * 1024 * 1024;
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
