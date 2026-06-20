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

  // Search query templates — {company}, {role}, and {country} are replaced at runtime
  // {country} expands to "Country State District" — drives location-aware results
  //
  // Three targeted categories: Reviews (pros/cons), Ratings, Salary
  // Each category has a primary and a variant query for broader coverage.
  searchQueryTemplates: [
    // ── Category 1: Reviews → extracts Pros & Cons ──
    '{company} {country} {role} Reviews',
    '{company} {country} {role} employee reviews pros cons',
    // ── Category 2: Ratings → extracts star ratings ──
    '{company} {country} {role} Ratings',
    '{company} {country} {role} employee rating',
    // ── Category 3: Salary → extracts salary range ──
    '{company} {country} {role} Salary',
    '{company} {country} {role} compensation pay',
  ] as string[],

  // Search engine endpoints
  searchEngines: {
    duckduckgo: 'https://www.duckduckgo.com/?q=',
    google: 'https://www.google.com/search?q=',
    brave: 'https://search.brave.com/search?q=',
    bing: 'https://www.bing.com/search?q=',
    yahoo: 'https://search.yahoo.com/search?p=',
  },

  // ─── Timeouts ─────────────────────────────────────────────────────────────
  perDomainTimeoutMs: 30000,        // 30s per page (generous for dynamic content)
  urlDiscoveryTimeoutMs: 30000,     // 30s per search query (lets engines fully render)
  totalTimeoutMs: 30 * 60000,       // 30 minutes total — thorough research
  aiInferenceTimeoutMs: 30 * 60000, // match total timeout; AI gets as long as it needs

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
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36',
};
