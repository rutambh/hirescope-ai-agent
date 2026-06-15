import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FinalResults, SearchFilters } from '../types';
import { CountryConfig } from '../constants/countries';
import { formatSalary } from '../utils/currency';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors, Spacing, Radius } from '../constants/theme';

type Props = { results: FinalResults; filters: SearchFilters; country: CountryConfig; };

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
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
      <Text style={[styles.title, { color: c.textMuted }]}>
        <Ionicons name="wallet-outline" size={12} color={c.textMuted} /> SALARY DETAILS
      </Text>
      {hasSalaryData ? (
        isCurrentSalaryHigh ? (
          <View style={styles.highSalaryContent}>
            <View style={[styles.highSalaryIcon, { backgroundColor: c.dangerLight }]}>
              <Ionicons name="trending-up" size={24} color={c.danger} />
            </View>
            <Text style={[styles.highSalaryText, { color: c.danger }]}>Your current salary is already above market range.</Text>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={[styles.rangeText, { color: c.primary }]}>
              {minFormatted}  —  {maxFormatted}
            </Text>
            <Text style={[styles.rangeLabel, { color: c.textMuted }]}>Expected Market Range</Text>

            <View style={[styles.divider, { backgroundColor: c.border }]} />

            <View style={styles.detailRow}>
              <View style={styles.detailLabelRow}>
                <Ionicons name="cash-outline" size={14} color={c.textSecondary} />
                <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Current Salary</Text>
              </View>
              <Text style={[styles.detailValue, { color: c.text }]}>{currentFormatted}</Text>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailLabelRow}>
                <Ionicons name="stats-chart-outline" size={14} color={c.textSecondary} />
                <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Market Average</Text>
              </View>
              <Text style={[styles.detailValue, { color: c.text }]}>{averageFormatted}</Text>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailLabelRow}>
                <Ionicons name="rocket-outline" size={14} color={c.success} />
                <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Expected Hike</Text>
              </View>
              <Text style={[styles.hikeValue, { color: c.success }]}>+{averageHikePercent}%</Text>
            </View>
            <View style={styles.detailRow}>
              <View style={styles.detailLabelRow}>
                <Ionicons name="briefcase-outline" size={14} color={c.textSecondary} />
                <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Experience</Text>
              </View>
              <Text style={[styles.detailValue, { color: c.text }]}>
                {filters.experience} {filters.experience === 1 ? 'yr' : 'yrs'}
              </Text>
            </View>
          </View>
        )
      ) : (
        <View style={styles.noDataWrap}>
          <Ionicons name="ban-outline" size={24} color={c.textMuted} />
          <Text style={[styles.noDataText, { color: c.textSecondary }]}>No salary data could be verified for this role.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xxl, padding: Spacing.xl, marginBottom: Spacing.lg, borderWidth: 1 },
  title: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: Spacing.lg },
  content: { alignItems: 'center' },
  rangeText: { fontSize: 26, fontWeight: '800', marginVertical: Spacing.xs, textAlign: 'center', letterSpacing: -0.5 },
  rangeLabel: { fontSize: 11, fontWeight: '500', marginBottom: Spacing.md },
  divider: { height: 1, width: '100%', marginVertical: Spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginVertical: 5 },
  detailLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '600' },
  hikeValue: { fontSize: 14, fontWeight: '700' },
  noDataWrap: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  noDataText: { fontSize: 14, textAlign: 'center' },
  highSalaryContent: { paddingVertical: Spacing.xl, alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  highSalaryIcon: { width: 48, height: 48, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  highSalaryText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
