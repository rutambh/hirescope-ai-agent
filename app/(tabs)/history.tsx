import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  useColorScheme,
  Platform,
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
import { LightColors, DarkColors, Spacing, Radius, Shadows } from '../../src/constants/theme';

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
    const totalSecs = 15 * 60;
    const elapsedMinutes = (totalSecs - estimatedSecondsRemaining) / 60;
    if (phase === 'searching') return 'Scanning sources across the web...';
    if (phase === 'extracting') return `Scraping page data... ${Math.round(elapsedMinutes)}/${Math.round(totalSecs / 60)} min`;
    if (elapsedMinutes < 3) return '~12 min remaining';
    if (elapsedMinutes < 6) return '~9 min remaining';
    if (elapsedMinutes < 9) return '~6 min remaining';
    if (elapsedMinutes < 12) return '~3 min remaining';
    if (elapsedMinutes < 14) return '~1 min remaining';
    return 'Finalizing results...';
  };

  const isResearching = phase === 'searching' || phase === 'extracting';

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.text }]}>History</Text>
          <View style={styles.headerRight}>
            {sortedSearches.length > 0 && (
              <TouchableOpacity onPress={handleClearAll} style={styles.headerBtn} activeOpacity={0.7}>
                <Ionicons name="trash-outline" size={20} color={c.danger} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.push('/settings')}
              style={[styles.headerBtn, { backgroundColor: c.surface, borderColor: c.border }]}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={20} color={c.text} />
            </TouchableOpacity>
          </View>
        </View>

        {isResearching && filters && (
          <View style={[styles.progressCard, { backgroundColor: c.surface, borderColor: c.primary + '30' }]}>
            <View style={styles.progressHeader}>
              <View style={styles.progressInfo}>
                <View style={styles.progressLabelRow}>
                  <View style={[styles.pulseDot, { backgroundColor: c.success }]} />
                  <Text style={[styles.progressLabel, { color: c.success }]}>IN PROGRESS</Text>
                </View>
                <View style={styles.progressMeta}>
                  <View style={styles.progressMetaLeft}>
                    <Text style={[styles.progressCompany, { color: c.text }]}>{filters.company}</Text>
                    <Text style={[styles.progressRole, { color: c.textSecondary }]}>{filters.role}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.stopBtn, { backgroundColor: c.dangerLight }]}
                    onPress={handleStopResearch}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="stop" size={18} color={c.danger} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.progressLocation, { color: c.primary }]}>
                  {filters.country}{filters.state ? `, ${filters.state}` : ''}{filters.district ? `, ${filters.district}` : ''}
                </Text>
              </View>
            </View>
            <ProgressBar progress={progressPercent} height={5} />
            <Text style={[styles.progressTime, { color: c.textMuted }]}>{getEstimatedTimeText()}</Text>
          </View>
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
                <View style={[styles.emptyIconWrap, { backgroundColor: c.primaryLight }]}>
                  <Ionicons name="time-outline" size={40} color={c.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: c.text }]}>No Searches Yet</Text>
                <Text style={[styles.emptyDesc, { color: c.textSecondary }]}>
                  Your past company salary and review researches will appear here.
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
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  progressCard: {
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    borderWidth: 1,
  },
  progressHeader: {},
  progressInfo: {},
  progressLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  pulseDot: { width: 8, height: 8, borderRadius: Radius.full },
  progressLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2 },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  progressMetaLeft: { flex: 1, marginRight: Spacing.sm },
  progressCompany: { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  progressRole: { fontSize: 13, fontWeight: '500' },
  progressLocation: { fontSize: 12, fontWeight: '600', marginBottom: Spacing.sm },
  progressTime: { fontSize: 11, marginTop: Spacing.sm },
  stopBtn: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.massive,
    paddingTop: Spacing.xs,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: Spacing.huge,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: Radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginBottom: Spacing.sm },
  emptyDesc: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
