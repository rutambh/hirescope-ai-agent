import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAIModelStore } from '../store/aiModelStore';
import { APP_CONFIG } from '../constants/config';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors, Spacing, Radius } from '../constants/theme';

export function AiDownloadPrompt() {
  const { status, promptDismissed, dismissPrompt } = useAIModelStore();
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;
  const router = useRouter();

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!promptDismissed && status === 'not_installed') {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [promptDismissed, status]);

  const handleDownload = () => {
    setVisible(false);
    dismissPrompt();
    router.push('/(tabs)/settings');
  };

  const handleLater = () => {
    setVisible(false);
    dismissPrompt();
  };

  if (promptDismissed || status !== 'not_installed') return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleLater}>
      <TouchableOpacity style={[styles.overlay, { backgroundColor: c.overlay }]} activeOpacity={1} onPress={handleLater}>
        <View style={[styles.dialog, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: c.primaryLight }]}>
            <Ionicons name="sparkles" size={28} color={c.primary} />
          </View>

          <Text style={[styles.title, { color: c.text }]}>Unlock AI-Powered Insights</Text>
          <Text style={[styles.message, { color: c.textSecondary }]}>
            Get instant, natural language summaries of salary data, ratings, and employee reviews — all processed{' '}
            <Text style={{ fontWeight: '700', color: c.text }}>on your device</Text>.{'\n\n'}
            No data ever leaves your phone. Zero cloud dependency.
          </Text>

          <View style={styles.featureRow}>
            <View style={[styles.featureChip, { backgroundColor: c.primaryLight }]}>
              <Ionicons name="lock-closed" size={12} color={c.primary} />
              <Text style={[styles.featureText, { color: c.primary }]}>100% Private</Text>
            </View>
            <View style={[styles.featureChip, { backgroundColor: c.successLight }]}>
              <Ionicons name="phone-portrait" size={12} color={c.success} />
              <Text style={[styles.featureText, { color: c.success }]}>On-Device</Text>
            </View>
            <View style={[styles.featureChip, { backgroundColor: c.warningLight }]}>
              <Ionicons name="cloud-offline" size={12} color={c.warning} />
              <Text style={[styles.featureText, { color: c.warning }]}>No Internet</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.laterBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
              onPress={handleLater}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, { color: c.textSecondary }]}>Maybe Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.downloadBtn, { backgroundColor: c.primary }]}
              onPress={handleDownload}
              activeOpacity={0.7}
            >
              <Ionicons name="download" size={18} color={isDark ? '#051424' : '#FFF'} />
              <Text style={[styles.btnText, { color: isDark ? '#051424' : '#FFF', fontWeight: '800' }]}>
                Download (~{APP_CONFIG.modelExpectedSizeMb} MB)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 10,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: Spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.xl,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    borderWidth: 1,
  },
  laterBtn: {},
  downloadBtn: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
