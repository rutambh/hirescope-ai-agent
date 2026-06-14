// src/utils/outlierDetection.ts

export function removeOutliers(values: number[]): number[] {
  const validValues = values.filter((v) => typeof v === 'number' && !isNaN(v));
  if (validValues.length < 3) return validValues;

  const sorted = [...validValues].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  // Remove values that are > 2x median or < 0.5x median
  return validValues.filter((v) => v <= median * 2 && v >= median * 0.5);
}

export function calculateMedian(values: number[]): number | null {
  const validValues = values.filter((v) => typeof v === 'number' && !isNaN(v));
  if (validValues.length === 0) return null;

  const sorted = [...validValues].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  } else {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
}

export function calculateAverage(values: number[]): number | null {
  const validValues = values.filter((v) => typeof v === 'number' && !isNaN(v));
  if (validValues.length === 0) return null;

  const sum = validValues.reduce((acc, v) => acc + v, 0);
  return sum / validValues.length;
}
