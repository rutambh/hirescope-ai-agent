// src/hooks/useAiDownloadNotification.ts
// Shows a persistent progress notification while the AI model is downloading.
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useAIModelStore } from '../store/aiModelStore';
import { APP_CONFIG } from '../constants/config';

const NOTIF_ID = 'ai-model-download';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

export function useAiDownloadNotification() {
  const status = useAIModelStore((s) => s.status);
  const downloadedBytes = useAIModelStore((s) => s.downloadedBytes);
  const totalBytes = useAIModelStore((s) => s.totalBytes);
  const prevStatusRef = useRef(status);

  useEffect(() => {
    const wasDownloading = prevStatusRef.current === 'downloading' || prevStatusRef.current === 'paused';
    const isDownloading = status === 'downloading' || status === 'paused';

    // Show / update notification while downloading
    if (isDownloading) {
      const pct = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
      const body = status === 'paused'
        ? `Paused at ${pct}% — ${formatBytes(downloadedBytes)} of ~${APP_CONFIG.modelExpectedSizeMb} MB`
        : `${pct}% complete — ${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes > 0 ? totalBytes : APP_CONFIG.modelExpectedSizeMb * 1024 * 1024)}`;

      Notifications.scheduleNotificationAsync({
        identifier: NOTIF_ID,
        content: {
          title: status === 'paused' ? 'AI Download Paused' : 'Downloading AI Model',
          body,
          data: { screen: 'settings' },
          sound: false,
        },
        trigger: null,
      }).catch(() => {});
    }

    // Cancel notification when download finishes, errors, or is cancelled
    if (wasDownloading && !isDownloading) {
      Notifications.cancelScheduledNotificationAsync(NOTIF_ID).catch(() => {});

      // Show a one-shot completion / error notification
      if (status === 'installed') {
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'AI Model Ready',
            body: 'AI summaries are now active for your next research.',
            data: { screen: 'settings' },
            sound: true,
          },
          trigger: null,
        }).catch(() => {});
      } else if (status === 'error') {
        Notifications.scheduleNotificationAsync({
          content: {
            title: 'AI Download Failed',
            body: 'Something went wrong. Open Settings to retry.',
            data: { screen: 'settings' },
            sound: true,
          },
          trigger: null,
        }).catch(() => {});
      }
    }

    prevStatusRef.current = status;
  }, [status, downloadedBytes, totalBytes]);
}
