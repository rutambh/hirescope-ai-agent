import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
      case 'high': return { label: 'High', color: c.success, icon: 'shield-checkmark' as const };
      case 'medium': return { label: 'Medium', color: c.warning, icon: 'shield-half' as const };
      case 'low': return { label: 'Low', color: c.danger, icon: 'shield-outline' as const };
      default: return { label: 'Minimal', color: c.textMuted, icon: 'alert-circle-outline' as const };
    }
  };

  const info = getConfidenceInfo();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.title, { color: c.textMuted }]}>
        <Ionicons name="analytics-outline" size={12} color={c.textMuted} /> DATA CONFIDENCE
      </Text>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: info.color + '20' }]}>
          <Ionicons name={info.icon} size={20} color={info.color} />
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.confLabel, { color: info.color }]}>{info.label} Confidence</Text>
          <Text style={[styles.srcCount, { color: c.textMuted }]}>({sourcesCount} sources)</Text>
        </View>
      </View>

      {confidence === 'minimal' && (
        <View style={[styles.warningBox, { backgroundColor: c.dangerLight, borderColor: c.danger + '30' }]}>
          <Ionicons name="warning-outline" size={14} color={c.danger} />
          <Text style={[styles.warningText, { color: c.danger }]}>
            Limited data found. Results may not be statistically representative.
          </Text>
        </View>
      )}

      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: c.primaryLight }]}>
            <Ionicons name="globe-outline" size={14} color={c.primary} />
          </View>
          <View>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Pages Scraped</Text>
            <Text style={[styles.statValue, { color: c.text }]}>{domainsScraped}</Text>
          </View>
        </View>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: c.accentLight }]}>
            <Ionicons name="time-outline" size={14} color={c.accent} />
          </View>
          <View>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Research Time</Text>
            <Text style={[styles.statValue, { color: c.text }]}>{formatTime(timeElapsedSeconds)}</Text>
          </View>
        </View>
      </View>

      {aiEnhancedSummary && (
        <View style={[styles.summaryBox, { backgroundColor: c.primaryFaint, borderColor: c.primary + '20' }]}>
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
  card: { borderRadius: Radius.xxl, padding: Spacing.xl, marginBottom: Spacing.lg, borderWidth: 1 },
  title: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: Spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.md },
  iconWrap: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  confLabel: { fontSize: 16, fontWeight: '700' },
  srcCount: { fontSize: 12, marginTop: 1 },
  warningBox: { flexDirection: 'row', alignItems: 'flex-start', padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.md, gap: Spacing.sm },
  warningText: { fontSize: 12, lineHeight: 16, flex: 1 },
  statsGrid: { flexDirection: 'row', gap: Spacing.md },
  statItem: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: Spacing.sm },
  statIcon: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  statValue: { fontSize: 14, fontWeight: '700' },
  summaryBox: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  summaryLabel: { fontSize: 12, fontWeight: '700' },
  summaryText: { fontSize: 13, lineHeight: 19 },
});
