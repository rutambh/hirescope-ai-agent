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
  company: string, role: string, country: string, experience: number | undefined,
  template?: string, forceUnquoted?: boolean
): string {
  const location = country;
  const tpl = template ?? '{company} {role} {experience} salary reviews';

  // Smart quoting: wrap multi-word company names in quotes for phrase-match precision
  // Single-word names are never quoted (quoting a single token adds no benefit)
  const companyToken = (isMultiWordCompany(company) && !forceUnquoted)
    ? `"${company}"`
    : company;

  const expStr = experience === undefined
    ? ''
    : (experience === 0 ? '0 years' : `${experience} years`);
  const expYrsStr = experience === undefined
    ? ''
    : (experience === 0 ? '0 yrs' : `${experience} yrs`);

  let query = tpl
    .replace('{company}', companyToken)
    .replace('{role}', role)
    .replace('{country}', location)
    .replace('{experience} years', expStr)
    .replace('{experience} yrs', expYrsStr)
    .replace('{experience}', expStr);

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

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 10000
): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

function isOfficialCompanyWebsite(url: string, company: string): boolean {
  try {
    const lcUrl = url.toLowerCase();
    const domain = getDomainName(url).toLowerCase();
    const cleanCompany = company.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const words = cleanCompany.split(/\s+/).filter(Boolean);

    const hasReviewsOrSalaries =
      lcUrl.includes('salary') ||
      lcUrl.includes('review') ||
      lcUrl.includes('rating') ||
      lcUrl.includes('compensation') ||
      lcUrl.includes('ctc') ||
      lcUrl.includes('wlb') ||
      lcUrl.includes('culture');

    if (hasReviewsOrSalaries) return false;

    // Check 1: exact match of clean company name, e.g. "advantmed" in "advantmed.com"
    const joinedCompany = words.join('');
    if (joinedCompany.length >= 3 && domain.includes(joinedCompany)) {
      return true;
    }

    // Check 2: initials match (for multi-word companies like Tata Consultancy Services -> tcs)
    if (words.length > 1) {
      const initials = words.map(w => w[0]).join('');
      if (initials.length >= 2 && (
        domain === `${initials}.com` ||
        domain === `${initials}.co.in` ||
        domain === `${initials}.in` ||
        domain === `www.${initials}.com` ||
        domain === `www.${initials}.co.in` ||
        domain === `www.${initials}.in`
      )) {
        return true;
      }

      // Check 3: first word match, e.g. "tata.com"
      const firstWord = words[0];
      if (firstWord.length >= 3 && (
        domain === `${firstWord}.com` ||
        domain === `${firstWord}.co.in` ||
        domain === `${firstWord}.in` ||
        domain === `www.${firstWord}.com` ||
        domain === `www.${firstWord}.co.in` ||
        domain === `www.${firstWord}.in`
      )) {
        return true;
      }
    }
  } catch (e) {}
  return false;
}

export const FAST_LANE_DOMAINS = [
  'kununu.com',
  'teamblind.com',
  'salary.com',
  'shine.com',
  'sulekha.com',
  'geekster.in',
  '6figr.com',
  'talent.com',
  'fairygodboss.com',
  'vault.com'
];

export function isFastLaneDomain(urlOrDomain: string): boolean {
  const domain = (getDomainName(urlOrDomain) || urlOrDomain.toLowerCase()).replace(/^www\./, '');
  return FAST_LANE_DOMAINS.some(d => {
    const baseName = d.split('.')[0];
    const parts = domain.split('.');
    return parts.includes(baseName);
  });
}

export const WEBVIEW_TIER_DOMAINS = [
  'ambitionbox.com', 'naukri.com', 'careerbliss.com', 'comparably.com',
  'levels.fyi', 'payscale.com', 'inhersight.com', 'glassdoor.com',
  'indeed.com', 'linkedin.com', 'mouthshut.com', 'freshersworld.com',
  'iimjobs.com', 'hirist.tech', 'geeksforgeeks.org', 'breakroom.cc',
  'justdial.com', 'cutshort.io', 'interviewbit.com', 'groww.in',
  'foundit.in', 'salaryexplorer.com', 'erieri.com', 'jobily.com',
  'timesjobs.com'
];

export function isWebViewTierDomain(urlOrDomain: string): boolean {
  const domain = (getDomainName(urlOrDomain) || urlOrDomain.toLowerCase()).replace(/^www\./, '');
  return WEBVIEW_TIER_DOMAINS.some(d => {
    const baseName = d.split('.')[0];
    const parts = domain.split('.');
    return parts.includes(baseName);
  });
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

export function resolveRedirect(raw: string): string {
  try {
    const u = new URL(raw);
    const host = u.hostname;
    // DuckDuckGo wraps results in /l/?uddg=<percent-encoded target>
    if (host.includes('duckduckgo.com') && u.pathname === '/l/') {
      const uddg = u.searchParams.get('uddg');
      if (uddg) return decodeURIComponent(uddg);
    }
    // Yahoo / some engines use ?url=<encoded target>
    const urlParam = u.searchParams.get('url');
    if (urlParam) {
      if (/^https?:/i.test(urlParam)) return urlParam;
      try {
        const dec = decodeURIComponent(urlParam);
        if (/^https?:/i.test(dec)) return dec;
      } catch (e) {}
    }
  } catch (e) {}
  return raw;
}

export function extractUrlsFromHtml(html: string, baseUrlString: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  
  // Match href="something" or href='something'
  const regex = /href\s*=\s*["']([^"']+)["']/gi;
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    const rawHref = match[1];
    
    // Resolve relative URLs
    try {
      let absoluteUrl = rawHref;
      if (!rawHref.startsWith('http://') && !rawHref.startsWith('https://')) {
        absoluteUrl = new URL(rawHref, baseUrlString).href;
      }
      
      const resolved = resolveRedirect(absoluteUrl);
      if (resolved && resolved.startsWith('http')) {
        const clean = resolved.replace(/[?&](utm_\w+|ref|source|fbclid|gclid|mc_cid|mc_eid)=[^&]*/gi, '');
        if (!seen.has(clean)) {
          seen.add(clean);
          links.push(resolved);
        }
      }
    } catch (e) {}
  }
  
  return links;
}

function cleanAndFilterUrls(
  rawUrls: string[], company: string, country: string, researchMode?: 'deep' | 'narrow'
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

    // In Narrow mode, exclude WebView-tier domains that block direct HTTP fetch
    if (researchMode === 'narrow' && isWebViewTierDomain(url)) continue;

    // Exclude official company corporate website (e.g. advantmed.com or tcs.com)
    // which has no review/salary data and yields NA results.
    if (isOfficialCompanyWebsite(url, company)) continue;

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

// ─── SSR JSON & Hydration Extractors ──────────────────────────────────────────

export function extractSsrJson(html: string): any | null {
  // 1. Try __NEXT_DATA__ block
  const nextDataMatch = html.match(/<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch) {
    try {
      return JSON.parse(nextDataMatch[1].trim());
    } catch (e) {
      logger.warn('SSR Parser', 'Failed to parse __NEXT_DATA__ JSON');
    }
  }

  // 2. Try window.__INITIAL_STATE__ or window.__NEXT_DATA__ inline scripts
  const initStateMatch = html.match(/window\s*\.\s*__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/i) ||
                         html.match(/window\s*\.\s*__NEXT_DATA__\s*=\s*(\{[\s\S]*?\});/i);
  if (initStateMatch) {
    try {
      return JSON.parse(initStateMatch[1].trim());
    } catch (e) {
      logger.warn('SSR Parser', 'Failed to parse window.__INITIAL_STATE__ JSON');
    }
  }

  // 3. Try any application/json scripts (e.g. fairygodboss.com)
  const jsonScriptRegex = /<script\b[^>]*type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = jsonScriptRegex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (parsed && typeof parsed === 'object') {
        if (JSON.stringify(parsed).length > 200) {
          return parsed;
        }
      }
    } catch (e) {}
  }

  return null;
}

export function extractTextFromJson(obj: any): string {
  const lines: string[] = [];
  
  function walk(node: any, path: string = '') {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') {
      const trimmed = node.trim();
      if (trimmed.length > 0) {
        const lowerKey = path.toLowerCase();
        if (lowerKey.includes('pro') && !lowerKey.includes('progress') && !lowerKey.includes('product')) {
          lines.push(`Pros: ${trimmed}`);
        } else if (lowerKey.includes('con') && !lowerKey.includes('contact') && !lowerKey.includes('config')) {
          lines.push(`Cons: ${trimmed}`);
        } else if (lowerKey.includes('rating')) {
          lines.push(`Rating: ${trimmed}`);
        } else if (lowerKey.includes('salary') || lowerKey.includes('ctc') || lowerKey.includes('pay') || lowerKey.includes('compensation')) {
          lines.push(`Salary: ${trimmed}`);
        } else {
          lines.push(trimmed);
        }
      }
    } else if (typeof node === 'number') {
      const lowerKey = path.toLowerCase();
      if (lowerKey.includes('rating')) {
        lines.push(`Rating: ${node}`);
      } else if (lowerKey.includes('salary') || lowerKey.includes('ctc') || lowerKey.includes('pay') || lowerKey.includes('compensation')) {
        lines.push(`Salary: ${node}`);
      } else {
        lines.push(String(node));
      }
    } else if (Array.isArray(node)) {
      node.forEach((item, index) => walk(item, `${path}[${index}]`));
    } else if (typeof node === 'object') {
      for (const [key, value] of Object.entries(node)) {
        walk(value, path ? `${path}.${key}` : key);
      }
    }
  }
  
  walk(obj);
  return lines.join('\n');
}

// ─── WebView-based Scraping ───────────────────────────────────────────────────

export function useDomainScraper() {
  const discoverUrls = useCallback(async (
    company: string, role: string, country: string, experience: number | undefined,
    deadlineTimestamp?: number,
    researchMode: 'deep' | 'narrow' = 'deep'
  ): Promise<string[]> => {
    const maxDomains = useAppStore.getState().maxDomainsToScrape;
    const allRawUrls: string[] = [];
    const engines = ['duckduckgo', 'bing', 'yahoo', 'startpage'];
    const templates = APP_CONFIG.searchQueryTemplates;
    const needsFallback = isMultiWordCompany(company);
    const isNarrow = researchMode === 'narrow';

    // Enough raw URLs that, after domain de-dup/scoring, we still have a
    // healthy pool to scrape from. Once we hit this we stop early.
    const RAW_TARGET = maxDomains * 2;
    const RAW_CAP = maxDomains * 3;

    const runNativeEngineQuery = async (
      engine: string, query: string, allowPage2: boolean
    ): Promise<void> => {
      if (globalCancelled) return;
      if (deadlineTimestamp && Date.now() >= deadlineTimestamp) return;

      const url = searchUrl(engine, query);
      try {
        logger.info('Discovery', `Native fetch discovery ${engine} → "${query}"`);
        const response = await fetchWithTimeout(url, {
          headers: {
            'User-Agent': APP_CONFIG.webViewUserAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          }
        }, 10000);
        const html = await response.text();
        if (globalCancelled) return;
        
        const urls = extractUrlsFromHtml(html, url);
        if (urls && urls.length > 0) allRawUrls.push(...urls);

        if (allowPage2 && allRawUrls.length < RAW_TARGET) {
          try {
            let page2 = '';
            if (engine === 'bing') page2 = `${url}&first=11`;
            else if (engine === 'yahoo') page2 = `${url}&b=11`;
            else if (engine === 'startpage') page2 = `${url}&start=10`;
            if (page2) {
              const res2 = await fetch(page2, {
                headers: {
                  'User-Agent': APP_CONFIG.webViewUserAgent,
                }
              });
              const html2 = await res2.text();
              if (globalCancelled) return;
              const urls2 = extractUrlsFromHtml(html2, page2);
              if (urls2 && urls2.length > 0) allRawUrls.push(...urls2);
            }
          } catch { /* pagination best-effort */ }
        }
      } catch (err: any) {
        if (globalCancelled) return;
        logger.warn('Discovery', `Native fetch for ${engine} failed:`, err?.message || err);
      }

      if (engine !== engines[engines.length - 1]) {
        await new Promise(r => setTimeout(r, 200 + Math.random() * 300));
      }
    };

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

      // Stop early only if we already have enough high-quality URLs after filtering
      const currentFiltered = cleanAndFilterUrls(allRawUrls, company, country, researchMode);
      if (currentFiltered.length >= maxDomains) break;

      if (deadlineTimestamp && Date.now() >= deadlineTimestamp) break;

      // Skip WebView-tier site-specific queries in Narrow mode
      if (isNarrow && (template.includes('site:glassdoor.com') || template.includes('site:ambitionbox.com'))) {
        continue;
      }

      const query = buildSearchQuery(company, role, country, experience, template);
      const urlsBeforeTemplate = allRawUrls.length;
      if (isNarrow) {
        await runNativeEngineQuery('duckduckgo', query, true);
      } else {
        await runEngineQuery('duckduckgo', query, true);
      }

      // Unquoted fallback for multi-word company names that yielded too few URLs
      const urlsFromTemplate = allRawUrls.length - urlsBeforeTemplate;
      if (needsFallback && urlsFromTemplate < APP_CONFIG.fallbackUrlThreshold) {
        if (globalCancelled) break;
        if (deadlineTimestamp && Date.now() >= deadlineTimestamp) break;
        const unquotedQuery = buildSearchQuery(company, role, country, experience, template, true);
        if (isNarrow) {
          await runNativeEngineQuery('duckduckgo', unquotedQuery, false);
        } else {
          await runEngineQuery('duckduckgo', unquotedQuery, false);
        }
      }
    }

    // ── Pass 2: fill remaining coverage with other engines only if needed ──
    const initialFilteredCount = cleanAndFilterUrls(allRawUrls, company, country, researchMode).length;
    if (initialFilteredCount < maxDomains) {
      for (const template of templates) {
        if (globalCancelled) break;
        if (deadlineTimestamp && Date.now() >= deadlineTimestamp) break;

        // Skip WebView-tier site-specific queries in Narrow mode
        if (isNarrow && (template.includes('site:glassdoor.com') || template.includes('site:ambitionbox.com'))) {
          continue;
        }

        const query = buildSearchQuery(company, role, country, experience, template);
        for (const engine of ['bing', 'yahoo', 'startpage']) {
          if (globalCancelled) break;
          if (deadlineTimestamp && Date.now() >= deadlineTimestamp) break;

          const currentFilteredCount = cleanAndFilterUrls(allRawUrls, company, country, researchMode).length;
          if (currentFilteredCount >= maxDomains) break;

          if (isNarrow) {
            await runNativeEngineQuery(engine, query, currentFilteredCount < maxDomains);
          } else {
            await runEngineQuery(engine, query, currentFilteredCount < maxDomains);
          }
        }
      }
    }

    const scored = cleanAndFilterUrls(allRawUrls, company, country, researchMode);
    return scored.map(s => s.url).slice(0, maxDomains);
  }, []);

  const scrapeUrl = useCallback(async (url: string, researchMode: 'deep' | 'narrow' = 'deep'): Promise<{ text: string; quality: number }> => {
    if (globalCancelled) return { text: '', quality: 0 };

    // Defense-in-depth: never load downloadable/binary files in the WebView.
    if (hasBlockedExtension(url)) {
      logger.scrapeFail(url, 'blocked: downloadable file');
      return { text: '', quality: 0 };
    }

    const logDomainFailure = (failUrl: string, reason: FailureReason) => {
      useDomainHealthStore.getState().logFailure(failUrl, reason);
    };

    if (isFastLaneDomain(url) || researchMode === 'narrow') {
      try {
        logger.info('Scraper', `Native fetch scrape → ${url}`);
        const response = await fetchWithTimeout(url, {
          headers: {
            'User-Agent': APP_CONFIG.webViewUserAgent,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
          }
        }, 15000);
        if (globalCancelled) return { text: '', quality: 0 };
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const html = await response.text();
        if (globalCancelled) return { text: '', quality: 0 };

        // Try SSR data extraction first (for next.js, nuxt, etc. sites)
        const ssrData = extractSsrJson(html);
        let cleanText = '';
        if (ssrData) {
          cleanText = extractTextFromJson(ssrData);
          logger.info('Scraper', `Parsed SSR hydration data block; extracted ${cleanText.length} characters.`);
        }

        // Fallback to strip HTML tag rendering if SSR failed or yielded too little text
        if (!cleanText || cleanText.length < 100) {
          cleanText = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
            .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
            .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
            .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
            .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
            .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        }

        const { isBlocked, reason } = detectLoginWall(cleanText);
        if (isBlocked) {
          logger.scrapeFail(url, `blocked: ${reason}`);
          const failureReason: FailureReason = reason === 'captcha' ? 'captcha' : reason === 'login_wall' ? 'login_wall' : 'empty_content';
          logDomainFailure(url, failureReason);
          return { text: '', quality: 0 };
        }

        const quality = scoreContentQuality(cleanText);
        if (cleanText.length >= 100) {
          logger.scrapeSuccess(url, cleanText.length);
          return { text: cleanText.substring(0, 100000), quality: Math.max(quality, 1) };
        }
        logger.scrapeFail(url, `too short (${cleanText.length}c)`);
        logDomainFailure(url, 'empty_content');
      } catch (err: any) {
        if (globalCancelled) return { text: '', quality: 0 };
        logger.scrapeFail(url, `native fetch failed: ${err?.message || err}`);
        logDomainFailure(url, err?.message?.includes('timeout') ? 'timeout' : 'http_error');
      }
      return { text: '', quality: 0 };
    }

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
