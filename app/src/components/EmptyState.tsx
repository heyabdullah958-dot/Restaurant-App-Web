import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS } from '../theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}) => (
  <View style={styles.container}>
    <View style={styles.iconRing}>
      <Ionicons name={icon} size={56} color={COLORS.primary} />
    </View>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.subtitle}>{subtitle}</Text>
    {actionLabel && onAction && (
      <TouchableOpacity style={styles.primaryBtn} onPress={onAction} activeOpacity={0.75}>
        <Text style={styles.primaryBtnText}>{actionLabel}</Text>
      </TouchableOpacity>
    )}
    {secondaryLabel && onSecondary && (
      <TouchableOpacity style={styles.secondaryBtn} onPress={onSecondary} activeOpacity={0.75}>
        <Text style={styles.secondaryBtnText}>{secondaryLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  iconRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,87,34,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(255,87,34,0.15)',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: 24,
    ...SHADOWS.small,
  },
  primaryBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  secondaryBtn: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  secondaryBtnText: {
    color: COLORS.gray,
    fontSize: 13,
    fontWeight: '500',
  },
});
