import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme,
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
            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: c.primary }]} onPress={handleNewSearch}>
              <Ionicons name="refresh" size={16} color="#FFF" />
              <Text style={styles.primaryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={[styles.header, { borderBottomColor: c.border }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color={c.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerCompany, { color: c.text }]} numberOfLines={1}>{filters.company}</Text>
            <Text style={[styles.headerMeta, { color: c.textSecondary }]} numberOfLines={1}>
              {filters.role} · {filters.country}
            </Text>
          </View>
          <TouchableOpacity onPress={handleNewSearch} style={styles.backBtn}>
            <Ionicons name="add" size={22} color={c.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.ratingCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <RatingStars rating={finalResults.rating} />
            <View style={[styles.sourceBadge, { backgroundColor: c.primaryLight }]}>
              <Ionicons name="document-text-outline" size={11} color={c.primary} />
              <Text style={[styles.sourceText, { color: c.primary }]}>
                {finalResults.sourcesCount} sources
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
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1,
  },
  backBtn: { padding: Spacing.xs, width: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerCompany: { fontSize: 16, fontWeight: '700' },
  headerMeta: { fontSize: 11, marginTop: 1 },
  scroll: { padding: Spacing.xl, paddingBottom: Spacing.massive },
  ratingCard: {
    borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center',
    marginBottom: Spacing.lg, borderWidth: 1,
  },
  sourceBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs + 2, borderRadius: Radius.full, marginTop: Spacing.sm, gap: Spacing.xs },
  sourceText: { fontSize: 11, fontWeight: '600' },
  noDataWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xxxl },
  noDataIcon: { width: 80, height: 80, borderRadius: Radius.xl, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  noDataTitle: { fontSize: 22, fontWeight: '800', marginBottom: Spacing.md },
  noDataDesc: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: Spacing.xxl },
  primaryBtn: { borderRadius: Radius.md, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
