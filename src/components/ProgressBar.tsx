import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, useColorScheme } from 'react-native';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors, Spacing, Radius } from '../constants/theme';

type Props = {
  progress: number;
  height?: number;
  showPercent?: boolean;
};

export function ProgressBar({ progress, height = 5, showPercent = false }: Props) {
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const animValue = useRef(new Animated.Value(0)).current;
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  useEffect(() => {
    Animated.timing(animValue, { toValue: progress, duration: 500, useNativeDriver: false }).start();
  }, [progress]);

  const width = animValue.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.container}>
      <View style={[styles.track, { height, backgroundColor: isDark ? '#1E1E3A' : '#E2E8F0' }]}>
        <Animated.View style={[styles.fill, { width, backgroundColor: c.primary }]} />
      </View>
      {showPercent && (
        <Text style={[styles.label, { color: c.textMuted }]}>{Math.round(progress)}%</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: Spacing.sm, width: '100%' },
  track: { borderRadius: Radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: Radius.full },
  label: { marginTop: Spacing.xs, fontSize: 11, fontWeight: '600', textAlign: 'right' },
});
