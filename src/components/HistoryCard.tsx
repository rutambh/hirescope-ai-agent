import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { SearchRecord } from '../types';
import { getCountryByName } from '../constants/countries';
import { formatSalary } from '../utils/currency';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors, Spacing, Radius } from '../constants/theme';

type Props = {
  record: SearchRecord;
  onView: (record: SearchRecord) => void;
  onDelete: (id: string) => void;
};

export function HistoryCard({ record, onView, onDelete }: Props) {
  const { filters, results, timestamp } = record;
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  const country = getCountryByName(filters.country) || {
    name: filters.country, code: 'IN', currency: 'INR', currencyCode: filters.currencyCode || 'INR',
    currencySymbol: filters.currency || '₹', salaryFormat: filters.salaryFormat || 'LPA', placeholder: '',
  };

  const displayMin = (results.salaryMin !== null && filters.currentSalary)
    ? Math.max(results.salaryMin, filters.currentSalary)
    : (results.salaryMin !== null ? results.salaryMin : 0);
  const displayMax = results.salaryMax !== null ? results.salaryMax : 0;

  const formattedMin = displayMin > 0 ? formatSalary(displayMin, country as any) : 'N/A';
  const formattedMax = displayMax > 0 ? formatSalary(displayMax, country as any) : 'N/A';

  const averageSalary = (displayMin > 0 && displayMax > 0)
    ? (displayMin + displayMax) / 2
    : null;
  const averageHikePercent = (averageSalary !== null && filters.currentSalary)
    ? Math.max(0, Math.round(((averageSalary - filters.currentSalary) / filters.currentSalary) * 100))
    : null;

  const getRatingColor = (ratingVal: number | null) => {
    if (ratingVal === null) return c.textMuted;
    if (ratingVal >= 4) return c.success;
    if (ratingVal >= 3) return c.warning;
    return c.danger;
  };

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  const formatLocation = () => {
    let loc = filters.country;
    if (filters.state) loc += `, ${filters.state}`;
    if (filters.district) loc += `, ${filters.district}`;
    return loc;
  };

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: c.primary }]} />

      <View style={styles.body}>
        {/* Header row */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{filters.company}</Text>
            <Text style={[styles.role, { color: c.textSecondary }]} numberOfLines={1}>{filters.role}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.locationText, { color: c.primary }]} numberOfLines={1}>
            📍 {formatLocation()}
          </Text>
          <Text style={[styles.timestamp, { color: c.textMuted }]}>• Searched {formatDate(timestamp)}</Text>
        </View>

        {/* Stats row */}
        <View style={[styles.statsRow, { backgroundColor: c.surfaceAlt }]}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Rating</Text>
            <Text style={[styles.statValue, { color: getRatingColor(results.rating) }]}>
              ★ {results.rating !== null ? results.rating.toFixed(1) : 'N/A'}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Salary</Text>
            <Text style={[styles.statValue, { color: c.text }]} numberOfLines={1}>
              {formattedMax}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Hike</Text>
            <Text style={[styles.statValue, { color: c.success }]}>
              {averageHikePercent !== null ? `+${averageHikePercent}%` : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.viewBtn, { backgroundColor: c.primary }]}
            onPress={() => onView(record)}
            activeOpacity={0.8}
          >
            <Text style={styles.viewBtnText}>View Results</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.deleteBtn, { backgroundColor: c.dangerLight, borderColor: c.danger + '30' }]}
            onPress={() => onDelete(record.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.deleteBtnText, { color: c.danger }]}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    overflow: 'hidden' as const,
    flexDirection: 'row' as const,
  },
  accentBar: { width: 4 },
  body: { flex: 1, padding: Spacing.md },
  header: {
    marginBottom: Spacing.xs,
  },
  title: { fontSize: 16, fontWeight: '700' },
  role: { fontSize: 13, marginTop: 2 },
  metaRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: Spacing.sm,
  },
  locationText: { fontSize: 12, fontWeight: '600', marginRight: Spacing.sm, flexShrink: 1 },
  timestamp: { fontSize: 11 },
  statsRow: {
    flexDirection: 'row' as const,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  stat: { flex: 1, alignItems: 'center' as const },
  statDivider: { width: 1, marginHorizontal: Spacing.xs },
  statLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 2 },
  statValue: { fontSize: 12, fontWeight: '700' },
  actions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
  },
  viewBtn: {
    flex: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center' as const,
  },
  viewBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  deleteBtn: {
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center' as const,
  },
  deleteBtnText: { fontSize: 14 },
});
