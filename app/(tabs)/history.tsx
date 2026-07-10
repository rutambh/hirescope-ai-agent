import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, Image, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useHistoryStore } from '../../src/store/historyStore';
import { useSearchStore } from '../../src/store/searchStore';
import { useScraper } from '../../src/hooks/useScraper';
import { HistoryCard } from '../../src/components/HistoryCard';
import { SearchRecord } from '../../src/types';
import { useAppStore } from '../../src/store/appStore';
import { LightColors, DarkColors, Spacing, Radius } from '../../src/constants/theme';
import { ThemedConfirm } from '../../src/components/ThemedConfirm';

export default function HistoryScreen() {
  const router = useRouter();
  const { searches, deleteSearch, clearAll } = useHistoryStore();
  const searchStore = useSearchStore();
  const scraper = useScraper();
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();

  const activeSearches = searchStore.activeSearches;
  const isResearching = activeSearches.length > 0;
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);
  const [clearAllVisible, setClearAllVisible] = useState(false);
  const [stopVisible, setStopVisible] = useState(false);

  const handleViewResults = (record: SearchRecord) => {
    searchStore.setFilters(record.filters);
    searchStore.setFinalResults(record.results);
    router.push('/results');
  };

  const handleDeleteItem = (id: string) => {
    setDeleteItemId(id);
  };

  const handleClearAll = () => {
    setClearAllVisible(true);
  };

  const handleStop = () => {
    setStopVisible(true);
  };

  const sortedSearches = [...searches].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const getEstimatedTimeText = (phase: string) => {
    if (phase === 'searching') return 'Scanning web...';
    if (phase === 'extracting') return 'Extracting data...';
    if (phase === 'ai-extract') return 'AI analyzing...';
    if (phase === 'ai-enhance') return 'AI summarizing...';
    return 'Scanning...';
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <Text style={[styles.title, { color: c.text }]}>History</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          
          {/* Active Searches Section */}
          {isResearching && (
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>
                  In Progress
                </Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeScroll}>
                  {activeSearches.map((search) => (
                    <TouchableOpacity
                      key={search.id}
                      activeOpacity={0.7}
                      onPress={() => router.push('/research-details?live=true')}
                      style={[styles.activeCard, { backgroundColor: isDark ? 'rgba(18, 33, 49, 0.4)' : c.card, borderColor: c.primary + '50' }]}
                    >
                      <View style={styles.activeCardTop}>
                        <View style={{ width: 36 }} />
                        <View style={{ width: 38 }} />
                      </View>
                      <Text style={[styles.activeTitle, { color: c.text }]} numberOfLines={1}>
                        {search.filters.role}
                      </Text>
                      <Text style={[styles.activeMeta, { color: c.textSecondary }]} numberOfLines={1}>
                        {search.filters.company} • {getEstimatedTimeText(search.phase)}
                      </Text>
                      <View style={[styles.barBg, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                        <View style={[styles.barFill, { backgroundColor: c.primary, width: `${search.progressPercent}%` }]} />
                      </View>
                      <Text style={[styles.progressUnder, { color: c.textMuted }]}>{Math.round(search.progressPercent)}%</Text>
                      <View style={styles.activeCardFooter}>
                        <Text style={[styles.avatarCount, { color: c.primary }]}>Live Search</Text>
                        <TouchableOpacity style={[styles.stopBtn, { backgroundColor: c.dangerLight }]} onPress={handleStop}>
                          <Ionicons name="stop" size={12} color={c.danger} />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          )}

          {/* Completed History List Header */}
          <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: c.text }]}>Completed</Text>
                {sortedSearches.length > 0 && (
                  <TouchableOpacity onPress={handleClearAll} style={styles.clearBtn}>
                    <Ionicons name="trash-outline" size={14} color={c.danger} />
                    <Text style={[styles.clearBtnText, { color: c.danger }]}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>

            {/* List */}
            {sortedSearches.length > 0 ? (
              sortedSearches.map((item) => (
                <HistoryCard
                  key={item.id}
                  record={item}
                  onView={handleViewResults}
                  onDelete={handleDeleteItem}
                />
              ))
            ) : (
              !isResearching && (
                <View style={styles.empty}>
                  <View style={[styles.emptyIcon, { backgroundColor: c.primaryLight }]}>
                    <Ionicons name="time-outline" size={32} color={c.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: c.text }]}>No research yet</Text>
                  <Text style={[styles.emptyDesc, { color: c.textSecondary }]}>
                    Start a search to see your salary and review results here.
                  </Text>
                </View>
              )
            )}
          </View>

        </ScrollView>
      </SafeAreaView>

      <ThemedConfirm
        visible={deleteItemId !== null}
        title="Delete"
        message="Remove this search record?"
        confirmLabel="Delete"
        danger
        onConfirm={() => {
          if (deleteItemId) deleteSearch(deleteItemId);
          setDeleteItemId(null);
        }}
        onCancel={() => setDeleteItemId(null)}
      />

      <ThemedConfirm
        visible={clearAllVisible}
        title="Clear History"
        message="Remove all search records?"
        confirmLabel="Clear"
        danger
        onConfirm={() => {
          setClearAllVisible(false);
          clearAll();
        }}
        onCancel={() => setClearAllVisible(false)}
      />

      <ThemedConfirm
        visible={stopVisible}
        title="Stop Research"
        message="Cancel research and lose progress?"
        confirmLabel="Stop"
        danger
        onConfirm={() => {
          setStopVisible(false);
          scraper.handleCancel();
        }}
        onCancel={() => setStopVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  profileBorder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  profileImg: { width: '100%', height: '100%', objectFit: 'cover' },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  headerRight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: Spacing.massive },
  sectionWrap: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionAction: {
    fontSize: 12,
    fontWeight: '700',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  circleBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeScroll: {
    paddingVertical: Spacing.xs,
    gap: 12,
    flexDirection: 'row',
  },
  activeCard: {
    width: 260,
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.md,
  },
  activeCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 10,
    fontWeight: '700',
  },
  progressUnder: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  activeMeta: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 8,
  },
  barBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  activeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarCount: {
    fontSize: 10,
    fontWeight: '700',
  },
  stopBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: Spacing.sm },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 19, paddingHorizontal: Spacing.xl },
});
