import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore } from '../../src/store/searchStore';
import { ExperienceSlider } from '../../src/components/ExperienceSlider';
import { SalaryInput } from '../../src/components/SalaryInput';
import { useAppStore } from '../../src/store/appStore';
import { useAIModelStore } from '../../src/store/aiModelStore';
import { INDIA, COUNTRIES, CountryConfig } from '../../src/constants/countries';
import { Spacing, Radius, useTheme } from '../../src/constants/theme';
import { ThemedConfirm } from '../../src/components/ThemedConfirm';
import { FilterDropdown } from '../../src/components/FilterDropdown';
import { APP_ICON } from '../../src/constants/config';

export default function SearchScreen() {
  const router = useRouter();
  const searchStore = useSearchStore();
  const { theme, keepScreenOnDefault, setKeepScreenOnDefault } = useAppStore();
  const { status: aiStatus } = useAIModelStore();
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [experience, setExperience] = useState(5);
  const [salary, setSalary] = useState('');
  const [countryCfg, setCountryCfg] = useState<CountryConfig>(INDIA);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [invalidSalaryVisible, setInvalidSalaryVisible] = useState(false);
  const [researchMode, setResearchMode] = useState<'deep' | 'narrow'>('deep');

  const activeSearches = searchStore.activeSearches;
  const isResearching = activeSearches.length > 0;

  const { isDark, c } = useTheme();

  const isFormValid =
    company.trim().length >= 2 &&
    role.trim().length >= 2 &&
    salary.trim().length > 0;

  const launchSearch = (numericSalaryVal?: number) => {
    const numericSalary = numericSalaryVal ?? parseFloat(salary);
    const searchId = Date.now().toString();
    searchStore.addActiveSearch(searchId, {
      country: countryCfg.name,
      countryCode: countryCfg.code,
      company: company.trim(),
      role: role.trim(),
      experience,
      currentSalary: numericSalary,
      currency: countryCfg.currency,
      currencyCode: countryCfg.currencyCode,
      salaryFormat: countryCfg.salaryFormat,
      researchMode,
    });
    router.replace('/(tabs)/history');
  };

  const handleStart = () => {
    if (!isFormValid) return;
    const numericSalary = parseFloat(salary);
    if (isNaN(numericSalary) || numericSalary <= 0) {
      setInvalidSalaryVisible(true);
      return;
    }

    if (!searchStore.canStartNewSearch()) {
      setShowLimitModal(true);
      return;
    }

    launchSearch(numericSalary);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        {/* Top App Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarLeft}>
            <Image source={APP_ICON} style={styles.brandImage} />
            <Text style={[styles.brandText, { color: c.text }]}>Hire<Text style={{ color: c.primary }}>Scope</Text></Text>
          </View>
          <View style={[styles.brandPill, { backgroundColor: c.primaryLight }]}>
            <Ionicons name="shield-checkmark-outline" size={13} color={c.primary} />
            <Text style={[styles.brandPillText, { color: c.primary }]}>Private</Text>
          </View>
        </View>

        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Position Card */}
            <View style={[styles.card, {
              backgroundColor: c.card, borderColor: c.border, borderWidth: 1, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4,
            }]}>
              <Text style={[styles.groupTitle, { color: c.primary }]}>POSITION</Text>

              <View style={styles.field}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Company</Text>
                <View style={[styles.inputShell, { backgroundColor: isDark ? c.surfaceAlt : c.primaryFaint, borderColor: c.primaryLight, borderWidth: 1 }]}>
                  <Ionicons name="business-outline" size={18} color={c.primary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.input, { color: c.text }]}
                    placeholder="e.g. Google"
                    placeholderTextColor={c.textMuted}
                    value={company}
                    onChangeText={setCompany}
                    autoCapitalize="words"
                    maxLength={20}
                  />
                  {company.length > 0 && (
                    <TouchableOpacity onPress={() => setCompany('')}>
                      <Ionicons name="close-circle" size={16} color={c.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Role or Title</Text>
                <View style={[styles.inputShell, { backgroundColor: isDark ? c.surfaceAlt : c.primaryFaint, borderColor: c.primaryLight, borderWidth: 1 }]}>
                  <Ionicons name="briefcase-outline" size={18} color={c.primary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.input, { color: c.text }]}
                    placeholder="e.g. Product Designer"
                    placeholderTextColor={c.textMuted}
                    value={role}
                    onChangeText={setRole}
                    autoCapitalize="words"
                    maxLength={20}
                  />
                  {role.length > 0 && (
                    <TouchableOpacity onPress={() => setRole('')}>
                      <Ionicons name="close-circle" size={16} color={c.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

            </View>

            {/* Location Card */}
            <View style={[styles.card, {
              backgroundColor: c.card, borderColor: c.border, borderWidth: 1, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4,
            }]}>
              <Text style={[styles.groupTitle, { color: c.primary }]}>LOCATION</Text>

              <FilterDropdown
                label="Country"
                icon="globe-outline"
                selectedValue={countryCfg.name}
                options={COUNTRIES}
                onSelect={setCountryCfg}
              />
            </View>

            {/* Research Mode Card */}
            <View style={[styles.card, {
              backgroundColor: c.card, borderColor: c.border, borderWidth: 1, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4,
            }]}>
              <Text style={[styles.groupTitle, { color: c.primary }]}>RESEARCH MODE</Text>
              
              <View style={styles.modeContainer}>
                <TouchableOpacity
                  style={[
                    styles.modeOption,
                    {
                      backgroundColor: researchMode === 'deep' ? c.primaryLight : (isDark ? c.surfaceAlt : c.bg),
                      borderColor: researchMode === 'deep' ? c.primary : (isDark ? 'transparent' : c.border),
                      borderWidth: 1.5,
                    }
                  ]}
                  onPress={() => setResearchMode('deep')}
                  activeOpacity={0.8}
                >
                  <View style={styles.modeHeader}>
                    <Ionicons name="layers-outline" size={18} color={researchMode === 'deep' ? c.primary : c.textSecondary} />
                    <Text style={[styles.modeTitle, { color: researchMode === 'deep' ? c.primary : c.text }]}>Deep Research</Text>
                  </View>
                  <Text style={[styles.modeDesc, { color: c.textSecondary }]}>
                    15–20 min budget. Scrapes core + WebView sources for maximum coverage.
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeOption,
                    {
                      backgroundColor: researchMode === 'narrow' ? c.primaryLight : (isDark ? c.surfaceAlt : c.bg),
                      borderColor: researchMode === 'narrow' ? c.primary : (isDark ? 'transparent' : c.border),
                      borderWidth: 1.5,
                      marginTop: Spacing.sm,
                    }
                  ]}
                  onPress={() => setResearchMode('narrow')}
                  activeOpacity={0.8}
                >
                  <View style={styles.modeHeader}>
                    <Ionicons name="flash-outline" size={18} color={researchMode === 'narrow' ? c.primary : c.textSecondary} />
                    <Text style={[styles.modeTitle, { color: researchMode === 'narrow' ? c.primary : c.text }]}>Narrow Research</Text>
                  </View>
                  <Text style={[styles.modeDesc, { color: c.textSecondary }]}>
                    2–3 min budget. Fast native requests only. Skips bot-blocked sites.
                  </Text>
                </TouchableOpacity>
              </View>

              {researchMode === 'deep' && (
                <TouchableOpacity
                  style={styles.keepScreenOnRow}
                  onPress={() => setKeepScreenOnDefault(!keepScreenOnDefault)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={keepScreenOnDefault ? "checkbox" : "square-outline"}
                    size={20}
                    color={c.primary}
                  />
                  <Text style={[styles.keepScreenOnText, { color: c.textSecondary }]}>
                    Keep screen on — prevents auto-lock during research. Please stay on this screen; switching apps will pause the search.
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Requirements Card */}
            <View style={[styles.card, {
              backgroundColor: c.card, borderColor: c.border, borderWidth: 1, shadowColor: c.cardShadow, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 16, elevation: 4,
            }]}>
              <Text style={[styles.groupTitle, { color: c.primary }]}>REQUIREMENTS</Text>

              <ExperienceSlider
                label="Experience Level"
                icon="ribbon-outline"
                value={experience}
                onChange={setExperience}
              />

              <SalaryInput
                label="Current Salary"
                icon="cash-outline"
                value={salary}
                country={countryCfg}
                onChange={setSalary}
              />
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.actionBtn,
                {
                  backgroundColor: isFormValid ? c.primary : c.surfaceAlt,
                  borderColor: isFormValid ? c.primary : c.border,
                  shadowColor: isFormValid ? c.primary : 'transparent',
                }
              ]}
              disabled={!isFormValid}
              onPress={handleStart}
              activeOpacity={0.85}
            >
              <Text style={[styles.actionBtnText, { color: isFormValid ? (c.onPrimary) : c.textMuted, fontWeight: '700' }]}>
                {activeSearches.length >= 1 ? 'Limit Reached' : 'Start Research'}
              </Text>
              <Ionicons name={activeSearches.length >= 1 ? "lock-closed-outline" : "arrow-forward-outline"} size={18} color={isFormValid ? (c.onPrimary) : c.textMuted} />
            </TouchableOpacity>

            

            <View style={styles.footer}>
              <Ionicons name="shield-checkmark-outline" size={12} color={c.textMuted} />
              <Text style={[styles.footerText, { color: c.textMuted }]}>
                {aiStatus === 'installed'
                  ? 'AI-powered · 100% on-device'
                  : 'No server · No login · Private'}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ThemedConfirm
        visible={showLimitModal}
        title="Research Limit Reached"
        message="A research is already in progress. Please wait for it to complete before starting a new one."
        confirmLabel="Got it"
        cancelLabel="Cancel"
        onConfirm={() => setShowLimitModal(false)}
        onCancel={() => setShowLimitModal(false)}
      />

      <ThemedConfirm
        visible={invalidSalaryVisible}
        title="Invalid Salary"
        message="Enter a positive number."
        confirmLabel="OK"
        singleButton
        onConfirm={() => setInvalidSalaryVisible(false)}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.massive },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandImage: {
    width: 34, height: 34, borderRadius: 10,
  },
  brandPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9999,
  },
  brandPillText: { fontSize: 12, fontWeight: '700' },
  brandText: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  topBarBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
  },
  field: { marginBottom: Spacing.md },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  inputShell: {
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: Spacing.xl,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, fontSize: 15, fontWeight: '500', padding: 0 },
  actionBtn: {
    borderRadius: Radius.full,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  actionBtnText: { fontSize: 15, fontWeight: '700' },
  
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xl, gap: Spacing.xs },
  footerText: { fontSize: 11, textAlign: 'center' },
  modeContainer: {
    gap: Spacing.sm,
  },
  modeOption: {
    borderRadius: 16,
    padding: Spacing.md,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 4,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  modeDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  keepScreenOnRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: 4,
  },
  keepScreenOnText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
});

