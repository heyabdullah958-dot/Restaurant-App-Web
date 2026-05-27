import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { COLORS } from '../theme';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonBox: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 16,
  borderRadius = 4,
  style,
}) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: COLORS.lightGray,
          opacity,
        },
        style,
      ]}
    />
  );
};

export const RestaurantCardSkeleton: React.FC = () => (
  <View style={styles.cardSkeleton}>
    <SkeletonBox height={160} borderRadius={0} />
    <View style={styles.cardBody}>
      <SkeletonBox width="60%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonBox width="40%" height={12} style={{ marginBottom: 8 }} />
      <SkeletonBox width="30%" height={10} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  cardSkeleton: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  cardBody: {
    padding: 16,
  },
});
