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
  const placeholder = '7';

  const handleChange = (text: string) => {
    const filtered = text.replace(/[^0-9.]/g, '');
    const parts = filtered.split('.');
    if (parts.length > 2) return;
    if (parts[0].length > 2) return;
    const num = parseFloat(filtered);
    if (!isNaN(num) && num > 99.9) return;
    onChange(filtered);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Ionicons name={(icon || 'cash-outline') as any} size={13} color={c.textMuted} />
        <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      </View>
      <View style={[styles.inputRow, { backgroundColor: c.surfaceAlt, borderColor: c.primary + '30' }]}>
        {symbol ? <Text style={[styles.symbol, { color: c.textMuted }]}>{symbol}</Text> : null}
        <TextInput
          style={[styles.input, { color: c.text }]}
          placeholder={placeholder}
          placeholderTextColor={c.textMuted}
          keyboardType="numeric"
          value={value}
          onChangeText={handleChange}
        />
        {suffix ? (
          <View style={[styles.badge, { backgroundColor: c.primaryLight, borderColor: c.primary + '30' }]}>
            <Text style={[styles.badgeText, { color: c.primary }]}>{suffix}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xs },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  inputRow: { borderRadius: Radius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg },
  symbol: { fontSize: 16, fontWeight: '600', marginRight: 4 },
  input: { flex: 1, paddingVertical: Platform.OS === 'ios' ? 13 : 11, fontSize: 16 },
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.sm, borderWidth: 1, marginLeft: Spacing.sm },
  badgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});
