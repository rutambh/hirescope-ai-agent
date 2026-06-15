import React from 'react';
import { View, Text, TextInput, StyleSheet, useColorScheme } from 'react-native';
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
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
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
  container: { marginBottom: Spacing.md },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: Spacing.xs, textTransform: 'uppercase' as const },
  inputRow: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  symbol: { fontSize: 16, fontWeight: '600', marginRight: 4 },
  icon: { marginRight: Spacing.sm, fontSize: 16 },
  input: { flex: 1, paddingVertical: Spacing.md, fontSize: 16 },
  suffixBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginLeft: Spacing.sm,
  },
  suffixText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
});
