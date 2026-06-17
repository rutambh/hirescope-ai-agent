import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, FlatList, TextInput, StyleSheet, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors, Spacing, Radius } from '../constants/theme';

type Props = {
  label: string;
  selectedValue: string;
  options: string[];
  placeholder?: string;
  icon?: string;
  onSelect: (option: string) => void;
  disabled?: boolean;
};

export function GenericDropdown({
  label, selectedValue, options, placeholder = 'Select', icon, onSelect, disabled = false,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  const filtered = options.filter(o => o.toLowerCase().includes(query.toLowerCase()));

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Ionicons name={(icon || 'map-outline') as any} size={13} color={c.textMuted} />
        <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      </View>
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: c.surfaceAlt, borderColor: c.border }, disabled && { opacity: 0.4 }]}
        onPress={() => { if (!disabled) { setQuery(''); setVisible(true); } }}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <View style={styles.triggerInner}>
          {selectedValue ? (
            <Text style={[styles.triggerText, { color: c.text }]}>{selectedValue}</Text>
          ) : (
            <Text style={[styles.placeholder, { color: c.textMuted }]}>{placeholder}</Text>
          )}
          <Ionicons name="chevron-down" size={16} color={c.textMuted} />
        </View>
      </TouchableOpacity>

      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modal, { backgroundColor: c.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => setVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={c.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: c.text }]}>Select {label}</Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={styles.searchWrap}>
            <View style={[styles.searchShell, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Ionicons name="search" size={18} color={c.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: c.text }]}
                placeholder="Search..."
                placeholderTextColor={c.textMuted}
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
            </View>
          </View>
          <FlatList
            data={filtered}
            keyExtractor={item => item}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.option, { borderBottomColor: c.border }]}
                onPress={() => { onSelect(item); setVisible(false); }}
              >
                <Text style={[styles.optionText, { color: c.text }]}>{item}</Text>
                {selectedValue === item && (
                  <Ionicons name="checkmark" size={20} color={c.primary} />
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={36} color={c.textMuted} />
                <Text style={[styles.emptyText, { color: c.textMuted }]}>No matches</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.md },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.xs },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  trigger: { borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.lg, paddingVertical: 13 },
  triggerInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  triggerText: { fontSize: 15, fontWeight: '500' },
  placeholder: { fontSize: 15 },
  modal: { flex: 1 },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  closeBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { padding: Spacing.lg },
  searchShell: { borderRadius: Radius.md, borderWidth: 1, paddingHorizontal: Spacing.lg, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  searchInput: { flex: 1, fontSize: 15 },
  list: { paddingBottom: Spacing.xl },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl, borderBottomWidth: 0.5 },
  optionText: { fontSize: 15, fontWeight: '500' },
  empty: { alignItems: 'center', marginTop: 80, gap: Spacing.md },
  emptyText: { fontSize: 14 },
});
