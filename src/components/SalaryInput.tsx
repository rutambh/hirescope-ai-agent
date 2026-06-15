import React from 'react';
import { View, Text, TextInput, StyleSheet, useColorScheme, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CountryConfig } from '../constants/countries';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors, Spacing, Radius } from '../constants/theme';

type Props = {
  label: string;
  value: string;
  country: CountryConfig | null;
  icon?: string;
  onChange: (val: string) => void;
};

export function SalaryInput({ label, value, country, icon, onChange }: Props) {
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  const symbol = country ? country.currencySymbol : '';
  const suffix = country ? country.salaryFormat : '';
  const placeholder = '7.83';

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Ionicons name={icon as any} size={14} color={c.textMuted} />
        <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      </View>
      <View style={[styles.inputRow, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
        {symbol ? <Text style={[styles.symbol, { color: c.textMuted }]}>{symbol}</Text> : null}
        <TextInput
          style={[styles.input, { color: c.text }]}
          placeholder={placeholder}
          placeholderTextColor={c.textMuted}
          keyboardType="numeric"
          value={value}
          onChangeText={onChange}
        />
        {suffix ? (
          <View style={[styles.suffixBadge, { backgroundColor: c.primaryLight, borderColor: c.primary + '30' }]}>
            <Text style={[styles.suffixText, { color: c.primary }]}>{suffix}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  inputRow: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  symbol: { fontSize: 16, fontWeight: '600', marginRight: 4 },
  input: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 14 : 12, fontSize: 16 },
  suffixBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginLeft: Spacing.sm,
  },
  suffixText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});
