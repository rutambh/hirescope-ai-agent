import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  const displayMin = results.salaryMin !== null ? results.salaryMin : 0;
  const displayMax = results.salaryMax !== null ? results.salaryMax : 0;
  const formattedMin = displayMin > 0 ? formatSalary(displayMin, country as any) : 'N/A';
  const formattedMax = displayMax > 0 ? formatSalary(displayMax, country as any) : 'N/A';

  const avgSalary = (displayMin > 0 && displayMax > 0) ? (displayMin + displayMax) / 2 : null;
  const avgHike = (avgSalary !== null && filters.currentSalary)
    ? Math.max(0, Math.round(((avgSalary - filters.currentSalary) / filters.currentSalary) * 100))
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
    <TouchableOpacity
      style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
      onPress={() => onView(record)}
      activeOpacity={0.85}
    >
      <View style={styles.topRow}>
        <View style={styles.titleArea}>
          <View style={styles.titleRow}>
            <View style={[styles.dot, { backgroundColor: c.primary }]} />
            <Text style={[styles.company, { color: c.text }]} numberOfLines={1}>{filters.company}</Text>
          </View>
          <Text style={[styles.role, { color: c.textSecondary }]} numberOfLines={1}>{filters.role}</Text>
        </View>
        <TouchableOpacity onPress={() => onDelete(record.id)} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={16} color={c.danger} />
        </TouchableOpacity>
      </View>

      <View style={styles.metaRow}>
        <Ionicons name="location-outline" size={11} color={c.primary} />
        <Text style={[styles.metaText, { color: c.primary }]} numberOfLines={1}>{formatLocation()}</Text>
        <Text style={[styles.metaDot, { color: c.textMuted }]}>·</Text>
        <Ionicons name="time-outline" size={11} color={c.textMuted} />
        <Text style={[styles.metaText, { color: c.textMuted }]}>{formatDate(timestamp)}</Text>
      </View>

      <View style={[styles.statsRow, { backgroundColor: c.surfaceAlt }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Rating</Text>
          <Text style={[styles.statValue, { color: getRatingColor(results.rating) }]}>
            {results.rating !== null ? `★ ${results.rating.toFixed(1)}` : '—'}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Salary</Text>
          <Text style={[styles.statValue, { color: c.text }]} numberOfLines={1}>{formattedMax}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Hike</Text>
          <Text style={[styles.statValue, { color: c.success }]}>{avgHike !== null ? `+${avgHike}%` : '—'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, marginBottom: Spacing.md, borderWidth: 1, padding: Spacing.lg },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  titleArea: { flex: 1, marginRight: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  company: { fontSize: 16, fontWeight: '700' },
  role: { fontSize: 12, fontWeight: '500', marginLeft: Spacing.lg + 2 },
  deleteBtn: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, marginBottom: Spacing.md, gap: 3, marginLeft: Spacing.lg + 2 },
  metaText: { fontSize: 11, fontWeight: '500', flexShrink: 1 },
  metaDot: { fontSize: 11, marginHorizontal: 1 },
  statsRow: { flexDirection: 'row', borderRadius: Radius.md, padding: Spacing.sm },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, marginHorizontal: Spacing.xs },
  statLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 1 },
  statValue: { fontSize: 12, fontWeight: '700' },
});
