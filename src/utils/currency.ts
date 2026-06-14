// src/utils/currency.ts
import { CountryConfig } from '../constants/countries';

export function formatSalary(value: number | null, country: CountryConfig): string {
  if (value === null || isNaN(value)) return 'N/A';

  // Format the number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString(country.code === 'IN' ? 'en-IN' : 'en-US', {
      maximumFractionDigits: 1,
    });
  };

  if (country.salaryFormat === 'LPA') {
    return `${country.currencySymbol}${formatNumber(value)} LPA`;
  } else if (country.salaryFormat === 'per month') {
    return `${country.currencySymbol}${formatNumber(value)}/month`;
  } else {
    // "per year" or yearly format
    return `${country.currencySymbol}${formatNumber(value)}/year`;
  }
}

export function formatHike(hike: number | null): string {
  if (hike === null || isNaN(hike)) return 'N/A';
  return hike > 0 ? `+${hike}%` : '0%';
}
