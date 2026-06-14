import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, useColorScheme } from 'react-native';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors, Spacing, Radius } from '../constants/theme';

type Props = {
  progress: number;
};

export function ProgressBar({ progress }: Props) {
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [progress, animatedValue]);

  const widthInterpolate = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.track, { backgroundColor: isDark ? '#1E293B' : '#E2E8F0' }]}>
        <Animated.View
          style={[
            styles.fill,
            { width: widthInterpolate, backgroundColor: c.primary },
          ]}
        />
      </View>
      <Text style={[styles.percentText, { color: c.textSecondary }]}>{Math.round(progress)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: Spacing.sm, width: '100%' as const },
  track: {
    height: 6,
    borderRadius: Radius.full,
    overflow: 'hidden' as const,
  },
  fill: { height: '100%', borderRadius: Radius.full },
  percentText: {
    marginTop: Spacing.xs,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right' as const,
  },
});
