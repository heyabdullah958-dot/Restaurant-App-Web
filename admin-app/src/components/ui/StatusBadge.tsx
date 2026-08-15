import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../theme';

export type StatusType =
  | 'received'
  | 'preparing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'
  | 'AVAILABLE'
  | 'ON_DELIVERY'
  | 'OFFLINE'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'primary'
  | 'neutral';

export interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

interface BadgeConfig {
  label: string;
  color: string;
  bg: string;
  icon?: string;
}

export const getStatusConfig = (status: string): BadgeConfig => {
  switch (status.toLowerCase()) {
    case 'received':
      return { label: 'Received', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)', icon: '📥' };
    case 'preparing':
      return { label: 'Preparing', color: COLORS.branchManager.primary, bg: COLORS.primaryTint, icon: '🍳' };
    case 'out_for_delivery':
      return { label: 'Out for Delivery', color: '#0284C7', bg: 'rgba(2, 132, 199, 0.12)', icon: '🛵' };
    case 'delivered':
      return { label: 'Delivered', color: COLORS.success, bg: COLORS.successLight, icon: '✅' };
    case 'cancelled':
      return { label: 'Cancelled', color: COLORS.danger, bg: COLORS.dangerLight, icon: '❌' };
    case 'available':
      return { label: 'Available', color: COLORS.success, bg: COLORS.successLight, icon: '🟢' };
    case 'on_delivery':
      return { label: 'On Delivery', color: '#0284C7', bg: 'rgba(2, 132, 199, 0.12)', icon: '🛵' };
    case 'offline':
      return { label: 'Offline', color: COLORS.neutral500, bg: COLORS.neutral100, icon: '⚪' };
    case 'success':
      return { label: 'Active', color: COLORS.success, bg: COLORS.successLight };
    case 'warning':
      return { label: 'Pending', color: COLORS.warningDark, bg: COLORS.warningLight };
    case 'danger':
      return { label: 'Error', color: COLORS.danger, bg: COLORS.dangerLight };
    case 'info':
      return { label: 'Info', color: COLORS.info, bg: COLORS.infoLight };
    case 'primary':
      return { label: 'Primary', color: COLORS.branchManager.primary, bg: COLORS.primaryTint };
    default:
      return { label: status, color: COLORS.neutral600, bg: COLORS.neutral100 };
  }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  style,
}) => {
  const config = getStatusConfig(status);
  const displayLabel = label || config.label;
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        isSmall ? styles.badgeSm : styles.badgeMd,
        style,
      ]}
    >
      {config.icon ? (
        <Text style={[styles.iconText, isSmall && styles.iconTextSm]}>
          {config.icon}{' '}
        </Text>
      ) : null}
      <Text
        style={[
          styles.labelText,
          { color: config.color },
          isSmall ? styles.labelSm : styles.labelMd,
        ]}
        numberOfLines={1}
      >
        {displayLabel}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.round,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  badgeMd: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
  },
  iconText: {
    fontSize: 12,
  },
  iconTextSm: {
    fontSize: 10,
  },
  labelText: {
    fontWeight: '600',
  },
  labelSm: {
    fontSize: 11,
  },
  labelMd: {
    fontSize: 12,
  },
});
