import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchRecord } from '../types';
import { INDIA } from '../constants/countries';
import { formatSalary } from '../utils/currency';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors, Spacing, Radius } from '../constants/theme';

type Props = {
  record: SearchRecord;
  onView: (record: SearchRecord) => void;
  onDelete: (id: string) => void;
};

export function HistoryCard({ record, onView, onDelete }: Props) {
  const { filters, results, timestamp } = record;
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  const country = INDIA;

  const displayMin = results.salaryMin !== null ? results.salaryMin : 0;
  const displayMax = results.salaryMax !== null ? results.salaryMax : 0;
  const formattedMin = displayMin > 0 ? formatSalary(displayMin, country) : 'N/A';
  const formattedMax = displayMax > 0 ? formatSalary(displayMax, country) : 'N/A';

  const avgSalary = (displayMin > 0 && displayMax > 0) ? (displayMin + displayMax) / 2 : null;
  const avgHike = (avgSalary !== null && filters.currentSalary)
    ? Math.max(0, Math.round(((avgSalary - filters.currentSalary) / filters.currentSalary) * 100))
    : null;

  const formatDate = (isoStr: string) => {
    const d = new Date(isoStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: isDark ? 'rgba(30, 29, 52, 0.4)' : c.card, borderColor: c.border }]}
      onPress={() => onView(record)}
      activeOpacity={0.85}
    >
      <View style={styles.contentWrap}>
        <View style={styles.textWrap}>
          <View style={styles.titleRow}>
            <Text style={[styles.roleTitle, { color: c.text }]} numberOfLines={1}>
              {filters.role}
            </Text>
          </View>
          
          <Text style={[styles.metaSub, { color: c.textSecondary }]}>
            {filters.company} · {formatDate(timestamp)}
          </Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Ionicons name="cash-outline" size={13} color={c.textSecondary} />
              <Text style={[styles.infoVal, { color: c.textSecondary }]} numberOfLines={1}>
                {formattedMax.split('/')[0]}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={13} color={c.textSecondary} />
              <Text style={[styles.infoVal, { color: c.textSecondary }]}>
                {results.sourcesCount || 0} Sources
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={[styles.actionArea, { borderTopColor: c.border }]}>
        <TouchableOpacity onPress={() => onDelete(record.id)} style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color={c.danger} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.detailsBtn, { backgroundColor: c.primaryLight, borderColor: c.primary + '30' }]} onPress={() => onView(record)}>
          <Text style={[styles.detailsBtnText, { color: c.primary }]}>Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  contentWrap: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  textWrap: {
    flex: 1,
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  roleTitle: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  metaSub: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  infoVal: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    borderTopWidth: 0.5,
    paddingTop: Spacing.xs,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  detailsBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
