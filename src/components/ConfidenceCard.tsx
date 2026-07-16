import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FinalResults } from '../types';
import { useAppStore } from '../store/appStore';
import { Spacing, Radius, useTheme } from '../constants/theme';

type Props = { results: FinalResults };

export function ConfidenceCard({ results }: Props) {
  const { confidence, sourcesCount, domainsScraped, timeElapsedSeconds, aiEnhancedSummary } = results;
  const { theme } = useAppStore();
  const { isDark, c } = useTheme();

  const confMap = {
    high: { label: 'High', color: c.success, icon: 'shield-checkmark' as const, pct: 100 },
    medium: { label: 'Medium', color: c.warning, icon: 'shield-half' as const, pct: 65 },
    low: { label: 'Low', color: c.danger, icon: 'shield-outline' as const, pct: 35 },
    minimal: { label: 'Minimal', color: c.textMuted, icon: 'alert-circle-outline' as const, pct: 10 },
  };

  const info = confMap[confidence];

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: c.textMuted }]}>Data Confidence</Text>
        <View style={[styles.badge, { backgroundColor: info.color + '20' }]}>
          <Text style={[styles.badgeText, { color: info.color }]}>{info.label}</Text>
        </View>
      </View>

      <View style={[styles.barTrack, { backgroundColor: c.surfaceAlt }]}>
        <View style={[styles.barFill, { backgroundColor: info.color, width: `${info.pct}%` }]} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="globe-outline" size={14} color={c.primary} />
          <Text style={[styles.statValue, { color: c.text }]}>{domainsScraped}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>pages</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="document-text-outline" size={14} color={c.accent} />
          <Text style={[styles.statValue, { color: c.text }]}>{sourcesCount}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>sources</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={14} color={c.warning} />
          <Text style={[styles.statValue, { color: c.text }]}>{formatTime(timeElapsedSeconds)}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>elapsed</Text>
        </View>
      </View>

      {aiEnhancedSummary && (
        <View style={[styles.summaryBox, { backgroundColor: c.primaryFaint, borderColor: c.primary + '30' }]}>
          <View style={styles.summaryHeader}>
            <Ionicons name="sparkles" size={14} color={c.primary} />
            <Text style={[styles.summaryLabel, { color: c.primary }]}>AI Summary</Text>
          </View>
          <Text style={[styles.summaryText, { color: c.text }]}>{aiEnhancedSummary}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  title: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.full },
  badgeText: { fontSize: 11, fontWeight: '700' },
  barTrack: { height: 4, borderRadius: Radius.full, marginBottom: Spacing.md, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radius.full },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: Spacing.sm },
  statItem: { alignItems: 'center', gap: 2 },
  statValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  statLabel: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase' },
  summaryBox: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  summaryLabel: { fontSize: 12, fontWeight: '700' },
  summaryText: { fontSize: 13, lineHeight: 19 },
});
