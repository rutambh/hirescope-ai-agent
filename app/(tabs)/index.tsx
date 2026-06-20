import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Alert, useColorScheme,
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
import { LightColors, DarkColors, Spacing, Radius } from '../../src/constants/theme';

export default function SearchScreen() {
  const router = useRouter();
  const setStoreFilters = useSearchStore((s) => s.setActiveFilters);
  const startSearch = useSearchStore((s) => s.startSearch);
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

  const handleStart = () => {
    if (!isFormValid || !selectedCountry) return;
    const numericSalary = parseFloat(salary);
    if (isNaN(numericSalary) || numericSalary <= 0) {
      Alert.alert('Invalid Salary', 'Enter a positive number.');
      return;
    }
    setStoreFilters({
      country: selectedCountry.name,
      countryCode: selectedCountry.code,
      company: company.trim(),
      role: role.trim(),
      experience,
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

  const handleStop = () => {
    Alert.alert('Stop Research', 'Cancel and lose all progress?', [
      { text: 'Continue', style: 'default' },
      { text: 'Stop', style: 'destructive', onPress: () => scraper.handleCancel() },
    ]);
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.topBar}>
              <View>
                <Text style={[styles.greeting, { color: c.textMuted }]}>HireScope</Text>
                <Text style={[styles.tagline, { color: c.text }]}>Know your worth</Text>
              </View>
              <TouchableOpacity
                style={[styles.iconBtn, { backgroundColor: c.card, borderColor: c.border }]}
                onPress={() => router.push('/settings')}
              >
                <Ionicons name="settings-outline" size={20} color={c.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.sectionTitle, { color: c.textMuted }]}>
                <Ionicons name="location-outline" size={13} color={c.textMuted} /> LOCATION
              </Text>

              <FilterDropdown
                label="Country"
                icon="globe-outline"
                selectedValue={selectedCountry?.name || ''}
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
                placeholder={selectedCountry ? 'Select state (optional)' : 'Select country first'}
                disabled={!selectedCountry}
                onSelect={(st) => {
                  if (st === 'Clear Selection') { setStateName(''); setDistrictName(''); }
                  else { setStateName(st); setDistrictName(''); }
                }}
              />

              <GenericDropdown
                label="City / District"
                icon="business-outline"
                selectedValue={districtName}
                options={stateName ? ['Clear Selection', ...(DISTRICTS_BY_STATE[stateName] || [])] : []}
                placeholder={stateName ? 'Select city (optional)' : 'Select state first'}
                disabled={!stateName}
                onSelect={(dt) => { setDistrictName(dt === 'Clear Selection' ? '' : dt); }}
              />

              <View style={styles.warningBox}>
                <Ionicons name="information-circle-outline" size={14} color={c.warning} />
                <Text style={[styles.warningText, { color: c.warning }]}>
                  If you select State and city filters, it might give you wrong results due to limited search
                </Text>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.sectionTitle, { color: c.textMuted }]}>
                <Ionicons name="briefcase-outline" size={13} color={c.textMuted} /> POSITION
              </Text>

              <View style={styles.field}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Company</Text>
                <View style={[styles.inputShell, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <Ionicons name="business-outline" size={16} color={c.textMuted} style={{ marginRight: 8 }} />
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
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Role</Text>
                <View style={[styles.inputShell, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
                  <Ionicons name="code-slash-outline" size={16} color={c.textMuted} style={{ marginRight: 8 }} />
                  <TextInput
                    style={[styles.input, { color: c.text }]}
                    placeholder="e.g. Software Engineer"
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

            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
              <Text style={[styles.sectionTitle, { color: c.textMuted }]}>
                <Ionicons name="wallet-outline" size={13} color={c.textMuted} /> COMPENSATION
              </Text>

              <ExperienceSlider
                label="Experience"
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

            {isResearching ? (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: c.dangerLight, borderColor: c.danger + '40' }]}
                onPress={handleStop}
                activeOpacity={0.85}
              >
                <Ionicons name="stop" size={18} color={c.danger} />
                <Text style={[styles.actionBtnText, { color: c.danger }]}>Stop Research</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, {
                  backgroundColor: isFormValid ? c.primary : c.surfaceAlt,
                  borderColor: isFormValid ? c.primary : c.border,
                }]}
                disabled={!isFormValid}
                onPress={handleStart}
                activeOpacity={0.85}
              >
                <Ionicons name="search" size={18} color={isFormValid ? '#FFF' : c.textMuted} />
                <Text style={[styles.actionBtnText, { color: isFormValid ? '#FFF' : c.textMuted }]}>Start Research</Text>
              </TouchableOpacity>
            )}

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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.massive },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.xxl },
  greeting: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  tagline: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  card: { borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.lg, borderWidth: 1 },
  sectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing.md },
  field: { marginBottom: Spacing.md },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: Spacing.xs },
  inputShell: { borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.lg, paddingVertical: Platform.OS === 'ios' ? 12 : 10, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, fontSize: 15, fontWeight: '500', padding: 0 },
  warningBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginTop: Spacing.sm, paddingHorizontal: Spacing.xs },
  warningText: { fontSize: 11, flex: 1, lineHeight: 15 },
  actionBtn: { borderRadius: Radius.md, paddingVertical: Spacing.md + 2, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  actionBtnText: { fontSize: 15, fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl, gap: Spacing.xs },
  footerText: { fontSize: 11, textAlign: 'center' },
});
