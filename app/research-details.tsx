import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore } from '../src/store/searchStore';
import { useAppStore } from '../src/store/appStore';
import { Spacing, Radius, useTheme } from '../src/constants/theme';

export default function ResearchDetailsScreen() {
  const router = useRouter();
  const { live } = useLocalSearchParams<{ live?: string }>();
  const searchStore = useSearchStore();
  const { theme } = useAppStore();
  const { isDark, c } = useTheme();

  const isLive = live === 'true';
  const activeSearches = searchStore.activeSearches;
  const latestActive = activeSearches[activeSearches.length - 1];

  const {
    filters: completedFilters, finalResults,
  } = searchStore;

  const filters = isLive ? latestActive?.filters ?? null : completedFilters;
  const rawUrls = isLive
    ? latestActive?.rawDataPoints?.filter(p => p.success).map(p => p.source) ?? []
    : (finalResults?.rawUrls ?? []);
  const pagesCount = isLive
    ? `${latestActive?.urlsProcessed ?? 0}/${latestActive?.urlsDiscovered ?? 0}`
    : String(rawUrls.length);

  const phaseLabel: Record<string, string> = {
    idle: 'Idle', searching: 'Scanning the web', extracting: 'Extracting data',
    'ai-extract': 'AI analyzing pages', 'ai-enhance': 'AI writing summary',
    complete: 'Complete', error: 'Error',
  };

  const activePhase = latestActive?.phase ?? 'idle';
  const isCompleted = finalResults !== null && (!isLive || !latestActive);

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)'); }} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={c.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>
              Research Details
            </Text>
            <Text style={[styles.headerMeta, { color: c.textSecondary }]} numberOfLines={1}>
              {filters?.company || ''} · {filters?.role || ''}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* ── Status Bar ── */}
          <View style={[styles.statusBar, {
            backgroundColor: isCompleted ? c.successLight : (isLive ? c.primaryLight : c.successLight),
            borderColor: isCompleted ? c.success + '30' : (isLive ? c.primary + '30' : c.success + '30'),
          }]}>
            {!isCompleted && isLive && <View style={[styles.liveDot, { backgroundColor: c.success }]} />}
            <Text style={[styles.statusText, { color: isCompleted ? c.success : (isLive ? c.primary : c.success) }]}>
              {isCompleted ? 'Research Complete' : (isLive ? phaseLabel[activePhase] || activePhase : 'Research Complete')}
            </Text>
            {isLive && !isCompleted && (
              <View style={styles.statusStats}>
                <Text style={[styles.statusStat, { color: c.textMuted }]}>{pagesCount} pages</Text>
              </View>
            )}
          </View>

          {/* ── View Results CTA (visible once a completed research has results) ── */}
          {finalResults && (
            <TouchableOpacity
              onPress={() => router.push('/results')}
              style={[styles.viewResultsBtn, { backgroundColor: c.primary }]}
              activeOpacity={0.85}
            >
              <Ionicons name="bar-chart-outline" size={18} color="#ffffff" />
              <Text style={[styles.viewResultsText, { color: c.onPrimary }]}>View Results</Text>
            </TouchableOpacity>
          )}

          {/* ── Scraped Pages ── */}
          <Text style={[styles.sectionLabel, { color: c.textMuted }]}>Searched Pages ({rawUrls.length})</Text>
          <View style={[styles.urlList, { backgroundColor: c.card, borderColor: c.border }]}>
            {rawUrls.length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textMuted }]}>No URLs yet</Text>
            ) : (
              rawUrls.map((url, idx) => (
                <View key={idx} style={[styles.urlRow, idx < rawUrls.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }]}>
                  <Text style={[styles.urlIndex, { color: c.textMuted }]}>{idx + 1}</Text>
                  <Text style={[styles.urlText, { color: c.text }]} numberOfLines={2}>{url}</Text>
                </View>
              ))
            )}
          </View>

          <View style={{ height: Spacing.massive }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1,
  },
  backBtn: { padding: Spacing.xs, width: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerMeta: { fontSize: 11, marginTop: 1 },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.massive },
  emptyText: { fontSize: 14, textAlign: 'center', paddingVertical: Spacing.xxl },
  statusBar: {
    flexDirection: 'row', alignItems: 'center', borderRadius: Radius.md,
    padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, gap: Spacing.sm,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 13, fontWeight: '700', flex: 1 },
  statusStats: { flexDirection: 'row', gap: Spacing.sm },
  statusStat: { fontSize: 11, fontWeight: '600' },
  viewResultsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderRadius: Radius.md, paddingVertical: Spacing.md, marginBottom: Spacing.lg,
  },
  viewResultsText: { fontSize: 15, fontWeight: '700' },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.sm },
  urlList: {
    borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1,
  },
  urlRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: Spacing.sm, gap: Spacing.sm },
  urlIndex: { fontSize: 11, fontWeight: '600', width: 24, textAlign: 'right' },
  urlText: { fontSize: 12, flex: 1, lineHeight: 17 },
});
