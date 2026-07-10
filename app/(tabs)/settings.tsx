import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking,
  Platform, Modal, useColorScheme, PanResponder, Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAppStore } from '../../src/store/appStore';
import { useAIModel } from '../../src/hooks/useAIModel';
import { APP_CONFIG } from '../../src/constants/config';
import { LightColors, DarkColors, Spacing, Radius } from '../../src/constants/theme';
import { ThemedConfirm } from '../../src/components/ThemedConfirm';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '';
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, setTheme, maxDomainsToScrape, setMaxDomainsToScrape } = useAppStore();
  const systemColorScheme = useColorScheme();
  const aiModel = useAIModel();
  const [downloadConfirmVisible, setDownloadConfirmVisible] = useState(false);
  const [restartAlertVisible, setRestartAlertVisible] = useState(false);
  const [copiedAlertVisible, setCopiedAlertVisible] = useState(false);
  const [deleteModelVisible, setDeleteModelVisible] = useState(false);
  const [shareErrorVisible, setShareErrorVisible] = useState(false);
  const [shareErrorMsg, setShareErrorMsg] = useState('');

  const prevStatusRef = useRef(aiModel.status);

  useEffect(() => {
    if (prevStatusRef.current !== 'installed' && aiModel.status === 'installed') {
      setRestartAlertVisible(true);
    }
    prevStatusRef.current = aiModel.status;
  }, [aiModel.status]);

  const [sliderWidth, setSliderWidth] = useState(0);
  const [sliderLeft, setSliderLeft] = useState(0);
  const sliderRef = useRef<View>(null);

  const handleSliderLayout = () => {
    sliderRef.current?.measure((_x, _y, width, _height, absoluteX) => {
      if (width > 0) { setSliderWidth(width); setSliderLeft(absoluteX); }
    });
  };

  const calculateSliderValue = (pageX: number) => {
    if (sliderWidth === 0) return;
    const relX = Math.max(0, Math.min(sliderWidth, pageX - sliderLeft));
    const pct = relX / sliderWidth;
    setMaxDomainsToScrape(Math.round(10 + pct * 40));
  };

  const calculateSliderValueRef = useRef(calculateSliderValue);
  calculateSliderValueRef.current = calculateSliderValue;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => calculateSliderValueRef.current(e.nativeEvent.pageX),
      onPanResponderMove: (e) => calculateSliderValueRef.current(e.nativeEvent.pageX),
    })
  ).current;

  const sliderFillPct = ((maxDomainsToScrape - 10) / 40) * 100;

  const handleCopyUPI = async () => {
    await Clipboard.setStringAsync('rutambh@upi');
    setCopiedAlertVisible(true);
  };

  const handleOpenBatterySettings = async () => {
    if (Platform.OS === 'android') {
      try { await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS'); }
      catch { Linking.openSettings(); }
    } else { Linking.openSettings(); }
  };

  const handleOpenAppInfo = async () => {
    if (Platform.OS === 'android') {
      try { await Linking.sendIntent('android.settings.APPLICATION_DETAILS_SETTINGS', [{ key: 'package', value: 'com.rutambh.hirescope' }]); }
      catch { Linking.openSettings(); }
    } else { Linking.openSettings(); }
  };

  const handleStartDownload = useCallback(() => {
    setDownloadConfirmVisible(false);
    aiModel.downloadModel();
  }, [aiModel]);

  const handleDeleteModel = () => {
    setDeleteModelVisible(true);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Check out HireScope! Get consolidated salary ranges, employee ratings, and reviews locally and privately: https://play.google.com/store/apps/details?id=com.rutambh.hirescope',
      });
    } catch (err: any) {
      setShareErrorMsg(err.message);
      setShareErrorVisible(true);
    }
  };

  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const C = isDark ? DarkColors : LightColors;

  const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    not_installed: { label: 'Not Installed', color: C.textMuted, bg: C.surfaceAlt },
    downloading: { label: 'Downloading', color: C.accent, bg: C.accentLight },
    paused: { label: 'Paused', color: C.warning, bg: C.warningLight },
    validating: { label: 'Validating', color: C.accent, bg: C.accentLight },
    installed: { label: 'Installed', color: C.success, bg: C.successLight },
    error: { label: 'Error', color: C.danger, bg: C.dangerLight },
  };

  const renderAI = () => {
    const { status, downloadedBytes, totalBytes, speedBytesPerSec, errorMessage, installedVersion } = aiModel;
    const progressPct = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
    const cfg = statusCfg[status] || statusCfg.not_installed;

    return (
      <View style={[styles.aiCard, {
        backgroundColor: isDark ? 'rgba(18, 33, 49, 0.4)' : C.surface,
      }]}>
        <View style={styles.aiHeader}>
          <View style={[styles.aiIcon, { backgroundColor: C.primaryLight }]}>
            <Ionicons name="sparkles" size={18} color={C.primary} />
          </View>
          <View style={styles.aiHeaderText}>
            <Text style={[styles.aiName, { color: C.text }]}>{APP_CONFIG.modelDisplayName}</Text>
            <View style={[styles.statusPill, { backgroundColor: cfg.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
              <Text style={[styles.statusPillText, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          </View>
        </View>

        {status === 'downloading' && (
          <View style={styles.aiBody}>
            <View style={styles.progressInfoRow}>
              <Text style={[styles.progressPct, { color: C.accent }]}>{progressPct}%</Text>
              {speedBytesPerSec > 0 && <Text style={[styles.speedText, { color: C.textSecondary }]}>{formatSpeed(speedBytesPerSec)}</Text>}
            </View>
            <View style={[styles.progressTrack, { backgroundColor: C.surface }]}>
              <View style={[styles.progressFill, { backgroundColor: C.accent, width: `${progressPct}%` }]} />
            </View>
            <Text style={[styles.progressBytes, { color: C.textMuted }]}>
              {formatBytes(downloadedBytes)} / {formatBytes(totalBytes > 0 ? totalBytes : APP_CONFIG.modelExpectedSizeMb * 1024 * 1024)}
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: isDark ? C.surface : C.bg }]} onPress={aiModel.pauseDownload}>
                <Ionicons name="pause" size={12} color={C.text} />
                <Text style={[styles.smallBtnText, { color: C.text }]}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.dangerLight }]} onPress={aiModel.cancelDownload}>
                <Ionicons name="close" size={12} color={C.danger} />
                <Text style={[styles.smallBtnText, { color: C.danger }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {status === 'paused' && (
          <View style={styles.aiBody}>
            <View style={[styles.progressTrack, { backgroundColor: C.surface }]}>
              <View style={[styles.progressFill, { backgroundColor: C.warning, width: `${progressPct}%` }]} />
            </View>
            <Text style={[styles.progressBytes, { color: C.textMuted }]}>{formatBytes(downloadedBytes)} / {formatBytes(APP_CONFIG.modelExpectedSizeMb * 1024 * 1024)}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: C.primary }]} onPress={aiModel.resumeDownload}>
                <Ionicons name="play" size={12} color={isDark ? '#051424' : '#FFF'} />
                <Text style={[styles.primaryBtnText, { color: isDark ? '#051424' : '#FFF' }]}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.dangerLight }]} onPress={aiModel.cancelDownload}>
                <Ionicons name="close" size={12} color={C.danger} />
                <Text style={[styles.smallBtnText, { color: C.danger }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {status === 'validating' && (
          <View style={styles.aiBody}>
            <Text style={[styles.validatingText, { color: C.accent }]}>Verifying model integrity...</Text>
          </View>
        )}

        {status === 'installed' && (
          <View style={styles.aiBody}>
            <View style={styles.metaRow}>
              {installedVersion && (
                <View style={styles.metaItem}>
                  <Text style={[styles.metaLabel, { color: C.textMuted }]}>Version</Text>
                  <Text style={[styles.metaValue, { color: C.text }]}>{installedVersion}</Text>
                </View>
              )}
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: C.textMuted }]}>Size</Text>
                <Text style={[styles.metaValue, { color: C.text }]}>~{APP_CONFIG.modelExpectedSizeMb} MB</Text>
              </View>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.dangerLight }]} onPress={handleDeleteModel}>
                <Ionicons name="trash-outline" size={12} color={C.danger} />
                <Text style={[styles.smallBtnText, { color: C.danger }]}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: isDark ? C.surface : C.bg }]} onPress={() => { aiModel.deleteModel().then(() => setDownloadConfirmVisible(true)); }}>
                <Ionicons name="refresh" size={12} color={C.text} />
                <Text style={[styles.smallBtnText, { color: C.text }]}>Re-download</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.aiBody}>
            {errorMessage && (
              <View style={[styles.errorBox, { backgroundColor: C.dangerLight }]}>
                <Ionicons name="alert-circle" size={12} color={C.danger} />
                <Text style={[styles.errorText, { color: C.danger }]} numberOfLines={2}>{errorMessage}</Text>
              </View>
            )}
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: C.primary }]} onPress={() => { aiModel.cancelDownload(); setDownloadConfirmVisible(true); }}>
              <Ionicons name="refresh" size={12} color={isDark ? '#051424' : '#FFF'} />
              <Text style={[styles.primaryBtnText, { color: isDark ? '#051424' : '#FFF' }]}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'not_installed' && (
          <View style={styles.aiBody}>
            <Text style={[styles.aiDesc, { color: C.textSecondary }]}>
              Optional on-device AI for natural summaries. Not needed for core features.
            </Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: C.primaryDark }]} onPress={() => setDownloadConfirmVisible(true)}>
              <Ionicons name="download-outline" size={14} color="#FFF" />
              <Text style={[styles.primaryBtnText, { color: '#FFF', fontWeight: '700' }]}>Download (~{APP_CONFIG.modelExpectedSizeMb} MB)</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        {/* Centered Tab Header - No back buttons */}
        <View style={styles.header}>
          <View style={{ width: 22 }} />
          <Text style={[styles.headerTitle, { color: C.text }]}>Settings</Text>
          <View style={{ width: 22 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* AI Model — top of page, standalone */}
          {renderAI()}

          {/* Visual Theme */}
          <View style={[styles.glassCard, { backgroundColor: isDark ? 'rgba(18, 33, 49, 0.4)' : C.surface }]}>
            <View style={styles.settingItem}>
              <Text style={[styles.settingLabel, { color: C.textSecondary }]}>Visual Theme</Text>

              <View style={styles.themeGrid}>
                <TouchableOpacity
                  style={[styles.themeOption, theme === 'dark' && { borderColor: C.primary, borderWidth: 2 }]}
                  onPress={() => setTheme('dark')}
                >
                  <View style={[styles.themePreview, { backgroundColor: '#051424' }]} />
                  <Text style={[styles.themeText, { color: theme === 'dark' ? C.primary : C.text }]}>Midnight</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.themeOption, theme === 'light' && { borderColor: C.primary, borderWidth: 2 }]}
                  onPress={() => setTheme('light')}
                >
                  <View style={[styles.themePreview, { backgroundColor: '#f9f9f9', borderColor: '#e2e8f0', borderWidth: 1 }]} />
                  <Text style={[styles.themeText, { color: theme === 'light' ? C.primary : C.text }]}>Crystal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.themeOption, theme === 'system' && { borderColor: C.primary, borderWidth: 2 }]}
                  onPress={() => setTheme('system')}
                >
                  <View style={[styles.themePreview, { flexDirection: 'row', overflow: 'hidden' }]}>
                    <View style={{ flex: 1, backgroundColor: '#051424' }} />
                    <View style={{ flex: 1, backgroundColor: '#f9f9f9' }} />
                  </View>
                  <Text style={[styles.themeText, { color: theme === 'system' ? C.primary : C.text }]}>Space</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Scrape Domain Limit */}
          <View style={[styles.glassCard, { backgroundColor: isDark ? 'rgba(18, 33, 49, 0.4)' : C.surface }]}>
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <Text style={[styles.sliderLabel, { color: C.textSecondary }]}>Search Domain Limit</Text>
                <View style={[styles.chip, { backgroundColor: C.primaryLight }]}>
                  <Text style={[styles.chipText, { color: C.primary }]}>{maxDomainsToScrape}</Text>
                </View>
              </View>

              <View ref={sliderRef} style={styles.sliderContainer} onLayout={handleSliderLayout} {...panResponder.panHandlers}>
                <View style={[styles.sliderTrackBg, { backgroundColor: C.surface }]}>
                  <View style={[styles.sliderTrackFill, { backgroundColor: C.primary, width: `${sliderFillPct}%` }]} />
                  <View style={[styles.sliderThumb, { backgroundColor: C.surfaceAlt, borderColor: C.primary, left: `${sliderFillPct}%` }]} />
                </View>
              </View>

              <View style={styles.rangeLabels}>
                <Text style={[styles.rangeText, { color: C.textMuted }]}>10</Text>
                <Text style={[styles.rangeText, { color: C.textMuted }]}>50</Text>
              </View>
            </View>
          </View>

          {/* System & Support */}
          <View style={[styles.glassCard, { backgroundColor: isDark ? 'rgba(18, 33, 49, 0.4)' : C.surface }]}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="settings-outline" size={18} color={C.textSecondary} />
              <Text style={[styles.sectionTitle, { color: C.text }]}>System & Support</Text>
            </View>

            <TouchableOpacity style={styles.linkRow} onPress={handleOpenBatterySettings}>
              <View style={[styles.linkIcon, { backgroundColor: C.warningLight }]}>
                <Ionicons name="battery-charging" size={16} color={C.warning} />
              </View>
              <Text style={[styles.linkLabel, { color: C.text }]}>Battery Optimization</Text>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkRow} onPress={handleOpenAppInfo}>
              <View style={[styles.linkIcon, { backgroundColor: C.primaryLight }]}>
                <Ionicons name="settings-outline" size={16} color={C.primary} />
              </View>
              <Text style={[styles.linkLabel, { color: C.text }]}>Background Activity</Text>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkRow} onPress={handleShare}>
              <View style={[styles.linkIcon, { backgroundColor: C.primaryLight }]}>
                <Ionicons name="share-outline" size={16} color={C.primary} />
              </View>
              <Text style={[styles.linkLabel, { color: C.text }]}>Share App</Text>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </View>

        </ScrollView>

        <Modal visible={downloadConfirmVisible} transparent animationType="fade" onRequestClose={() => setDownloadConfirmVisible(false)}>
          <TouchableOpacity style={[styles.overlay, { backgroundColor: C.overlay }]} activeOpacity={1} onPress={() => setDownloadConfirmVisible(false)}>
            <View style={[styles.confirmModal, { backgroundColor: C.surface }]}>
              <View style={[styles.confirmIcon, { backgroundColor: C.primaryLight }]}>
                <Ionicons name="sparkles" size={26} color={C.primary} />
              </View>
              <Text style={[styles.confirmTitle, { color: C.text }]}>Download AI Model?</Text>
              <View style={[styles.confirmDetails, { backgroundColor: C.surfaceAlt }]}>
                <View style={styles.confirmRow}>
                  <Text style={[styles.confirmKey, { color: C.textSecondary }]}>Model</Text>
                  <Text style={[styles.confirmValue, { color: C.text }]}>{APP_CONFIG.modelDisplayName}</Text>
                </View>
                <View style={[styles.confirmDivider, { backgroundColor: C.border }]} />
                <View style={styles.confirmRow}>
                  <Text style={[styles.confirmKey, { color: C.textSecondary }]}>Size</Text>
                  <Text style={[styles.confirmValue, { color: C.text }]}>~{APP_CONFIG.modelExpectedSizeMb} MB</Text>
                </View>
              </View>
              <View style={styles.confirmActions}>
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.surfaceAlt }]} onPress={() => setDownloadConfirmVisible(false)}>
                  <Text style={[styles.smallBtnText, { color: C.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: C.primary }]} onPress={handleStartDownload}>
                  <Text style={[styles.primaryBtnText, { color: isDark ? '#051424' : '#FFF' }]}>Download</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        <ThemedConfirm
          visible={restartAlertVisible}
          title="AI Model Ready"
          message="Consolidated AI summaries are now active for your next research!"
          confirmLabel="OK"
          singleButton
          onConfirm={() => setRestartAlertVisible(false)}
        />

        <ThemedConfirm
          visible={copiedAlertVisible}
          title="Copied!"
          message="UPI ID copied to clipboard."
          confirmLabel="OK"
          singleButton
          onConfirm={() => setCopiedAlertVisible(false)}
        />

        <ThemedConfirm
          visible={deleteModelVisible}
          title="Delete AI Model"
          message={`Remove the ~${APP_CONFIG.modelExpectedSizeMb} MB model?`}
          confirmLabel="Delete"
          danger
          onConfirm={() => {
            setDeleteModelVisible(false);
            aiModel.deleteModel();
          }}
          onCancel={() => setDeleteModelVisible(false)}
        />

        <ThemedConfirm
          visible={shareErrorVisible}
          title="Share Failed"
          message={shareErrorMsg}
          confirmLabel="OK"
          singleButton
          onConfirm={() => setShareErrorVisible(false)}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xs, paddingBottom: Spacing.massive },
  heroHeader: {
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  heroDesc: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  glassCard: {
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  settingItem: {
    marginBottom: Spacing.lg,
  },
  settingLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  settingSubText: {
    fontSize: 11,
    marginBottom: Spacing.md,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  themeOption: {
    flex: 1,
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
    gap: 8,
  },
  themePreview: {
    width: '100%',
    height: 48,
    borderRadius: 10,
  },
  themeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  switchText: {
    flex: 1,
    marginRight: Spacing.md,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchSub: {
    fontSize: 11,
    marginTop: 2,
  },
  tipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: Spacing.md,
    borderRadius: 16,
    marginTop: Spacing.md,
  },
  tipText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  healthCard: {
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  healthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  healthLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  healthVal: {
    fontSize: 11,
    fontWeight: '700',
  },
  healthProgressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  healthProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  sliderSection: {
    marginBottom: Spacing.lg,
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  chip: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  chipText: { fontSize: 12, fontWeight: '700' },
  sliderContainer: { height: 44, justifyContent: 'center' },
  sliderTrackBg: { height: 6, borderRadius: Radius.full, position: 'relative', justifyContent: 'center' },
  sliderTrackFill: { height: '100%', borderRadius: Radius.full },
  sliderThumb: { position: 'absolute', width: 24, height: 24, borderRadius: 12, borderWidth: 3, marginLeft: -12 },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  rangeText: { fontSize: 10, fontWeight: '500' },
  aiCard: {
    borderRadius: 16,
    padding: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  aiIcon: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  aiHeaderText: { flex: 1, flexDirection: 'column', alignItems: 'flex-start', gap: 4 },
  aiName: { fontSize: 14, fontWeight: '700' },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full, gap: 3 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  aiBody: { marginTop: Spacing.xs },
  progressInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  progressPct: { fontSize: 20, fontWeight: '800' },
  speedText: { fontSize: 12, fontWeight: '500' },
  progressTrack: { height: 5, borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.sm },
  progressFill: { height: '100%', borderRadius: Radius.full },
  progressBytes: { fontSize: 11, marginBottom: Spacing.sm },
  validatingText: { fontSize: 13, fontWeight: '600', fontStyle: 'italic' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.md },
  metaItem: { minWidth: '45%' },
  metaLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 1 },
  metaValue: { fontSize: 13, fontWeight: '600' },
  aiDesc: { fontSize: 12, lineHeight: 18, marginBottom: Spacing.md },
  actionRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  smallBtn: { flex: 1, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  smallBtnText: { fontSize: 13, fontWeight: '600' },
  primaryBtn: { flex: 1, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  primaryBtnText: { color: '#080716', fontSize: 13, fontWeight: '700' },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.md, gap: Spacing.sm },
  errorText: { fontSize: 12, flex: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, gap: Spacing.md },
  linkIcon: { width: 32, height: 32, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center' },
  linkLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  linkSub: { fontSize: 11, marginTop: 1 },
  copyBtn: { paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: Radius.full },
  copyBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  confirmModal: { borderRadius: Radius.xl, width: '86%', padding: Spacing.xl },
  confirmIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: Spacing.md },
  confirmTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: Spacing.lg },
  confirmDetails: { borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  confirmDivider: { height: 1, marginVertical: 2 },
  confirmKey: { fontSize: 12 },
  confirmValue: { fontSize: 12, fontWeight: '700' },
  confirmActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  logoutWrap: {
    marginVertical: Spacing.lg,
    alignItems: 'center',
  },
  logoutBtn: {
    width: '100%',
    height: 52,
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
