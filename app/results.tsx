import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSearchStore } from '../src/store/searchStore';
import { getCountryByName } from '../src/constants/countries';
import { RatingStars } from '../src/components/RatingStars';
import { SalaryCard } from '../src/components/SalaryCard';
import { ProsConsCard } from '../src/components/ProsConsCard';
import { ConfidenceCard } from '../src/components/ConfidenceCard';
import { useAppStore } from '../src/store/appStore';
import { LightColors, DarkColors, Spacing, Radius } from '../src/constants/theme';

export default function ResultsScreen() {
  const router = useRouter();
  const { filters, finalResults, resetViewer } = useSearchStore();
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  const handleNewSearch = () => { resetViewer(); router.replace('/(tabs)'); };
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]} edges={['top']}>
        <View style={styles.noDataWrap}>
          <Text style={styles.noDataEmoji}>😔</Text>
          <Text style={[styles.noDataTitle, { color: c.text }]}>No Data Found</Text>
          <Text style={[styles.noDataDesc, { color: c.textSecondary }]}>
            We searched for <Text style={[styles.highlight, { color: c.text }]}>{filters.company}</Text> as a{' '}
            <Text style={[styles.highlight, { color: c.text }]}>{filters.role}</Text> in{' '}
            <Text style={[styles.highlight, { color: c.text }]}>{filters.country}</Text>, but could not find enough verified information.
          </Text>
          <Text style={[styles.noDataSub, { color: c.textMuted }]}>
            This may happen for very new companies, niche roles, or companies with limited online presence.
          </Text>
          <TouchableOpacity style={[styles.newSearchBtn, { backgroundColor: c.primary }]} onPress={handleNewSearch} activeOpacity={0.8}>
            <Text style={styles.newSearchBtnText}>Try Different Filters</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: c.bg }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: c.primary }]}>← Back</Text>
        </TouchableOpacity>
        <View style={{ alignItems: 'center', flex: 1, marginHorizontal: Spacing.sm }}>
          <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>{filters.company}</Text>
          <Text style={[styles.headerSubtitle, { color: c.textSecondary }]} numberOfLines={1}>
            {filters.role} · {filters.country}{filters.state ? `, ${filters.state}` : ''}{filters.district ? `, ${filters.district}` : ''}
          </Text>
        </View>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Rating */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.sectionLabel, { color: c.textMuted }]}>OVERALL COMPANY RATING</Text>
          <RatingStars rating={finalResults.rating} size={32} />
          <Text style={[styles.sourcesText, { color: c.textMuted }]}>
            Based on {finalResults.sourcesCount} pages scraped
            {finalResults.aiEnhancedSummary ? ' · AI Enhanced ✨' : ' · Summary Engine'}
          </Text>
        </View>

        {/* Salary */}
        <SalaryCard results={finalResults} filters={filters} country={country as any} />

        {/* Pros & Cons */}
        <ProsConsCard positives={finalResults.positives} negatives={finalResults.negatives} />

        {/* Confidence */}
        <ConfidenceCard results={finalResults} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  backBtn: { paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, width: 60 },
  backText: { fontSize: 14, fontWeight: '700' },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSubtitle: { fontSize: 11, marginTop: 2 },
  scrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxxl },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    marginVertical: Spacing.sm,
    borderWidth: 1,
  },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: Spacing.sm },
  sourcesText: { fontSize: 11, textAlign: 'center', marginTop: Spacing.sm, lineHeight: 16 },
  // No Data
  noDataWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xxxl },
  noDataEmoji: { fontSize: 72, marginBottom: Spacing.lg },
  noDataTitle: { fontSize: 24, fontWeight: '800', marginBottom: Spacing.md },
  noDataDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.sm },
  highlight: { fontWeight: '700' },
  noDataSub: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: Spacing.xxxl },
  newSearchBtn: {
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xxxl,
    width: '100%',
    alignItems: 'center',
  },
  newSearchBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
