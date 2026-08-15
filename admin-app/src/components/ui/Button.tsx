import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../theme';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'destructive'
  | 'outline'
  | 'ghost';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getContainerStyle = (): ViewStyle => {
    let base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: RADIUS.md,
      alignSelf: fullWidth ? 'stretch' : 'auto',
    };

    // Sizing
    if (size === 'sm') {
      base = { ...base, paddingVertical: 6, paddingHorizontal: 12, borderRadius: RADIUS.sm };
    } else if (size === 'lg') {
      base = { ...base, paddingVertical: 14, paddingHorizontal: 20, borderRadius: RADIUS.lg };
    } else {
      base = { ...base, paddingVertical: 10, paddingHorizontal: 16, borderRadius: RADIUS.md };
    }

    // Variants
    switch (variant) {
      case 'secondary':
        base = {
          ...base,
          backgroundColor: COLORS.branchManager.secondary,
        };
        break;
      case 'success':
        base = {
          ...base,
          backgroundColor: COLORS.success,
        };
        break;
      case 'destructive':
        base = {
          ...base,
          backgroundColor: COLORS.danger,
        };
        break;
      case 'outline':
        base = {
          ...base,
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: COLORS.neutral300,
        };
        break;
      case 'ghost':
        base = {
          ...base,
          backgroundColor: 'transparent',
        };
        break;
      case 'primary':
      default:
        base = {
          ...base,
          backgroundColor: COLORS.branchManager.primary,
          ...SHADOWS.coloredBranch,
        };
        break;
    }

    if (disabled || isLoading) {
      base = { ...base, opacity: 0.65, ...SHADOWS.none };
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    let base: TextStyle = {
      fontWeight: '600',
    };

    if (size === 'sm') {
      base = { ...base, fontSize: 13 };
    } else if (size === 'lg') {
      base = { ...base, fontSize: 16, fontWeight: '700' };
    } else {
      base = { ...base, fontSize: 14 };
    }

    switch (variant) {
      case 'outline':
        base = { ...base, color: COLORS.neutral700 };
        break;
      case 'ghost':
        base = { ...base, color: COLORS.neutral600 };
        break;
      case 'primary':
      case 'secondary':
      case 'success':
      case 'destructive':
      default:
        base = { ...base, color: '#FFFFFF' };
        break;
    }

    return base;
  };

  const loadingIndicatorColor =
    variant === 'outline' || variant === 'ghost' ? COLORS.neutral700 : '#FFFFFF';

  return (
    <TouchableOpacity
      style={[getContainerStyle(), style]}
      onPress={onPress}
      disabled={disabled || isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={loadingIndicatorColor} />
      ) : (
        <>
          {icon ? <View style={styles.iconLeft}>{icon}</View> : null}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          {iconRight ? <View style={styles.iconRight}>{iconRight}</View> : null}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconLeft: {
    marginRight: 6,
  },
  iconRight: {
    marginLeft: 6,
  },
});
