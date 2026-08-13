export const COLORS = {
  primary: '#2563EB',
  secondary: '#EA580C',
  accent: '#3B82F6',
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
  gradient: ['#2563EB', '#3B82F6'],
  overlay: 'rgba(0,0,0,0.6)',

  // Role Palettes
  superAdmin: {
    bg: '#0F172A',
    card: '#1E293B',
    border: '#334155',
    text: '#F8FAFC',
    muted: '#94A3B8',
    accent: '#3B82F6',
    primary: '#2563EB',
  },
  branchManager: {
    bg: '#FAFAFA',
    card: '#FFFFFF',
    border: '#E4E4E7',
    text: '#09090B',
    muted: '#71717A',
    primary: '#EA580C',
    secondary: '#F97316',
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
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48,
  2: 2, 4: 4, 8: 8, 12: 12, 16: 16, 20: 20, 24: 24, 32: 32, 40: 40, 48: 48, 64: 64,
};

export const TYPOGRAPHY = {
  h1: { fontSize: 32, fontWeight: 'bold' as const, color: COLORS.dark },
  h2: { fontSize: 24, fontWeight: 'bold' as const, color: COLORS.dark },
  h3: { fontSize: 20, fontWeight: '600' as const, color: COLORS.dark },
  body1: { fontSize: 16, fontWeight: 'normal' as const, color: COLORS.dark },
  body2: { fontSize: 14, fontWeight: 'normal' as const, color: COLORS.dark },
  caption: { fontSize: 12, fontWeight: 'normal' as const, color: COLORS.neutral500 },
};

export const SHADOWS = {
  small: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  medium: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  large: { shadowColor: '#0F172A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8 },
  coloredSuper: { shadowColor: COLORS.superAdmin.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
  coloredBranch: { shadowColor: COLORS.branchManager.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 },
};

export const FONTS = {
  title: { fontSize: 22, fontWeight: 'bold' as const },
  subtitle: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 14 },
  caption: { fontSize: 12 },
};

export const RADIUS = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, round: 999 };
