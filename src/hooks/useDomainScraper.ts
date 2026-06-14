// src/hooks/useDomainScraper.ts
//
// Discovers URLs via multi-engine search and scrapes each discovered page.
//
// KEY ARCHITECTURE FIX (V5):
// - Uses webView.injectJavaScript() called from onLoadEnd instead of the
//   `injectedJavaScript` prop, which fires too early for SPA pages.
// - Adds a configurable delay after page load to let dynamic content render.
// - Uses MutationObserver inside the page to wait for content-rich DOM state.
// - Does NOT destroy/recreate WebView between queries — reuses the same instance.
// - Serial URL discovery with proper engine fallback.

import { useRef, useCallback } from 'react';
import { APP_CONFIG } from '../constants/config';
import { useAppStore } from '../store/appStore';
import { useSearchStore } from '../store/searchStore';

// ─── Injection Scripts ────────────────────────────────────────────────────────

// Extracts search result links from DuckDuckGo / Brave / Bing
// Uses MutationObserver to wait for results to appear dynamically
const WEBVIEW_URL_EXTRACTOR_SCRIPT = `
(function() {
  try {
    function extractUrls() {
      var urls = [];

      // DuckDuckGo selectors
      var ddgLinks = document.querySelectorAll(
        'a.result__url, a.result__link, .result__title a, .links_main a, .result a[href]'
      );
      for (var i = 0; i < ddgLinks.length; i++) {
        var href = ddgLinks[i].getAttribute('href') || ddgLinks[i].href;
        if (href && href.startsWith('http') && !href.includes('duckduckgo.com')) urls.push(href);
      }

      // Brave Search selectors
      var braveLinks = document.querySelectorAll(
        '.result .title a, a.result-title, .result-card a[href], .snippet-url, .result-url'
      );
      for (var j = 0; j < braveLinks.length; j++) {
        var href = braveLinks[j].getAttribute('href') || braveLinks[j].href;
        if (href && href.startsWith('http') && !href.includes('brave.com') && !href.includes('search.brave.com')) urls.push(href);
      }

      // Bing selectors
      var bingLinks = document.querySelectorAll(
        '#b_results .b_algo h2 a, #b_results .b_caption a'
      );
      for (var k = 0; k < bingLinks.length; k++) {
        var href = bingLinks[k].getAttribute('href') || bingLinks[k].href;
        if (href && href.startsWith('http') && !href.includes('bing.com') && !href.includes('microsoft.com')) urls.push(href);
      }

      // Fallback: all visible anchor tags
      if (urls.length === 0) {
        var allAnchors = document.querySelectorAll('a[href]');
        for (var n = 0; n < allAnchors.length && urls.length < 50; n++) {
          var href = allAnchors[n].getAttribute('href') || '';
          if (href.startsWith('http') &&
              !href.includes('duckduckgo.com') &&
              !href.includes('bing.com') &&
              !href.includes('brave.com') &&
              !href.includes('google.com') &&
              !href.includes('youtube.com') &&
              !href.includes('facebook.com') &&
              !href.includes('twitter.com') &&
              !href.includes('x.com') &&
              !href.includes('instagram.com') &&
              !href.includes('pinterest.com') &&
              !href.includes('javascript:')) {
            urls.push(href);
          }
        }
      }

      return urls;
    }

    // Try extracting immediately
    var urls = extractUrls();
    if (urls.length > 0) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'URL_EXTRACTION', urls: urls }));
      return;
    }

    // If nothing yet, use MutationObserver to wait for dynamic content
    var attempts = 0;
    var maxAttempts = 40; // 4 seconds total (100ms interval)
    var observer = null;

    function tryExtract() {
      attempts++;
      var found = extractUrls();
      if (found.length > 0) {
        if (observer) observer.disconnect();
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'URL_EXTRACTION', urls: found }));
        return true;
      }
      if (attempts >= maxAttempts) {
        if (observer) observer.disconnect();
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'URL_EXTRACTION', urls: [] }));
        return true;
      }
      return false;
    }

    // Poll every 100ms
    var pollInterval = setInterval(function() {
      if (tryExtract()) {
        clearInterval(pollInterval);
      }
    }, 100);

    // Also observe DOM changes as a faster path
    observer = new MutationObserver(function() {
      if (tryExtract()) {
        clearInterval(pollInterval);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: e.toString() }));
  }
})();
true;
`;

// Extracts visible text content from a page
const WEBVIEW_CONTENT_EXTRACTOR_SCRIPT = `
(function() {
  try {
    function extractContent() {
      // Remove non-content elements
      var toRemove = document.querySelectorAll(
        'script, style, noscript, nav, header, footer, aside, ' +
        '.ad, .ads, .advertisement, .cookie-banner, .popup, .modal, ' +
        '[class*="cookie"], [class*="banner"], [id*="cookie"], [id*="banner"], ' +
        '[class*="nav"], [id*="nav"], [class*="menu"], [id*="sidebar"]'
      );
      toRemove.forEach(function(el) { el.remove(); });

      // Prioritize review / salary content areas
      var reviewSections = document.querySelectorAll(
        '[class*="review"], [class*="rating"], [class*="salary"], [class*="compensation"], ' +
        '[class*="pros"], [class*="cons"], [class*="employee"], ' +
        '[id*="review"], [id*="rating"], article, .content, main, section, [class*="detail"]'
      );

      var text = '';
      if (reviewSections.length > 0) {
        reviewSections.forEach(function(el) {
          text += (el.innerText || el.textContent || '') + '\\n\\n';
        });
      }

      // Fallback to full body text
      if (text.trim().length < 200) {
        text = document.body.innerText || document.body.textContent || '';
      }

      return text.trim().substring(0, 50000);
    }

    // Try immediately
    var text = extractContent();
    if (text.length >= 100) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CONTENT_EXTRACTION', text: text }));
      return;
    }

    // Wait for dynamic content
    var attempts = 0;
    var maxAttempts = 60; // 6 seconds total

    var pollInterval = setInterval(function() {
      attempts++;
      var t = extractContent();
      if (t.length >= 100 || attempts >= maxAttempts) {
        clearInterval(pollInterval);
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CONTENT_EXTRACTION', text: t }));
      }
    }, 100);

  } catch(e) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ERROR', message: e.toString() }));
  }
})();
true;
`;

// ─── URL Filtering ────────────────────────────────────────────────────────────

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
];

export function cleanAndFilterUrls(
  rawUrls: string[],
  company: string,
  country: string
): string[] {
  const lc = company.toLowerCase();
  const lcc = country.toLowerCase();
  const unique = new Set<string>();

  for (const rawUrl of rawUrls) {
    if (!rawUrl || typeof rawUrl !== 'string') continue;

    let url = rawUrl.trim();
    if (url.startsWith('//')) {
      url = 'https:' + url;
    } else if (url.startsWith('/')) {
      url = 'https://html.duckduckgo.com' + url;
    }

    // Resolve DDG redirect URLs
    if (url.includes('uddg=')) {
      const match = url.match(/[?&]uddg=([^&]+)/);
      if (match && match[1]) {
        try { url = decodeURIComponent(match[1]); } catch { /* keep original */ }
      }
    }

    // Resolve Bing redirect URLs
    if (url.includes('bing.com/ck/a') || url.includes('/url?')) {
      try {
        const urlObj = new URL(url);
        const q = urlObj.searchParams.get('q') || urlObj.searchParams.get('u');
        if (q && q.startsWith('http')) url = decodeURIComponent(q);
      } catch { /* keep original */ }
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) continue;

    const urlLower = url.toLowerCase();

    // Skip excluded domains
    if (EXCLUDED_DOMAINS.some(d => urlLower.includes(d))) continue;

    // Country-based URL filtering
    if (lcc === 'india') {
      if (['/us/', '/uk/', '/ca/', '/au/', '.co.uk', '.com.au', '.ca'].some(s => urlLower.includes(s))) continue;
    } else if (lcc === 'united states') {
      if (['/in/', '/uk/', '/ca/', '/au/', '.co.in', '.co.uk', '.com.au'].some(s => urlLower.includes(s))) continue;
    }

    unique.add(url.trim());
  }

  // Sort: high-value domains first, then company-name matches
  return Array.from(unique).sort((a, b) => {
    const aLow = a.toLowerCase();
    const bLow = b.toLowerCase();
    const aHigh = HIGH_VALUE_DOMAINS.some(d => aLow.includes(d)) ? 2 : 0;
    const bHigh = HIGH_VALUE_DOMAINS.some(d => bLow.includes(d)) ? 2 : 0;
    const aComp = aLow.includes(lc) ? 1 : 0;
    const bComp = bLow.includes(lc) ? 1 : 0;
    return (bHigh + bComp) - (aHigh + aComp);
  });
}

// ─── Build Search URLs ────────────────────────────────────────────────────────

function buildSearchUrl(
  engine: 'duckduckgo' | 'brave' | 'bing',
  company: string,
  role: string,
  country: string,
  state?: string,
  district?: string,
  queryTemplate?: string
): string {
  const template = queryTemplate ?? '{company} {role} {country} salary reviews';
  const location = [country, state, district].filter(Boolean).join(' ');
  const query = template
    .replace('{company}', company)
    .replace('{role}', role)
    .replace('{country}', location);

  const encoded = encodeURIComponent(query);
  const base = APP_CONFIG.searchEngines[engine];
  return `${base}${encoded}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDomainScraper() {
  // The WebView ref — stable across the hook lifetime
  const webViewRef = useRef<any>(null);

  // Promise refs for URL discovery
  const resolveUrlsRef = useRef<((value: string[]) => void) | null>(null);
  const rejectUrlsRef = useRef<((reason: any) => void) | null>(null);
  const resolveContentRef = useRef<((value: string) => void) | null>(null);
  const rejectContentRef = useRef<((reason: any) => void) | null>(null);

  const urlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentModeRef = useRef<'url' | 'content' | null>(null);

  const clearAllTimeouts = useCallback(() => {
    if (urlTimeoutRef.current) { clearTimeout(urlTimeoutRef.current); urlTimeoutRef.current = null; }
    if (contentTimeoutRef.current) { clearTimeout(contentTimeoutRef.current); contentTimeoutRef.current = null; }
  }, []);

  // Set WebView ref
  const setWebViewRef = useCallback((ref: any) => {
    webViewRef.current = ref;
  }, []);

  // ─── Handle WebView Messages ──────────────────────────────────────────────

  const handleMessage = useCallback((event: any) => {
    try {
      const eventData = event?.nativeEvent?.data ?? event;
      const data = JSON.parse(eventData);

      if (data.type === 'URL_EXTRACTION' && currentModeRef.current === 'url') {
        clearAllTimeouts();
        currentModeRef.current = null;
        const rawUrls: string[] = data.urls || [];
        if (resolveUrlsRef.current) {
          resolveUrlsRef.current(rawUrls);
          resolveUrlsRef.current = null;
          rejectUrlsRef.current = null;
        }
      } else if (data.type === 'CONTENT_EXTRACTION' && currentModeRef.current === 'content') {
        clearAllTimeouts();
        currentModeRef.current = null;
        const text: string = data.text || '';
        if (resolveContentRef.current) {
          resolveContentRef.current(text);
          resolveContentRef.current = null;
          rejectContentRef.current = null;
        }
      } else if (data.type === 'ERROR') {
        clearAllTimeouts();
        currentModeRef.current = null;
        const err = new Error(data.message || 'WebView error');
        if (resolveUrlsRef.current) { resolveUrlsRef.current([]); resolveUrlsRef.current = null; rejectUrlsRef.current = null; }
        if (resolveContentRef.current) { resolveContentRef.current(''); resolveContentRef.current = null; rejectContentRef.current = null; }
      }
    } catch (err) {
      console.warn('[DomainScraper] Message parse error:', err);
    }
  }, [clearAllTimeouts]);

  // ─── Page Load Handlers ──────────────────────────────────────────────────

  const onLoadEnd = useCallback(() => {
    const mode = currentModeRef.current;
    if (!mode || !webViewRef.current) return;

    const script = mode === 'url' ? WEBVIEW_URL_EXTRACTOR_SCRIPT : WEBVIEW_CONTENT_EXTRACTOR_SCRIPT;

    // Small delay for any last JS rendering, then inject
    setTimeout(() => {
      try {
        webViewRef.current?.injectJavaScript(script);
      } catch (err) {
        console.warn('[DomainScraper] injectJavaScript failed:', err);
        // Fallback: resolve with empty
        if (mode === 'url' && resolveUrlsRef.current) {
          resolveUrlsRef.current([]);
          resolveUrlsRef.current = null; rejectUrlsRef.current = null;
        }
        if (mode === 'content' && resolveContentRef.current) {
          resolveContentRef.current('');
          resolveContentRef.current = null; rejectContentRef.current = null;
        }
        currentModeRef.current = null;
      }
    }, 500);
  }, []);

  // ─── URL Discovery ───────────────────────────────────────────────────────

  const discoverUrlsForQuery = useCallback((searchUrl: string): Promise<string[]> => {
    return new Promise<string[]>((resolve, reject) => {
      resolveUrlsRef.current = resolve;
      rejectUrlsRef.current = reject;
      currentModeRef.current = 'url';
      clearAllTimeouts();

      // Navigate the WebView natively by changing the state-bound URL prop
      if (webViewRef.current) {
        try {
          webViewRef.current.stopLoading();
        } catch { /* ignore */ }
        useSearchStore.getState().setActiveScraperUrl(searchUrl);
      } else {
        reject(new Error('WebView not ready'));
        return;
      }

      // Safety timeout
      urlTimeoutRef.current = setTimeout(() => {
        currentModeRef.current = null;
        if (resolveUrlsRef.current) {
          resolveUrlsRef.current([]);
          resolveUrlsRef.current = null;
          rejectUrlsRef.current = null;
        }
      }, APP_CONFIG.urlDiscoveryTimeoutMs);
    });
  }, [clearAllTimeouts]);

  const discoverUrls = useCallback(async (
    company: string,
    role: string,
    country: string,
    state?: string,
    district?: string
  ): Promise<string[]> => {
    const maxDomains = useAppStore.getState().maxDomainsToScrape;
    const allRawUrls: string[] = [];
    const engines: Array<'duckduckgo' | 'brave' | 'bing'> = ['duckduckgo', 'brave', 'bing'];

    // Search comprehensively across all templates and engines
    for (const template of APP_CONFIG.searchQueryTemplates) {
      if (allRawUrls.length >= maxDomains * 2) break; // gathered plenty of raw candidates
      
      for (const engine of engines) {
        const searchUrl = buildSearchUrl(engine, company, role, country, state, district, template);
        try {
          const urls = await discoverUrlsForQuery(searchUrl);
          if (urls.length > 0) {
            allRawUrls.push(...urls);
          }
        } catch {
          // Engine failed, try next
        }

        // Optional page 2 pagination to hit higher targets (like 50 domains)
        if (allRawUrls.length < maxDomains) {
          try {
            let page2Url = '';
            if (engine === 'brave') {
              page2Url = `${searchUrl}&page=2`;
            } else if (engine === 'bing') {
              page2Url = `${searchUrl}&first=11`;
            }
            if (page2Url) {
              const urls2 = await discoverUrlsForQuery(page2Url);
              if (urls2.length > 0) {
                allRawUrls.push(...urls2);
              }
            }
          } catch {
            // ignore pagination errors
          }
        }
      }
    }

    const filtered = cleanAndFilterUrls(allRawUrls, company, country);
    return filtered.slice(0, maxDomains);
  }, [discoverUrlsForQuery]);

  // ─── Page Scraping ───────────────────────────────────────────────────────

  const scrapeUrl = useCallback((url: string): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      resolveContentRef.current = resolve;
      rejectContentRef.current = reject;
      currentModeRef.current = 'content';
      clearAllTimeouts();

      // Navigate the WebView natively by changing the state-bound URL prop
      if (webViewRef.current) {
        try {
          webViewRef.current.stopLoading();
        } catch { /* ignore */ }
        useSearchStore.getState().setActiveScraperUrl(url);
      } else {
        reject(new Error('WebView not ready'));
        return;
      }

      // Safety timeout
      contentTimeoutRef.current = setTimeout(() => {
        currentModeRef.current = null;
        if (resolveContentRef.current) {
          resolveContentRef.current('');
          resolveContentRef.current = null;
          rejectContentRef.current = null;
        }
      }, APP_CONFIG.perDomainTimeoutMs);
    });
  }, [clearAllTimeouts]);

  return {
    setWebViewRef,
    discoverUrls,
    scrapeUrl,
    handleMessage,
    onLoadEnd,
  };
}
