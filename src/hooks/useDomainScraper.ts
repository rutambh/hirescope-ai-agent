import { useRef, useCallback, useState, useEffect } from 'react';
import { APP_CONFIG } from '../constants/config';
import { useAppStore } from '../store/appStore';
import { logger } from '../utils/logger';

export interface WebViewRequest {
  url: string;
  action: 'discover' | 'scrape';
  resolve: (result: any) => void;
  reject: (err: any) => void;
}

// Module-level abort controller — shared across all instances
let globalAbortController: AbortController | null = null;

let activeWebViewRequest: WebViewRequest | null = null;
const listeners = new Set<() => void>();

export function registerWebViewListener(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach(l => l());
}

export function useActiveWebViewRequest() {
  const [request, setRequest] = useState<WebViewRequest | null>(activeWebViewRequest);

  useEffect(() => {
    return registerWebViewListener(() => {
      setRequest(activeWebViewRequest);
    });
  }, []);

  return request;
}

export function resolveActiveWebViewRequest(result: any) {
  if (activeWebViewRequest) {
    activeWebViewRequest.resolve(result);
    activeWebViewRequest = null;
    notifyListeners();
  }
}

export function rejectActiveWebViewRequest(err: any) {
  if (activeWebViewRequest) {
    activeWebViewRequest.reject(err);
    activeWebViewRequest = null;
    notifyListeners();
  }
}

async function requestViaWebView(
  url: string,
  action: 'discover' | 'scrape',
  timeoutMs: number
): Promise<any> {
  if (globalAbortController?.signal.aborted) {
    throw new Error('Cancelled');
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('WebView timeout'));
    }, timeoutMs);

    // Cancel any previous pending request
    if (activeWebViewRequest) {
      activeWebViewRequest.reject(new Error('Cancelled by new request'));
    }

    activeWebViewRequest = {
      url,
      action,
      resolve: (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      reject: (err) => {
        clearTimeout(timer);
        reject(err);
      },
    };
    notifyListeners();
  });
}

export function cancelAllFetches() {
  if (globalAbortController) {
    globalAbortController.abort();
    globalAbortController = null;
  }
  rejectActiveWebViewRequest(new Error('Cancelled'));
}

// ─── HTML → Plain Text ─────────────────────────────────────────────────────────

function htmlToText(html: string): string {
  // Extract JSON-LD script blocks first
  const jsonLdBlocks: string[] = [];
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonMatch: RegExpExecArray | null;
  while ((jsonMatch = jsonLdRegex.exec(html)) !== null) {
    const blockText = jsonMatch[1].trim();
    if (blockText && (
      blockText.includes('salary') || blockText.includes('Salary') ||
      blockText.includes('compensation') || blockText.includes('Compensation') ||
      blockText.includes('baseSalary') || blockText.includes('BaseSalary')
    )) {
      jsonLdBlocks.push(blockText);
    }
  }

  const plainText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<button[^>]*>[\s\S]*?<\/button>/gi, ' ')
    .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, ' ')
    .replace(/<input[^>]*>/gi, ' ')
    .replace(/<select[^>]*>[\s\S]*?<\/select>/gi, ' ')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c)))
    .replace(/&[a-zA-Z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (jsonLdBlocks.length > 0) {
    return `${plainText}\n\n=== JSON-LD START ===\n${jsonLdBlocks.join('\n')}\n=== JSON-LD END ===`;
  }
  return plainText;
}

// ─── Login-Wall & CAPTCHA Detection ─────────────────────────────────────────────

const LOGIN_WALL_INDICATORS = [
  'sign in to continue', 'log in to continue', 'please sign in',
  'please log in', 'create an account', 'create your account',
  'register to view', 'subscribe to view', 'premium content',
  'members only', 'login required', 'authentication required',
  'access denied', 'sign in with', 'continue with google',
  'continue with facebook', 'continue with linkedin',
  'enter your email to', 'unlock full report', 'get full access',
  'start your free trial', 'upgrade to premium', 'become a member',
  'subscribe now', 'paywall', 'metered wall',
];

const CAPTCHA_INDICATORS = [
  'captcha', 'recaptcha', 'are you a robot', 'verify you are human',
  'security check', 'unusual traffic', 'automated queries',
  'please verify', 'human verification', 'bot check',
];

const JUNK_CONTENT_INDICATORS = [
  'access to this page has been denied',
  'please enable cookies',
  'enable javascript',
  'this page requires javascript',
  'please wait while we verify',
  'checking your browser',
  'just a moment',
  'ray id:',
  'cloudflare',
];

function detectLoginWall(html: string): { isBlocked: boolean; reason: string } {
  const lower = html.toLowerCase();

  for (const indicator of CAPTCHA_INDICATORS) {
    if (lower.includes(indicator)) {
      return { isBlocked: true, reason: 'captcha' };
    }
  }

  for (const indicator of LOGIN_WALL_INDICATORS) {
    if (lower.includes(indicator)) {
      return { isBlocked: true, reason: 'login_wall' };
    }
  }

  for (const indicator of JUNK_CONTENT_INDICATORS) {
    if (lower.includes(indicator)) {
      return { isBlocked: true, reason: 'junk_content' };
    }
  }

  return { isBlocked: false, reason: '' };
}

// ─── Content Quality Scoring ────────────────────────────────────────────────────

const QUALITY_KEYWORDS = [
  'salary', 'compensation', 'pay', 'hike', 'raise', 'bonus',
  'rating', 'review', 'pros', 'cons', 'employee', 'work culture',
  'management', 'work life balance', 'benefits', 'perks',
  'experience', 'growth', 'learning', 'promotion', 'appraisal',
  'interview', 'hiring', 'offer', 'ctc', 'lpa', 'package',
];

function scoreContentQuality(text: string): number {
  if (text.length < 100) return 0;
  const lower = text.toLowerCase();
  let score = 0;

  // Base score from length
  if (text.length > 500) score += 1;
  if (text.length > 2000) score += 1;
  if (text.length > 5000) score += 1;

  // Score from relevant keywords
  for (const kw of QUALITY_KEYWORDS) {
    const regex = new RegExp(`\\b${kw}`, 'gi');
    const matches = lower.match(regex);
    if (matches) {
      score += Math.min(matches.length, 3);
    }
  }

  // Bonus for structured data (numbers with currency patterns)
  if (/\d+\s*(?:lpa|lakh|lakhs|k|K|\$|₹|€|£)/.test(text)) score += 2;
  if (/\b\d+(?:\.\d+)?\s*(?:\/\s*5|out\s+of\s+5)\b/i.test(text)) score += 2;

  // Boost for JSON-LD structured blocks
  if (text.includes('=== JSON-LD START ===')) score += 4;

  // Penalty for very short text
  if (text.length < 200) score -= 2;

  return Math.max(0, score);
}

// ─── URL Extraction from Search HTML ───────────────────────────────────────────

function extractUrlsFromHtml(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  // Extract from href attributes
  const hrefRegex = /<a[^>]*href=["'](https?:\/\/[^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = hrefRegex.exec(html)) !== null) {
    let url = match[1]
      .replace(/&amp;/g, '&')
      .replace(/&#(\d+);/g, (_, c) => String.fromCharCode(parseInt(c)))
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'");
    // Remove tracking params
    url = url.replace(/[?&](utm_\w+|ref|source|fbclid|gclid|mc_cid|mc_eid)=[^&]*/gi, '');
    if (!seen.has(url)) { seen.add(url); urls.push(url); }
  }

  // Also extract from data-href and data-url attributes
  const dataUrlRegex = /data-(?:href|url)=["'](https?:\/\/[^"']+)["']/gi;
  while ((match = dataUrlRegex.exec(html)) !== null) {
    const url = match[1].replace(/&amp;/g, '&');
    if (!seen.has(url)) { seen.add(url); urls.push(url); }
  }

  return urls;
}

// ─── Search Query Builder ──────────────────────────────────────────────────────

function buildSearchQuery(
  company: string, role: string, country: string, experience: number,
  template?: string
): string {
  const location = country;
  const tpl = template ?? '{company} {role} {country} salary reviews';
  let query = tpl
    .replace('{company}', company)
    .replace('{role}', role)
    .replace('{country}', location);

  if (experience > 0) {
    query = query.replace('{experience}', `${experience} years`);
  } else {
    query = query.replace('{experience}', '');
  }
  return query.replace(/\s+/g, ' ').trim();
}

function searchUrl(engine: string, query: string): string {
  const q = encodeURIComponent(query);
  const engines: Record<string, string> = {
    duckduckgo: `https://html.duckduckgo.com/html/?q=${q}`,
    bing: `https://www.bing.com/search?q=${q}`,
    yahoo: `https://search.yahoo.com/search?p=${q}`,
    startpage: `https://www.startpage.com/sp/search?query=${q}`,
  };
  return engines[engine] || engines.duckduckgo;
}

// ─── Cache Fallback URLs ───────────────────────────────────────────────────────

function getCacheUrl(originalUrl: string): string[] {
  const caches: string[] = [];
  // Google Web Cache
  caches.push(`https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(originalUrl)}`);
  // Wayback Machine (latest snapshot)
  caches.push(`https://web.archive.org/web/2/${originalUrl}`);
  return caches;
}

// ─── Domain Filtering & Scoring ─────────────────────────────────────────────────

const EXCLUDED_DOMAINS = [
  'duckduckgo.com', 'bing.com', 'google.com', 'yahoo.com',
  'microsoft.com', 'youtube.com', 'twitter.com', 'x.com',
  'facebook.com', 'instagram.com', 'pinterest.com',
  'linkedin.com/share', 'ad.doubleclick.net', 'wikipedia.org',
  'brave.com', 'search.brave.com', 'reddit.com',
  'quora.com', 'medium.com', 'substack.com',
  'apple.com', 'amazon.com', 'ebay.com',
  'tiktok.com', 'tumblr.com',
];

// Tier 1: Best salary/review data (score 3)
const TIER1_DOMAINS = [
  'glassdoor', 'ambitionbox', 'levels.fyi', 'payscale', 'indeed',
  'naukri', 'comparably', 'teamblind', 'blind',
  'salary.com', 'kununu', 'fairygodboss',
  '6figr', 'cutshort', 'interviewbit',
];

// Tier 2: Good salary/review data (score 2)
const TIER2_DOMAINS = [
  'monster', 'jobstreet', 'groww', 'foundit', 'shine',
  'upstox', 'salaryexplorer', 'talent.com', 'erieri',
  'geekster', 'vault.com', 'careerbliss', 'jobily',
  'ambitionbox', 'glassdoor', 'linkedin.com/jobs',
  'justdial', 'sulekha', 'mouthshut',
];

// Tier 3: May have relevant data (score 1)
const TIER3_DOMAINS = [
  'glassdoor', 'indeed', 'naukri', 'timesjobs',
  'freshersworld', 'iimjobs', 'hirist', 'daypo',
  'toppr', 'sanfoundry', 'geeksforgeeks',
];

function getDomainScore(url: string): number {
  const lower = url.toLowerCase();
  if (TIER1_DOMAINS.some(d => lower.includes(d))) return 3;
  if (TIER2_DOMAINS.some(d => lower.includes(d))) return 2;
  if (TIER3_DOMAINS.some(d => lower.includes(d))) return 1;
  return 0;
}

function getDomainName(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function cleanAndFilterUrls(
  rawUrls: string[], company: string, country: string
): { url: string; score: number }[] {
  const lc = company.toLowerCase();
  const lcc = country.toLowerCase();
  const seenDomains = new Set<string>();
  const results: { url: string; score: number }[] = [];

  for (const raw of rawUrls) {
    let url = raw.trim();
    if (!url.startsWith('http')) continue;
    const lower = url.toLowerCase();

    // Exclude known junk domains
    if (EXCLUDED_DOMAINS.some(d => lower.includes(d))) continue;

    // Country-specific filtering
    if (lcc === 'india' && ['/us/', '/uk/', '/ca/', '/au/', '.co.uk', '.com.au', '.ca'].some(s => lower.includes(s))) continue;
    if (lcc === 'united states' && ['/in/', '/uk/', '/ca/', '/au/', '.co.in', '.co.uk', '.com.au'].some(s => lower.includes(s))) continue;

    // Deduplicate by domain (keep highest scoring URL per domain)
    const domain = getDomainName(url);
    if (!domain) continue;

    let domainScore = getDomainScore(url);

    // Boost score if URL contains company name
    if (lower.includes(lc)) domainScore += 2;

    // Boost score for salary/review-specific URL paths
    if (lower.includes('/salary') || lower.includes('/review') || lower.includes('/rating')) domainScore += 1;
    if (lower.includes('/company/') || lower.includes('/employer/')) domainScore += 1;

    // Keep best URL per domain
    const existing = results.find(r => getDomainName(r.url) === domain);
    if (existing) {
      if (domainScore > existing.score) {
        existing.url = url;
        existing.score = domainScore;
      }
    } else {
      results.push({ url, score: domainScore });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  return results;
}

// ─── WebView-based Scraping ───────────────────────────────────────────────────

export function useDomainScraper() {
  const discoverUrls = useCallback(async (
    company: string, role: string, country: string, experience: number,
    deadlineTimestamp?: number
  ): Promise<string[]> => {
    const maxDomains = useAppStore.getState().maxDomainsToScrape;
    const allRawUrls: string[] = [];
    const engines = ['duckduckgo', 'bing', 'yahoo', 'startpage'];
    const templates = APP_CONFIG.searchQueryTemplates;

    for (const template of templates) {
      if (allRawUrls.length >= maxDomains * 3) break;
      if (deadlineTimestamp && Date.now() >= deadlineTimestamp) {
        logger.warn('Discovery', 'Deadline reached during URL discovery');
        break;
      }
      const query = buildSearchQuery(company, role, country, experience, template);

      for (const engine of engines) {
        if (allRawUrls.length >= maxDomains * 3) break;
        if (globalAbortController?.signal.aborted) return [];
        if (deadlineTimestamp && Date.now() >= deadlineTimestamp) {
          logger.warn('Discovery', 'Deadline reached during URL discovery');
          break;
        }

        const url = searchUrl(engine, query);
        try {
          logger.info('Discovery', `WebView discovery ${engine} → "${query}"`);
          const urls = await requestViaWebView(url, 'discover', APP_CONFIG.urlDiscoveryTimeoutMs);
          if (globalAbortController?.signal.aborted) return [];
          
          if (urls && urls.length > 0) {
            allRawUrls.push(...urls);
          }

          // Page 2 for more results
          if (allRawUrls.length < maxDomains * 2) {
            try {
              let page2 = '';
              if (engine === 'bing') page2 = `${url}&first=11`;
              else if (engine === 'yahoo') page2 = `${url}&b=11`;
              else if (engine === 'startpage') page2 = `${url}&start=10`;
              if (page2) {
                const urls2 = await requestViaWebView(page2, 'discover', APP_CONFIG.urlDiscoveryTimeoutMs);
                if (globalAbortController?.signal.aborted) return [];
                if (urls2 && urls2.length > 0) {
                  allRawUrls.push(...urls2);
                }
              }
            } catch { /* pagination best-effort */ }
          }
        } catch (err: any) {
          if (globalAbortController?.signal.aborted) return [];
          logger.warn('Discovery', `${engine} failed:`, err?.message || err);
        }

        // Delay between engines to avoid rate limiting
        if (engine !== engines[engines.length - 1]) {
          await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
        }
      }
    }

    const scored = cleanAndFilterUrls(allRawUrls, company, country);
    return scored.map(s => s.url).slice(0, maxDomains);
  }, []);

  const scrapeUrl = useCallback(async (url: string): Promise<{ text: string; quality: number }> => {
    if (globalAbortController?.signal.aborted) return { text: '', quality: 0 };

    try {
      logger.info('Scraper', `WebView scrape → ${url}`);
      const result = await requestViaWebView(url, 'scrape', APP_CONFIG.perDomainTimeoutMs);
      if (globalAbortController?.signal.aborted) return { text: '', quality: 0 };

      const text = result.text || '';
      const { isBlocked, reason } = detectLoginWall(text);
      if (isBlocked) {
        logger.scrapeFail(url, `blocked: ${reason}`);
        return { text: '', quality: 0 };
      }

      const quality = scoreContentQuality(text);
      if (text.length >= 100) {
        logger.scrapeSuccess(url, text.length);
        return { text: text.substring(0, 100000), quality: Math.max(quality, 1) };
      }
      logger.scrapeFail(url, `too short (${text.length}c)`);
    } catch (err: any) {
      if (globalAbortController?.signal.aborted) return { text: '', quality: 0 };
      logger.scrapeFail(url, err?.message || 'failed');

      // Fallback to Google Cache
      const cacheUrls = getCacheUrl(url);
      for (const cacheUrl of cacheUrls) {
        if (globalAbortController?.signal.aborted) return { text: '', quality: 0 };
        try {
          logger.info('Scraper', `WebView fallback scrape → ${cacheUrl}`);
          const cacheResult = await requestViaWebView(cacheUrl, 'scrape', APP_CONFIG.perDomainTimeoutMs / 2);
          if (globalAbortController?.signal.aborted) return { text: '', quality: 0 };

          const cacheText = cacheResult.text || '';
          const { isBlocked: cacheBlocked } = detectLoginWall(cacheText);
          if (!cacheBlocked) {
            const quality = scoreContentQuality(cacheText);
            if (cacheText.length >= 100) {
              logger.scrapeSuccess(`${cacheUrl} (cache of ${url})`, cacheText.length);
              return { text: cacheText.substring(0, 100000), quality: Math.max(quality, 1) };
            }
          }
        } catch {
          if (globalAbortController?.signal.aborted) return { text: '', quality: 0 };
        }
      }
    }

    return { text: '', quality: 0 };
  }, []);

  const setWebViewRef = useCallback((_ref: any) => {}, []);
  const handleMessage = useCallback((_event: any) => {}, []);
  const onLoadEnd = useCallback(() => {}, []);

  return { discoverUrls, scrapeUrl, setWebViewRef, handleMessage, onLoadEnd };
}
