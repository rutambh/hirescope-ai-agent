// src/components/BackgroundScraper.tsx
//
// Hidden component that hosts a single persistent WebView for scraping.
//
// KEY FIX (V5):
// - Uses a single WebView instance (no key-based remounting between queries)
// - WebView is small (300x300) but NOT 1x1 — some sites block tiny viewports
// - Uses setWebViewRef to give the hook direct access to the WebView
// - Calls onLoadEnd → hook.injectJavaScript() instead of injectedJavaScript prop
// - WebView is always mounted but offscreen when not active

import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSearchStore } from '../store/searchStore';
import { useScraper } from '../hooks/useScraper';
import { APP_CONFIG } from '../constants/config';

export function BackgroundScraper() {
  const phase = useSearchStore((s) => s.activePhase);
  const scraperUrl = useSearchStore((s) => s.activeScraperUrl);
  const scraper = useScraper();
  const startedRef = useRef(false);
  const webViewRef = useRef<WebView>(null);

  const setWebViewRef = useCallback((ref: WebView | null) => {
    (webViewRef as any).current = ref;
    scraper.setWebViewRef(ref);
  }, [scraper]);

  // Start scraping when phase changes to searching/extracting
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

  const isActive = phase === 'searching' || phase === 'extracting';
  if (!isActive) return null;

  return (
    <View style={styles.hiddenContainer}>
      <View style={styles.webviewWrapper}>
        <WebView
          ref={setWebViewRef}
          source={{ uri: scraperUrl || 'about:blank' }}
          onMessage={scraper.handleMessage}
          onLoadEnd={scraper.onLoadEnd}
          onLoadStart={(e) => {
            console.log(`[Scraper] LoadStart: ${e.nativeEvent.url}`);
          }}
          onError={(e) => {
            console.warn(`[Scraper] Error: ${e.nativeEvent.description}`);
          }}
          userAgent={APP_CONFIG.webViewUserAgent}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mediaPlaybackRequiresUserAction={true}
          mixedContentMode="compatibility"
          allowsInlineMediaPlayback={true}
          cacheMode="LOAD_DEFAULT"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenContainer: {
    position: 'absolute',
    top: -9999,
    left: -9999,
    width: 0,
    height: 0,
    overflow: 'hidden',
  },
  webviewWrapper: {
    width: 300,
    height: 300,
    opacity: 0.01,
  },
});
