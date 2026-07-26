import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const shimmerX = useSharedValue(-200);

  useEffect(() => {
    shimmerX.value = withRepeat(
      withTiming(200, { duration: 1500, easing: Easing.linear }),
      -1, // Loop infinitely
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shimmerX.value }],
    };
  });

  return (
    <View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: '#ECEEEF', // Warm, premium light gray placeholder
          overflow: 'hidden',
          position: 'relative',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          animatedStyle,
          { width: '150%' } // Allow wider range for natural sweeping speed
        ]}
      >
        <LinearGradient
          colors={['transparent', 'rgba(255, 255, 255, 0.65)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
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

export const MenuItemSkeleton: React.FC = () => (
  <View style={[styles.cardSkeleton, { padding: 12, flexDirection: 'row', alignItems: 'center' }]}>
    <View style={{ flex: 1, marginRight: 12 }}>
      <SkeletonBox width="70%" height={16} style={{ marginBottom: 8 }} />
      <SkeletonBox width="90%" height={12} style={{ marginBottom: 8 }} />
      <SkeletonBox width="35%" height={14} />
    </View>
    <SkeletonBox width={80} height={80} borderRadius={12} />
  </View>
);

export const OrderCardSkeleton: React.FC = () => (
  <View style={[styles.cardSkeleton, { padding: 16 }]}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
      <SkeletonBox width="50%" height={18} />
      <SkeletonBox width="25%" height={18} borderRadius={12} />
    </View>
    <SkeletonBox width="75%" height={12} style={{ marginBottom: 8 }} />
    <SkeletonBox width="40%" height={12} style={{ marginBottom: 12 }} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <SkeletonBox width="30%" height={16} />
      <SkeletonBox width="25%" height={32} borderRadius={8} />
    </View>
  </View>
);

export const SearchResultSkeleton: React.FC = () => (
  <View style={[styles.cardSkeleton, { padding: 12, flexDirection: 'row', alignItems: 'center' }]}>
    <SkeletonBox width={60} height={60} borderRadius={8} style={{ marginRight: 12 }} />
    <View style={{ flex: 1 }}>
      <SkeletonBox width="60%" height={16} style={{ marginBottom: 6 }} />
      <SkeletonBox width="40%" height={12} />
    </View>
  </View>
);

export const RewardCardSkeleton: React.FC = () => (
  <View style={[styles.cardSkeleton, { padding: 16 }]}>
    <SkeletonBox width="40%" height={14} style={{ marginBottom: 8 }} />
    <SkeletonBox width="80%" height={24} style={{ marginBottom: 12 }} />
    <SkeletonBox width="100%" height={8} borderRadius={4} />
  </View>
);

export const TrackingStatusSkeleton: React.FC = () => (
  <View style={[styles.cardSkeleton, { padding: 20, alignItems: 'center' }]}>
    <SkeletonBox width={100} height={100} borderRadius={50} style={{ marginBottom: 16 }} />
    <SkeletonBox width="60%" height={20} style={{ marginBottom: 8 }} />
    <SkeletonBox width="40%" height={14} />
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

