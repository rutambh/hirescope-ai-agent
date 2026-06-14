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
import { CountryConfig } from '../constants/countries';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors, Spacing, Radius } from '../constants/theme';

type Props = {
  label: string;
  selectedValue: string;
  options: CountryConfig[];
  icon?: string;
  onSelect: (option: CountryConfig) => void;
};

export function FilterDropdown({ label, selectedValue, options, icon, onSelect }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  const filteredOptions = options.filter(option =>
    option.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>

      <TouchableOpacity
        style={[styles.dropdownButton, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
        onPress={() => { setSearchQuery(''); setModalVisible(true); }}
        activeOpacity={0.7}
      >
        <View style={styles.dropdownLeft}>
          {icon ? <Text style={styles.iconText}>{icon}</Text> : null}
          <Text style={selectedValue ? [styles.selectedText, { color: c.text }] : styles.placeholderText}>
            {selectedValue || 'Select Country'}
          </Text>
        </View>
        <Text style={[styles.arrow, { color: c.textMuted }]}>▼</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: c.bg }]}>
          <View style={[styles.modalHeader, { borderBottomColor: c.border }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Select {label}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: c.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: c.surfaceAlt, borderColor: c.border, color: c.text }]}
              placeholder="Search country..."
              placeholderTextColor={c.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>

          <FlatList
            data={filteredOptions}
            keyExtractor={(item) => item.code}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.optionItem, { borderBottomColor: c.border }]}
                onPress={() => { onSelect(item); setModalVisible(false); }}
                activeOpacity={0.6}
              >
                <View style={styles.optionRow}>
                  <Text style={[styles.optionText, { color: c.text }]}>{item.name}</Text>
                  <View style={[styles.currencyBadge, { backgroundColor: c.primaryLight }]}>
                    <Text style={[styles.currencyBadgeText, { color: c.primary }]}>
                      {item.currencyCode} · {item.currencySymbol.trim()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: c.textMuted }]}>No countries match your search</Text>
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
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: Spacing.xs, textTransform: 'uppercase' as const },
  dropdownButton: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedText: { fontSize: 15, fontWeight: '500' },
  placeholderText: { fontSize: 15, color: '#94A3B8' },
  arrow: { fontSize: 10 },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconText: {
    marginRight: Spacing.sm,
    fontSize: 16,
  },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  closeBtn: { padding: Spacing.xs },
  closeBtnText: { fontSize: 15, fontWeight: '600' },
  searchWrap: { padding: Spacing.md },
  searchInput: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    fontSize: 15,
  },
  listContent: { paddingBottom: Spacing.xl },
  optionItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 0.5,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: { fontSize: 15, fontWeight: '500' },
  currencyBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  currencyBadgeText: { fontSize: 12, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', marginTop: Spacing.xxxl },
  emptyText: { fontSize: 14 },
});
