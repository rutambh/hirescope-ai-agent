// src/constants/theme.ts
// Modern design system tokens — compact spacing

export const LightColors = {
  bg:           '#F8FAFC',
  surface:      '#FFFFFF',
  surfaceAlt:  '#F1F5F9',
  card:         '#FFFFFF',
  border:       '#E2E8F0',
  borderFocus:  '#6366F1',
  text:         '#0F172A',
  textSecondary:'#475569',
  textMuted:    '#94A3B8',
  primary:      '#6366F1',
  primaryDark:  '#4F46E5',
  primaryLight: '#EEF2FF',
  accent:       '#0EA5E9',
  success:      '#10B981',
  successLight: '#ECFDF5',
  danger:       '#EF4444',
  dangerLight:  '#FEF2F2',
  warning:      '#F59E0B',
  warningLight: '#FFFBEB',
  star:         '#F59E0B',
};

export const DarkColors = {
  bg:           '#0F172A',
  surface:      '#1E293B',
  surfaceAlt:  '#334155',
  card:         '#1E293B',
  border:       '#334155',
  borderFocus:  '#818CF8',
  text:         '#F1F5F9',
  textSecondary:'#94A3B8',
  textMuted:    '#64748B',
  primary:      '#818CF8',
  primaryDark:  '#6366F1',
  primaryLight: '#1E1B4B',
  accent:       '#38BDF8',
  success:      '#34D399',
  successLight: '#064E3B',
  danger:       '#F87171',
  dangerLight:  '#7F1D1D',
  warning:      '#FBBF24',
  warningLight: '#78350F',
  star:         '#FBBF24',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
};
