// src/constants/config.ts

export const APP_CONFIG = {
  appName: 'HireScope',
  packageName: 'com.rutambh.hirescope',
  supportEmail: 'rutambhtrivedi@gmail.com',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.rutambh.hirescope',

  // ─── Search Targets ───────────────────────────────────────────────────────
  maxUrlsTarget: 50,
  maxUrlsFallback: 25,
  maxUrlsMinimum: 5,

  // Search query templates — {company} and {role} are replaced at runtime
  searchQueryTemplates: [
    '{company} {role} salary',
    '{company} {role} reviews',
    '{company} {role} glassdoor',
    '{company} {role} ambitionbox',
    '{company} {role} compensation',
  ] as string[],

  // Search engine endpoints
  searchEngines: {
    duckduckgo: 'https://html.duckduckgo.com/html/?q=',
    brave: 'https://search.brave.com/search?q=',
    bing: 'https://www.bing.com/search?q=',
  },

  // ─── Timeouts ─────────────────────────────────────────────────────────────
  perDomainTimeoutMs: 25000,        // 25s per page (increased for dynamic content)
  urlDiscoveryTimeoutMs: 20000,     // 20s per search query (increased for SPA rendering)
  totalTimeoutMs: 8 * 60000,        // 8 minutes total
  aiInferenceTimeoutMs: 30000,      // 30s for on-device model

  // ─── AI Model (Optional On-Device Enhancement) ────────────────────────────
  // Update modelDownloadUrl after uploading to your host
  modelDownloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
  modelFileName: 'model.gguf',
  modelExpectedSizeMb: 350,
  modelDisplayName: 'HireScope AI Lite',
  modelVersion: '1.0',
  // SHA-256 of the GGUF file — set this after you download and verify the file
  modelExpectedChecksum: '',

  // ─── History ──────────────────────────────────────────────────────────────
  maxHistoryItems: 20,

  // ─── WebView ──────────────────────────────────────────────────────────────
  webViewUserAgent:
    'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.144 Mobile Safari/537.36',
};
