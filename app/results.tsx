import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useColorScheme,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore } from '../src/store/searchStore';
import { getCountryByName } from '../src/constants/countries';
import { RatingStars } from '../src/components/RatingStars';
import { SalaryCard } from '../src/components/SalaryCard';
import { ProsConsCard } from '../src/components/ProsConsCard';
import { ConfidenceCard } from '../src/components/ConfidenceCard';
import { useAppStore } from '../src/store/appStore';
import { LightColors, DarkColors, Spacing, Radius, Shadows } from '../src/constants/theme';

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
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.noDataWrap}>
            <View style={[styles.noDataIconWrap, { backgroundColor: c.primaryLight }]}>
              <Ionicons name="search-outline" size={48} color={c.primary} />
            </View>
            <Text style={[styles.noDataTitle, { color: c.text }]}>No Data Found</Text>
            <Text style={[styles.noDataDesc, { color: c.textSecondary }]}>
              We searched for{' '}
              <Text style={{ fontWeight: '700', color: c.text }}>{filters.company}</Text>{' '}
              as a{' '}
              <Text style={{ fontWeight: '700', color: c.text }}>{filters.role}</Text>{' '}
              in{' '}
              <Text style={{ fontWeight: '700', color: c.text }}>{filters.country}</Text>, but could not find enough verified information.
            </Text>
            <Text style={[styles.noDataSub, { color: c.textMuted }]}>
              This may happen for very new companies, niche roles, or companies with limited online presence.
            </Text>
            <TouchableOpacity style={[styles.newSearchBtn, { backgroundColor: c.primary }]} onPress={handleNewSearch} activeOpacity={0.8}>
              <Ionicons name="refresh" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.newSearchBtnText}>Try Different Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={c.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: c.text }]} numberOfLines={1}>{filters.company}</Text>
            <Text style={[styles.headerSubtitle, { color: c.textSecondary }]} numberOfLines={1}>
              {filters.role} · {filters.country}{filters.state ? `, ${filters.state}` : ''}{filters.district ? `, ${filters.district}` : ''}
            </Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.ratingCard, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.cardLabel, { color: c.textMuted }]}>COMPANY RATING</Text>
            <RatingStars rating={finalResults.rating} size={32} />
            <View style={[styles.sourcesBadge, { backgroundColor: c.primaryLight }]}>
              <Ionicons name="document-text-outline" size={12} color={c.primary} />
              <Text style={[styles.sourcesText, { color: c.primary }]}>
                Based on {finalResults.sourcesCount} pages
              </Text>
            </View>
          </View>

          <SalaryCard results={finalResults} filters={filters} country={country as any} />
          <ProsConsCard positives={finalResults.positives} negatives={finalResults.negatives} />
          <ConfidenceCard results={finalResults} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { padding: Spacing.xs, width: 44 },
  headerCenter: { flex: 1, alignItems: 'center', marginHorizontal: Spacing.sm },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSubtitle: { fontSize: 11, marginTop: 2 },
  headerSpacer: { width: 44 },
  scrollContent: { padding: Spacing.xxl, paddingBottom: Spacing.massive },
  ratingCard: {
    borderRadius: Radius.xxl,
    padding: Spacing.xxl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: Spacing.lg,
  },
  sourcesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  sourcesText: { fontSize: 11, fontWeight: '600' },
  noDataWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxl },
  noDataIconWrap: {
    width: 96,
    height: 96,
    borderRadius: Radius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  noDataTitle: { fontSize: 24, fontWeight: '800', marginBottom: Spacing.md },
  noDataDesc: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: Spacing.sm },
  noDataSub: { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: Spacing.xxxl },
  newSearchBtn: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xxxl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSearchBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
