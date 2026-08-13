import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchOrdersThunk } from '../../store/orderSlice';
import { fetchRestaurants, AdminOrder } from '../../services/api';
import { useOrderPolling } from '../../hooks/useOrderPolling';

type Timeframe = 'today' | 'week' | 'month' | 'all';

export const BranchDashboardScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const { user, restaurantId, branchId } = useAppSelector((state) => state.auth);
  const { orders, isLoading, isRefreshing } = useAppSelector((state) => state.orders);

  // Poll orders every 15s
  useOrderPolling(15000);

  const [timeframe, setTimeframe] = useState<Timeframe>('today');
  const [restaurantData, setRestaurantData] = useState<any | null>(null);
  const [branchDetail, setBranchDetail] = useState<any | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(false);

  const loadDashboardData = async (isRefresh: boolean = false) => {
    dispatch(fetchOrdersThunk({ isRefresh }));
    if (!restaurantData) {
      setLoadingRestaurant(true);
      try {
        const res = await fetchRestaurants();
        const found = (res.results || []).find((r) => Number(r.id) === Number(restaurantId));
        if (found) {
          setRestaurantData(found);
          const br = (found.branches || []).find((b: any) => Number(b.id) === Number(branchId));
          setBranchDetail(br || null);
        }
      } catch (err) {
        console.warn('Failed to fetch restaurant info:', err);
      } finally {
        setLoadingRestaurant(false);
      }
    }
  };

  useEffect(() => {
    loadDashboardData(false);
  }, []);

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  // Stat 1: Pending Live Orders
  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'received' || o.status === 'preparing' || o.status === 'out_for_delivery'
  ).length;

  // Stat 2: Sales with Timeframe filter
  const calculateRevenue = () => {
    const now = new Date();
    let cutoff = new Date(0); // All time default

    if (timeframe === 'today') {
      cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (timeframe === 'week') {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'month') {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const filtered = orders.filter(
      (o) => o.status !== 'cancelled' && new Date(o.created_at).getTime() >= cutoff.getTime()
    );

    return filtered.reduce((sum, o) => sum + (parseFloat(o.total) || 0), 0);
  };

  const revenueTotal = calculateRevenue();

  // Stat 3 & 4: Static from restaurant config
  const avgDeliveryTime = restaurantData
    ? `${restaurantData.delivery_time_min || 20}-${restaurantData.delivery_time_max || 40} mins`
    : '25-40 mins';

  const ratingDisplay = restaurantData?.rating && Number(restaurantData.rating) > 0
    ? `${Number(restaurantData.rating).toFixed(1)} / 5.0`
    : '4.8 / 5.0';

  const recentOrders = orders.slice(0, 5);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.branchManager.bg} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.branchManager.primary]}
            tintColor={COLORS.branchManager.primary}
          />
        }
      >
        {/* Branch Info Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.restaurantName}>
                {restaurantData?.name || 'Restaurant Workspace'}
              </Text>
              <Text style={styles.branchName}>
                {branchDetail?.name || `Branch #${branchId || 'HQ'}`}
              </Text>
            </View>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipText}>● Live Branch</Text>
            </View>
          </View>

          {branchDetail?.address ? (
            <Text style={styles.headerAddress}>📍 {branchDetail.address}</Text>
          ) : null}
          {branchDetail?.phone ? (
            <Text style={styles.headerPhone}>📞 {branchDetail.phone}</Text>
          ) : null}
        </View>

        {/* 2x2 Stat Cards Grid */}
        <View style={styles.gridContainer}>
          {/* Card 1: Pending Live Orders */}
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('OrderManagement')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, { backgroundColor: 'rgba(234, 88, 12, 0.1)' }]}>
              <Text style={styles.statIcon}>📦</Text>
            </View>
            <Text style={styles.statValue}>{pendingOrdersCount}</Text>
            <Text style={styles.statLabel}>Pending Orders</Text>
            <Text style={styles.statSubText}>Tap to view board →</Text>
          </TouchableOpacity>

          {/* Card 2: Sales Revenue */}
          <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Text style={styles.statIcon}>💰</Text>
            </View>
            <Text style={styles.statValue}>Rs. {Math.round(revenueTotal).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Revenue</Text>

            {/* Timeframe selector */}
            <View style={styles.timeframeRow}>
              {(['today', 'week', 'month', 'all'] as Timeframe[]).map((tf) => (
                <TouchableOpacity
                  key={tf}
                  style={[styles.tfChip, timeframe === tf && styles.tfChipActive]}
                  onPress={() => setTimeframe(tf)}
                >
                  <Text style={[styles.tfText, timeframe === tf && styles.tfTextActive]}>
                    {tf.charAt(0).toUpperCase() + tf.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Card 3: Avg Delivery Time */}
          <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(2, 132, 199, 0.1)' }]}>
              <Text style={styles.statIcon}>⏱️</Text>
            </View>
            <Text style={styles.statValue}>{avgDeliveryTime}</Text>
            <Text style={styles.statLabel}>Avg Delivery Time</Text>
            <Text style={styles.statSubText}>Target SLA Window</Text>
          </View>

          {/* Card 4: Overall Rating */}
          <View style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
              <Text style={styles.statIcon}>⭐</Text>
            </View>
            <Text style={styles.statValue}>{ratingDisplay}</Text>
            <Text style={styles.statLabel}>Store Rating</Text>
            <Text style={styles.statSubText}>Verified Customers</Text>
          </View>
        </View>

        {/* Recent Orders Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Incoming Orders</Text>
          <TouchableOpacity onPress={() => navigation.navigate('OrderManagement')}>
            <Text style={styles.seeAllText}>View All ({orders.length}) →</Text>
          </TouchableOpacity>
        </View>

        {recentOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No orders fetched yet.</Text>
          </View>
        ) : (
          recentOrders.map((ord: AdminOrder) => (
            <TouchableOpacity
              key={ord.id}
              style={styles.recentOrderCard}
              onPress={() => navigation.navigate('OrderManagement')}
              activeOpacity={0.8}
            >
              <View style={styles.recentLeft}>
                <Text style={styles.recentId}>
                  {ord.display_order_id || `#${ord.id}`}
                </Text>
                <Text style={styles.recentCustomer}>{ord.guest_name || 'Guest'}</Text>
                <Text style={styles.recentTime}>
                  {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <View style={styles.recentRight}>
                <Text style={styles.recentTotal}>Rs. {parseFloat(ord.total).toLocaleString()}</Text>
                <View style={styles.recentStatusBadge}>
                  <Text style={styles.recentStatusText}>{ord.status.replace('_', ' ')}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.branchManager.bg,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  headerCard: {
    backgroundColor: COLORS.branchManager.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.branchManager.border,
    ...SHADOWS.small,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.branchManager.text,
  },
  branchName: {
    fontSize: 14,
    color: COLORS.branchManager.primary,
    fontWeight: '600',
  },
  statusChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  statusChipText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  headerAddress: {
    fontSize: 12,
    color: COLORS.branchManager.muted,
    marginTop: 2,
  },
  headerPhone: {
    fontSize: 12,
    color: COLORS.branchManager.muted,
    marginTop: 2,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.branchManager.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.branchManager.border,
    ...SHADOWS.small,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.xs,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statIcon: {
    fontSize: 18,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.branchManager.text,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.branchManager.muted,
    fontWeight: '600',
  },
  statSubText: {
    fontSize: 10,
    color: COLORS.branchManager.primary,
    marginTop: 4,
  },
  timeframeRow: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
    justifyContent: 'space-between',
  },
  tfChip: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
  },
  tfChipActive: {
    backgroundColor: COLORS.branchManager.primary,
  },
  tfText: {
    fontSize: 9,
    color: COLORS.branchManager.muted,
    fontWeight: '600',
  },
  tfTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.branchManager.text,
  },
  seeAllText: {
    fontSize: 13,
    color: COLORS.branchManager.primary,
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: COLORS.branchManager.card,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.branchManager.border,
  },
  emptyText: {
    color: COLORS.branchManager.muted,
    fontSize: 13,
  },
  recentOrderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.branchManager.card,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.branchManager.border,
  },
  recentLeft: {
    flex: 1,
  },
  recentId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.branchManager.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  recentCustomer: {
    fontSize: 13,
    color: COLORS.branchManager.text,
  },
  recentTime: {
    fontSize: 11,
    color: COLORS.branchManager.muted,
  },
  recentRight: {
    alignItems: 'flex-end',
  },
  recentTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.branchManager.primary,
    marginBottom: 2,
  },
  recentStatusBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  recentStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.branchManager.muted,
    textTransform: 'capitalize',
  },
});
