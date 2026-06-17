import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking,
  Platform, Alert, Modal, useColorScheme, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useAppStore } from '../src/store/appStore';
import { useAIModel } from '../src/hooks/useAIModel';
import { APP_CONFIG } from '../src/constants/config';
import { LightColors, DarkColors, Spacing, Radius } from '../src/constants/theme';

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

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const handleCopyUPI = async () => {
    await Clipboard.setStringAsync('rutambh@upi');
    Alert.alert('Copied!', 'UPI ID copied to clipboard.');
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
    Alert.alert('Delete AI Model', 'Remove the ~350 MB model?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => aiModel.deleteModel() },
    ]);
  };

  const handleShare = () => {
    Linking.openURL(`https://play.google.com/store/apps/details?id=${APP_CONFIG.packageName}`);
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
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.aiHeader}>
          <View style={[styles.aiIcon, { backgroundColor: C.primaryLight }]}>
            <Ionicons name="sparkles" size={20} color={C.primary} />
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
            <View style={[styles.progressTrack, { backgroundColor: C.surfaceAlt }]}>
              <View style={[styles.progressFill, { backgroundColor: C.accent, width: `${progressPct}%` }]} />
            </View>
            <Text style={[styles.progressBytes, { color: C.textMuted }]}>
              {formatBytes(downloadedBytes)} / {formatBytes(totalBytes > 0 ? totalBytes : APP_CONFIG.modelExpectedSizeMb * 1024 * 1024)}
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.surfaceAlt, borderColor: C.border }]} onPress={aiModel.pauseDownload}>
                <Ionicons name="pause" size={14} color={C.text} />
                <Text style={[styles.smallBtnText, { color: C.text }]}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.dangerLight, borderColor: C.danger + '30' }]} onPress={aiModel.cancelDownload}>
                <Ionicons name="close" size={14} color={C.danger} />
                <Text style={[styles.smallBtnText, { color: C.danger }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {status === 'paused' && (
          <View style={styles.aiBody}>
            <View style={[styles.progressTrack, { backgroundColor: C.surfaceAlt }]}>
              <View style={[styles.progressFill, { backgroundColor: C.warning, width: `${progressPct}%` }]} />
            </View>
            <Text style={[styles.progressBytes, { color: C.textMuted }]}>{formatBytes(downloadedBytes)} / {formatBytes(APP_CONFIG.modelExpectedSizeMb * 1024 * 1024)}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: C.primary }]} onPress={aiModel.resumeDownload}>
                <Ionicons name="play" size={14} color="#FFF" />
                <Text style={styles.primaryBtnText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.dangerLight, borderColor: C.danger + '30' }]} onPress={aiModel.cancelDownload}>
                <Ionicons name="close" size={14} color={C.danger} />
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
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.dangerLight, borderColor: C.danger + '30' }]} onPress={handleDeleteModel}>
                <Ionicons name="trash-outline" size={14} color={C.danger} />
                <Text style={[styles.smallBtnText, { color: C.danger }]}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.surfaceAlt, borderColor: C.border }]} onPress={() => { aiModel.deleteModel().then(() => setDownloadConfirmVisible(true)); }}>
                <Ionicons name="refresh" size={14} color={C.text} />
                <Text style={[styles.smallBtnText, { color: C.text }]}>Re-download</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.aiBody}>
            {errorMessage && (
              <View style={[styles.errorBox, { backgroundColor: C.dangerLight, borderColor: C.danger + '30' }]}>
                <Ionicons name="alert-circle" size={14} color={C.danger} />
                <Text style={[styles.errorText, { color: C.danger }]} numberOfLines={2}>{errorMessage}</Text>
              </View>
            )}
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: C.primary }]} onPress={() => { aiModel.cancelDownload(); setDownloadConfirmVisible(true); }}>
              <Ionicons name="refresh" size={14} color="#FFF" />
              <Text style={styles.primaryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'not_installed' && (
          <View style={styles.aiBody}>
            <Text style={[styles.aiDesc, { color: C.textSecondary }]}>
              Optional on-device AI for natural summaries. Not needed for core features.
            </Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: C.primary }]} onPress={() => setDownloadConfirmVisible(true)}>
              <Ionicons name="download-outline" size={16} color="#FFF" />
              <Text style={styles.primaryBtnText}>Download (~{APP_CONFIG.modelExpectedSizeMb} MB)</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: C.border }]}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <Ionicons name="close" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: C.text }]}>Settings</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionLabel, { color: C.textMuted }]}>AI Enhancement</Text>
          {renderAI()}

          <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Appearance</Text>
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={[styles.segmented, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
              {(['light', 'dark', 'system'] as const).map((t) => {
                const active = theme === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.segmentPill, active && { backgroundColor: C.primary }]}
                    onPress={() => setTheme(t)}
                  >
                    <Ionicons name={t === 'light' ? 'sunny' : t === 'dark' ? 'moon' : 'phone-portrait'} size={13} color={active ? '#FFF' : C.textSecondary} />
                    <Text style={[styles.segmentLabel, { color: active ? '#FFF' : C.textSecondary }]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Search</Text>
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.cardLabel, { color: C.textSecondary }]}>Scrape Limit</Text>
              <View style={[styles.chip, { backgroundColor: C.primaryLight }]}>
                <Text style={[styles.chipText, { color: C.primary }]}>{maxDomainsToScrape}</Text>
              </View>
            </View>

            <View ref={sliderRef} style={styles.sliderContainer} onLayout={handleSliderLayout} {...panResponder.panHandlers}>
              <View style={[styles.sliderTrackBg, { backgroundColor: C.surfaceAlt }]}>
                <View style={[styles.sliderTrackFill, { backgroundColor: C.primary, width: `${sliderFillPct}%` }]} />
                <View style={[styles.sliderThumb, { backgroundColor: C.card, borderColor: C.primary, left: `${sliderFillPct}%` }]} />
              </View>
            </View>

            <View style={styles.rangeLabels}>
              <Text style={[styles.rangeText, { color: C.textMuted }]}>10</Text>
              <Text style={[styles.rangeText, { color: C.textMuted }]}>50</Text>
            </View>

            <Text style={[styles.sliderDesc, { color: C.textSecondary }]}>
              More domains = higher accuracy but longer research time.
            </Text>
          </View>

          <Text style={[styles.sectionLabel, { color: C.textMuted }]}>System</Text>
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.cardDesc, { color: C.textSecondary }]}>
              Configure battery settings for uninterrupted background research.
            </Text>
            <TouchableOpacity style={[styles.linkRow, { borderBottomColor: C.border }]} onPress={handleOpenBatterySettings}>
              <View style={[styles.linkIcon, { backgroundColor: C.warningLight }]}>
                <Ionicons name="battery-charging" size={16} color={C.warning} />
              </View>
              <Text style={[styles.linkLabel, { color: C.text }]}>Battery Optimization</Text>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.linkRow, { borderBottomWidth: 0 }]} onPress={handleOpenAppInfo}>
              <View style={[styles.linkIcon, { backgroundColor: C.primaryLight }]}>
                <Ionicons name="settings-outline" size={16} color={C.primary} />
              </View>
              <Text style={[styles.linkLabel, { color: C.text }]}>Background Activity</Text>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.sectionLabel, { color: C.textMuted }]}>Support</Text>
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <TouchableOpacity style={[styles.linkRow, { borderBottomColor: C.border }]} onPress={handleShare}>
              <View style={[styles.linkIcon, { backgroundColor: C.primaryLight }]}>
                <Ionicons name="share-outline" size={16} color={C.primary} />
              </View>
              <Text style={[styles.linkLabel, { color: C.text }]}>Share App</Text>
              <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.linkRow, { borderBottomWidth: 0 }]} onPress={handleCopyUPI}>
              <View style={[styles.linkIcon, { backgroundColor: C.warningLight }]}>
                <Ionicons name="heart-outline" size={16} color={C.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.linkLabel, { color: C.text }]}>Donate via UPI</Text>
                <Text style={[styles.linkSub, { color: C.textMuted }]}>rutambh@upi</Text>
              </View>
              <TouchableOpacity style={[styles.copyBtn, { backgroundColor: C.primary }]} onPress={handleCopyUPI}>
                <Text style={styles.copyBtnText}>Copy</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>

          <View style={{ height: Spacing.xxxl }} />
        </ScrollView>

        <Modal visible={downloadConfirmVisible} transparent animationType="fade" onRequestClose={() => setDownloadConfirmVisible(false)}>
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setDownloadConfirmVisible(false)}>
            <View style={[styles.confirmModal, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={[styles.confirmIcon, { backgroundColor: C.primaryLight }]}>
                <Ionicons name="sparkles" size={26} color={C.primary} />
              </View>
              <Text style={[styles.confirmTitle, { color: C.text }]}>Download AI Model?</Text>
              <View style={[styles.confirmDetails, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
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
                <TouchableOpacity style={[styles.smallBtn, { backgroundColor: C.surfaceAlt, borderColor: C.border }]} onPress={() => setDownloadConfirmVisible(false)}>
                  <Text style={[styles.smallBtnText, { color: C.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: C.primary }]} onPress={handleStartDownload}>
                  <Text style={styles.primaryBtnText}>Download</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 44, height: 44, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: Spacing.md, marginTop: Spacing.xl, paddingLeft: Spacing.xs,
  },
  card: { borderRadius: Radius.xl, padding: Spacing.xl, borderWidth: StyleSheet.hairlineWidth, marginBottom: Spacing.sm },
  cardLabel: { fontSize: 13, fontWeight: '600', marginBottom: Spacing.xs },
  cardDesc: { fontSize: 12, lineHeight: 18, marginBottom: Spacing.md },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  aiIcon: { width: 40, height: 40, borderRadius: Radius.md, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  aiHeaderText: { flex: 1 },
  aiName: { fontSize: 15, fontWeight: '700' },
  statusPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full, marginTop: 3, alignSelf: 'flex-start', gap: 3 },
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
  smallBtn: { flex: 1, borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  smallBtnText: { fontSize: 13, fontWeight: '600' },
  primaryBtn: { flex: 1, borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  errorBox: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.md, gap: Spacing.sm },
  errorText: { fontSize: 12, flex: 1 },
  segmented: { flexDirection: 'row', borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, padding: 2, gap: 2 },
  segmentPill: { flex: 1, borderRadius: 12, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 3 },
  segmentLabel: { fontSize: 11, fontWeight: '600' },
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  chip: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  chipText: { fontSize: 12, fontWeight: '700' },
  sliderContainer: { height: 32, justifyContent: 'center' },
  sliderTrackBg: { height: 5, borderRadius: Radius.full, position: 'relative', justifyContent: 'center' },
  sliderTrackFill: { height: '100%', borderRadius: Radius.full },
  sliderThumb: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 3, marginLeft: -10 },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  rangeText: { fontSize: 10, fontWeight: '500' },
  sliderDesc: { fontSize: 11, lineHeight: 16, marginTop: Spacing.sm },
  linkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.md },
  linkIcon: { width: 32, height: 32, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center' },
  linkLabel: { flex: 1, fontSize: 13, fontWeight: '600' },
  linkSub: { fontSize: 11, marginTop: 1 },
  copyBtn: { paddingHorizontal: Spacing.md, paddingVertical: 5, borderRadius: Radius.full },
  copyBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  confirmModal: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, width: '86%', padding: Spacing.xl },
  confirmIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: Spacing.md },
  confirmTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: Spacing.lg },
  confirmDetails: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.md, marginBottom: Spacing.md },
  confirmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  confirmDivider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  confirmKey: { fontSize: 12 },
  confirmValue: { fontSize: 12, fontWeight: '700' },
  confirmActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
});
