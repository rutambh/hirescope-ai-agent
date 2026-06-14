import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors, Spacing, Radius } from '../constants/theme';

type Props = { positives: string[]; negatives: string[]; };

export function ProsConsCard({ positives, negatives }: Props) {
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: c.card, borderLeftColor: c.success, borderColor: c.border }]}>
        <Text style={[styles.cardTitle, { color: c.success }]}>✅ PROS</Text>
        {positives.length > 0 ? positives.map((item, idx) => (
          <View key={`pro-${idx}`} style={styles.listItem}>
            <Text style={[styles.bullet, { color: c.success }]}>•</Text>
            <Text style={[styles.itemText, { color: c.text }]}>{item}</Text>
          </View>
        )) : (
          <Text style={[styles.noData, { color: c.textMuted }]}>No positive themes could be determined.</Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: c.card, borderLeftColor: c.danger, borderColor: c.border }]}>
        <Text style={[styles.cardTitle, { color: c.danger }]}>❌ CONS</Text>
        {negatives.length > 0 ? negatives.map((item, idx) => (
          <View key={`con-${idx}`} style={styles.listItem}>
            <Text style={[styles.bullet, { color: c.danger }]}>•</Text>
            <Text style={[styles.itemText, { color: c.text }]}>{item}</Text>
          </View>
        )) : (
          <Text style={[styles.noData, { color: c.textMuted }]}>No negative themes could be determined.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: Spacing.sm },
  card: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginVertical: Spacing.xs,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1, marginBottom: Spacing.sm },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 5, paddingRight: Spacing.sm },
  bullet: { fontSize: 16, marginRight: Spacing.sm, lineHeight: 20 },
  itemText: { fontSize: 14, lineHeight: 20, flex: 1 },
  noData: { paddingVertical: Spacing.xs },
});
