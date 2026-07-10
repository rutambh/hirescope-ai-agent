import React, { useEffect, useRef } from 'react';
import { WebView } from 'react-native-webview';
import { useSearchStore } from '../store/searchStore';
import { useScraper } from '../hooks/useScraper';
import { 
  useActiveWebViewRequest, 
  resolveActiveWebViewRequest, 
  rejectActiveWebViewRequest 
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
            function addUrl(rawUrl) {
              if (!rawUrl || !rawUrl.startsWith('http')) return;
              var clean = rawUrl.replace(/[?&](utm_\\w+|ref|source|fbclid|gclid|mc_cid|mc_eid)=[^&]*/gi, '');
              if (!seen.has(clean)) {
                seen.add(clean);
                urls.push(rawUrl);
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

  if (!activeRequest) {
    return null;
  }

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: activeRequest.url }}
      userAgent={APP_CONFIG.webViewUserAgent}
      style={{ width: 0, height: 0, opacity: 0, position: 'absolute' }}
      onLoadEnd={handleLoadEnd}
      onMessage={handleMessage}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      onError={(err) => {
        logger.error('BackgroundScraper WebView', 'Load error', err.nativeEvent);
        rejectActiveWebViewRequest(new Error(`WebView load failed: ${err.nativeEvent.description}`));
      }}
    />
  );
}
