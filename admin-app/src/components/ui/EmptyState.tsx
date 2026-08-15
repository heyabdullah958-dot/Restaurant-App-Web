import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { COLORS, SPACING, RADIUS } from '../../theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  themeMode?: 'super' | 'branch';
  style?: ViewStyle;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📦',
  title,
  description,
  actionLabel,
  onAction,
  themeMode = 'branch',
  style,
}) => {
  const isSuper = themeMode === 'super';
  const textColor = isSuper ? COLORS.superAdmin.text : COLORS.branchManager.text;
  const mutedColor = isSuper ? COLORS.superAdmin.muted : COLORS.branchManager.muted;
  const cardBg = isSuper ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.7)';
  const borderColor = isSuper ? COLORS.superAdmin.border : COLORS.branchManager.border;
  const actionColor = isSuper ? COLORS.superAdmin.accent : COLORS.branchManager.primary;

  return (
    <View style={[styles.container, { backgroundColor: cardBg, borderColor }, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      <Text style={[styles.description, { color: mutedColor }]}>{description}</Text>

      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: actionColor }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.xl,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.lg,
  },
  icon: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 280,
  },
  actionButton: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  actionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
