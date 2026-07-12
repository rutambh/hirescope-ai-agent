import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSearchStore } from '../store/searchStore';
import { useScraper } from '../hooks/useScraper';
import { 
  useActiveWebViewRequest, 
  resolveActiveWebViewRequest, 
  rejectActiveWebViewRequest,
  hasBlockedExtension
} from '../hooks/useDomainScraper';
import { APP_CONFIG } from '../constants/config';
import { logger } from '../utils/logger';

export function BackgroundScraper() {
  const activeRequest = useActiveWebViewRequest();
  const webViewRef = useRef<WebView>(null);
  const activeSearches = useSearchStore((s) => s.activeSearches);
  const scraper = useScraper();
  const startedRef = useRef(false);

  const latestSearch = activeSearches[activeSearches.length - 1];
  const phase = latestSearch?.phase ?? 'idle';

  useEffect(() => {
    if ((phase === 'searching' || phase === 'extracting') && !startedRef.current) {
      startedRef.current = true;
      scraper.runScrape().catch((err: any) => {
        console.error('BackgroundScraper error:', err);
      });
    } else if (phase === 'idle' || phase === 'complete' || phase === 'error') {
      startedRef.current = false;
    }
  }, [phase, scraper]);

  const handleLoadEnd = () => {
    if (!activeRequest || !webViewRef.current) return;

    logger.info('BackgroundScraper', `WebView loaded URL: ${activeRequest.url}`);

    let jsCode = '';
    if (activeRequest.action === 'discover') {
      jsCode = `
        (function() {
          try {
            var urls = [];
            var seen = new Set();
            function resolveRedirect(raw) {
              try {
                var u = new URL(raw);
                var host = u.hostname;
                var params = u.searchParams;
                // DuckDuckGo wraps results in /l/?uddg=<percent-encoded target>
                if (host.indexOf('duckduckgo.com') !== -1) {
                  var uddg = params.get('uddg');
                  if (uddg) return decodeURIComponent(uddg);
                }
                // Yahoo / some engines use ?url=<encoded target>
                var urlParam = params.get('url');
                if (urlParam) {
                  if (/^https?:/i.test(urlParam)) return urlParam;
                  try {
                    var dec = decodeURIComponent(urlParam);
                    if (/^https?:/i.test(dec)) return dec;
                  } catch (e) {}
                }
              } catch (e) {}
              return raw;
            }
            function addUrl(rawUrl) {
              if (!rawUrl || !rawUrl.startsWith('http')) return;
              var resolved = resolveRedirect(rawUrl);
              var clean = resolved.replace(/[?&](utm_\\w+|ref|source|fbclid|gclid|mc_cid|mc_eid)=[^&]*/gi, '');
              if (!seen.has(clean)) {
                seen.add(clean);
                urls.push(resolved);
              }
            }
            document.querySelectorAll('a').forEach(function(a) {
              addUrl(a.href);
            });
            document.querySelectorAll('[data-href], [data-url]').forEach(function(el) {
              addUrl(el.getAttribute('data-href') || el.getAttribute('data-url'));
            });
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'urls',
              urls: urls
            }));
          } catch (err) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: err.message
            }));
          }
        })();
      `;
    } else {
      jsCode = `
        (function() {
          try {
            var jsonLdBlocks = [];
            document.querySelectorAll('script[type="application/ld+json"]').forEach(function(script) {
              var text = script.textContent || '';
              if (text.indexOf('salary') !== -1 || text.indexOf('Salary') !== -1 ||
                  text.indexOf('compensation') !== -1 || text.indexOf('Compensation') !== -1 ||
                  text.indexOf('baseSalary') !== -1 || text.indexOf('BaseSalary') !== -1) {
                jsonLdBlocks.push(text.trim());
              }
            });

            var selectorsToRemove = ['script', 'style', 'nav', 'footer', 'header', 'aside', 'noscript', 'svg', 'button', 'form', 'input', 'select', 'iframe'];
            selectorsToRemove.forEach(function(sel) {
              document.querySelectorAll(sel).forEach(function(el) {
                el.remove();
              });
            });

            var bodyText = document.body ? (document.body.innerText || document.body.textContent || '') : '';
            var cleanText = bodyText.replace(/\\s+/g, ' ').trim();

            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'scraped',
              text: cleanText,
              jsonLd: jsonLdBlocks
            }));
          } catch (err) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              message: err.message
            }));
          }
        })();
      `;
    }

    webViewRef.current.injectJavaScript(jsCode);
  };

  const handleMessage = (event: any) => {
    if (!activeRequest) return;
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'urls') {
        resolveActiveWebViewRequest(data.urls);
      } else if (data.type === 'scraped') {
        let text = data.text;
        if (data.jsonLd && data.jsonLd.length > 0) {
          text += '\n\n=== JSON-LD START ===\n' + data.jsonLd.join('\n') + '\n=== JSON-LD END ===';
        }
        resolveActiveWebViewRequest({ text });
      } else if (data.type === 'error') {
        rejectActiveWebViewRequest(new Error(data.message));
      }
    } catch (err: any) {
      rejectActiveWebViewRequest(err);
    }
  };

  return (
    <View style={{ position: 'absolute', width: 1, height: 1, opacity: 0.01, left: -9999, top: -9999, overflow: 'hidden' }}>
      <WebView
        ref={webViewRef}
        source={activeRequest ? { uri: activeRequest.url } : { html: '<html><body></body></html>' }}
        userAgent={APP_CONFIG.webViewUserAgent}
        style={{ width: 1, height: 1 }}
        onLoadStart={(event) => {
          const { url } = event.nativeEvent;
          if (hasBlockedExtension(url)) {
            logger.warn('BackgroundScraper WebView', `Aborting download URL via onLoadStart: ${url}`);
            if (webViewRef.current) {
              try {
                webViewRef.current.stopLoading();
              } catch (e) {
                logger.error('BackgroundScraper WebView', 'Failed to stopLoading', e);
              }
            }
            rejectActiveWebViewRequest({ reason: 'blocked_download', message: 'file download blocked via onLoadStart' });
          }
        }}
        onLoadEnd={handleLoadEnd}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onShouldStartLoadWithRequest={(request) => {
          const { url } = request;
          // Allow about:blank and data urls
          if (url === 'about:blank' || url.startsWith('data:') || url.startsWith('file://')) {
            return true;
          }
          // Block non-http/https URLs (e.g. market://, intent://)
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            logger.info('BackgroundScraper WebView', `Blocked custom scheme navigation: ${url}`);
            return false;
          }
          // Block app store links
          if (
            url.includes('play.google.com') ||
            url.includes('market://') ||
            url.includes('apps.apple.com') ||
            url.includes('itunes.apple.com')
          ) {
            logger.info('BackgroundScraper WebView', `Blocked app store navigation: ${url}`);
            return false;
          }
          // Block downloadable/binary resources (PDF, Office docs, archives,
          // installers). Loading these triggers the OS download manager instead
          // of rendering HTML — never let the WebView navigate to them.
          if (hasBlockedExtension(url)) {
            logger.info('BackgroundScraper WebView', `Blocked downloadable file navigation: ${url}`);
            return false;
          }
          return true;
        }}
        // Layer 4b (defense-in-depth): react-native-webview 13.15.0 (Android) does
        // NOT emit onFileDownload on its own — a patch-package patch to RNW makes
        // the DownloadListener emit `topFileDownload` instead of enqueuing to the
        // system DownloadManager. That patch is the real prevention (Layer 4a).
        // This handler is the JS half: if a download is intercepted, fail the
        // in-flight scrape immediately (no 30s hang) so domainHealthStore records
        // a `blocked_download`. NOTE: the native patch already prevents the OS
        // file save; this only adds fast-failure + observability.
        onFileDownload={(event: any) => {
          const downloadUrl = event?.nativeEvent?.downloadUrl;
          logger.warn('BackgroundScraper WebView', `File download intercepted (blocked_download): ${downloadUrl}`);
          rejectActiveWebViewRequest({ reason: 'blocked_download', message: 'file download intercepted' });
        }}
        onError={(err) => {
          if (!activeRequest) return;
          logger.error('BackgroundScraper WebView', 'Load error', err.nativeEvent);
          rejectActiveWebViewRequest(new Error(`WebView load failed: ${err.nativeEvent.description}`));
        }}
      />
    </View>
  );
}
