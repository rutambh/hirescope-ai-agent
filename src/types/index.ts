// src/types/index.ts

// ─── Search ──────────────────────────────────────────────────────────────────

export type SearchFilters = {
  country: string;
  countryCode: string;
  company: string;
  role: string;
  experience: number;
  currentSalary: number;
  currency: string;
  currencyCode: string;
  salaryFormat: string;
  state?: string;
  district?: string;
};

// Raw scraped page data point
export type RawDataPoint = {
  source: string;       // URL of the scraped page
  rawText: string;
  timestamp: string;
  success: boolean;
};

// Structured record extracted deterministically from one page
export type StructuredRecord = {
  source: string;
  rating: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  pros: string[];       // raw extracted pro strings
  cons: string[];       // raw extracted con strings
  snippets: string[];   // useful employee comment fragments
};

// Theme with frequency count (output of themeEngine)
export type ThemeFrequency = {
  theme: string;
  count: number;
};

// Final aggregated results — Summary Engine output
export type FinalResults = {
  rating: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  hikeMinPercent: number | null;
  hikeMaxPercent: number | null;
  positives: string[];      // top 5 canonical theme strings
  negatives: string[];      // top 5 canonical theme strings
  sourcesCount: number;
  domainsScraped: number;
  confidence: 'high' | 'medium' | 'low' | 'minimal';
  timeElapsedSeconds: number;
  aiEnhancedSummary?: string;  // optional — set if on-device model ran
  // Research detail logging (for the View Details screen)
  rawUrls?: string[];          // URLs that were scraped
  aiPrompt?: string;           // full prompt sent to the AI model
  aiRawResponse?: string;      // raw text returned by the AI model
};

export type SearchRecord = {
  id: string;
  timestamp: string;
  filters: SearchFilters;
  results: FinalResults;
};

// ─── AI Model ─────────────────────────────────────────────────────────────────

export type AIModelStatus =
  | 'not_installed'
  | 'downloading'
  | 'paused'
  | 'validating'
  | 'installed'
  | 'error';

export type AIModelInfo = {
  status: AIModelStatus;
  downloadedBytes: number;
  totalBytes: number;
  speedBytesPerSec: number;
  errorMessage: string | null;
  installedVersion: string | null;
};
