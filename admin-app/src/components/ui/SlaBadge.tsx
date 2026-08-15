import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../theme';

export interface SlaBadgeProps {
  createdAt: string;
  status: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

/**
 * Converts elapsed minutes into human readable text:
 * - < 1m -> "Just now"
 * - < 60m -> "23m"
 * - < 24h -> "4h 12m" (or "4h" if 0m)
 * - >= 24h -> "2d 4h" (or "2d" if 0h)
 */
export const formatHumanElapsedTime = (createdAt: string): string => {
  if (!createdAt) return '';
  const createdDate = new Date(createdAt);
  const now = Date.now();
  const elapsedMs = Math.max(0, now - createdDate.getTime());
  const elapsedMins = Math.floor(elapsedMs / 60000);

  if (elapsedMins < 1) {
    return 'Just now';
  }
  if (elapsedMins < 60) {
    return `${elapsedMins}m`;
  }
  const hours = Math.floor(elapsedMins / 60);
  const remainingMins = elapsedMins % 60;

  if (hours < 24) {
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
};

export const getSlaStatus = (createdAt: string, status: string) => {
  if (status === 'delivered' || status === 'cancelled') return null;

  const elapsedMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const elapsedMins = Math.floor(elapsedMs / 60000);
  const formattedTime = formatHumanElapsedTime(createdAt);

  if (elapsedMins < 15) {
    return {
      label: `🟢 ${formattedTime}`,
      color: COLORS.successDark,
      bg: COLORS.successLight,
      level: 'normal' as const,
    };
  } else if (elapsedMins <= 30) {
    return {
      label: `⚠️ ${formattedTime}`,
      color: COLORS.warningDark,
      bg: COLORS.warningLight,
      level: 'warning' as const,
    };
  } else {
    return {
      label: `🚨 ${formattedTime} overdue`,
      color: COLORS.dangerDark,
      bg: COLORS.dangerLight,
      level: 'overdue' as const,
    };
  }
};

export const SlaBadge: React.FC<SlaBadgeProps> = ({
  createdAt,
  status,
  size = 'md',
  style,
}) => {
  const sla = getSlaStatus(createdAt, status);
  if (!sla) return null;

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: sla.bg },
        isSmall ? styles.badgeSm : styles.badgeMd,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: sla.color },
          isSmall ? styles.textSm : styles.textMd,
        ]}
        numberOfLines={1}
      >
        {sla.label}
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
  text: {
    fontWeight: '700',
  },
  textSm: {
    fontSize: 11,
  },
  textMd: {
    fontSize: 12,
  },
});
