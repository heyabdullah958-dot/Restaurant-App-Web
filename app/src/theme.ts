export const COLORS = {
  primary: '#E8364E',
  secondary: '#FF8C42',
  accent: '#6C63FF',
  dark: '#0F172A',
  surface: '#F8FAFC',
  card: '#FFFFFF',
  neutral50: '#F8FAFC',
  neutral100: '#F1F5F9',
  neutral200: '#E2E8F0',
  neutral300: '#CBD5E1',
  neutral400: '#94A3B8',
  neutral500: '#64748B',
  neutral600: '#475569',
  neutral700: '#334155',
  neutral800: '#1E293B',
  neutral900: '#0F172A',
  success: '#00C48C',
  warning: '#FFB020',
  danger: '#FF4757',
  gradient: ['#E8364E', '#FF6B6B'],
  overlay: 'rgba(0,0,0,0.5)',
  
  // Clean unified palette
  light: '#F8FAFC',
  gray: '#64748B',
  lightGray: '#E2E8F0',
  white: '#FFFFFF',
  cardBackground: '#FFFFFF',
  primaryLight: 'rgba(232, 54, 78, 0.08)',
  darkText: '#0F172A',
  subtleText: '#64748B',
};

export const SPACING = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  2: 2, 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32, 40: 40, 48: 48, 64: 64,
};

export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: 'bold' as const, color: COLORS.dark },
  h2: { fontSize: 24, fontWeight: 'bold' as const, color: COLORS.dark },
  h3: { fontSize: 20, fontWeight: '600' as const, color: COLORS.dark },
  body1: { fontSize: 16, fontWeight: 'normal' as const, color: COLORS.dark },
  body2: { fontSize: 14, fontWeight: 'normal' as const, color: COLORS.dark },
  caption: { fontSize: 12, fontWeight: 'normal' as const, color: COLORS.gray },
};

export const SHADOWS = {
  small: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  medium: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  large: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  colored: { shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 6 },
};

export const FONTS = {
  title: { fontSize: 22, fontWeight: 'bold' as const, color: COLORS.dark },
  subtitle: { fontSize: 16, fontWeight: '600' as const, color: COLORS.dark },
  body: { fontSize: 14, color: COLORS.dark },
  caption: { fontSize: 12, color: COLORS.gray },
  price: { fontSize: 16, fontWeight: 'bold' as const, color: COLORS.primary },
};

export const RADIUS = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, round: 999 };
