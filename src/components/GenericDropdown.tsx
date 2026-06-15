import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
  StyleSheet,
  useColorScheme,
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
  label,
  selectedValue,
  options,
  placeholder = 'Select option',
  icon,
  onSelect,
  disabled = false,
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Ionicons name={icon as any} size={14} color={c.textMuted} />
        <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      </View>

      <TouchableOpacity
        style={[styles.dropdownButton, { backgroundColor: c.surfaceAlt, borderColor: c.border }, disabled && { opacity: 0.5 }]}
        onPress={() => { if (!disabled) { setSearchQuery(''); setModalVisible(true); } }}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Text style={selectedValue ? [styles.selectedText, { color: c.text }] : [styles.placeholderText, { color: c.textMuted }]}>
          {selectedValue || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={c.textMuted} />
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: c.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={c.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: c.text }]}>Select {label}</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.searchWrap}>
            <View style={[styles.searchInputShell, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}>
              <Ionicons name="search" size={18} color={c.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: c.text }]}
                placeholder={`Search ${label.toLowerCase()}...`}
                placeholderTextColor={c.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>
          </View>

          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: c.border }]}
                onPress={() => { onSelect(item); setModalVisible(false); }}
                activeOpacity={0.6}
              >
                <Text style={[styles.optionText, { color: c.text }]}>{item}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Ionicons name="search-outline" size={40} color={c.textMuted} />
                <Text style={[styles.emptyText, { color: c.textMuted }]}>No matches found</Text>
              </View>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },
  dropdownButton: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedText: { fontSize: 15, fontWeight: '500' },
  placeholderText: { fontSize: 15 },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: '700' },
  closeBtn: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  searchWrap: { padding: Spacing.lg },
  searchInputShell: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchInput: { flex: 1, fontSize: 15 },
  listContent: { paddingBottom: Spacing.xl },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderBottomWidth: 0.5,
  },
  optionText: { fontSize: 15, fontWeight: '500' },
  emptyWrap: { alignItems: 'center', marginTop: 80, gap: Spacing.md },
  emptyText: { fontSize: 14 },
});
