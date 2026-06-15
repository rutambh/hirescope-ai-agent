import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchRecord } from '../types';
import { getCountryByName } from '../constants/countries';
import { formatSalary } from '../utils/currency';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors, Spacing, Radius, Shadows } from '../constants/theme';

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
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <View style={styles.cardBody}>
        <View style={styles.topRow}>
          <View style={styles.titleArea}>
            <View style={styles.companyRow}>
              <View style={[styles.companyDot, { backgroundColor: c.primary }]} />
              <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{filters.company}</Text>
            </View>
            <Text style={[styles.role, { color: c.textSecondary }]} numberOfLines={1}>{filters.role}</Text>
          </View>
          <TouchableOpacity onPress={() => onDelete(record.id)} style={styles.deleteBtn} activeOpacity={0.6}>
            <Ionicons name="trash-outline" size={18} color={c.danger} />
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={12} color={c.primary} />
          <Text style={[styles.locationText, { color: c.primary }]} numberOfLines={1}>{formatLocation()}</Text>
          <Text style={[styles.dot, { color: c.textMuted }]}>·</Text>
          <Ionicons name="time-outline" size={12} color={c.textMuted} />
          <Text style={[styles.timestamp, { color: c.textMuted }]}>{formatDate(timestamp)}</Text>
        </View>

        <View style={[styles.statsRow, { backgroundColor: isDark ? c.surfaceAlt : '#F8F9FA' }]}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Rating</Text>
            <Text style={[styles.statValue, { color: getRatingColor(results.rating) }]}>
              ★ {results.rating !== null ? results.rating.toFixed(1) : 'N/A'}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Salary</Text>
            <Text style={[styles.statValue, { color: c.text }]} numberOfLines={1}>{formattedMax}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: c.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>Hike</Text>
            <Text style={[styles.statValue, { color: c.success }]}>
              {averageHikePercent !== null ? `+${averageHikePercent}%` : 'N/A'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.viewBtn, { backgroundColor: c.primary }]}
          onPress={() => onView(record)}
          activeOpacity={0.8}
        >
          <Text style={styles.viewBtnText}>View Results</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xxl,
    marginBottom: Spacing.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardBody: { padding: Spacing.lg },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleArea: { flex: 1, marginRight: Spacing.sm },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 2 },
  companyDot: { width: 8, height: 8, borderRadius: Radius.full },
  title: { fontSize: 17, fontWeight: '700' },
  role: { fontSize: 13, fontWeight: '500', marginLeft: Spacing.lg + 4 },
  deleteBtn: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm, marginBottom: Spacing.md, gap: 4, marginLeft: Spacing.lg + 4 },
  locationText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  dot: { fontSize: 12, marginHorizontal: 2 },
  timestamp: { fontSize: 11 },
  statsRow: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  stat: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, marginHorizontal: Spacing.xs },
  statLabel: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  statValue: { fontSize: 12, fontWeight: '700' },
  viewBtn: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  viewBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
