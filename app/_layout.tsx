import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Appearance } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useNotification } from '../src/hooks/useNotification';
import { useAppStore } from '../src/store/appStore';
import { BackgroundScraper } from '../src/components/BackgroundScraper';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Suppress known benign crash from whatwg-fetch polyfill (RangeError: status 0)
if (global.ErrorUtils) {
  const origHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (error?.message?.includes("Failed to construct 'Response'")) {
      console.warn('[HireScope] Suppressed whatwg-fetch polyfill error:', error.message);
      return;
    }
    origHandler(error, isFatal);
  });
}

export default function RootLayout() {
  useNotification();
  const theme = useAppStore((state) => state.theme);

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
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0B0B1A' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="results" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <BackgroundScraper />
    </>
  );
}
