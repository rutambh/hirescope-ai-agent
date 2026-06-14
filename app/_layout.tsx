import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Appearance } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useNotification } from '../src/hooks/useNotification';
import { useAppStore } from '../src/store/appStore';
import { BackgroundScraper } from '../src/components/BackgroundScraper';

SplashScreen.preventAutoHideAsync().catch(() => {});

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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="results" options={{ animation: 'slide_from_right' }} />
      </Stack>
      <BackgroundScraper />
    </>
  );
}
