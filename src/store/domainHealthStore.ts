// src/store/domainHealthStore.ts
//
// Persisted domain-health tracking for the scraping pipeline.
// Records scrape failures per bare domain (hostname only — no path, no query).
// Used to deprioritize (never hard-exclude) domains with poor recent history.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FailureReason = 'captcha' | 'http_error' | 'empty_content' | 'login_wall' | 'timeout' | 'blocked_download';

type DomainFailure = {
  timestamp: number;     // epoch ms
  reason: FailureReason;
};

type DomainHealthState = {
  // Map of bare domain → array of failures (pruned on read)
  failures: Record<string, DomainFailure[]>;

  // Monotonically increasing search counter — incremented each time a scrape run completes
  searchCounter: number;

  // The searchCounter at which each failure was logged (parallel to failures array)
  // Stored separately so the main failures map stays simple
  failureSearchIds: Record<string, number[]>;

  // Actions
  logFailure: (rawDomainOrUrl: string, reason: FailureReason) => void;
  incrementSearchCounter: () => void;
  getRecentFailureCount: (rawDomainOrUrl: string) => number;
  getDomainHealth: (rawDomainOrUrl: string) => number;
  _pruneOldFailures: () => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_SEARCH_WINDOW = 5;       // Only count failures from the last N searches
const MAX_TIME_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// ─── Domain Normalization ─────────────────────────────────────────────────────
// Always reduces to bare hostname (no protocol, no path, no query, no port).
// Invalid inputs are normalized to empty string and rejected.

export function normalizeDomain(input: string): string {
  if (!input || typeof input !== 'string') return '';

  let cleaned = input.trim();

  // If it looks like a URL (has protocol or path), parse it
  if (cleaned.includes('://') || cleaned.includes('/')) {
    try {
      // Prepend protocol if missing for URL constructor
      const urlStr = cleaned.includes('://') ? cleaned : `https://${cleaned}`;
      const parsed = new URL(urlStr);
      cleaned = parsed.hostname;
    } catch {
      // If URL parsing fails, try extracting hostname manually
      cleaned = cleaned
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .split('?')[0]
        .split('#')[0]
        .split(':')[0]; // strip port
    }
  }

  // Strip www. prefix
  cleaned = cleaned.replace(/^www\./i, '');

  // Validate: must have at least one dot and no slashes/queries
  if (!cleaned.includes('.') || cleaned.includes('/') || cleaned.includes('?') || cleaned.includes('#')) {
    return '';
  }

  return cleaned.toLowerCase();
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useDomainHealthStore = create<DomainHealthState>()(
  persist(
    (set, get) => ({
      failures: {},
      searchCounter: 0,
      failureSearchIds: {},

      logFailure: (rawDomainOrUrl: string, reason: FailureReason) => {
        const domain = normalizeDomain(rawDomainOrUrl);
        if (!domain) return; // Reject invalid/un-normalizable inputs

        const state = get();
        const existing = state.failures[domain] ?? [];
        const existingIds = state.failureSearchIds[domain] ?? [];

        set({
          failures: {
            ...state.failures,
            [domain]: [...existing, { timestamp: Date.now(), reason }],
          },
          failureSearchIds: {
            ...state.failureSearchIds,
            [domain]: [...existingIds, state.searchCounter],
          },
        });
      },

      incrementSearchCounter: () => {
        const state = get();
        set({ searchCounter: state.searchCounter + 1 });

        // Prune old failures on each search completion
        get()._pruneOldFailures();
      },

      getRecentFailureCount: (rawDomainOrUrl: string): number => {
        const domain = normalizeDomain(rawDomainOrUrl);
        if (!domain) return 0;

        const state = get();
        const failures = state.failures[domain];
        const searchIds = state.failureSearchIds[domain];
        if (!failures || failures.length === 0) return 0;

        const now = Date.now();
        const minSearchId = state.searchCounter - MAX_SEARCH_WINDOW;

        let count = 0;
        for (let i = 0; i < failures.length; i++) {
          const failure = failures[i];
          const searchId = searchIds?.[i] ?? 0;

          // Within recency window: last N searches AND last 7 days
          const withinSearchWindow = searchId >= minSearchId;
          const withinTimeWindow = (now - failure.timestamp) <= MAX_TIME_WINDOW_MS;

          if (withinSearchWindow && withinTimeWindow) {
            count++;
          }
        }

        return count;
      },

      getDomainHealth: (rawDomainOrUrl: string): number => {
        const recentFailures = get().getRecentFailureCount(rawDomainOrUrl);
        if (recentFailures === 0) return 1;

        // Smooth deprioritization: 1 failure → 0.75, 2 → 0.6, 3 → 0.5, 6 → 0.33
        // A domain never reaches 0 — it's always given another chance
        return 1 - (recentFailures / (recentFailures + 3));
      },

      _pruneOldFailures: () => {
        const state = get();
        const now = Date.now();
        const minSearchId = state.searchCounter - MAX_SEARCH_WINDOW;
        const newFailures: Record<string, DomainFailure[]> = {};
        const newSearchIds: Record<string, number[]> = {};

        for (const [domain, domainFailures] of Object.entries(state.failures)) {
          const searchIds = state.failureSearchIds[domain] ?? [];
          const kept: DomainFailure[] = [];
          const keptIds: number[] = [];

          for (let i = 0; i < domainFailures.length; i++) {
            const failure = domainFailures[i];
            const searchId = searchIds[i] ?? 0;

            const withinSearchWindow = searchId >= minSearchId;
            const withinTimeWindow = (now - failure.timestamp) <= MAX_TIME_WINDOW_MS;

            if (withinSearchWindow && withinTimeWindow) {
              kept.push(failure);
              keptIds.push(searchId);
            }
          }

          if (kept.length > 0) {
            newFailures[domain] = kept;
            newSearchIds[domain] = keptIds;
          }
          // If no recent failures remain, drop the domain entirely from storage
        }

        set({ failures: newFailures, failureSearchIds: newSearchIds });
      },
    }),
    {
      name: 'hirescope-domain-health',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
