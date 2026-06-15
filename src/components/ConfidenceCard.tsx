import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { FinalResults } from '../types';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors, Spacing, Radius } from '../constants/theme';

type Props = { results: FinalResults; };

export function ConfidenceCard({ results }: Props) {
  const { confidence, sourcesCount, domainsScraped, timeElapsedSeconds, aiEnhancedSummary } = results;
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  const getConfidenceInfo = () => {
    switch (confidence) {
      case 'high': return { label: 'High', color: c.success, dot: '🟢' };
      case 'medium': return { label: 'Medium', color: c.warning, dot: '🟡' };
      case 'low': return { label: 'Low', color: c.danger, dot: '🔴' };
      default: return { label: 'Minimal', color: c.textMuted, dot: '⚫' };
    }
  };

  const info = getConfidenceInfo();
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.title, { color: c.textMuted }]}>DATA CONFIDENCE</Text>
      <View style={styles.header}>
        <Text style={styles.dot}>{info.dot}</Text>
        <Text style={[styles.confLabel, { color: info.color }]}>{info.label} Confidence</Text>
        <Text style={[styles.srcCount, { color: c.textMuted }]}>({sourcesCount} sources)</Text>
      </View>
      {confidence === 'minimal' && (
        <Text style={[styles.warning, { color: c.danger }]}>
          ⚠️ Limited data found. Results may not be statistically representative.
        </Text>
      )}
      <View style={styles.stats}>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: c.textSecondary }]}>Pages Scraped:</Text>
          <Text style={[styles.statValue, { color: c.text }]}>{domainsScraped}</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: c.textSecondary }]}>Research Time:</Text>
          <Text style={[styles.statValue, { color: c.text }]}>{formatTime(timeElapsedSeconds)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, padding: Spacing.lg, marginVertical: Spacing.sm, borderWidth: 1 },
  title: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.xs, gap: Spacing.xs },
  dot: { fontSize: 14 },
  confLabel: { fontSize: 15, fontWeight: '700' },
  srcCount: { fontSize: 12 },
  warning: {
    fontSize: 12,
    backgroundColor: '#FEF2F2',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginVertical: Spacing.xs,
    lineHeight: 16,
    overflow: 'hidden',
  },
  stats: { marginTop: Spacing.xs },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 12, fontWeight: '600' },
});
