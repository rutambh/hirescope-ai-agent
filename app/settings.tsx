import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  Alert,
  Modal,
  useColorScheme,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useAppStore } from '../src/store/appStore';
import { useAIModel } from '../src/hooks/useAIModel';
import { APP_CONFIG } from '../src/constants/config';
import { LightColors, DarkColors, Spacing, Radius, Shadows } from '../src/constants/theme';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1000) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toFixed(0)} MB`;
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec <= 0) return '';
  const mbps = bytesPerSec / (1024 * 1024);
  return `${mbps.toFixed(1)} MB/s`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { theme, setTheme, maxDomainsToScrape, setMaxDomainsToScrape } = useAppStore();
  const systemColorScheme = useColorScheme();
  const aiModel = useAIModel();

  const [downloadConfirmVisible, setDownloadConfirmVisible] = useState(false);

  // Custom slider logic for Domains Search Expansion
  const [sliderWidth, setSliderWidth] = useState(0);
  const [sliderLeft, setSliderLeft] = useState(0);
  const sliderRef = useRef<View>(null);

  const handleSliderLayout = () => {
    sliderRef.current?.measure((_x, _y, width, _height, absoluteX, _absoluteY) => {
      if (width > 0) {
        setSliderWidth(width);
        setSliderLeft(absoluteX);
      }
    });
  };

  const calculateSliderValue = (pageX: number) => {
    if (sliderWidth === 0) return;
    const relativeX = Math.max(0, Math.min(sliderWidth, pageX - sliderLeft));
    const percentage = relativeX / sliderWidth;
    const minVal = 10;
    const maxVal = 50;
    const rawVal = minVal + percentage * (maxVal - minVal);
    const steppedVal = Math.round(rawVal);
    setMaxDomainsToScrape(steppedVal);
  };

  const calculateSliderValueRef = useRef(calculateSliderValue);
  calculateSliderValueRef.current = calculateSliderValue;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (e) => {
        calculateSliderValueRef.current(e.nativeEvent.pageX);
      },
      onPanResponderMove: (e) => {
        calculateSliderValueRef.current(e.nativeEvent.pageX);
      },
    })
  ).current;

  const sliderFillPercentage = ((maxDomainsToScrape - 10) / (50 - 10)) * 100;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleCopyUPI = async () => {
    await Clipboard.setStringAsync('rutambh@upi');
    Alert.alert('Copied!', 'UPI ID "rutambh@upi" copied to clipboard.');
  };

  const handleOpenBatterySettings = async () => {
    if (Platform.OS === 'android') {
      try {
        await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
      } catch {
        Linking.openSettings();
      }
    } else {
      Linking.openSettings();
    }
  };

  const handleOpenAppInfo = async () => {
    if (Platform.OS === 'android') {
      try {
        await Linking.sendIntent('android.settings.APPLICATION_DETAILS_SETTINGS', [
          { key: 'package', value: 'com.rutambh.hirescope' },
        ]);
      } catch {
        Linking.openSettings();
      }
    } else {
      Linking.openSettings();
    }
  };

  const handleStartDownload = useCallback(() => {
    setDownloadConfirmVisible(false);
    aiModel.downloadModel();
  }, [aiModel]);

  const handleDeleteModel = () => {
    Alert.alert(
      'Delete AI Model',
      'This will remove the HireScope AI Lite model (~350 MB). You can re-download it later. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => aiModel.deleteModel(),
        },
      ]
    );
  };


  const handleShare = () => {
    Linking.openURL(
      `https://play.google.com/store/apps/details?id=${APP_CONFIG.packageName}`
    );
  };

  const handleOpenSource = () => {
    // Placeholder for OSS licenses screen
    Alert.alert('Open Source Licenses', 'Licenses screen coming soon.');
  };

  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const C = isDark ? DarkColors : LightColors;

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    not_installed: { label: 'Not Installed', color: C.textMuted, bg: C.surfaceAlt, icon: '○' },
    downloading:   { label: 'Downloading',   color: C.accent,   bg: isDark ? '#0C4A6E' : '#E0F2FE', icon: '◐' },
    paused:        { label: 'Paused',        color: C.warning,  bg: C.warningLight, icon: '⏸' },
    validating:    { label: 'Validating',    color: C.accent,   bg: isDark ? '#0C4A6E' : '#E0F2FE', icon: '◐' },
    installed:     { label: 'Installed',     color: C.success,  bg: C.successLight, icon: '✓' },
    error:         { label: 'Error',         color: C.danger,   bg: C.dangerLight,  icon: '✕' },
  };

  const renderAISection = () => {
    const { status, downloadedBytes, totalBytes, speedBytesPerSec, errorMessage, installedVersion } = aiModel;
    const progressPercent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
    const cfg = statusConfig[status] || statusConfig.not_installed;

    return (
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        {/* Model header row */}
        <View style={styles.aiHeader}>
          <View style={[styles.modelIcon, { backgroundColor: C.primaryLight }]}>
            <Text style={[styles.modelIconText, { color: C.primary }]}>AI</Text>
          </View>
          <View style={styles.aiHeaderText}>
            <Text style={[styles.aiModelName, { color: C.text }]}>{APP_CONFIG.modelDisplayName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg, marginTop: 4, alignSelf: 'flex-start' }]}>
              <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.icon} {cfg.label}</Text>
            </View>
          </View>
        </View>

        {/* Downloading state */}
        {status === 'downloading' && (
          <View style={styles.downloadBody}>
            <View style={styles.progressInfoRow}>
              <Text style={[styles.progressPercent, { color: C.accent }]}>{progressPercent}%</Text>
              {speedBytesPerSec > 0 && (
                <Text style={[styles.downloadSpeed, { color: C.textSecondary }]}>
                  {formatSpeed(speedBytesPerSec)}
                </Text>
              )}
            </View>
            <View style={[styles.progressTrack, { backgroundColor: C.surfaceAlt }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: C.accent, width: `${progressPercent}%` },
                ]}
              />
            </View>
            <Text style={[styles.downloadBytes, { color: C.textMuted }]}>
              {formatBytes(downloadedBytes)} / {formatBytes(totalBytes > 0 ? totalBytes : APP_CONFIG.modelExpectedSizeMb * 1024 * 1024)}
            </Text>
            <View style={[styles.warningPill, { backgroundColor: C.warningLight }]}>
              <Text style={[styles.warningPillText, { color: C.warning }]}>WiFi recommended</Text>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}
                onPress={aiModel.pauseDownload}
              >
                <Text style={[styles.actionBtnText, { color: C.text }]}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.dangerLight, borderColor: `${C.danger}30` }]}
                onPress={aiModel.cancelDownload}
              >
                <Text style={[styles.actionBtnText, { color: C.danger }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Paused state */}
        {status === 'paused' && (
          <View style={styles.downloadBody}>
            <View style={[styles.progressTrack, { backgroundColor: C.surfaceAlt }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: C.warning, width: `${progressPercent}%` },
                ]}
              />
            </View>
            <Text style={[styles.downloadBytes, { color: C.textMuted }]}>
              {formatBytes(downloadedBytes)} / {formatBytes(APP_CONFIG.modelExpectedSizeMb * 1024 * 1024)} &middot; {progressPercent}%
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: C.primary }]}
                onPress={aiModel.resumeDownload}
              >
                <Text style={styles.primaryBtnText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.dangerLight, borderColor: `${C.danger}30` }]}
                onPress={aiModel.cancelDownload}
              >
                <Text style={[styles.actionBtnText, { color: C.danger }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Validating state */}
        {status === 'validating' && (
          <View style={styles.downloadBody}>
            <Text style={[styles.validatingText, { color: C.accent }]}>Validating model integrity...</Text>
          </View>
        )}

        {/* Installed state */}
        {status === 'installed' && (
          <View style={styles.downloadBody}>
            <View style={styles.metaGrid}>
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
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.dangerLight, borderColor: `${C.danger}30` }]}
                onPress={handleDeleteModel}
              >
                <Text style={[styles.actionBtnText, { color: C.danger }]}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}
                onPress={() => { aiModel.deleteModel().then(() => setDownloadConfirmVisible(true)); }}
              >
                <Text style={[styles.actionBtnText, { color: C.text }]}>Re-download</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Error state */}
        {status === 'error' && (
          <View style={styles.downloadBody}>
            {errorMessage && (
              <Text style={[styles.errorText, { color: C.danger }]} numberOfLines={2}>
                {errorMessage}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: C.primary }]}
              onPress={() => { aiModel.cancelDownload(); setDownloadConfirmVisible(true); }}
            >
              <Text style={styles.primaryBtnText}>Retry Download</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Not installed state */}
        {status === 'not_installed' && (
          <View style={styles.downloadBody}>
            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <Text style={[styles.metaLabel, { color: C.textMuted }]}>Size</Text>
                <Text style={[styles.metaValue, { color: C.text }]}>~{APP_CONFIG.modelExpectedSizeMb} MB</Text>
              </View>
            </View>
            <Text style={[styles.aiDescription, { color: C.textSecondary }]}>
              Optional enhancement for more natural result summaries. The app works fully without it.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: C.primary }]}
              onPress={() => setDownloadConfirmVisible(true)}
            >
              <Text style={styles.primaryBtnText}>Download AI Model</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.bg }]} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: C.bg, borderBottomColor: C.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={[styles.backArrow, { color: C.primary }]}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── AI Enhancement ────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>AI Enhancement</Text>
          {renderAISection()}
        </View>

        {/* ── Appearance ────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Appearance</Text>
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.cardLabel, { color: C.textSecondary }]}>Theme</Text>
            <View style={[styles.segmentedControl, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
              {(['light', 'dark', 'system'] as const).map((t) => {
                const isActive = theme === t;
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.segmentPill,
                      isActive && { backgroundColor: C.primary, ...Shadows.sm },
                    ]}
                    onPress={() => setTheme(t)}
                  >
                    <Text
                      style={[
                        styles.segmentLabel,
                        { color: isActive ? '#FFFFFF' : C.textSecondary },
                      ]}
                    >
                      {t === 'light' ? 'Light' : t === 'dark' ? 'Dark' : 'System'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* ── Search Settings ───────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Search Settings</Text>
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.sliderHeader}>
              <Text style={[styles.cardLabel, { color: C.textSecondary }]}>Scrape Limit</Text>
              <View style={[styles.valueChip, { backgroundColor: C.primaryLight }]}>
                <Text style={[styles.valueChipText, { color: C.primary }]}>{maxDomainsToScrape} domains</Text>
              </View>
            </View>

            <View
              ref={sliderRef}
              style={styles.sliderTrackContainer}
              onLayout={handleSliderLayout}
              {...panResponder.panHandlers}
            >
              <View style={[styles.trackBackground, { backgroundColor: C.surfaceAlt }]}>
                <View
                  style={[
                    styles.trackFill,
                    { backgroundColor: C.primary, width: `${sliderFillPercentage}%` },
                  ]}
                />
                <View
                  style={[
                    styles.sliderThumb,
                    {
                      backgroundColor: C.card,
                      borderColor: C.primary,
                      left: `${sliderFillPercentage}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.rangeLabels}>
              <Text style={[styles.rangeText, { color: C.textMuted }]}>10</Text>
              <Text style={[styles.rangeText, { color: C.textMuted }]}>50</Text>
            </View>

            <Text style={[styles.sliderDescription, { color: C.textSecondary }]}>
              Maximum number of search result pages the scraping engine retrieves. More domains provide higher accuracy but increase search time.
            </Text>
          </View>
        </View>

        {/* ── System Permissions ────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>System</Text>
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
            <Text style={[styles.cardDescription, { color: C.textSecondary }]}>
              HireScope runs background research tasks. Configure battery settings for uninterrupted scraping.
            </Text>
            <TouchableOpacity
              style={[styles.linkRow, { borderBottomColor: C.border }]}
              onPress={handleOpenBatterySettings}
            >
              <View style={[styles.linkIcon, { backgroundColor: C.warningLight }]}>
                <Text style={[styles.linkIconText, { color: C.warning }]}>B</Text>
              </View>
              <Text style={[styles.linkLabel, { color: C.text }]}>Battery Optimization</Text>
              <Text style={[styles.chevron, { color: C.textMuted }]}>{'>'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkRow, { borderBottomWidth: 0 }]}
              onPress={handleOpenAppInfo}
            >
              <View style={[styles.linkIcon, { backgroundColor: C.primaryLight }]}>
                <Text style={[styles.linkIconText, { color: C.primary }]}>S</Text>
              </View>
              <Text style={[styles.linkLabel, { color: C.text }]}>Background Activity</Text>
              <Text style={[styles.chevron, { color: C.textMuted }]}>{'>'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Support ───────────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: C.textMuted }]}>Support</Text>
          <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>

            <TouchableOpacity
              style={[styles.linkRow, { borderBottomColor: C.border }]}
              onPress={handleShare}
            >
              <View style={[styles.linkIcon, { backgroundColor: C.primaryLight }]}>
                <Text style={[styles.linkIconText, { color: C.primary }]}>Sh</Text>
              </View>
              <Text style={[styles.linkLabel, { color: C.text }]}>Share App</Text>
              <Text style={[styles.chevron, { color: C.textMuted }]}>{'>'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkRow, { borderBottomWidth: 0 }]}
              onPress={handleCopyUPI}
            >
              <View style={[styles.linkIcon, { backgroundColor: C.warningLight }]}>
                <Text style={[styles.linkIconText, { color: C.warning }]}>U</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.linkLabel, { color: C.text }]}>Donate via UPI</Text>
                <Text style={[styles.linkSubLabel, { color: C.textMuted }]}>rutambh@upi</Text>
              </View>
              <TouchableOpacity style={[styles.copyPill, { backgroundColor: C.primary }]} onPress={handleCopyUPI}>
                <Text style={styles.copyPillText}>Copy</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>
        </View>



        {/* Bottom spacer */}
        <View style={{ height: Spacing.xxxl }} />
      </ScrollView>

      {/* ── Download Confirmation Modal ────────────────────────────────────── */}
      <Modal
        visible={downloadConfirmVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDownloadConfirmVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDownloadConfirmVisible(false)}
        >
          <View style={[styles.confirmModal, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={[styles.confirmIconCircle, { backgroundColor: C.primaryLight }]}>
              <Text style={[styles.confirmIconText, { color: C.primary }]}>AI</Text>
            </View>
            <Text style={[styles.confirmTitle, { color: C.text }]}>Download AI Model?</Text>
            <View style={[styles.confirmDetails, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}>
              <View style={styles.confirmRow}>
                <Text style={[styles.confirmKey, { color: C.textSecondary }]}>Model</Text>
                <Text style={[styles.confirmValue, { color: C.text }]}>{APP_CONFIG.modelDisplayName}</Text>
              </View>
              <View style={[styles.confirmDivider, { backgroundColor: C.border }]} />
              <View style={styles.confirmRow}>
                <Text style={[styles.confirmKey, { color: C.textSecondary }]}>Download Size</Text>
                <Text style={[styles.confirmValue, { color: C.text }]}>~{APP_CONFIG.modelExpectedSizeMb} MB</Text>
              </View>
              <View style={[styles.confirmDivider, { backgroundColor: C.border }]} />
              <View style={styles.confirmRow}>
                <Text style={[styles.confirmKey, { color: C.textSecondary }]}>Required Storage</Text>
                <Text style={[styles.confirmValue, { color: C.text }]}>~500 MB</Text>
              </View>
            </View>
            <View style={[styles.warningPill, { backgroundColor: C.warningLight, alignSelf: 'center' }]}>
              <Text style={[styles.warningPillText, { color: C.warning }]}>WiFi connection recommended</Text>
            </View>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: C.surfaceAlt, borderColor: C.border }]}
                onPress={() => setDownloadConfirmVisible(false)}
              >
                <Text style={[styles.actionBtnText, { color: C.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: C.primary }]}
                onPress={handleStartDownload}
              >
                <Text style={styles.primaryBtnText}>Download</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ── Layout ────────────────────────────────────────────────────────────────
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backArrow: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: { marginBottom: Spacing.xxl },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
    paddingLeft: Spacing.xs,
  },

  // ── Card ───────────────────────────────────────────────────────────────────
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...Shadows.md,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  cardDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },

  // ── AI Model Card ──────────────────────────────────────────────────────────
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  modelIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  modelIconText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aiHeaderText: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  aiModelName: {
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  downloadBody: {
    marginTop: Spacing.xs,
  },

  // ── Download Progress ──────────────────────────────────────────────────────
  progressInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  progressPercent: {
    fontSize: 22,
    fontWeight: '800',
  },
  downloadSpeed: {
    fontSize: 13,
    fontWeight: '500',
  },
  progressTrack: {
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  downloadBytes: {
    fontSize: 12,
    marginBottom: Spacing.sm,
  },
  validatingText: {
    fontSize: 14,
    fontWeight: '600',
    fontStyle: 'italic',
  },

  // ── Meta Grid ──────────────────────────────────────────────────────────────
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  metaItem: {
    minWidth: '45%',
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  aiDescription: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },

  // ── Warning Pill ───────────────────────────────────────────────────────────
  warningPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
  },
  warningPillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Action Buttons ─────────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  primaryBtn: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 13,
    marginBottom: Spacing.sm,
  },

  // ── Segmented Control (Theme Selector) ─────────────────────────────────────
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 2,
  },
  segmentPill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  segmentLabel: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── Slider ─────────────────────────────────────────────────────────────────
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  valueChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  valueChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sliderTrackContainer: {
    height: 36,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  trackBackground: {
    height: 6,
    borderRadius: Radius.full,
    position: 'relative',
    justifyContent: 'center',
  },
  trackFill: {
    height: '100%',
    borderRadius: Radius.full,
  },
  sliderThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 3,
    marginLeft: -11,
    ...Shadows.sm,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  rangeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  sliderDescription: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: Spacing.sm,
  },

  // ── Link Rows (Support, System) ────────────────────────────────────────────
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  linkIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  linkIconText: {
    fontSize: 13,
    fontWeight: '800',
  },
  linkLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  linkSubLabel: {
    fontSize: 12,
    marginTop: 1,
  },
  chevron: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: Spacing.sm,
  },
  copyPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  copyPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── About ──────────────────────────────────────────────────────────────────
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  aboutLabel: {
    fontSize: 14,
  },
  aboutValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },

  // ── Modals ─────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmModal: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    width: '88%',
    padding: Spacing.xxl,
    ...Shadows.lg,
  },
  confirmIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  confirmIconText: {
    fontSize: 18,
    fontWeight: '800',
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  confirmDetails: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  confirmDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  confirmKey: {
    fontSize: 13,
  },
  confirmValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
});
