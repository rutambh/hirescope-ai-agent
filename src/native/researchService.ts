// src/native/researchService.ts
//
// Thin JS bridge to the Android foreground service (ResearchModule). Keeps the
// research process alive (and out of Doze) while the app is backgrounded so the
// hidden-WebView scrape can continue. No-op on non-Android platforms.

import { NativeModules, Platform } from 'react-native';

type ResearchModuleType = {
  startService: (params: { title: string; text: string }) => void;
  updateNotification: (params: { title: string; text: string }) => void;
  stopService: () => void;
};

const ResearchModule = NativeModules.ResearchModule as ResearchModuleType | undefined;

export function startResearchService(title: string, text: string): void {
  if (Platform.OS !== 'android' || !ResearchModule) return;
  try {
    ResearchModule.startService({ title, text });
  } catch {
    // Native layer unavailable — scraping still works in the foreground.
  }
}

export function updateResearchNotification(title: string, text: string): void {
  if (Platform.OS !== 'android' || !ResearchModule) return;
  try {
    ResearchModule.updateNotification({ title, text });
  } catch {
    /* ignore */
  }
}

export function stopResearchService(): void {
  if (Platform.OS !== 'android' || !ResearchModule) return;
  try {
    ResearchModule.stopService();
  } catch {
    /* ignore */
  }
}
