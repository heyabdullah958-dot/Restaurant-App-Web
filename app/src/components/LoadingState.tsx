import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, SPACING } from '../theme';

interface LoadingStateProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  fullScreen = false,
}) => {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  fullScreen: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  message: {
    marginTop: SPACING.md,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.neutral500,
    textAlign: 'center',
  },
});

export default LoadingState;
