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
import { Ionicons } from '@expo/vector-icons';
import { useSearchStore } from '../../src/store/searchStore';
import { COUNTRIES, CountryConfig } from '../../src/constants/countries';
import { FilterDropdown } from '../../src/components/FilterDropdown';
import { GenericDropdown } from '../../src/components/GenericDropdown';
import { ExperienceSlider } from '../../src/components/ExperienceSlider';
import { SalaryInput } from '../../src/components/SalaryInput';
import { STATES_BY_COUNTRY, DISTRICTS_BY_STATE } from '../../src/constants/locations';
import { useAppStore } from '../../src/store/appStore';
import { useAIModelStore } from '../../src/store/aiModelStore';
import { useScraper } from '../../src/hooks/useScraper';
import { LightColors, DarkColors, Spacing, Radius, Shadows } from '../../src/constants/theme';

export default function SearchScreen() {
  const router = useRouter();
  const setStoreFilters = useSearchStore((state) => state.setActiveFilters);
  const startSearch = useSearchStore((state) => state.startSearch);
  const searchStore = useSearchStore();
  const scraper = useScraper();
  const { theme } = useAppStore();
  const { status: aiStatus } = useAIModelStore();
  const systemColorScheme = useColorScheme();

  const [selectedCountry, setSelectedCountry] = useState<CountryConfig | null>(null);
  const [stateName, setStateName] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [experience, setExperience] = useState(5);
  const [salary, setSalary] = useState('');

  const phase = searchStore.activePhase;
  const isResearching = phase === 'searching' || phase === 'extracting';

  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

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

    startSearch();
    router.replace('/(tabs)/history');
  };

  const handleStopResearch = () => {
    Alert.alert('Stop Research', 'Are you sure you want to stop this background research? You will lose all active progress.', [
      { text: 'Continue', style: 'default' },
      { text: 'Stop', style: 'destructive', onPress: () => scraper.handleCancel() },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.headerSection}>
              <View style={styles.headerTop}>
                <View style={styles.headerLeft}>
                  <Text style={[styles.greeting, { color: c.textSecondary }]}>Good Morning</Text>
                  <Text style={[styles.title, { color: c.text }]}>HireScope</Text>
                </View>
                <TouchableOpacity
                  style={[styles.settingsBtn, { backgroundColor: c.surface, borderColor: c.border }]}
                  onPress={() => router.push('/settings')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="settings-outline" size={22} color={c.text} />
                </TouchableOpacity>
              </View>

              <View style={[styles.aiStatusRow, { backgroundColor: c.primaryFaint }]}>
                <View style={[styles.aiDot, { backgroundColor: aiStatus === 'installed' ? c.success : c.textMuted }]} />
                <Text style={[styles.aiStatusText, { color: c.primary }]}>
                  {aiStatus === 'installed' ? 'AI Enhancement Active' : aiStatus === 'downloading' ? 'Downloading AI...' : 'No AI Model'}
                </Text>
              </View>
            </View>

            <View style={[styles.formCard, { backgroundColor: c.surface, borderColor: c.border }]}>
              <View style={styles.formHeader}>
                <View style={[styles.formHeaderIcon, { backgroundColor: c.primaryLight }]}>
                  <Ionicons name="search" size={18} color={c.primary} />
                </View>
                <Text style={[styles.formHeaderText, { color: c.text }]}>Research Parameters</Text>
              </View>

              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
                  <Ionicons name="location-outline" size={14} color={c.textMuted} /> LOCATION
                </Text>

                <FilterDropdown
                  label="Country"
                  icon="globe-outline"
                  selectedValue={selectedCountry ? selectedCountry.name : ''}
                  options={COUNTRIES}
                  onSelect={(country) => {
                    setSelectedCountry(country);
                    setStateName('');
                    setDistrictName('');
                    setSalary('');
                  }}
                />

                <GenericDropdown
                  label="State"
                  icon="map-outline"
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

                <GenericDropdown
                  label="District / City"
                  icon="business-outline"
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

              <View style={styles.divider} />

              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
                  <Ionicons name="briefcase-outline" size={14} color={c.textMuted} /> POSITION
                </Text>

                <View style={styles.fieldContainer}>
                  <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Company Name</Text>
                  <View style={[styles.inputShell, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                    <Ionicons name="business-outline" size={18} color={c.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: c.text }]}
                      placeholder="e.g. Google"
                      placeholderTextColor={c.textMuted}
                      value={company}
                      onChangeText={setCompany}
                      autoCapitalize="words"
                      maxLength={20}
                    />
                    {company.length > 0 && (
                      <TouchableOpacity onPress={() => setCompany('')}>
                        <Ionicons name="close-circle" size={18} color={c.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.fieldContainer}>
                  <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Job Role</Text>
                  <View style={[styles.inputShell, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                    <Ionicons name="code-slash-outline" size={18} color={c.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={[styles.textInput, { color: c.text }]}
                      placeholder="e.g. Software Engineer"
                      placeholderTextColor={c.textMuted}
                      value={role}
                      onChangeText={setRole}
                      autoCapitalize="words"
                      maxLength={20}
                    />
                    {role.length > 0 && (
                      <TouchableOpacity onPress={() => setRole('')}>
                        <Ionicons name="close-circle" size={18} color={c.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.section}>
                <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
                  <Ionicons name="wallet-outline" size={14} color={c.textMuted} /> COMPENSATION
                </Text>

                <ExperienceSlider
                  label="Years of Experience"
                  icon="time-outline"
                  value={experience}
                  onChange={setExperience}
                />

                <SalaryInput
                  label="Current Salary"
                  icon="cash-outline"
                  value={salary}
                  country={selectedCountry}
                  onChange={setSalary}
                />
              </View>

              <View style={[styles.tipRow, { backgroundColor: c.accentLight }]}>
                <Ionicons name="bulb-outline" size={16} color={c.accent} />
                <Text style={[styles.tipText, { color: c.accent }]}>
                  Select a country first to enable location-specific salary formatting.
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: isFormValid ? c.primary : c.surfaceAlt,
                    ...(isFormValid ? Shadows.glow : {}),
                  },
                ]}
                disabled={!isFormValid || isResearching}
                onPress={handleStartResearch}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.submitButtonText,
                    { color: isFormValid && !isResearching ? '#FFFFFF' : c.textMuted },
                  ]}
                >
                  {isResearching ? 'Research in Progress...' : 'Start Research'}
                </Text>
                {isFormValid && !isResearching && (
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footerRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color={c.textMuted} />
              <Text style={[styles.footerText, { color: c.textMuted }]}>
                {aiStatus === 'installed'
                  ? 'AI-enhanced research • 100% on-device'
                  : 'No server. No login. Your data stays on device.'}
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.huge,
  },
  headerSection: {
    marginBottom: Spacing.xxl,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerLeft: {},
  greeting: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  aiStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    gap: 6,
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  aiStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  formCard: {
    borderRadius: Radius.xxl,
    padding: Spacing.xxl,
    borderWidth: 1,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  formHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formHeaderText: {
    fontSize: 18,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.md,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: Spacing.md,
    opacity: 0.5,
  },
  fieldContainer: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    letterSpacing: 0.3,
  },
  inputShell: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Platform.OS === 'ios' ? 14 : 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    padding: 0,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  tipText: {
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
    marginTop: Spacing.xxl,
    flexDirection: 'row',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
