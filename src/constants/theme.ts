import { Platform } from 'react-native';
import { useColorScheme } from 'react-native';
import { useAppStore } from '../store/appStore';

export const palette = {
  violet: { 50: '#F5F3FF', 100: '#EDE9FE', 200: '#DDD6FE', 300: '#C4B5FD', 400: '#A78BFA', 500: '#8B5CF6', 600: '#7C3AED', 700: '#6D28D9', 800: '#5B21B6', 900: '#4C1D95' },
  cyan: { 50: '#ECFEFF', 100: '#CFFAFE', 200: '#A5F3FC', 300: '#67E8F9', 400: '#22D3EE', 500: '#06B6D4', 600: '#0891B2', 700: '#0E7490', 800: '#155E75', 900: '#164E63' },
  emerald: { 50: '#ECFDF5', 100: '#D1FAE5', 200: '#A7F3D0', 300: '#6EE7B7', 400: '#34D399', 500: '#10B981', 600: '#059669', 700: '#047857' },
  rose: { 50: '#FFF1F2', 100: '#FFE4E6', 200: '#FECDD3', 300: '#FDA4AF', 400: '#FB7185', 500: '#F43F5E', 600: '#E11D48', 700: '#BE123C' },
  amber: { 50: '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A', 300: '#FCD34D', 400: '#FBBF24', 500: '#F59E0B', 600: '#D97706' },
  slate: { 50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1', 400: '#94A3B8', 500: '#64748B', 600: '#475569', 700: '#334155', 800: '#1E293B', 900: '#0F172A', 950: '#020617' },
};

// ── Modern dark theme ──
// Deep, slightly desaturated indigo-black base with a vibrant violet/indigo accent.
export const DarkColors = {
  bg: '#0B0B12',
  bgAlt: '#12121C',
  surface: '#171722',
  surfaceAlt: '#1F1F2E',
  surfaceElevated: '#262638',
  card: '#171722',
  border: '#2A2A3C',
  borderFocus: '#8B7CF6',
  text: '#F4F4FB',
  textSecondary: '#B6B6C8',
  textMuted: '#76768C',
  primary: '#8B7CF6',
  primaryDark: '#6D5EF0',
  primaryLight: 'rgba(139, 124, 246, 0.16)',
  primaryFaint: 'rgba(139, 124, 246, 0.08)',
  accent: '#22D3EE',
  accentLight: 'rgba(34, 211, 238, 0.14)',
  success: '#34D399',
  successLight: 'rgba(52, 211, 153, 0.14)',
  danger: '#FB7185',
  dangerLight: 'rgba(251, 113, 133, 0.14)',
  warning: '#FBBF24',
  warningLight: 'rgba(251, 191, 36, 0.14)',
  star: '#FBBF24',
  gradientStart: '#8B7CF6',
  gradientEnd: '#22D3EE',
  tabBar: 'rgba(14, 14, 22, 0.86)',
  tabBarBorder: 'rgba(139, 124, 246, 0.22)',
  overlay: 'rgba(7, 7, 12, 0.72)',
  glassBg: 'rgba(34, 34, 50, 0.45)',
  cardShadow: 'rgba(0, 0, 0, 0.45)',
  onPrimary: '#FFFFFF',
};

// ── Modern light theme ──
// Crisp near-white with a vivid indigo/violet primary and cyan accent.
export const LightColors = {
  bg: '#F7F7FB',
  bgAlt: '#EFEFF5',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F2F8',
  surfaceElevated: '#E9E9F4',
  card: 'rgba(255, 255, 255, 0.85)',
  border: '#E6E6F0',
  borderFocus: '#6D5EF0',
  text: '#15151F',
  textSecondary: '#4A4A5E',
  textMuted: '#8989A0',
  primary: '#6D5EF0',
  primaryDark: '#5A4BD6',
  primaryLight: 'rgba(109, 94, 240, 0.12)',
  primaryFaint: 'rgba(109, 94, 240, 0.06)',
  accent: '#0EA5C4',
  accentLight: 'rgba(14, 165, 196, 0.12)',
  success: '#059669',
  successLight: 'rgba(5, 150, 105, 0.12)',
  danger: '#E11D48',
  dangerLight: 'rgba(225, 29, 72, 0.10)',
  warning: '#D97706',
  warningLight: 'rgba(217, 119, 6, 0.12)',
  star: '#F59E0B',
  gradientStart: '#7C5CF6',
  gradientEnd: '#22D3EE',
  tabBar: 'rgba(247, 247, 251, 0.86)',
  tabBarBorder: 'rgba(109, 94, 240, 0.18)',
  overlay: 'rgba(21, 21, 31, 0.45)',
  glassBg: 'rgba(255, 255, 255, 0.72)',
  cardShadow: 'rgba(40, 35, 90, 0.12)',
  onPrimary: '#FFFFFF',
};

export type ThemeColors = typeof DarkColors;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  xxxl: 48,
  huge: 56,
  massive: 64,
};

export const Radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 24,
  xxl: 32,
  full: 9999,
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 8,
  },
  glow: {
    shadowColor: '#8B7CF6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 8,
  },
};

export const Typography = {
  font: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  h1: { fontSize: 40, fontWeight: '700', letterSpacing: -0.8, lineHeight: 48 },
  h2: { fontSize: 32, fontWeight: '700', letterSpacing: -0.6, lineHeight: 40 },
  h3: { fontSize: 24, fontWeight: '600', letterSpacing: -0.2, lineHeight: 32 },
  h4: { fontSize: 18, fontWeight: '700', letterSpacing: 0, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyBold: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  caption: { fontSize: 13, fontWeight: '500', lineHeight: 18 },
  small: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, lineHeight: 14 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, lineHeight: 16 },
  badge: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, lineHeight: 12 },
};

// Helper: resolve current dark/light state from app theme + system scheme.
export function useIsDark(): boolean {
  const theme = useAppStore((s) => s.theme);
  const systemColorScheme = useColorScheme();
  return theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
}

// Central hook: returns the active color set + a boolean for dark mode.
// Use this everywhere instead of re-deriving isDark / importing two color objects.
export function useTheme() {
  const isDark = useIsDark();
  const c = isDark ? DarkColors : LightColors;
  return { isDark, c };
}
