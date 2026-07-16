import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Appearance } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useNotification } from '../src/hooks/useNotification';
import { useAppStore } from '../src/store/appStore';
import { BackgroundScraper } from '../src/components/BackgroundScraper';
import { AiDownloadPrompt } from '../src/components/AiDownloadPrompt';
import { useAiDownloadNotification } from '../src/hooks/useAiDownloadNotification';
import { useTheme } from '../src/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Suppress known benign crash from whatwg-fetch polyfill (RangeError: status 0)
const globalAny = global as any;
if (globalAny.ErrorUtils) {
  const origHandler = globalAny.ErrorUtils.getGlobalHandler();
  globalAny.ErrorUtils.setGlobalHandler((error: any, isFatal: any) => {
    if (error?.message?.includes("Failed to construct 'Response'")) {
      console.warn('[HireScope] Suppressed whatwg-fetch polyfill error:', error.message);
      return;
    }
    origHandler(error, isFatal);
  });
}

export default function RootLayout() {
  useNotification();
  useAiDownloadNotification();
  const theme = useAppStore((state) => state.theme);
  const { isDark, c } = useTheme();

  useEffect(() => {
    if (theme === 'dark') Appearance.setColorScheme('dark');
    else if (theme === 'light') Appearance.setColorScheme('light');
    else Appearance.setColorScheme(null);
  }, [theme]);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : theme === 'light' ? 'dark' : 'auto'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="results" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <BackgroundScraper />
      <AiDownloadPrompt />
    </>
  );
}
