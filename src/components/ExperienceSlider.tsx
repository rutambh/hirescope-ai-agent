import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, PanResponder, TouchableOpacity,
  GestureResponderEvent, useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors, Spacing, Radius } from '../constants/theme';

type Props = {
  label: string;
  value: number;
  min?: number;
  max?: number;
  icon?: string;
  onChange: (val: number) => void;
};

export function ExperienceSlider({ label, value, min = 1, max = 30, icon, onChange }: Props) {
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  const trackWidthRef = useRef(0);
  const trackLeftRef = useRef(0);

  const handleLayout = () => {
    containerRef.current?.measure((_x, _y, width, _h, absoluteX) => {
      if (width > 0) { trackWidthRef.current = width; trackLeftRef.current = absoluteX; }
    });
  };

  const updateValue = (pageX: number) => {
    const relX = Math.max(0, Math.min(trackWidthRef.current, pageX - trackLeftRef.current));
    const pct = relX / trackWidthRef.current;
    onChange(Math.round(min + pct * (max - min)));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => { updateValue(e.nativeEvent.pageX); },
      onPanResponderMove: (e: GestureResponderEvent) => { updateValue(e.nativeEvent.pageX); },
    })
  ).current;

  const containerRef = useRef<View>(null);
  const fillPct = ((value - min) / (max - min)) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          <Ionicons name={(icon || 'time-outline') as any} size={14} color={c.textMuted} />
          <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: c.primaryLight }]}>
          <Text style={[styles.pillText, { color: c.primary }]}>{value} {value === 1 ? 'yr' : 'yrs'}</Text>
        </View>
      </View>

      <View style={styles.sliderRow}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
          onPress={() => onChange(Math.max(min, value - 1))}
        >
          <Ionicons name="remove" size={18} color={c.text} />
        </TouchableOpacity>

        <View
          ref={containerRef}
          style={styles.trackContainer}
          onLayout={handleLayout}
          {...panResponder.panHandlers}
        >
          <View style={[styles.trackBg, { backgroundColor: isDark ? '#1E1E3A' : '#E2E8F0' }]}>
            <View style={[styles.trackFill, { width: `${fillPct}%`, backgroundColor: c.primary }]} />
          </View>
          <View style={[styles.thumb, { left: `${fillPct}%`, borderColor: c.primary, backgroundColor: isDark ? '#1A1A35' : '#FFF' }]} />
        </View>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
          onPress={() => onChange(Math.min(max, value + 1))}
        >
          <Ionicons name="add" size={18} color={c.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  label: { fontSize: 12, fontWeight: '600' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 3 },
  pillText: { fontSize: 13, fontWeight: '700' },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  btn: { width: 34, height: 34, borderRadius: Radius.full, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  trackContainer: { flex: 1, height: 28, justifyContent: 'center' },
  trackBg: { height: 4, borderRadius: Radius.full, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: Radius.full },
  thumb: {
    position: 'absolute', width: 20, height: 20, borderRadius: Radius.full,
    borderWidth: 3, marginLeft: -10,
    shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
});
