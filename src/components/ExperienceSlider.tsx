import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  TouchableOpacity,
  GestureResponderEvent,
  useColorScheme,
} from 'react-native';
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
  const [trackWidth, setTrackWidth] = useState(0);
  const containerRef = useRef<View>(null);
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  // Use refs to avoid stale closures in the gesture responder
  const trackWidthRef = useRef(0);
  const trackLeftRef = useRef(0);

  const handleLayout = () => {
    containerRef.current?.measure((_x, _y, width, _h, absoluteX, _aY) => {
      if (width > 0) {
        trackWidthRef.current = width;
        trackLeftRef.current = absoluteX;
        setTrackWidth(width);
      }
    });
  };

  const updateValueFromPageX = (pageX: number) => {
    const width = trackWidthRef.current;
    const left = trackLeftRef.current;
    if (width > 0) {
      const relativeX = Math.max(0, Math.min(width, pageX - left));
      const percentage = relativeX / width;
      const rawVal = min + percentage * (max - min);
      onChange(Math.round(rawVal));
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        // Measure coordinates on grant to handle any offsets correctly
        containerRef.current?.measure((_x, _y, width, _h, absoluteX, _aY) => {
          if (width > 0) {
            trackWidthRef.current = width;
            trackLeftRef.current = absoluteX;
            setTrackWidth(width);
            updateValueFromPageX(e.nativeEvent.pageX);
          }
        });
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        updateValueFromPageX(e.nativeEvent.pageX);
      },
    })
  ).current;

  const fillPercentage = ((value - min) / (max - min)) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.labelRow}>
          {icon ? <Text style={styles.sliderIcon}>{icon}</Text> : null}
          <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
        </View>
        <View style={[styles.valueBadge, { backgroundColor: c.primaryLight }]}>
          <Text style={[styles.valueText, { color: c.primary }]}>
            {value} {value === 1 ? 'yr' : 'yrs'}
          </Text>
        </View>
      </View>

      <View style={styles.sliderRow}>
        <TouchableOpacity
          style={[styles.stepBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
          onPress={() => onChange(Math.max(min, value - 1))}
          activeOpacity={0.7}
        >
          <Text style={[styles.stepBtnText, { color: c.text }]}>−</Text>
        </TouchableOpacity>

        <View style={styles.sliderWrapper}>
          <View
            ref={containerRef}
            style={styles.sliderTrackContainer}
            onLayout={handleLayout}
            {...panResponder.panHandlers}
          >
            <View style={[styles.trackBg, { backgroundColor: isDark ? '#1E293B' : '#CBD5E1' }]}>
              <View style={[styles.trackFill, { width: `${fillPercentage}%`, backgroundColor: c.primary }]} />
            </View>
            <View style={[styles.thumb, { left: `${fillPercentage}%`, borderColor: c.primary, backgroundColor: c.surface }]} />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.stepBtn, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
          onPress={() => onChange(Math.min(max, value + 1))}
          activeOpacity={0.7}
        >
          <Text style={[styles.stepBtnText, { color: c.text }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' as const },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sliderIcon: {
    marginRight: Spacing.sm,
    fontSize: 16,
  },
  valueBadge: {
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    minWidth: 60,
    alignItems: 'center',
  },
  valueText: { fontSize: 14, fontWeight: '700' },
  sliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  sliderWrapper: {
    flex: 1,
  },
  sliderTrackContainer: { height: 28, justifyContent: 'center' },
  trackBg: { height: 4, borderRadius: Radius.full, overflow: 'hidden' as const },
  trackFill: { height: '100%', borderRadius: Radius.full },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: Radius.full,
    borderWidth: 3,
    marginLeft: -10,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
});
