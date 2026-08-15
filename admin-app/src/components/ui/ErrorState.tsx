import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../theme';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  themeMode?: 'super' | 'branch';
  style?: ViewStyle;
  icon?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something Went Wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  themeMode = 'branch',
  style,
  icon = '⚠️',
}) => {
  const isSuper = themeMode === 'super';
  const textColor = isSuper ? COLORS.superAdmin.text : COLORS.branchManager.text;
  const mutedColor = isSuper ? COLORS.superAdmin.muted : COLORS.branchManager.muted;
  const cardBg = isSuper ? COLORS.superAdmin.card : COLORS.branchManager.card;
  const borderColor = isSuper ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)';
  const btnBg = isSuper ? '#EF4444' : COLORS.branchManager.primary;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        <Text style={[styles.message, { color: mutedColor }]}>{message}</Text>

        {onRetry ? (
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: btnBg }]}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>🔄 {retryLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
    minHeight: 250,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  icon: {
    fontSize: 26,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  retryButton: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.small,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
