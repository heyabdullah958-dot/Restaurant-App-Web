export const COLORS = {
  primary: '#FF5722',
  secondary: '#FF9800',
  accent: '#E91E63',
  dark: '#1A1A2E',
  light: '#F8F9FA',
  gray: '#9E9E9E',
  lightGray: '#E0E0E0',
  white: '#FFFFFF',
  success: '#4CAF50',
  warning: '#FFC107',
  danger: '#F44336',
  cardBackground: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.4)',
  // Additional tokens
  primaryLight: 'rgba(255, 87, 34, 0.1)',
  darkText: '#1A1A2E',
  subtleText: '#6B7280',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  colored: {
    shadowColor: '#FF5722',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
};

export const FONTS = {
  title: {
    fontSize: 22,
    fontWeight: 'bold' as const,
    color: COLORS.dark,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.dark,
  },
  body: {
    fontSize: 14,
    color: COLORS.dark,
  },
  caption: {
    fontSize: 12,
    color: COLORS.gray,
  },
  // New: Price text
  price: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: COLORS.dark,
  },
};

// Border radius tokens
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  round: 999,
};
