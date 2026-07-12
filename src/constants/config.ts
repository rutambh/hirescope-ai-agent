// src/constants/config.ts

export const APP_CONFIG = {
  appName: 'HireScope',
  packageName: 'com.rutambh.hirescope',
  supportEmail: 'rutambhtrivedi@gmail.com',
  playStoreUrl: 'https://play.google.com/store/apps/details?id=com.rutambh.hirescope',

  // ─── Search Targets ───────────────────────────────────────────────────────
  maxUrlsTarget: 50,

  // File/resource extensions the scraper must NEVER load. Loading any of these
  // (PDFs, Office docs, archives, installers) triggers the OS download manager
  // instead of rendering HTML, which hangs the WebView and wastes the run.
  blockedFileExtensions: [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.odt', '.ods', '.odp', '.rtf', '.epub', '.csv', '.tsv',
    '.zip', '.rar', '.7z', '.tar', '.gz', '.tgz',
    '.apk', '.exe', '.dmg', '.iso', '.bin', '.img',
  ],
  maxUrlsFallback: 25,
  maxUrlsMinimum: 5,

  // Search query templates — {company}, {role}, {experience}, and {country} are replaced at runtime
  //
  // Five targeted categories for maximum coverage
  // Note: {company} may be auto-quoted for multi-word names (see buildSearchQuery)
  searchQueryTemplates: [
    // ── Category 1: Reviews → company-wide, no {role} ──
    '{company} reviews {country}',
    '{company} employee reviews pros cons {country}',
    '{company} working culture reviews {country}',
    // ── Category 2: Ratings → company-wide, no {role} ──
    '{company} ratings {country}',
    '{company} employee rating {country}',
    '{company} overall rating {country}',
    // ── Category 3: Salary → keep {role} + {experience}, salary is seniority-dependent ──
    '{company} {role} {experience} salary {country}',
    '{company} {role} {experience} compensation pay {country}',
    '{company} {role} {experience} salary range {country}',
    // ── Category 4: Site-specific ──
    'site:glassdoor.com {company} {role} {experience} salary {country}',
    'site:ambitionbox.com {company} reviews',
    // ── Category 5: General salary ──
    '{company} {role} {experience} hiring salary package {country}',
    '{company} {role} CTC {experience} experience {country}',
    '{company} {role} {experience} years experience salary {country}',
    '{company} {role} {experience} yrs salary {country}',
  ] as string[],

  // Minimum URL count from a quoted-company query before triggering an unquoted fallback
  fallbackUrlThreshold: 3,

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
  // Qwen2.5-0.5B-Instruct (q4_k_m) — actual file is ~491MB, fast on mobile, good for extraction
  modelDownloadUrl: 'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf',
  modelFileName: 'model.gguf',
  modelExpectedSizeMb: 491,
  modelDisplayName: 'HireScope AI',
  modelVersion: '3.0',
  // SHA-256 of the GGUF file (verified via HuggingFace tree API). validateModel()
  // re-computes this on-device with the chunked sha256File() verifier in
  // src/utils/sha256.ts; a mismatch deletes the downloaded file.
  modelExpectedChecksum: 'a0ee18ee2bcb22c2b6c95360b292c2c40a2d7a03',

  // ─── History ──────────────────────────────────────────────────────────────
  maxHistoryItems: 20,

  // ─── WebView ──────────────────────────────────────────────────────────────
  webViewUserAgent:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.165 Mobile Safari/537.36',
};
