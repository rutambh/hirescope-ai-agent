import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors, Spacing } from '../constants/theme';

type Props = { rating: number | null; size?: number };

export function RatingStars({ rating, size = 28 }: Props) {
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  if (rating === null || isNaN(rating)) {
    return (
      <View style={styles.container}>
        <Text style={[styles.noRatingText, { color: c.textMuted, fontSize: size - 8 }]}>—</Text>
      </View>
    );
  }

  const roundedRating = Math.round(rating * 2) / 2;

  const getRatingColor = (r: number) => {
    if (r >= 4) return c.success;
    if (r >= 3) return c.warning;
    return c.danger;
  };

  return (
    <View style={styles.container}>
      <View style={styles.ring}>
        <Text style={[styles.bigNumber, { color: getRatingColor(rating) }]}>{rating.toFixed(1)}</Text>
        <Text style={[styles.outOf, { color: c.textMuted }]}>/5</Text>
      </View>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= Math.floor(roundedRating);
          const half = !filled && i - 0.5 === roundedRating;
          return (
            <Text
              key={i}
              style={[
                styles.star,
                { fontSize: size * 0.55 },
                filled && { color: c.star },
                half && { color: c.star, opacity: 0.5 },
                !filled && !half && { color: c.textMuted, opacity: 0.2 },
              ]}
            >
              ★
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', marginVertical: Spacing.xs },
  ring: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 4 },
  bigNumber: { fontSize: 42, fontWeight: '800', letterSpacing: -1 },
  outOf: { fontSize: 16, fontWeight: '600', marginLeft: 2 },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  star: { marginHorizontal: 1 },
  noRatingText: { fontWeight: '600' },
});
