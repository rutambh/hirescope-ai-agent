import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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

  const handleViewResults = (record: SearchRecord) => {
    searchStore.setFilters(record.filters);
    searchStore.setFinalResults(record.results);
    router.push('/results');
  };

  const handleDeleteItem = (id: string) => {
    Alert.alert('Delete Record', 'Are you sure you want to delete this search history item?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSearch(id) },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Clear History', 'Are you sure you want to clear all search history?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear All', style: 'destructive', onPress: () => clearAll() },
    ]);
  };

  const handleStopResearch = () => {
    Alert.alert('Stop Research', 'Are you sure you want to stop this background research? You will lose all active progress.', [
      { text: 'Continue', style: 'default' },
      { text: 'Stop', style: 'destructive', onPress: () => scraper.handleCancel() },
    ]);
  };

  const sortedSearches = [...searches].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getEstimatedTimeText = () => {
    const totalSecs = 8 * 60;
    const elapsedMinutes = (totalSecs - estimatedSecondsRemaining) / 60;
    if (phase === 'searching') return 'Discovering URLs...';
    if (elapsedMinutes < 2) return '~6 min remaining';
    if (elapsedMinutes < 4) return '~4 min remaining';
    if (elapsedMinutes < 6) return '~2 min remaining';
    return 'Finalizing...';
  };

  const isResearching = phase === 'searching' || phase === 'extracting';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <View style={{ width: 40 }} />
        <Text style={[styles.title, { color: c.text }]}>Research History</Text>
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          style={[styles.settingsBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          activeOpacity={0.7}
        >
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {isResearching && filters && (
        <View style={[styles.progressCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.progressHeader}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <View style={styles.progressLabelRow}>
                <View style={[styles.pulseDot, { backgroundColor: c.success }]} />
                <Text style={[styles.progressLabel, { color: c.success }]}>RESEARCH IN PROGRESS</Text>
              </View>
              <Text style={[styles.progressCompany, { color: c.text }]}>{filters.company}</Text>
              <Text style={[styles.progressRole, { color: c.textSecondary }]}>{filters.role}</Text>
              <Text style={[styles.progressLocation, { color: c.primary }]}>
                {filters.country}{filters.state ? `, ${filters.state}` : ''}{filters.district ? `, ${filters.district}` : ''}
              </Text>
              <Text style={[styles.progressTime, { color: c.textMuted }]}>{getEstimatedTimeText()}</Text>
            </View>
            <TouchableOpacity
              style={[styles.stopBtn, { backgroundColor: c.dangerLight, borderColor: c.danger + '30' }]}
              onPress={handleStopResearch}
              activeOpacity={0.7}
            >
              <Text style={[styles.stopBtnText, { color: c.danger }]}>■</Text>
              <Text style={[styles.stopLabel, { color: c.danger }]}>Stop</Text>
            </TouchableOpacity>
          </View>
          <ProgressBar progress={progressPercent} />
        </View>
      )}

      {sortedSearches.length > 0 && (
        <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll} activeOpacity={0.7}>
          <Text style={[styles.clearAllText, { color: c.danger }]}>
            Clear All ({sortedSearches.length})
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={sortedSearches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <HistoryCard record={item} onView={handleViewResults} onDelete={handleDeleteItem} />
        )}
        ListEmptyComponent={
          !isResearching ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={[styles.emptyTitle, { color: c.text }]}>No Searches Yet</Text>
              <Text style={[styles.emptyDesc, { color: c.textSecondary }]}>
                Your past company salary and review researches will appear here.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '800' },
  settingsBtn: {
    width: 40, height: 40,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: { fontSize: 20 },
  progressCard: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    borderWidth: 1,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  progressLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
  pulseDot: { width: 8, height: 8, borderRadius: Radius.full },
  progressLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  progressCompany: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  progressRole: { fontSize: 13, marginBottom: 2 },
  progressLocation: { fontSize: 12, fontWeight: '600', marginBottom: Spacing.xs },
  progressTime: { fontSize: 11 },
  stopBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.lg, borderWidth: 1, width: 52, height: 52,
  },
  stopBtnText: { fontSize: 18, fontWeight: '700' },
  stopLabel: { fontSize: 10, fontWeight: '700', marginTop: 2 },
  clearAllBtn: { alignSelf: 'flex-end', marginHorizontal: Spacing.lg, marginTop: Spacing.sm },
  clearAllText: { fontSize: 12, fontWeight: '600' },
  listContent: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: Spacing.xxxl },
  emptyIcon: { fontSize: 56, marginBottom: Spacing.lg },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.sm },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
