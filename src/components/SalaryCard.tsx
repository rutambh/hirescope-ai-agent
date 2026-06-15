import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
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

  // Use actual market salary range from scraped data — never override with current salary
  const displayMin = hasSalaryData ? salaryMin : 0;
  const displayMax = hasSalaryData ? salaryMax : 0;

  const minFormatted = formatSalary(displayMin, country);
  const maxFormatted = formatSalary(displayMax, country);
  const currentFormatted = formatSalary(filters.currentSalary, country);

  // Average Salary calculation
  const averageSalary = hasSalaryData ? (displayMin + displayMax) / 2 : 0;
  const averageFormatted = formatSalary(averageSalary, country);

  // Expected Average Hike (percentage of Average Hike compared to Current Salary)
  const averageHikePercent = hasSalaryData
    ? Math.max(0, Math.round(((averageSalary - filters.currentSalary) / filters.currentSalary) * 100))
    : 0;

  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Text style={[styles.title, { color: c.textMuted }]}>EXPECTED SALARY DETAILS</Text>
      {hasSalaryData ? (
        isCurrentSalaryHigh ? (
          <View style={styles.highSalaryContent}>
            <Text style={[styles.highSalaryText, { color: c.danger }]}>
              Your current Salary is already high.
            </Text>
          </View>
        ) : (
          <View style={styles.content}>
            <Text style={[styles.rangeText, { color: c.primary }]}>
              {minFormatted}  —  {maxFormatted}
            </Text>
            <View style={[styles.divider, { backgroundColor: c.border }]} />
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Current Salary</Text>
              <Text style={[styles.detailValue, { color: c.text }]}>{currentFormatted}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Average Salary</Text>
              <Text style={[styles.detailValue, { color: c.text }]}>{averageFormatted}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Expected Average Hike</Text>
              <Text style={[styles.hikeValue, { color: c.success }]}>
                +{averageHikePercent}%
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: c.textSecondary }]}>Experience</Text>
              <Text style={[styles.detailValue, { color: c.text }]}>
                {filters.experience} {filters.experience === 1 ? 'yr' : 'yrs'}
              </Text>
            </View>
          </View>
        )
      ) : (
        <Text style={[styles.noDataText, { color: c.textSecondary }]}>No salary data could be verified for this role.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.xl, padding: Spacing.lg, marginVertical: Spacing.sm, borderWidth: 1 },
  title: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: Spacing.md },
  content: { alignItems: 'center' },
  rangeText: { fontSize: 24, fontWeight: '800', marginVertical: Spacing.sm, textAlign: 'center' },
  divider: { height: 1, width: '100%', marginVertical: Spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginVertical: 4 },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '600' },
  hikeValue: { fontSize: 13, fontWeight: '700' },
  noDataText: { textAlign: 'center', paddingVertical: Spacing.md },
  highSalaryContent: { paddingVertical: Spacing.xl, alignItems: 'center', justifyContent: 'center' },
  highSalaryText: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
