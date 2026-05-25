export const COLORS = {
  primary: '#FF5722',      // Food-themed deep orange
  secondary: '#FF9800',    // Sunset orange
  accent: '#E91E63',       // Coral pink
  dark: '#1A1A2E',         // Dark theme/text primary
  light: '#F8F9FA',        // Light background
  gray: '#9E9E9E',         // Subtitles
  lightGray: '#E0E0E0',    // Borders
  white: '#FFFFFF',
  success: '#4CAF50',
  warning: '#FFC107',
  danger: '#F44336',
  cardBackground: '#FFFFFF',
  overlay: 'rgba(0, 0, 0, 0.4)',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
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
};
