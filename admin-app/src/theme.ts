export const COLORS = {
  // Brand Core
  primary: '#EA580C',      // Warm Branch Brand Orange
  primaryLight: '#FFF7ED', // Orange 50
  primaryTint: 'rgba(234, 88, 12, 0.12)',
  secondary: '#F97316',    // Bright Orange
  accent: '#3B82F6',       // Electric Blue (Super Admin)
  accentTint: 'rgba(59, 130, 246, 0.12)',
  dark: '#0F172A',
  surface: '#F8FAFC',
  card: '#FFFFFF',
  
  // Slate Neutral Scale
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

  // Semantic Status Colors
  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.12)',
  successDark: '#059669',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.12)',
  warningDark: '#D97706',
  danger: '#EF4444',
  dangerLight: 'rgba(239, 68, 68, 0.12)',
  dangerDark: '#DC2626',
  info: '#0284C7',
  infoLight: 'rgba(2, 132, 199, 0.12)',

  gradientPrimary: ['#EA580C', '#F97316'],
  gradientSuper: ['#2563EB', '#3B82F6'],
  overlay: 'rgba(15, 23, 42, 0.75)',

  // Role Palettes
  superAdmin: {
    bg: '#0F172A',
    card: '#1E293B',
    cardElevated: '#243247',
    border: '#334155',
    text: '#F8FAFC',
    textSecondary: '#CBD5E1',
    muted: '#94A3B8',
    accent: '#3B82F6',
    primary: '#2563EB',
    tint: 'rgba(59, 130, 246, 0.15)',
  },
  branchManager: {
    bg: '#FAFAFA',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    border: '#E4E4E7',
    text: '#09090B',
    textSecondary: '#52525B',
    muted: '#71717A',
    primary: '#EA580C',
    secondary: '#F97316',
    tint: 'rgba(234, 88, 12, 0.12)',
    vipGold: '#D97706',
  },

  // 7 Restaurant Brand Accents
  brands: {
    seenbanao: '#EA580C',
    dineatblue: '#0284C7',
    jushhpk: '#DC2626',
    tandooristoppk: '#B45309',
    sandmelts: '#059669',
    birdmanfoodspk: '#9333EA',
    getafomo: '#DB2777',
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  40: 40,
  48: 48,
  64: 64,
};

export const TYPOGRAPHY = {
  display: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.5 },
  h1: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  h2: { fontSize: 20, fontWeight: '700' as const },
  h3: { fontSize: 17, fontWeight: '600' as const },
  subtitle: { fontSize: 15, fontWeight: '600' as const },
  body1: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  body2: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodyBold: { fontSize: 14, fontWeight: '600' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  captionBold: { fontSize: 12, fontWeight: '600' as const },
  micro: { fontSize: 11, fontWeight: '600' as const, letterSpacing: 0.2 },
};

export const SHADOWS = {
  none: { elevation: 0, shadowOpacity: 0 },
  small: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  coloredBranch: {
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  coloredSuper: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
};

export const FONTS = {
  title: { fontSize: 22, fontWeight: 'bold' as const },
  subtitle: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 14 },
  caption: { fontSize: 12 },
};

export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  round: 999,
};
