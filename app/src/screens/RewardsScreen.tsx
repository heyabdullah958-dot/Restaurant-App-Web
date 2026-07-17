import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SHADOWS } from '../theme';
import { RootState, AppDispatch } from '../store';
import { updateUserProfile } from '../store/userSlice';
import api from '../services/api';
import { StatusBar } from 'expo-status-bar';

// High-fidelity animation and gesture imports
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface Transaction {
  id: number;
  order: number | null;
  points: number;
  transaction_type: 'earned' | 'redeemed';
  description: string;
  created_at: string;
}

export default function RewardsScreen({ navigation }: { navigation: any }) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.user);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [points, setPoints] = useState(user?.loyalty_points || 0);

  // Parallax and Shimmer Shared Values
  const rotateX = useSharedValue(0);
  const rotateY = useSharedValue(0);
  const shimmerX = useSharedValue(-width);

  useEffect(() => {
    // Continuous metallic shimmer sweep loop
    shimmerX.value = withRepeat(
      withTiming(width * 1.5, { duration: 2500, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
      -1,
      false
    );
  }, []);

  const gesture = Gesture.Pan()
    .onUpdate((event) => {
      // 3D parallax rotations limited to +/- 12 degrees for safety and premium feel
      rotateX.value = -event.translationY / 25;
      rotateY.value = event.translationX / 25;
    })
    .onEnd(() => {
      rotateX.value = withSpring(0, { damping: 12 });
      rotateY.value = withSpring(0, { damping: 12 });
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { perspective: 1000 },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
      ],
    };
  });

  const animatedShimmerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shimmerX.value }],
    };
  });

  // Fetch Loyalty Data from Backend
  const fetchLoyaltyData = async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get('/users/loyalty/') as any;
      
      // Handle different levels of response unwrapping robustly
      let loyaltyData = response;
      if (response && response.data) {
        loyaltyData = response.data;
      }
      if (loyaltyData && loyaltyData.data) {
        loyaltyData = loyaltyData.data;
      }
      
      if (loyaltyData && Array.isArray(loyaltyData.transactions)) {
        setTransactions(loyaltyData.transactions);
      }
      if (loyaltyData && typeof loyaltyData.loyalty_points === 'number') {
        setPoints(loyaltyData.loyalty_points);
        // Sync with Redux user state
        dispatch(updateUserProfile({ loyalty_points: loyaltyData.loyalty_points }));
      }
    } catch (error) {
      console.error('Failed to fetch loyalty history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLoyaltyData();
  }, []);

  // Compute Tier Details
  const getTierInfo = (currentPoints: number) => {
    if (currentPoints >= 1000) {
      return {
        name: 'Platinum',
        nextName: 'Max Tier reached!',
        min: 1000,
        max: 1000,
        progress: 1.0,
        color: '#E5E4E2', // Platinum platinum color
        badgeIcon: 'ribbon',
        remaining: 0,
      };
    } else if (currentPoints >= 500) {
      return {
        name: 'Gold',
        nextName: 'Platinum',
        min: 500,
        max: 1000,
        progress: (currentPoints - 500) / 500,
        color: '#FFD700', // Gold color
        badgeIcon: 'trophy',
        remaining: 1000 - currentPoints,
      };
    } else if (currentPoints >= 200) {
      return {
        name: 'Silver',
        nextName: 'Gold',
        min: 200,
        max: 500,
        progress: (currentPoints - 200) / 300,
        color: '#C0C0C0', // Silver color
        badgeIcon: 'medal',
        remaining: 500 - currentPoints,
      };
    } else {
      return {
        name: 'Bronze',
        nextName: 'Silver',
        min: 0,
        max: 200,
        progress: currentPoints / 200,
        color: '#CD7F32', // Bronze color
        badgeIcon: 'shield',
        remaining: 200 - currentPoints,
      };
    }
  };

  const tier = getTierInfo(points);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }) + ' ' + date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const renderHeader = () => {
    return (
      <View style={styles.headerContainer}>
        {/* Tier Card with Interactive 3D Parallax & Metallic Shimmer Overlay */}
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.tierCard, { shadowColor: tier.color }, SHADOWS.large, animatedCardStyle]}>
            {/* Shimmer sweep overlay */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                animatedShimmerStyle,
                { width: '200%', opacity: 0.15 }
              ]}
            >
              <LinearGradient
                colors={['transparent', 'rgba(255, 255, 255, 0.8)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>

            <View style={styles.cardHeader}>
              <View style={styles.tierBadge}>
                <Ionicons name={tier.badgeIcon as any} size={28} color={tier.color} />
                <Text style={[styles.tierName, { color: tier.color }]}>{tier.name} Member</Text>
              </View>
              <Ionicons name="sparkles" size={20} color={COLORS.secondary} />
            </View>

            <View style={styles.pointsContainer}>
              <Text style={styles.pointsLabel}>Available Balance</Text>
              <Text style={styles.pointsValue}>{points}</Text>
              <Text style={styles.pointsUnit}>FoodSphere Points</Text>
            </View>

            {/* Progress Bar Container */}
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Tier Progress</Text>
                <Text style={styles.progressValues}>
                  {points} / {tier.max}
                </Text>
              </View>
              
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(100, Math.max(5, tier.progress * 100))}%`,
                      backgroundColor: tier.color,
                    },
                  ]}
                />
              </View>

              {tier.remaining > 0 ? (
                <Text style={styles.progressFooter}>
                  Earn <Text style={{ fontWeight: 'bold' }}>{tier.remaining}</Text> more points for{' '}
                  <Text style={{ color: tier.color, fontWeight: 'bold' }}>{tier.nextName}</Text> Tier
                </Text>
              ) : (
                <Text style={styles.progressFooter}>You are in the elite tier!</Text>
              )}
            </View>
          </Animated.View>
        </GestureDetector>

        {/* Benefits Info Box */}
        <View style={[styles.infoBox, SHADOWS.small]}>
          <Text style={styles.infoTitle}>How it works</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoBullet}>
              <Ionicons name="pizza-outline" size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.infoText}>Earn 1 point for every Rs. 100 spent across all 7 restaurant brands.</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoBullet}>
              <Ionicons name="cash-outline" size={16} color={COLORS.primary} />
            </View>
            <Text style={styles.infoText}>Redeem at checkout: 100 points = Rs. 100 discount on your order!</Text>
          </View>
        </View>

        <Text style={styles.historyTitle}>Points Transaction History</Text>
      </View>
    );
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isEarned = item.transaction_type === 'earned';
    return (
      <View style={[styles.transactionItem, SHADOWS.small]}>
        <View
          style={[
            styles.txIconContainer,
            { backgroundColor: isEarned ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)' },
          ]}
        >
          <Ionicons
            name={isEarned ? 'arrow-up-outline' : 'arrow-down-outline'}
            size={22}
            color={isEarned ? COLORS.success : COLORS.danger}
          />
        </View>
        <View style={styles.txDetails}>
          <Text style={styles.txDesc}>{item.description}</Text>
          <Text style={styles.txDate}>{formatDate(item.created_at)}</Text>
        </View>
        <Text
          style={[
            styles.txPoints,
            { color: isEarned ? COLORS.success : COLORS.danger },
          ]}
        >
          {isEarned ? '+' : '-'}
          {item.points}
        </Text>
      </View>
    );
  };

  const renderEmptyState = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="receipt-outline" size={54} color={COLORS.gray} />
        <Text style={styles.emptyText}>No points transactions found</Text>
        <Text style={styles.emptySubtext}>Your points transaction history will appear here after placing orders.</Text>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        {/* Custom Navigation Header */}
        <View style={styles.navHeader}>
          <TouchableOpacity activeOpacity={0.75} style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Loyalty & Rewards</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading && !refreshing ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loaderText}>Loading rewards dashboard...</Text>
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderTransactionItem}
            keyExtractor={(item) => item.id.toString()}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchLoyaltyData(true)}
                tintColor={COLORS.primary}
                colors={[COLORS.primary]}
              />
            }
          />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    ...FONTS.subtitle,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderText: {
    ...FONTS.body,
    color: COLORS.gray,
    marginTop: SPACING.sm,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  headerContainer: {
    width: '100%',
  },
  tierCard: {
    backgroundColor: COLORS.dark,
    borderRadius: 24,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tierName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: SPACING.xs,
  },
  pointsContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  pointsLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pointsValue: {
    fontSize: 52,
    fontWeight: 'bold',
    color: COLORS.white,
    marginVertical: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  pointsUnit: {
    fontSize: 12,
    color: COLORS.secondary,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: SPACING.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  progressValues: {
    fontSize: 11,
    color: COLORS.white,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressFooter: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  infoBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 87, 34, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.gray,
    flex: 1,
    lineHeight: 16,
  },
  historyTitle: {
    ...FONTS.subtitle,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  txIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  txDetails: {
    flex: 1,
  },
  txDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: 2,
  },
  txDate: {
    fontSize: 11,
    color: COLORS.gray,
  },
  txPoints: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: SPACING.md,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 18,
  },
});
