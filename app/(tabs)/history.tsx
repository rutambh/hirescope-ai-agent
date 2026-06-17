import React from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHistoryStore } from '../../src/store/historyStore';
import { useSearchStore } from '../../src/store/searchStore';
import { useScraper } from '../../src/hooks/useScraper';
import { HistoryCard } from '../../src/components/HistoryCard';
import { ProgressBar } from '../../src/components/ProgressBar';
import { SearchRecord } from '../../src/types';
import { useAppStore } from '../../src/store/appStore';
import { LightColors, DarkColors, Spacing, Radius } from '../../src/constants/theme';

export default function HistoryScreen() {
  const router = useRouter();
  const { searches, deleteSearch, clearAll } = useHistoryStore();
  const searchStore = useSearchStore();
  const scraper = useScraper();
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();

  const phase = searchStore.activePhase;
  const progressPercent = searchStore.activeProgressPercent;
  const estimatedSecondsRemaining = searchStore.activeEstimatedSecondsRemaining;
  const filters = searchStore.activeFilters;
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  const isResearching = phase === 'searching' || phase === 'extracting';

  const handleViewResults = (record: SearchRecord) => {
    searchStore.setFilters(record.filters);
    searchStore.setFinalResults(record.results);
    router.push('/results');
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert('Delete', 'Remove this search record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSearch(id) },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Clear History', 'Remove all search records?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => clearAll() },
    ]);
  };

  const handleStop = () => {
    Alert.alert('Stop', 'Cancel research and lose progress?', [
      { text: 'Continue', style: 'default' },
      { text: 'Stop', style: 'destructive', onPress: () => scraper.handleCancel() },
    ]);
  };

  const sortedSearches = [...searches].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getEstimatedTimeText = () => {
    const totalSecs = 15 * 60;
    const elapsedMinutes = (totalSecs - estimatedSecondsRemaining) / 60;
    if (phase === 'searching') return 'Scanning the web...';
    if (phase === 'extracting') return `Extracting data... ${Math.round(elapsedMinutes)}/${Math.round(totalSecs / 60)}m`;
    if (estimatedSecondsRemaining > 720) return '~12 min remaining';
    if (estimatedSecondsRemaining > 540) return '~9 min remaining';
    if (estimatedSecondsRemaining > 360) return '~6 min remaining';
    if (estimatedSecondsRemaining > 180) return '~3 min remaining';
    if (estimatedSecondsRemaining > 60) return '~1 min remaining';
    return 'Finalizing...';
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>Research</Text>
          <View style={styles.headerRight}>
            {sortedSearches.length > 0 && (
              <TouchableOpacity onPress={handleClearAll} style={styles.headerBtn}>
                <Ionicons name="trash-outline" size={18} color={c.danger} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => router.push('/settings')} style={[styles.headerBtn, { backgroundColor: c.card, borderColor: c.border }]}>
              <Ionicons name="settings-outline" size={18} color={c.text} />
            </TouchableOpacity>
          </View>
        </View>

        {isResearching && filters && (
          <View style={[styles.progressCard, { backgroundColor: c.card, borderColor: c.primary + '30' }]}>
            <View style={styles.progressTop}>
              <View style={[styles.liveDot, { backgroundColor: c.success }]} />
              <Text style={[styles.liveText, { color: c.success }]}>LIVE</Text>
            </View>
            <View style={styles.progressMeta}>
              <View>
                <Text style={[styles.progressCompany, { color: c.text }]}>{filters.company}</Text>
                <Text style={[styles.progressRole, { color: c.textSecondary }]}>{filters.role}</Text>
              </View>
              <TouchableOpacity style={[styles.stopBtn, { backgroundColor: c.dangerLight }]} onPress={handleStop}>
                <Ionicons name="stop" size={16} color={c.danger} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.progressLoc, { color: c.primary }]}>
              {filters.country}{filters.state ? `, ${filters.state}` : ''}{filters.district ? `, ${filters.district}` : ''}
            </Text>
            <ProgressBar progress={progressPercent} />
            <Text style={[styles.progressTime, { color: c.textMuted }]}>{getEstimatedTimeText()}</Text>
          </View>
        )}

        <FlatList
          data={sortedSearches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <HistoryCard record={item} onView={handleViewResults} onDelete={handleDeleteItem} />
          )}
          ListEmptyComponent={
            !isResearching ? (
              <View style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: c.primaryLight }]}>
                  <Ionicons name="time-outline" size={32} color={c.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: c.text }]}>No research yet</Text>
                <Text style={[styles.emptyDesc, { color: c.textSecondary }]}>
                  Start a search to see your salary and review results here.
                </Text>
              </View>
            ) : null
          }
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md,
  },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerBtn: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  progressCard: {
    marginHorizontal: Spacing.xl, marginBottom: Spacing.lg,
    borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1,
  },
  progressTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  liveDot: { width: 7, height: 7, borderRadius: 3.5 },
  liveText: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  progressCompany: { fontSize: 16, fontWeight: '700' },
  progressRole: { fontSize: 12, fontWeight: '500' },
  progressLoc: { fontSize: 11, fontWeight: '600', marginBottom: Spacing.sm },
  progressTime: { fontSize: 11, marginTop: Spacing.sm },
  stopBtn: { width: 34, height: 34, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.massive, paddingTop: Spacing.xs },
  empty: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: Spacing.huge },
  emptyIcon: { width: 64, height: 64, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.sm },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
