import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FinalResults, SearchFilters } from '../types';
import { CountryConfig } from '../constants/countries';
import { formatSalary } from '../utils/currency';
import { useAppStore } from '../store/appStore';
import { Spacing, Radius, Shadows, useTheme } from '../constants/theme';

type Props = { results: FinalResults; filters: SearchFilters; country: CountryConfig };

export function SalaryCard({ results, filters, country }: Props) {
  const { salaryMin, salaryMax } = results;
  const { theme } = useAppStore();
  const { isDark, c } = useTheme();

  const hasSalaryData = salaryMin !== null && salaryMax !== null;
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
      <View style={[styles.accentBar, { backgroundColor: c.primary }]} />
      {hasSalaryData ? (
        <>
          <Text style={[styles.rangeLabel, { color: c.textMuted }]}>Expected Range</Text>
          <Text style={[styles.rangeText, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
            {minFormatted}
            <Text style={{ color: c.primary }}> — </Text>
            {maxFormatted}
          </Text>

          {/* Salary Distribution Chart */}
          <View style={styles.chartContainer}>
            <View style={styles.chartBars}>
              {[15, 30, 55, 80, 100, 70, 40, 20, 10].map((heightPercent, index) => {
                const isMiddle = index >= 3 && index <= 5;
                const barColor = isMiddle ? c.primary : (isDark ? c.surfaceAlt : c.border);
                
                return (
                  <View 
                    key={index} 
                    style={[
                      styles.chartBar, 
                      { 
                        height: `${heightPercent}%`, 
                        backgroundColor: barColor 
                      }
                    ]} 
                  />
                );
              })}
            </View>

            <View style={styles.chartFooter}>
              <Text style={[styles.chartFooterText, { color: c.textSecondary }]}>{minFormatted}</Text>
              <View style={styles.marketAvgTextWrap}>
                <Text style={[styles.marketAvgText, { color: c.primary }]}>Market Average</Text>
                <Text style={[styles.marketAvgSub, { color: c.textMuted }]}>Aggregated Data</Text>
              </View>
              <Text style={[styles.chartFooterText, { color: c.textSecondary }]}>{maxFormatted}+</Text>
            </View>
          </View>

          <View style={[styles.statRow, { backgroundColor: c.surfaceAlt }]}>
            <View style={styles.statItem}>
              <View style={styles.statLabelWrap}>
                <Text style={[styles.statLabel, { color: c.textMuted }]}>Current</Text>
              </View>
              <Text style={[styles.statValue, { color: c.text }]}>{currentFormatted}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.statItem}>
              <View style={styles.statLabelWrap}>
                <Text style={[styles.statLabel, { color: c.textMuted }]}>Average</Text>
              </View>
              <Text style={[styles.statValue, { color: c.text }]}>{averageFormatted}</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: c.border }]} />
            <View style={styles.statItem}>
              <View style={styles.statLabelWrap}>
                <Text style={[styles.statLabel, { color: c.textMuted }]}>Average Hike</Text>
              </View>
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
  accentBar: { height: 3, marginHorizontal: -Spacing.xl, marginTop: -Spacing.xl, marginBottom: Spacing.lg },
  rangeLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  rangeText: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: Spacing.md, alignSelf: 'stretch' },
  chartContainer: { marginTop: Spacing.sm, marginBottom: Spacing.lg, alignSelf: 'stretch' },
  chartBars: { height: 64, flexDirection: 'row', alignItems: 'flex-end', alignSelf: 'stretch', marginBottom: Spacing.sm },
  chartBar: { flex: 1, borderRadius: Radius.sm, marginHorizontal: 2 },
  chartFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs },
  chartFooterText: { fontSize: 12, fontWeight: '700' },
  marketAvgTextWrap: { alignItems: 'center' },
  marketAvgText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  marketAvgSub: { fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  statRow: { flexDirection: 'row', paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, marginBottom: Spacing.md, marginHorizontal: -Spacing.xl },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, marginHorizontal: Spacing.xs },
  statLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', textAlign: 'center' },
  statLabelWrap: { minHeight: 24, justifyContent: 'center', marginBottom: 2 },
  statValue: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center' },
  detailText: { fontSize: 12, fontWeight: '500' },
  noDataWrap: { alignItems: 'center', paddingVertical: Spacing.xl, gap: Spacing.sm },
  noDataText: { fontSize: 14, textAlign: 'center' },
  highSalaryContent: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md },
  iconBox: { width: 52, height: 52, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  highSalaryText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
