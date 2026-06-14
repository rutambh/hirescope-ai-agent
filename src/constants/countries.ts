// src/constants/countries.ts

export type CountryConfig = {
  name: string;
  code: string;
  currency: string;
  currencyCode: string;
  currencySymbol: string;
  salaryFormat: string; // "LPA", "yearly", "monthly"
  placeholder: string;
};

export const COUNTRIES: CountryConfig[] = [
  {
    name: 'India',
    code: 'IN',
    currency: 'Indian Rupee',
    currencyCode: 'INR',
    currencySymbol: '₹',
    salaryFormat: 'LPA',
    placeholder: 'e.g. 12 (for 12 LPA)'
  },
  {
    name: 'United States',
    code: 'US',
    currency: 'US Dollar',
    currencyCode: 'USD',
    currencySymbol: '$',
    salaryFormat: 'per year',
    placeholder: 'e.g. 120000'
  },
  {
    name: 'United Kingdom',
    code: 'GB',
    currency: 'British Pound',
    currencyCode: 'GBP',
    currencySymbol: '£',
    salaryFormat: 'per year',
    placeholder: 'e.g. 65000'
  },
  {
    name: 'UAE',
    code: 'AE',
    currency: 'UAE Dirham',
    currencyCode: 'AED',
    currencySymbol: 'AED ',
    salaryFormat: 'per month',
    placeholder: 'e.g. 15000'
  },
  {
    name: 'Canada',
    code: 'CA',
    currency: 'Canadian Dollar',
    currencyCode: 'CAD',
    currencySymbol: 'C$',
    salaryFormat: 'per year',
    placeholder: 'e.g. 95000'
  },
  {
    name: 'Australia',
    code: 'AU',
    currency: 'Australian Dollar',
    currencyCode: 'AUD',
    currencySymbol: 'A$',
    salaryFormat: 'per year',
    placeholder: 'e.g. 110000'
  },
  {
    name: 'Germany',
    code: 'DE',
    currency: 'Euro',
    currencyCode: 'EUR',
    currencySymbol: '€',
    salaryFormat: 'per year',
    placeholder: 'e.g. 70000'
  },
  {
    name: 'Singapore',
    code: 'SG',
    currency: 'Singapore Dollar',
    currencyCode: 'SGD',
    currencySymbol: 'S$',
    salaryFormat: 'per year',
    placeholder: 'e.g. 80000'
  }
];

export const getCountryByCode = (code: string): CountryConfig | undefined => {
  return COUNTRIES.find(c => c.code === code);
};

export const getCountryByName = (name: string): CountryConfig | undefined => {
  return COUNTRIES.find(c => c.name.toLowerCase() === name.toLowerCase());
};
