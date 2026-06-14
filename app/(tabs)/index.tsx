// app/(tabs)/index.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSearchStore } from '../../src/store/searchStore';
import { COUNTRIES, CountryConfig } from '../../src/constants/countries';
import { FilterDropdown } from '../../src/components/FilterDropdown';
import { GenericDropdown } from '../../src/components/GenericDropdown';
import { ExperienceSlider } from '../../src/components/ExperienceSlider';
import { SalaryInput } from '../../src/components/SalaryInput';
import { STATES_BY_COUNTRY, DISTRICTS_BY_STATE } from '../../src/constants/locations';
import { useAppStore } from '../../src/store/appStore';
import { useAIModelStore } from '../../src/store/aiModelStore';
import { LightColors, DarkColors, Spacing, Radius, Shadows } from '../../src/constants/theme';

export default function SearchScreen() {
  const router = useRouter();
  const setStoreFilters = useSearchStore((state) => state.setActiveFilters);
  const startSearch = useSearchStore((state) => state.startSearch);
  const { theme } = useAppStore();
  const { status: aiStatus } = useAIModelStore();
  const systemColorScheme = useColorScheme();

  // Filter States
  const [selectedCountry, setSelectedCountry] = useState<CountryConfig | null>(null);
  const [stateName, setStateName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [experience, setExperience] = useState(5); // default 5 years
  const [salary, setSalary] = useState('');

  // Determine active theme colors dynamically
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const designTokens = isDark ? DarkColors : LightColors;
  const colors = {
    background: designTokens.bg,
    card: designTokens.surface,
    text: designTokens.text,
    subtext: designTokens.textSecondary,
    muted: designTokens.textMuted,
    border: designTokens.border,
    primary: designTokens.primary,
    primaryDark: designTokens.primaryDark,
    primaryLight: designTokens.primaryLight,
    accent: designTokens.accent,
    surfaceAlt: designTokens.surfaceAlt,
  };

  // Validate inputs
  const isFormValid =
    selectedCountry !== null &&
    company.trim().length >= 2 &&
    role.trim().length >= 2 &&
    salary.trim().length > 0;

  const handleStartResearch = () => {
    if (!isFormValid || !selectedCountry) return;

    const numericSalary = parseFloat(salary);
    if (isNaN(numericSalary) || numericSalary <= 0) {
      Alert.alert('Invalid Salary', 'Please enter a positive numeric salary.');
      return;
    }

    // Set filters in Zustand store
    setStoreFilters({
      country: selectedCountry.name,
      countryCode: selectedCountry.code,
      company: company.trim(),
      role: role.trim(),
      experience: experience,
      currentSalary: numericSalary,
      currency: selectedCountry.currency,
      currencyCode: selectedCountry.currencyCode,
      salaryFormat: selectedCountry.salaryFormat,
      state: stateName || undefined,
      district: districtName || undefined,
    });

    // Start background research phase
    startSearch();

    // Navigate immediately to History screen (where active progress is displayed)
    router.replace('/(tabs)/history');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xxxl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={[styles.appTitle, { color: colors.text }]}>HireScope</Text>
              <View style={styles.subtitleRow}>
                <View style={[styles.subtitleAccent, { backgroundColor: colors.primary }]} />
                <Text style={[styles.appSubtitle, { color: colors.subtext }]}>
                  Pre-interview Research Engine
                </Text>
                {aiStatus === 'installed' && (
                  <Text style={styles.aiBadge}> · AI Enhanced ✨</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={[styles.settingsButton, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push('/settings')}
              activeOpacity={0.7}
            >
              <Text style={styles.settingsIcon}>⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Form Card */}
          <View
            style={[
              styles.formCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                ...(isDark ? Shadows.lg : Shadows.md),
              },
            ]}
          >
            {/* Form Header */}
            <View style={styles.formHeader}>
              <View style={[styles.formHeaderAccent, { backgroundColor: colors.primary }]} />
              <Text style={[styles.formHeaderText, { color: colors.text }]}>
                Research Parameters
              </Text>
            </View>

            {/* Location Section */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionIcon}>📍</Text>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>LOCATION</Text>
              </View>

              {/* Country */}
              <FilterDropdown
                label="Country"
                icon="🌍"
                selectedValue={selectedCountry ? selectedCountry.name : ''}
                options={COUNTRIES}
                onSelect={(country) => {
                  setSelectedCountry(country);
                  setStateName('');
                  setDistrictName('');
                  setSalary('');
                }}
              />

              {/* State */}
              <GenericDropdown
                label="State"
                icon="🗺️"
                selectedValue={stateName}
                options={selectedCountry ? ['Clear Selection', ...(STATES_BY_COUNTRY[selectedCountry.name] || [])] : []}
                placeholder={selectedCountry ? 'Select State (Optional)' : 'Select Country first'}
                disabled={!selectedCountry}
                onSelect={(st) => {
                  if (st === 'Clear Selection') {
                    setStateName('');
                    setDistrictName('');
                  } else {
                    setStateName(st);
                    setDistrictName('');
                  }
                }}
              />

              {/* District */}
              <GenericDropdown
                label="District"
                icon="🏙️"
                selectedValue={districtName}
                options={stateName ? ['Clear Selection', ...(DISTRICTS_BY_STATE[stateName] || [])] : []}
                placeholder={stateName ? 'Select District (Optional)' : 'Select State first'}
                disabled={!stateName}
                onSelect={(dt) => {
                  if (dt === 'Clear Selection') {
                    setDistrictName('');
                  } else {
                    setDistrictName(dt);
                  }
                }}
              />
            </View>

            {/* Position Section */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionIcon}>💼</Text>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>Company and Job Looking for</Text>
              </View>

              {/* Company */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.inputLabel, { color: colors.subtext }]}>Company Name</Text>
                <View
                  style={[
                    styles.inputShell,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={styles.inputIcon}>🏢</Text>
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="e.g. Google, Deloitte, Infosys"
                    placeholderTextColor={colors.muted}
                    value={company}
                    onChangeText={setCompany}
                    autoCapitalize="words"
                    maxLength={20}
                  />
                </View>
              </View>

              {/* Role */}
              <View style={styles.fieldContainer}>
                <Text style={[styles.inputLabel, { color: colors.subtext }]}>Job Role</Text>
                <View
                  style={[
                    styles.inputShell,
                    {
                      backgroundColor: colors.surfaceAlt,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={styles.inputIcon}>🎯</Text>
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="e.g. SDE 2, PM, Analyst"
                    placeholderTextColor={colors.muted}
                    value={role}
                    onChangeText={setRole}
                    autoCapitalize="words"
                    maxLength={20}
                  />
                </View>
              </View>
            </View>

            {/* Compensation Section */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionLabelRow}>
                <Text style={styles.sectionIcon}>💰</Text>
                <Text style={[styles.sectionLabel, { color: colors.muted }]}>COMPENSATION</Text>
              </View>

              {/* Experience */}
              <ExperienceSlider
                label="Years of Experience"
                icon="⏱️"
                value={experience}
                onChange={setExperience}
              />

              {/* Salary */}
              <SalaryInput
                label="Current Salary"
                icon="💵"
                value={salary}
                country={selectedCountry}
                onChange={setSalary}
              />
            </View>

            {/* Helper Text */}
            <View style={[styles.helperRow, { backgroundColor: colors.primaryLight }]}>
              <Text style={styles.helperIcon}>💡</Text>
              <Text style={[styles.helperText, { color: colors.primaryDark }]}>
                Tip: Select a country first to enable location-specific salary formatting.
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                {
                  backgroundColor: isFormValid ? colors.primary : colors.surfaceAlt,
                  borderColor: isFormValid ? colors.primaryDark : colors.border,
                  ...(isFormValid
                    ? {
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 6 },
                        shadowOpacity: 0.35,
                        shadowRadius: 12,
                        elevation: 8,
                      }
                    : { shadowOpacity: 0, elevation: 0 }),
                },
              ]}
              disabled={!isFormValid}
              onPress={handleStartResearch}
              activeOpacity={0.85}
            >
              {isFormValid && (
                <View style={[styles.submitGlow, { backgroundColor: colors.primary, opacity: 0.18 }]} />
              )}
              <Text
                style={[
                  styles.submitButtonText,
                  { color: isFormValid ? '#FFFFFF' : colors.muted },
                ]}
              >
                Start Research
              </Text>
              {isFormValid && <Text style={styles.submitArrow}>→</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.lg,
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xxl,
    marginTop: Spacing.sm,
  },
  headerLeft: {
    flex: 1,
    paddingRight: Spacing.md,
  },
  appTitle: {
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  subtitleAccent: {
    width: 4,
    height: 14,
    borderRadius: Radius.full,
    marginRight: Spacing.sm,
  },
  appSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  aiBadge: {
    fontSize: 13,
    color: '#F59E0B',
    fontWeight: '500',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Shadows.sm,
  },
  settingsIcon: {
    fontSize: 20,
  },
  formCard: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F020',
  },
  formHeaderAccent: {
    width: 4,
    height: 20,
    borderRadius: Radius.full,
    marginRight: Spacing.md,
  },
  formHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  formHeaderSubtext: {
    fontSize: 12,
    marginLeft: 'auto',
    fontWeight: '500',
  },
  sectionBlock: {
    marginBottom: Spacing.md,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  sectionIcon: {
    fontSize: 16,
    marginRight: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  fieldContainer: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  inputShell: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: Spacing.sm,
    fontSize: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    padding: 0,
  },
  helperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  helperIcon: {
    fontSize: 14,
    marginRight: Spacing.sm,
  },
  helperText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
    lineHeight: 16,
  },
  submitButton: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
  },
  submitGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.lg,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
    zIndex: 1,
  },
  submitArrow: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '700',
    marginLeft: Spacing.sm,
    zIndex: 1,
  },
});
