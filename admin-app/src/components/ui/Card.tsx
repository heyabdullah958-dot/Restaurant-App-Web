import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../theme';

export interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  onPress?: () => void;
  activeOpacity?: number;
  padding?: keyof typeof SPACING | number;
  themeMode?: 'branch' | 'super';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'default',
  onPress,
  activeOpacity = 0.85,
  padding = 'md',
  themeMode = 'branch',
}) => {
  const isSuper = themeMode === 'super';
  const bgColor = isSuper ? COLORS.superAdmin.card : COLORS.branchManager.card;
  const borderColor = isSuper ? COLORS.superAdmin.border : COLORS.branchManager.border;

  const padValue = typeof padding === 'number' ? padding : (SPACING[padding] || SPACING.md);

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: 1,
          ...SHADOWS.medium,
        };
      case 'outlined':
        return {
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: 1,
          ...SHADOWS.none,
        };
      case 'flat':
        return {
          backgroundColor: isSuper ? COLORS.superAdmin.bg : COLORS.neutral100,
          borderColor: 'transparent',
          borderWidth: 0,
          ...SHADOWS.none,
        };
      case 'default':
      default:
        return {
          backgroundColor: bgColor,
          borderColor: borderColor,
          borderWidth: 1,
          ...SHADOWS.small,
        };
    }
  };

  const cardStyles: StyleProp<ViewStyle> = [
    styles.base,
    getVariantStyle(),
    { padding: padValue },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={activeOpacity}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
});
