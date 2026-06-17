import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FinalResults, SearchFilters } from '../types';
import { CountryConfig } from '../constants/countries';
import { formatSalary } from '../utils/currency';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors, Spacing, Radius, Shadows } from '../constants/theme';

type Props = { results: FinalResults; filters: SearchFilters; country: CountryConfig };

export function SalaryCard({ results, filters, country }: Props) {
  const { salaryMin, salaryMax } = results;
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  const hasSalaryData = salaryMin !== null && salaryMax !== null;
  const isCurrentSalaryHigh = hasSalaryData && filters.currentSalary > salaryMax;

  const displayMin = hasSalaryData ? salaryMin : 0;
  const displayMax = hasSalaryData ? salaryMax : 0;

  const minFormatted = formatSalary(displayMin, country);
  const maxFormatted = formatSalary(displayMax, country);
  const currentFormatted = formatSalary(filters.currentSalary, country);

  const averageSalary = hasSalaryData ? (displayMin + displayMax) / 2 : 0;
  const averageFormatted = formatSalary(averageSalary, country);

  const averageHikePercent = hasSalaryData
    ? Math.max(0, Math.round(((averageSalary - filters.currentSalary) / filters.currentSalary) * 100))
    : 0;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <View style={styles.accentBar} />
      {hasSalaryData ? (
        isCurrentSalaryHigh ? (
          <View style={styles.highSalaryContent}>
            <View style={[styles.iconBox, { backgroundColor: c.dangerLight }]}>
              <Ionicons name="trending-up" size={28} color={c.danger} />
            </View>
            <Text style={[styles.highSalaryText, { color: c.danger }]}>You're already above market range</Text>
          </View>
        ) : (
          <>
            <Text style={[styles.rangeLabel, { color: c.textMuted }]}>Expected Range</Text>
            <Text style={[styles.rangeText, { color: c.text }]}>
              {minFormatted}
              <Text style={{ color: c.primary }}> — </Text>
              {maxFormatted}
            </Text>

            <View style={[styles.statRow, { backgroundColor: c.surfaceAlt }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: c.textMuted }]}>Current</Text>
                <Text style={[styles.statValue, { color: c.text }]}>{currentFormatted}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: c.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: c.textMuted }]}>Average</Text>
                <Text style={[styles.statValue, { color: c.text }]}>{averageFormatted}</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: c.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statLabel, { color: c.textMuted }]}>Hike</Text>
                <Text style={[styles.statValue, { color: c.success }]}>+{averageHikePercent}%</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="briefcase-outline" size={14} color={c.textMuted} />
              <Text style={[styles.detailText, { color: c.textSecondary }]}>
                {filters.experience} {filters.experience === 1 ? 'yr' : 'yrs'} experience
              </Text>
            </View>
          </>
        )
      ) : (
        <View style={styles.noDataWrap}>
          <Ionicons name="ban-outline" size={32} color={c.textMuted} />
          <Text style={[styles.noDataText, { color: c.textSecondary }]}>No salary data verified</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, marginBottom: Spacing.lg, borderWidth: 1, overflow: 'hidden', padding: Spacing.xl },
  accentBar: { height: 3, backgroundColor: '#8B5CF6', marginHorizontal: -Spacing.xl, marginTop: -Spacing.xl, marginBottom: Spacing.lg },
  rangeLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  rangeText: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: Spacing.lg },
  statRow: { flexDirection: 'row', borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, marginHorizontal: Spacing.xs },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '700' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 12, fontWeight: '500' },
  noDataWrap: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  noDataText: { fontSize: 14, textAlign: 'center' },
  highSalaryContent: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  iconBox: { width: 52, height: 52, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  highSalaryText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
