// src/hooks/useNotification.ts
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { router } from 'expo-router';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function useNotification() {
  useEffect(() => {
    // Request permissions on mount
    async function requestPermissions() {
      if (Platform.OS === 'android') {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.warn('Failed to get push token for local notifications!');
        }
      }
    }

    requestPermissions();

    // Listen for notification taps (when user taps the notification)
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data && data.screen === 'results') {
        // Navigate to the results screen
        router.replace('/results');
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  async function triggerSearchCompleteNotification(company: string, role: string, country: string) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Research Complete ✅',
          body: `${company} · ${role} · ${country} results are ready`,
          data: { screen: 'results' },
          sound: true,
        },
        trigger: null, // immediately
      });
    } catch (error) {
      console.error('Error triggering notification:', error);
    }
  }

  return { triggerSearchCompleteNotification };
}
