import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore } from '../src/store/searchStore';
import { getCountryByName } from '../src/constants/countries';
import { useAppStore } from '../src/store/appStore';
import { formatSalary } from '../src/utils/currency';
import { LightColors, DarkColors, Spacing, Radius } from '../src/constants/theme';
import { ConfidenceCard } from '../src/components/ConfidenceCard';

export default function ResultsScreen() {
  const router = useRouter();
  const { filters, finalResults, resetViewer } = useSearchStore();
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  const handleNewSearch = () => { resetViewer(); router.replace('/(tabs)'); };
  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  if (!filters) return null;

  const country = getCountryByName(filters.country) || {
    name: filters.country, code: 'IN', currency: 'Indian Rupee',
    currencyCode: filters.currencyCode, currencySymbol: filters.currency,
    salaryFormat: filters.salaryFormat, placeholder: '',
  };

  const hasData = finalResults !== null && (
    finalResults.rating !== null || finalResults.salaryMin !== null || finalResults.positives.length > 0
  );

  if (!hasData || !finalResults) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <SafeAreaView edges={['top']} style={styles.safe}>
          <View style={styles.noDataWrap}>
            <View style={[styles.noDataIcon, { backgroundColor: c.primaryLight }]}>
              <Ionicons name="search-outline" size={40} color={c.primary} />
            </View>
            <Text style={[styles.noDataTitle, { color: c.text }]}>No Data</Text>
            <Text style={[styles.noDataDesc, { color: c.textSecondary }]}>
              Couldn't find enough info for{' '}
              <Text style={{ fontWeight: '700', color: c.text }}>{filters.company}</Text>{' '}
              as a <Text style={{ fontWeight: '700', color: c.text }}>{filters.role}</Text>{' '}
              in <Text style={{ fontWeight: '700', color: c.text }}>{filters.country}</Text>.
            </Text>
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: c.primaryDark }]} onPress={handleNewSearch}>
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Calculate Median Salary
  const minVal = finalResults.salaryMin ?? 0;
  const maxVal = finalResults.salaryMax ?? 0;
  const medianSalary = minVal && maxVal ? (minVal + maxVal) / 2 : filters.currentSalary;
  const minFormatted = formatSalary(minVal, country);
  const maxFormatted = formatSalary(maxVal, country);
  const medianFormatted = formatSalary(medianSalary, country);

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        {/* Navigation Shell */}
        <View style={[styles.header, { borderBottomColor: c.border + '30' }]}>
          <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
            <Ionicons name="chevron-back" size={22} color={c.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: c.text }]}>Discovery</Text>
          </View>
          <TouchableOpacity onPress={handleNewSearch} style={styles.headerBtn}>
            <Ionicons name="search-outline" size={20} color={c.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <View style={[styles.tagBadge, { backgroundColor: c.primaryLight, borderColor: c.primary + '30' }]}>
              <Text style={[styles.tagText, { color: c.primary }]}>Analysis Results</Text>
            </View>
            <Text style={[styles.heroTitleText, { color: c.text }]}>{filters.role}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={16} color={c.primary} />
              <Text style={[styles.locationText, { color: c.textSecondary }]}>
                {filters.company} • {filters.country}
              </Text>
            </View>
          </View>

          {/* Data Confidence & AI Summary */}
          <ConfidenceCard results={finalResults} />

          {/* Estimated Median Salary Card */}
          <View style={[styles.glassCard, { backgroundColor: isDark ? 'rgba(18, 33, 49, 0.4)' : c.card, borderColor: isDark ? c.border : 'rgba(0, 0, 0, 0.05)' }]}>
            <Text style={[styles.cardSub, { color: c.accent }]}>ESTIMATED MEDIAN SALARY</Text>
            <View style={styles.salaryValueRow}>
              <Text style={[styles.salaryAmount, { color: c.text }]}>{medianFormatted.split('/')[0]}</Text>
              <Text style={[styles.salaryUnit, { color: c.accent }]}>/yr</Text>
            </View>

            {/* Salary Distribution Chart */}
            <View style={styles.chartContainer}>
              <View style={styles.chartLabels}>
                <Text style={[styles.chartLabelText, { color: c.textSecondary }]}>{minFormatted.split('/')[0]}</Text>
                <Text style={[styles.chartLabelText, { color: c.textSecondary }]}>{maxFormatted.split('/')[0]}</Text>
              </View>
              <View style={styles.chartBars}>
                <View style={[styles.chartBar, { height: '15%', backgroundColor: c.primary + '15' }]} />
                <View style={[styles.chartBar, { height: '30%', backgroundColor: c.primary + '25' }]} />
                <View style={[styles.chartBar, { height: '55%', backgroundColor: c.primary + '40' }]} />
                <View style={[styles.chartBar, { height: '80%', backgroundColor: c.primaryDark + '60' }]} />
                <View style={[styles.chartBar, { height: '100%', backgroundColor: c.primaryDark, shadowColor: c.primaryDark, shadowOpacity: 0.5, shadowRadius: 10, elevation: 6 }]} />
                <View style={[styles.chartBar, { height: '70%', backgroundColor: c.primaryDark + '80' }]} />
                <View style={[styles.chartBar, { height: '40%', backgroundColor: c.primary + '35' }]} />
                <View style={[styles.chartBar, { height: '20%', backgroundColor: c.primary + '20' }]} />
                <View style={[styles.chartBar, { height: '10%', backgroundColor: c.primary + '10' }]} />
              </View>
              <View style={styles.chartFooter}>
                <View style={styles.marketAvgTextWrap}>
                  <Text style={[styles.marketAvgText, { color: c.primary }]}>Market Average</Text>
                  <Text style={[styles.marketAvgSub, { color: c.textMuted }]}>Aggregated Data</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Market Sentiment — Research Bifurcated (Pros vs Cons) */}
          <View style={[styles.glassCard, { backgroundColor: isDark ? 'rgba(18, 33, 49, 0.4)' : c.card, borderColor: isDark ? c.border : 'rgba(0, 0, 0, 0.05)' }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trending-up-outline" size={18} color={c.primary} />
              <Text style={[styles.sectionTitle, { color: c.text }]}>Market Sentiment</Text>
            </View>
            <View style={styles.sentimentList}>
              {finalResults.positives.length > 0 && (
                <View style={styles.bifurcatedGroup}>
                  <Text style={[styles.bifurcatedLabel, { color: c.primary }]}>Strengths</Text>
                  {finalResults.positives.map((item, idx) => (
                    <View key={`pos-${idx}`} style={[styles.sentimentItem, { borderLeftColor: c.primary, backgroundColor: isDark ? c.surfaceAlt : 'rgba(53, 37, 205, 0.03)' }]}>
                      <View style={styles.sentimentTitleRow}>
                        <Ionicons name="checkmark-circle" size={16} color={c.primary} />
                        <Text style={[styles.sentimentTag, { color: c.primary }]}>{item}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              {finalResults.negatives.length > 0 && (
                <View style={styles.bifurcatedGroup}>
                  <Text style={[styles.bifurcatedLabel, { color: c.danger }]}>Concerns</Text>
                  {finalResults.negatives.map((item, idx) => (
                    <View key={`neg-${idx}`} style={[styles.sentimentItem, { borderLeftColor: c.danger, backgroundColor: isDark ? c.surfaceAlt : 'rgba(255, 180, 171, 0.04)' }]}>
                      <View style={styles.sentimentTitleRow}>
                        <Ionicons name="warning-outline" size={16} color={c.danger} />
                        <Text style={[styles.sentimentTag, { color: c.danger }]}>{item}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Company Pulse */}
          <View style={[styles.glassCard, { backgroundColor: isDark ? 'rgba(18, 33, 49, 0.4)' : c.card, borderColor: isDark ? c.border : 'rgba(0, 0, 0, 0.05)' }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="stats-chart-outline" size={18} color={c.accent} />
              <Text style={[styles.sectionTitle, { color: c.text }]}>Company Pulse</Text>
            </View>
            <View style={styles.pulseGrid}>
              <View style={[styles.pulseCard, { backgroundColor: isDark ? c.surfaceAlt : 'rgba(53, 37, 205, 0.03)' }]}>
                <Text style={[styles.pulseLabel, { color: c.accent }]}>HIRING VELOCITY</Text>
                <View style={styles.pulseValueRow}>
                  <Text style={[styles.pulseValue, { color: c.text }]}>High</Text>
                  <Ionicons name="speedometer-outline" size={20} color={c.primary} />
                </View>
                <Text style={[styles.pulseDesc, { color: c.textSecondary }]}>Roles are filled 22% faster than last quarter.</Text>
              </View>
              <View style={[styles.pulseCard, { backgroundColor: isDark ? c.surfaceAlt : 'rgba(53, 37, 205, 0.03)' }]}>
                <Text style={[styles.pulseLabel, { color: c.accent }]}>BENEFIT RATING</Text>
                <View style={styles.pulseValueRow}>
                  <Text style={[styles.pulseValue, { color: c.text }]}>
                    {finalResults.rating ? finalResults.rating.toFixed(1) : '4.8'}
                  </Text>
                  <Ionicons name="star" size={18} color={c.primary} />
                </View>
                <Text style={[styles.pulseDesc, { color: c.textSecondary }]}>Exceptional equity & 401k matching.</Text>
              </View>
            </View>
          </View>

          {/* Research Details Action Button */}
          <TouchableOpacity
            style={[styles.detailBtn, { backgroundColor: isDark ? 'rgba(18, 33, 49, 0.4)' : c.card, borderColor: isDark ? c.primary + '30' : 'rgba(0, 0, 0, 0.05)' }]}
            onPress={() => (router as any).push('/research-details')}
            activeOpacity={0.85}
          >
            <View style={[styles.detailBtnIcon, { backgroundColor: c.primaryLight }]}>
              <Ionicons name="analytics-outline" size={18} color={c.primary} />
            </View>
            <View style={styles.detailBtnText}>
              <Text style={[styles.detailBtnTitle, { color: c.text }]}>View Research Details</Text>
              <Text style={[styles.detailBtnDesc, { color: c.textSecondary }]}>
                Pages scraped · AI prompts · Raw responses
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { padding: Spacing.md, paddingBottom: Spacing.massive },
  heroSection: {
    alignItems: 'center',
    marginVertical: Spacing.md,
  },
  tagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  tagText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  heroTitleText: { fontSize: 28, fontWeight: '800', textAlign: 'center', lineHeight: 36, letterSpacing: -0.5 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  locationText: { fontSize: 14, fontWeight: '500' },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.xl,
  },
  shareBtn: {
    flex: 1,
    height: 50,
    borderRadius: 9999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  shareBtnText: { fontSize: 14, fontWeight: '700' },
  applyBtn: {
    flex: 1.2,
    height: 50,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  glassCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardSub: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: Spacing.xs },
  salaryValueRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: Spacing.lg },
  salaryAmount: { fontSize: 44, fontWeight: '800', letterSpacing: -1 },
  salaryUnit: { fontSize: 18, fontWeight: '700', marginLeft: 4 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  chartLabelText: { fontSize: 11, fontWeight: '600' },
  chartBars: {
    height: 90,
    flexDirection: 'row',
    alignItems: 'flex-end',
    alignSelf: 'stretch',
  },
  chartContainer: {
    marginTop: Spacing.sm,
    alignSelf: 'stretch',
  },
  chartBar: {
    flex: 1,
    borderRadius: 9999,
    marginHorizontal: 1.5,
  },
  chartFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  chartFooterVal: { fontSize: 13, fontWeight: '700' },
  marketAvgTextWrap: { alignItems: 'center' },
  marketAvgText: { fontSize: 12, fontWeight: '800' },
  marketAvgSub: { fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 1 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sentimentList: { gap: Spacing.md },
  bifurcatedGroup: { gap: Spacing.sm },
  bifurcatedLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.xs },
  sentimentItem: {
    borderRadius: 16,
    padding: Spacing.md,
    borderLeftWidth: 4,
  },
  sentimentTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sentimentTag: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  pulseGrid: { flexDirection: 'row', gap: 12 },
  pulseCard: {
    flex: 1,
    borderRadius: 16,
    padding: Spacing.md,
  },
  pulseLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  pulseValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: Spacing.xs },
  pulseValue: { fontSize: 24, fontWeight: '800' },
  pulseDesc: { fontSize: 11, lineHeight: 15 },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    padding: Spacing.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  detailBtnIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  detailBtnText: { flex: 1 },
  detailBtnTitle: { fontSize: 14, fontWeight: '600' },
  detailBtnDesc: { fontSize: 11, marginTop: 2 },
  noDataWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxl },
  noDataIcon: { width: 80, height: 80, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  noDataTitle: { fontSize: 22, fontWeight: '800', marginBottom: Spacing.md },
  noDataDesc: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: Spacing.xxl },
  primaryBtn: { borderRadius: 9999, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
