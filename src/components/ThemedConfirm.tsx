import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { Spacing, Radius, useTheme } from '../constants/theme';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  singleButton?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
};

export function ThemedConfirm({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  singleButton = false,
  onConfirm,
  onCancel,
}: Props) {
  const { theme } = useAppStore();
  const { isDark, c } = useTheme();

  const handleClose = singleButton ? onConfirm : (onCancel ?? onConfirm);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={[styles.overlay, { backgroundColor: c.overlay }]}>
        <View style={[styles.dialog, { backgroundColor: c.surface, borderColor: c.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: danger ? c.dangerLight : c.primaryLight }]}>
            <Ionicons
              name={danger ? 'warning-outline' : 'information-circle-outline'}
              size={28}
              color={danger ? c.danger : c.primary}
            />
          </View>

          <Text style={[styles.title, { color: c.text }]}>{title}</Text>
          <Text style={[styles.message, { color: c.textSecondary }]}>{message}</Text>

          <View style={styles.actions}>
            {!singleButton && onCancel && (
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text style={[styles.btnText, { color: c.textSecondary }]}>{cancelLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.btn,
                styles.confirmBtn,
                singleButton && { flex: 1 },
                {
                  backgroundColor: danger ? c.danger : c.primary,
                  shadowColor: danger ? c.danger : c.primary,
                },
              ]}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnText, { color: '#ffffff', fontWeight: '700' }]}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 320,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.xl,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 8,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
  },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelBtn: {},
  confirmBtn: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
