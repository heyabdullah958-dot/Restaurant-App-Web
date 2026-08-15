import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../theme';

interface LoadingStateProps {
  message?: string;
  themeMode?: 'super' | 'branch';
  style?: ViewStyle;
  inline?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  themeMode = 'branch',
  style,
  inline = false,
}) => {
  const isSuper = themeMode === 'super';
  const spinnerColor = isSuper ? COLORS.superAdmin.accent : COLORS.branchManager.primary;
  const textColor = isSuper ? COLORS.superAdmin.muted : COLORS.branchManager.muted;
  const bgColor = isSuper ? COLORS.superAdmin.bg : COLORS.branchManager.bg;

  return (
    <View style={[inline ? styles.inlineContainer : styles.fullContainer, !inline && { backgroundColor: bgColor }, style]}>
      <ActivityIndicator size={inline ? 'small' : 'large'} color={spinnerColor} />
      {message ? <Text style={[styles.message, { color: textColor }]}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  fullContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    minHeight: 220,
  },
  inlineContainer: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: SPACING.md,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
