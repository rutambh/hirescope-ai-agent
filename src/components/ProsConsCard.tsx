import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors, Spacing, Radius } from '../constants/theme';

type Props = { positives: string[]; negatives: string[] };

export function ProsConsCard({ positives, negatives }: Props) {
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.sectionHeader, { backgroundColor: c.successLight }]}>
          <Ionicons name="thumbs-up" size={14} color={c.success} />
          <Text style={[styles.sectionTitle, { color: c.success }]}>PROS</Text>
        </View>
        {positives.length > 0 ? positives.map((item, idx) => (
          <View key={`pro-${idx}`} style={styles.listItem}>
            <View style={[styles.bullet, { backgroundColor: c.success }]} />
            <Text style={[styles.itemText, { color: c.text }]}>{item}</Text>
          </View>
        )) : (
          <Text style={[styles.noData, { color: c.textMuted }]}>No positive themes found</Text>
        )}
      </View>

      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        <View style={[styles.sectionHeader, { backgroundColor: c.dangerLight }]}>
          <Ionicons name="thumbs-down" size={14} color={c.danger} />
          <Text style={[styles.sectionTitle, { color: c.danger }]}>CONS</Text>
        </View>
        {negatives.length > 0 ? negatives.map((item, idx) => (
          <View key={`con-${idx}`} style={styles.listItem}>
            <View style={[styles.bullet, { backgroundColor: c.danger }]} />
            <Text style={[styles.itemText, { color: c.text }]}>{item}</Text>
          </View>
        )) : (
          <Text style={[styles.noData, { color: c.textMuted }]}>No negative themes found</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.lg, gap: Spacing.md },
  card: { borderRadius: Radius.xl, padding: Spacing.lg, borderWidth: 1 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.sm, alignSelf: 'flex-start', marginBottom: Spacing.md,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  listItem: { flexDirection: 'row', alignItems: 'flex-start', marginVertical: 4, gap: Spacing.sm },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  itemText: { fontSize: 14, lineHeight: 20, flex: 1 },
  noData: { paddingVertical: Spacing.xs, fontSize: 13, fontStyle: 'italic' },
});
