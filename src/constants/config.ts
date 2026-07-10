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
  //
  // Five targeted categories for maximum coverage
  searchQueryTemplates: [
    // ── Category 1: Reviews → extracts Pros & Cons ──
    '{company} {role} reviews {country}',
    '{company} {role} employee reviews pros cons {country}',
    '{company} {role} working culture reviews {country}',
    // ── Category 2: Ratings → extracts star ratings ──
    '{company} {role} ratings {country}',
    '{company} {role} employee rating {country}',
    '{company} {role} overall rating {country}',
    // ── Category 3: Salary → extracts salary range ──
    '{company} {role} {experience} salary {country}',
    '{company} {role} {experience} compensation pay {country}',
    '{company} {role} {experience} salary range {country}',
    // ── Category 4: Glassdoor/AmbitionBox specific ──
    'site:glassdoor.com {company} {role} {experience} salary {country}',
    'site:ambitionbox.com {company} {role} {experience} reviews',
    // ── Category 5: General employment data ──
    '{company} {role} {experience} hiring salary package {country}',
    '{company} {role} CTC {experience} experience {country}',
    '{company} {role} {experience} years experience salary {country}',
    '{company} {role} {experience} yrs salary {country}',
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
  totalTimeoutMs: 10 * 60000,       // 10 minutes total — thorough research
  aiInferenceTimeoutMs: 10 * 60000, // 10 minutes total for AI inference

  // ─── AI Model (Optional On-Device Enhancement) ────────────────────────────
  // Qwen2.5-0.5B-Instruct (q4_k_m) — ~300MB, fast on mobile, good for extraction
  modelDownloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
  modelFileName: 'model.gguf',
  modelExpectedSizeMb: 300,
  modelDisplayName: 'HireScope AI',
  modelVersion: '3.0',
  // SHA-256 of the GGUF file — set this after you download and verify the file
  modelExpectedChecksum: '',

  // ─── History ──────────────────────────────────────────────────────────────
  maxHistoryItems: 20,

  // ─── WebView ──────────────────────────────────────────────────────────────
  webViewUserAgent:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36',
};
