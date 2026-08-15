import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, SHADOWS } from '../theme';

interface ErrorStateProps {
  title?: string;
  message?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  icon = '⚠️',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {onRetry ? (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry} activeOpacity={0.8}>
            <Text style={styles.retryText}>🔄 {retryLabel}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.neutral200,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  icon: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  message: {
    fontSize: 13,
    color: COLORS.neutral500,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.md,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 12,
    marginTop: SPACING.xs,
    ...SHADOWS.small,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default ErrorState;
