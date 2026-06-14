import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { useAppStore } from '../store/appStore';
import { LightColors, DarkColors } from '../constants/theme';

type Props = { rating: number | null; size?: number; };

export function RatingStars({ rating, size = 24 }: Props) {
  const { theme } = useAppStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const c = isDark ? DarkColors : LightColors;

  if (rating === null || isNaN(rating)) {
    return (
      <View style={styles.container}>
        <Text style={[styles.noRatingText, { color: c.textMuted, fontSize: size - 4 }]}>No Rating Available</Text>
      </View>
    );
  }

  const roundedRating = Math.round(rating * 2) / 2;
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (i <= roundedRating) {
      stars.push(<Text key={i} style={[styles.star, { fontSize: size, color: c.star }]}>★</Text>);
    } else if (i - 0.5 === roundedRating) {
      stars.push(<Text key={i} style={[styles.star, { fontSize: size, color: c.star, opacity: 0.5 }]}>★</Text>);
    } else {
      stars.push(<Text key={i} style={[styles.star, { fontSize: size, color: c.textMuted }]}>☆</Text>);
    }
  }

  const getRatingColor = (r: number) => {
    if (r >= 4) return c.success;
    if (r >= 3) return c.warning;
    return c.danger;
  };

  return (
    <View style={styles.container}>
      <View style={styles.starsRow}>{stars}</View>
      <Text style={[styles.ratingValue, { fontSize: size - 4, color: getRatingColor(rating) }]}>
        {rating.toFixed(1)} / 5
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  starsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  star: { marginHorizontal: 2 },
  ratingValue: { fontWeight: '700' },
  noRatingText: {},
});
