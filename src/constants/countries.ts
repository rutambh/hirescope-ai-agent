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

// India only — country filter removed
export const INDIA: CountryConfig = {
  name: 'India',
  code: 'IN',
  currency: 'Indian Rupee',
  currencyCode: 'INR',
  currencySymbol: '\u20B9',
  salaryFormat: 'LPA',
  placeholder: '7 LPA only'
};
