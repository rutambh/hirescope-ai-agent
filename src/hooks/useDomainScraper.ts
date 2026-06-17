import { useRef, useCallback } from 'react';
import { APP_CONFIG } from '../constants/config';
import { useAppStore } from '../store/appStore';
import { logger } from '../utils/logger';

// Module-level abort controller — shared across all instances
let globalAbortController: AbortController | null = null;

function getSignal(): AbortSignal | undefined {
  return globalAbortController?.signal;
}

export function cancelAllFetches() {
  if (globalAbortController) {
    globalAbortController.abort();
    globalAbortController = null;
  }
}

// ─── HTML → Plain Text ─────────────────────────────────────────────────────────

function htmlToText(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c))
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── URL Extraction from Search HTML ───────────────────────────────────────────

function extractUrlsFromHtml(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const hrefRegex = /<a[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(html)) !== null) {
    let url = match[1].replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, c) => String.fromCharCode(c));
    if (!seen.has(url)) { seen.add(url); urls.push(url); }
  }
  const excluded = [
    'duckduckgo.com', 'bing.com', 'brave.com', 'search.brave.com',
    'yahoo.com', 'search.yahoo.com', 'google.com', 'youtube.com',
    'facebook.com', 'twitter.com', 'x.com', 'instagram.com',
    'pinterest.com', 'linkedin.com/share', 'reddit.com',
    'microsoft.com', 'ad.doubleclick.net', 'wikipedia.org',
  ];
  return urls.filter(url => !excluded.some(d => url.toLowerCase().includes(d)));
}

// ─── Search Query Builder ──────────────────────────────────────────────────────

function buildSearchQuery(
  company: string, role: string, country: string,
  state?: string, district?: string, template?: string
): string {
  const location = [country, state, district].filter(Boolean).join(' ');
  const tpl = template ?? '{company} {role} {country} salary reviews';
  return tpl.replace('{company}', company).replace('{role}', role).replace('{country}', location);
}

function searchUrl(engine: string, query: string): string {
  const q = encodeURIComponent(query);
  const engines: Record<string, string> = {
    duckduckgo: `https://html.duckduckgo.com/html/?q=${q}`,
    brave: `https://search.brave.com/search?q=${q}`,
    bing: `https://www.bing.com/search?q=${q}`,
    yahoo: `https://search.yahoo.com/search?p=${q}`,
  };
  return engines[engine] || engines.duckduckgo;
}

// ─── Domain Filtering ──────────────────────────────────────────────────────────

const EXCLUDED_DOMAINS = [
  'duckduckgo.com', 'bing.com', 'google.com', 'yahoo.com',
  'microsoft.com', 'youtube.com', 'twitter.com', 'x.com',
  'facebook.com', 'instagram.com', 'pinterest.com',
  'linkedin.com/share', 'ad.doubleclick.net', 'wikipedia.org',
  'brave.com', 'search.brave.com',
];

const HIGH_VALUE_DOMAINS = [
  'glassdoor', 'ambitionbox', 'levels.fyi', 'payscale', 'indeed',
  'naukri', 'monster', 'comparably', 'teamblind', 'blind',
  'salary.com', 'jobstreet', 'kununu', 'fairygodboss',
  'groww', 'foundit', 'shine', 'upstox',
  'salaryexplorer', 'talent.com', 'erieri',
  '6figr', 'interviewbit', 'geekster', 'cutshort',
];

function cleanAndFilterUrls(rawUrls: string[], company: string, country: string): string[] {
  const lc = company.toLowerCase();
  const lcc = country.toLowerCase();
  const unique = new Set<string>();
  for (const raw of rawUrls) {
    let url = raw.trim();
    if (!url.startsWith('http')) continue;
    const lower = url.toLowerCase();
    if (EXCLUDED_DOMAINS.some(d => lower.includes(d))) continue;
    if (lcc === 'india' && ['/us/', '/uk/', '/ca/', '/au/', '.co.uk', '.com.au', '.ca'].some(s => lower.includes(s))) continue;
    if (lcc === 'united states' && ['/in/', '/uk/', '/ca/', '/au/', '.co.in', '.co.uk', '.com.au'].some(s => lower.includes(s))) continue;
    unique.add(url);
  }
  return Array.from(unique).sort((a, b) => {
    const aLow = a.toLowerCase(), bLow = b.toLowerCase();
    return ((bLow.includes(lc) ? 1 : 0) + (HIGH_VALUE_DOMAINS.some(d => bLow.includes(d)) ? 2 : 0)) -
           ((aLow.includes(lc) ? 1 : 0) + (HIGH_VALUE_DOMAINS.some(d => aLow.includes(d)) ? 2 : 0));
  });
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useDomainScraper() {
  const fetchWithTimeout = useCallback(async (url: string, timeoutMs: number): Promise<string> => {
    if (!globalAbortController) {
      globalAbortController = new AbortController();
    }
    const signal = globalAbortController.signal;

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    );

    const fetchPromise = fetch(url, {
      signal,
      headers: {
        'User-Agent': APP_CONFIG.webViewUserAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    }).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    });

    return Promise.race([fetchPromise, timeoutPromise]);
  }, []);

  const discoverUrls = useCallback(async (
    company: string, role: string, country: string,
    state?: string, district?: string
  ): Promise<string[]> => {
    const maxDomains = useAppStore.getState().maxDomainsToScrape;
    const allRawUrls: string[] = [];
    // Try DuckDuckGo first (best HTML output), then Brave, Bing, Yahoo
    const engines = ['duckduckgo', 'brave', 'bing', 'yahoo'];
    const templates = APP_CONFIG.searchQueryTemplates;

    for (const template of templates) {
      if (allRawUrls.length >= maxDomains * 2) break;
      const query = buildSearchQuery(company, role, country, state, district, template);

      for (const engine of engines) {
        if (allRawUrls.length >= maxDomains * 2) break;
        if (globalAbortController?.signal.aborted) return [];

        const url = searchUrl(engine, query);
        try {
          logger.info('Discovery', `${engine} → "${query}"`);
          const html = await fetchWithTimeout(url, APP_CONFIG.urlDiscoveryTimeoutMs);
          const urls = extractUrlsFromHtml(html);
          logger.urlsDiscovered(engine, urls.length, query);
          allRawUrls.push(...urls);

          // Page 2
          if (allRawUrls.length < maxDomains) {
            try {
              let page2 = '';
              if (engine === 'bing') page2 = `${url}&first=11`;
              else if (engine === 'brave') page2 = `${url}&page=2`;
              else if (engine === 'yahoo') page2 = `${url}&b=11`;
              if (page2) {
                const html2 = await fetchWithTimeout(page2, APP_CONFIG.urlDiscoveryTimeoutMs);
                allRawUrls.push(...extractUrlsFromHtml(html2));
              }
            } catch { /* pagination best-effort */ }
          }
        } catch (err) {
          logger.warn('Discovery', `${engine} failed:`, err);
        }

        // Delay between engines
        if (engine !== engines[engines.length - 1]) {
          await new Promise(r => setTimeout(r, 400 + Math.random() * 400));
        }
      }
    }

    return cleanAndFilterUrls(allRawUrls, company, country).slice(0, maxDomains);
  }, [fetchWithTimeout]);

  const scrapeUrl = useCallback(async (url: string): Promise<string> => {
    if (globalAbortController?.signal.aborted) return '';
    try {
      const html = await fetchWithTimeout(url, APP_CONFIG.perDomainTimeoutMs);
      const text = htmlToText(html);
      if (text.length >= 100) {
        logger.scrapeSuccess(url, text.length);
        return text.substring(0, 100000);
      }
      logger.scrapeFail(url, `too short (${text.length}c)`);
      return '';
    } catch (err: any) {
      logger.scrapeFail(url, err?.message || 'failed');
      return '';
    }
  }, [fetchWithTimeout]);

  // Reserved for future WebView fallback
  const setWebViewRef = useCallback((_ref: any) => {}, []);
  const handleMessage = useCallback((_event: any) => {}, []);
  const onLoadEnd = useCallback(() => {}, []);

  return { discoverUrls, scrapeUrl, setWebViewRef, handleMessage, onLoadEnd };
}
