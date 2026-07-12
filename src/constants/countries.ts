// src/constants/countries.ts

export type CountryConfig = {
  name: string;
  code: string;
  currency: string;
  currencyCode: string;
  currencySymbol: string;
  salaryFormat: string;
  placeholder: string;
};

// India is the default / primary market.
export const INDIA: CountryConfig = {
  name: 'India',
  code: 'IN',
  currency: 'Indian Rupee',
  currencyCode: 'INR',
  currencySymbol: '₹',
  salaryFormat: 'LPA',
  placeholder: '7 LPA only'
};

// Full country list for the selector. `salaryFormat` MUST be one of the three
// values handled by dataExtractor.ts / currency.ts: 'LPA' | 'per year' | 'per month'.
export const COUNTRIES: CountryConfig[] = [
  INDIA,
  {
    name: 'United States',
    code: 'US',
    currency: 'US Dollar',
    currencyCode: 'USD',
    currencySymbol: '$',
    salaryFormat: 'per year',
    placeholder: '120k',
  },
  {
    name: 'United Kingdom',
    code: 'GB',
    currency: 'British Pound',
    currencyCode: 'GBP',
    currencySymbol: '£',
    salaryFormat: 'per year',
    placeholder: '50k',
  },
  {
    name: 'Canada',
    code: 'CA',
    currency: 'Canadian Dollar',
    currencyCode: 'CAD',
    currencySymbol: 'C$',
    salaryFormat: 'per year',
    placeholder: '90k',
  },
  {
    name: 'Australia',
    code: 'AU',
    currency: 'Australian Dollar',
    currencyCode: 'AUD',
    currencySymbol: 'A$',
    salaryFormat: 'per year',
    placeholder: '110k',
  },
  {
    name: 'Germany',
    code: 'DE',
    currency: 'Euro',
    currencyCode: 'EUR',
    currencySymbol: '€',
    salaryFormat: 'per year',
    placeholder: '60k',
  },
  {
    name: 'Singapore',
    code: 'SG',
    currency: 'Singapore Dollar',
    currencyCode: 'SGD',
    currencySymbol: 'S$',
    salaryFormat: 'per month',
    placeholder: '8k',
  },
  {
    name: 'United Arab Emirates',
    code: 'AE',
    currency: 'UAE Dirham',
    currencyCode: 'AED',
    currencySymbol: 'AED',
    salaryFormat: 'per month',
    placeholder: '20k',
  },
];

// Country → URL path/TLD hints that indicate a *different* region. Used by the
// discovery filter (cleanAndFilterUrls) to drop URLs clearly meant for another
// country than the one being researched. Countries absent from this map get no
// path-based exclusion (the search query itself already biases toward the locale).
export const COUNTRY_FOREIGN_HINTS: Record<string, string[]> = {
  'india': ['/us/', '/uk/', '/ca/', '/au/', '.co.uk', '.com.au', '.ca', '.de', '.fr'],
  'united states': ['/in/', '/uk/', '/ca/', '/au/', '.co.in', '.co.uk', '.com.au', '.ca', '.de', '.fr', '.au'],
  'united kingdom': ['/us/', '/in/', '/ca/', '/au/', '.co.in', '.com.au', '.ca', '.us', '.de'],
  'canada': ['/us/', '/uk/', '/in/', '/au/', '.co.uk', '.com.au', '.co.in', '.us'],
  'australia': ['/us/', '/uk/', '/in/', '/ca/', '.co.uk', '.co.in', '.us', '.ca'],
  'germany': ['/us/', '/uk/', '/in/', '/ca/', '/au/', '.co.uk', '.co.in', '.com.au', '.us'],
  'singapore': ['/us/', '/uk/', '/in/', '/ca/', '/au/', '.co.uk', '.co.in', '.com.au', '.us'],
  'united arab emirates': ['/us/', '/uk/', '/in/', '/ca/', '/au/', '.co.uk', '.co.in', '.com.au', '.us'],
};

export function getCountryByCode(code: string): CountryConfig {
  return COUNTRIES.find(c => c.code === code) ?? INDIA;
}

export function getCountryByName(name: string): CountryConfig {
  return COUNTRIES.find(c => c.name.toLowerCase() === name.toLowerCase()) ?? INDIA;
}
