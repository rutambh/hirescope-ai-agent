import { useRef, useCallback, useState, useEffect } from 'react';
import { APP_CONFIG } from '../constants/config';
import { useAppStore } from '../store/appStore';
import { useDomainHealthStore, FailureReason } from '../store/domainHealthStore';
import { COUNTRY_FOREIGN_HINTS } from '../constants/countries';
import { logger } from '../utils/logger';

export interface WebViewRequest {
  url: string;
  action: 'discover' | 'scrape';
  resolve: (result: any) => void;
  reject: (err: any) => void;
}

// Module-level cancellation flag — shared across all instances.
// Set by setCancelFlag() (called from the scraper on user cancel).
// Replaces the previous dead globalAbortController, which was never
// instantiated and therefore never actually aborted anything.
let globalCancelled = false;

export function setCancelFlag() {
  globalCancelled = true;
  cancelAllFetches();
}

export function isCancelled(): boolean {
  return globalCancelled;
}

export function resetCancelFlag() {
  globalCancelled = false;
}

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
  if (globalCancelled) {
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
  rejectActiveWebViewRequest(new Error('Cancelled'));
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

// ─── Search Query Builder ──────────────────────────────────────────────────────

function isMultiWordCompany(company: string): boolean {
  return company.trim().includes(' ');
}

function buildSearchQuery(
  company: string, role: string, country: string, experience: number,
  template?: string, forceUnquoted?: boolean
): string {
  const location = country;
  const tpl = template ?? '{company} {role} {country} salary reviews';

  // Smart quoting: wrap multi-word company names in quotes for phrase-match precision
  // Single-word names are never quoted (quoting a single token adds no benefit)
  const companyToken = (isMultiWordCompany(company) && !forceUnquoted)
    ? `"${company}"`
    : company;

  let query = tpl
    .replace('{company}', companyToken)
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

// True if the URL points at a downloadable/binary resource (PDF, Office doc,
// archive, installer, or dynamic download endpoint). Loading these in the
// WebView triggers the OS download manager instead of rendering HTML.
export function hasBlockedExtension(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  
  // 1. Strip query and hash to get the path
  const pathOnly = lowerUrl.split('?')[0].split('#')[0];
  
  // 2. Check if the path ends with any blocked file extension (standard check)
  if (APP_CONFIG.blockedFileExtensions.some(ext => pathOnly.endsWith(ext))) {
    return true;
  }
  
  // 3. Path-heuristic check: block URLs that contain file-download markers.
  // We check for specific patterns:
  // - "/pdf/", "/download/", "/downloads/", "/attachment/", "/uploads/" in path segment
  // - specific files like "download.php", "download.jsp", "download.aspx", "download.ashx"
  // - "content-disposition"
  // - query params: ?file=, ?download=, ?attachment=, ?format=, ?type=
  const pathSegments = pathOnly.split('/');
  const hasDownloadSegment = pathSegments.some(seg => 
    seg === 'download' || 
    seg === 'downloads' || 
    seg === 'pdf' || 
    seg === 'attachment' ||
    seg === 'upload' ||
    seg === 'uploads'
  );

  if (
    hasDownloadSegment ||
    lowerUrl.includes('download.php') ||
    lowerUrl.includes('download.jsp') ||
    lowerUrl.includes('download.aspx') ||
    lowerUrl.includes('download.ashx') ||
    lowerUrl.includes('content-disposition') ||
    /[?&](file|download|attachment|format|type)=/i.test(lowerUrl)
  ) {
    // If it contains "download" or similar, but ends with a safe extension like .html, .htm, .php, .jsp, .aspx, .ashx, we can allow it
    // because it might be a download page rather than the file itself.
    const safeExtensions = ['.html', '.htm', '.jsp', '.jspx', '.php', '.php3', '.php4', '.php5', '.phtml', '.asp', '.aspx', '.ashx', '.cfm', '.cgi', '.pl'];
    const hasSafeExtension = safeExtensions.some(ext => pathOnly.endsWith(ext));
    
    // But if it ends with one of our blocked extensions (checked in step 2) or has no safe extension and contains file indicators:
    if (!hasSafeExtension) {
      return true;
    }
  }
  
  return false;
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

    // Never scrape downloadable/binary files — they hang the WebView and
    // trigger the OS download manager instead of rendering HTML.
    if (hasBlockedExtension(url)) continue;

    // Exclude known junk domains
    if (EXCLUDED_DOMAINS.some(d => lower.includes(d))) continue;

    // Country-specific filtering — drop URLs clearly meant for another region
    const foreignHints = COUNTRY_FOREIGN_HINTS[lcc];
    if (foreignHints && foreignHints.some(s => lower.includes(s))) continue;

    // Deduplicate by domain (keep highest scoring URL per domain)
    const domain = getDomainName(url);
    if (!domain) continue;

    let domainScore = getDomainScore(url);

    // Boost score if URL contains company name
    if (lower.includes(lc)) domainScore += 2;

    // Boost score for salary/review-specific URL paths
    if (lower.includes('/salary') || lower.includes('/review') || lower.includes('/rating')) domainScore += 1;
    if (lower.includes('/company/') || lower.includes('/employer/')) domainScore += 1;

    // Apply domain health multiplier — deprioritize domains with recent failures
    // Health is 0-1, where 1 = no recent failures. Score is scaled but never zeroed.
    const healthScore = useDomainHealthStore.getState().getDomainHealth(domain);
    domainScore = Math.round(domainScore * healthScore * 100) / 100;

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
    const needsFallback = isMultiWordCompany(company);

    // Enough raw URLs that, after domain de-dup/scoring, we still have a
    // healthy pool to scrape from. Once we hit this we stop early.
    const RAW_TARGET = maxDomains * 2;
    const RAW_CAP = maxDomains * 3;

    const runEngineQuery = async (
      engine: string, query: string, allowPage2: boolean
    ): Promise<void> => {
      if (globalCancelled) return;
      if (deadlineTimestamp && Date.now() >= deadlineTimestamp) return;

      const url = searchUrl(engine, query);
      try {
        logger.info('Discovery', `WebView discovery ${engine} → "${query}"`);
        const urls = await requestViaWebView(url, 'discover', APP_CONFIG.urlDiscoveryTimeoutMs);
        if (globalCancelled) return;
        if (urls && urls.length > 0) allRawUrls.push(...urls);

        if (allowPage2 && allRawUrls.length < RAW_TARGET) {
          try {
            let page2 = '';
            if (engine === 'bing') page2 = `${url}&first=11`;
            else if (engine === 'yahoo') page2 = `${url}&b=11`;
            else if (engine === 'startpage') page2 = `${url}&start=10`;
            if (page2) {
              const urls2 = await requestViaWebView(page2, 'discover', APP_CONFIG.urlDiscoveryTimeoutMs);
              if (globalCancelled) return;
              if (urls2 && urls2.length > 0) allRawUrls.push(...urls2);
            }
          } catch { /* pagination best-effort */ }
        }
      } catch (err: any) {
        if (globalCancelled) return;
        logger.warn('Discovery', `${engine} failed:`, err?.message || err);
      }

      if (engine !== engines[engines.length - 1]) {
        await new Promise(r => setTimeout(r, 300 + Math.random() * 500));
      }
    };

    // ── Pass 1: primary engine (DuckDuckGo) for every template ──
    // This is where the large majority of useful URLs come from. We only
    // escalate to other engines (Pass 2) if we still need more coverage,
    // which avoids 64+ serial WebView loads blowing the total timeout.
    for (const template of templates) {
      if (globalCancelled) break;
      if (allRawUrls.length >= RAW_TARGET) break;
      if (deadlineTimestamp && Date.now() >= deadlineTimestamp) break;

      const query = buildSearchQuery(company, role, country, experience, template);
      const urlsBeforeTemplate = allRawUrls.length;
      await runEngineQuery('duckduckgo', query, true);

      // Unquoted fallback for multi-word company names that yielded too few URLs
      const urlsFromTemplate = allRawUrls.length - urlsBeforeTemplate;
      if (needsFallback && urlsFromTemplate < APP_CONFIG.fallbackUrlThreshold) {
        if (globalCancelled) break;
        if (deadlineTimestamp && Date.now() >= deadlineTimestamp) break;
        const unquotedQuery = buildSearchQuery(company, role, country, experience, template, true);
        await runEngineQuery('duckduckgo', unquotedQuery, false);
      }
    }

    // ── Pass 2: fill remaining coverage with other engines only if needed ──
    if (allRawUrls.length < maxDomains) {
      for (const template of templates) {
        if (globalCancelled) break;
        if (allRawUrls.length >= RAW_CAP) break;
        if (deadlineTimestamp && Date.now() >= deadlineTimestamp) break;

        const query = buildSearchQuery(company, role, country, experience, template);
        for (const engine of ['bing', 'yahoo', 'startpage']) {
          if (globalCancelled) break;
          if (allRawUrls.length >= RAW_CAP) break;
          if (deadlineTimestamp && Date.now() >= deadlineTimestamp) break;
          await runEngineQuery(engine, query, allRawUrls.length < RAW_TARGET);
        }
      }
    }

    const scored = cleanAndFilterUrls(allRawUrls, company, country);
    return scored.map(s => s.url).slice(0, maxDomains);
  }, []);

  const scrapeUrl = useCallback(async (url: string): Promise<{ text: string; quality: number }> => {
    if (globalCancelled) return { text: '', quality: 0 };

    // Defense-in-depth: never load downloadable/binary files in the WebView.
    if (hasBlockedExtension(url)) {
      logger.scrapeFail(url, 'blocked: downloadable file');
      return { text: '', quality: 0 };
    }

    const logDomainFailure = (failUrl: string, reason: FailureReason) => {
      useDomainHealthStore.getState().logFailure(failUrl, reason);
    };

    try {
      logger.info('Scraper', `WebView scrape → ${url}`);
      const result = await requestViaWebView(url, 'scrape', APP_CONFIG.perDomainTimeoutMs);
      if (globalCancelled) return { text: '', quality: 0 };

      const text = result.text || '';
      const { isBlocked, reason } = detectLoginWall(text);
      if (isBlocked) {
        logger.scrapeFail(url, `blocked: ${reason}`);
        // Log domain failure: map detectLoginWall reason to FailureReason
        const failureReason: FailureReason = reason === 'captcha' ? 'captcha' : reason === 'login_wall' ? 'login_wall' : 'empty_content';
        logDomainFailure(url, failureReason);
        return { text: '', quality: 0 };
      }

      const quality = scoreContentQuality(text);
      if (text.length >= 100) {
        logger.scrapeSuccess(url, text.length);
        return { text: text.substring(0, 100000), quality: Math.max(quality, 1) };
      }
      // Content too short — log as empty content failure
      logger.scrapeFail(url, `too short (${text.length}c)`);
      logDomainFailure(url, 'empty_content');
    } catch (err: any) {
      if (globalCancelled) return { text: '', quality: 0 };
      logger.scrapeFail(url, err?.message || 'failed');

      // Log failure: timeout vs general HTTP error vs blocked download
      const failureReason: FailureReason =
        err?.reason ?? (err?.message?.includes('timeout') ? 'timeout' : 'http_error');
      logDomainFailure(url, failureReason);

      // Fallback to Google Cache
      const cacheUrls = getCacheUrl(url);
      for (const cacheUrl of cacheUrls) {
        if (globalCancelled) return { text: '', quality: 0 };
        try {
          logger.info('Scraper', `WebView fallback scrape → ${cacheUrl}`);
          const cacheResult = await requestViaWebView(cacheUrl, 'scrape', APP_CONFIG.perDomainTimeoutMs / 2);
          if (globalCancelled) return { text: '', quality: 0 };

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
          if (globalCancelled) return { text: '', quality: 0 };
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
