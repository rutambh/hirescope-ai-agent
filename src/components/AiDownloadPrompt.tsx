import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAIModelStore } from '../store/aiModelStore';
import { useAIModel } from '../hooks/useAIModel';
import { useAppStore } from '../store/appStore';
import { Spacing, Radius, useTheme } from '../constants/theme';

export function AiDownloadPrompt() {
  const { status, promptDismissed, dismissPrompt } = useAIModelStore();
  const { theme } = useAppStore();
  const { isDark, c } = useTheme();
  const router = useRouter();
  const aiModel = useAIModel();

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!promptDismissed && status === 'not_installed') {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [promptDismissed, status]);

  const handleDownload = () => {
    if (status === 'downloading' || status === 'validating') return;
    setVisible(false);
    dismissPrompt();
    aiModel.downloadModel();
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
            No data leaves your phone
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.laterBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
              onPress={handleLater}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, { color: c.textSecondary }]}>Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.downloadBtn, { backgroundColor: c.primary }]}
              onPress={handleDownload}
              activeOpacity={0.7}
            >
              <Ionicons name="download" size={18} color={c.onPrimary} />
              <Text style={[styles.btnText, { color: c.onPrimary, fontWeight: '800' }]}>
                Download
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
