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
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchOrdersThunk } from '../../store/orderSlice';
import { fetchRestaurants, fetchReviews, AdminOrder, CustomerReview } from '../../services/api';
import { useOrderPolling } from '../../hooks/useOrderPolling';
import { Card, StatusBadge, SlaBadge, ErrorState, EmptyState, LoadingState } from '../../components/ui';

type Timeframe = 'today' | 'week' | 'month' | 'all';

export const BranchDashboardScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const { user, restaurantId, branchId } = useAppSelector((state) => state.auth);
  const { orders, isLoading, isRefreshing, error } = useAppSelector((state) => state.orders);

  // Poll orders every 15s
  useOrderPolling(15000);

  const [timeframe, setTimeframe] = useState<Timeframe>('today');
  const [restaurantData, setRestaurantData] = useState<any | null>(null);
  const [branchDetail, setBranchDetail] = useState<any | null>(null);
  const [loadingRestaurant, setLoadingRestaurant] = useState(false);

  const [reviews, setReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

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

    if (restaurantId) {
      setLoadingReviews(true);
      fetchReviews({ restaurant_id: restaurantId })
        .then((revs) => setReviews(revs))
        .catch(() => setReviews([]))
        .finally(() => setLoadingReviews(false));
    }
  };

  useEffect(() => {
    loadDashboardData(false);
  }, [restaurantId]);

  const handleRefresh = () => {
    loadDashboardData(true);
  };

  // Stat 1: Pending Live Orders
  const pendingOrdersCount = orders.filter(
    (o) => o.status === 'received' || o.status === 'preparing' || o.status === 'out_for_delivery'
  ).length;

  // Stat 2: Sales with Timeframe filter (Delivered-Only Revenue Accounting)
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

    // Strictly filter by status === 'delivered'
    const filtered = orders.filter(
      (o) => o.status === 'delivered' && new Date(o.created_at).getTime() >= cutoff.getTime()
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
        <Card style={styles.headerCard}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
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
        </Card>

        {/* 2x2 Stat Cards Grid */}
        <View style={styles.gridContainer}>
          {/* Card 1: Pending Live Orders */}
          <Card
            style={styles.statCard}
            onPress={() => navigation.navigate('OrderManagement')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconBox, { backgroundColor: COLORS.primaryTint }]}>
              <Text style={styles.statIcon}>📦</Text>
            </View>
            <Text style={styles.statValue}>{pendingOrdersCount}</Text>
            <Text style={styles.statLabel}>Pending Orders</Text>
            <Text style={styles.statSubText}>Tap to view board →</Text>
          </Card>

          {/* Card 2: Sales Revenue */}
          <Card style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: COLORS.successLight }]}>
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
          </Card>

          {/* Card 3: Avg Delivery Time */}
          <Card style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: COLORS.infoLight }]}>
              <Text style={styles.statIcon}>⏱️</Text>
            </View>
            <Text style={styles.statValue}>{avgDeliveryTime}</Text>
            <Text style={styles.statLabel}>Avg Delivery Time</Text>
            <Text style={styles.statSubText}>Target SLA Window</Text>
          </Card>

          {/* Card 4: Overall Rating */}
          <Card style={styles.statCard}>
            <View style={[styles.iconBox, { backgroundColor: COLORS.warningLight }]}>
              <Text style={styles.statIcon}>⭐</Text>
            </View>
            <Text style={styles.statValue}>{ratingDisplay}</Text>
            <Text style={styles.statLabel}>Store Rating</Text>
            <Text style={styles.statSubText}>Verified Customers</Text>
          </Card>
        </View>

        {/* Recent Orders Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Incoming Orders</Text>
          <TouchableOpacity onPress={() => navigation.navigate('OrderManagement')} activeOpacity={0.7}>
            <Text style={styles.seeAllText}>View All ({orders.length}) →</Text>
          </TouchableOpacity>
        </View>

        {error && orders.length === 0 ? (
          <ErrorState
            title="Dashboard Sync Notice"
            message={error}
            onRetry={handleRefresh}
            retryLabel="Refresh Dashboard"
            themeMode="branch"
          />
        ) : recentOrders.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No Orders Yet"
            description="Incoming orders for your branch will appear here live with SLA tracking."
            themeMode="branch"
          />
        ) : (
          recentOrders.map((ord: AdminOrder) => (
            <Card
              key={ord.id}
              style={styles.recentOrderCard}
              onPress={() => navigation.navigate('OrderManagement')}
              activeOpacity={0.8}
            >
              <View style={styles.recentLeft}>
                <View style={styles.recentIdRow}>
                  <Text style={styles.recentId}>
                    {ord.display_order_id || `#${ord.id}`}
                  </Text>
                  <SlaBadge createdAt={ord.created_at} status={ord.status} size="sm" />
                </View>
                <Text style={styles.recentCustomer}>👤 {ord.guest_name || 'Guest'}</Text>
                <Text style={styles.recentTime}>
                  Placed: {new Date(ord.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>

              <View style={styles.recentRight}>
                <Text style={styles.recentTotal}>Rs. {parseFloat(ord.total).toLocaleString()}</Text>
                <StatusBadge status={ord.status} size="sm" />
              </View>
            </Card>
          ))
        )}

        {/* Customer Reviews & Feedback Section */}
        <View style={styles.reviewsSectionHeader}>
          <Text style={styles.reviewsSectionTitle}>💬 Customer Reviews & Ratings</Text>
          <View style={styles.reviewsCountPill}>
            <Text style={styles.reviewsCountPillText}>
              {reviews.length} feedback received
            </Text>
          </View>
        </View>

        {loadingReviews ? (
          <ActivityIndicator color={COLORS.branchManager.primary} style={{ marginVertical: 16 }} />
        ) : reviews.length === 0 ? (
          <Card style={styles.emptyReviewsCard}>
            <Text style={styles.emptyReviewsText}>No customer reviews yet. Reviews will appear here after delivery completion.</Text>
          </Card>
        ) : (
          reviews.slice(0, 5).map((rev) => (
            <Card key={rev.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewUser}>👤 {rev.user_name || 'Verified Customer'}</Text>
                <Text style={styles.reviewStars}>
                  {'⭐'.repeat(Math.min(Math.max(rev.rating, 1), 5))}
                </Text>
              </View>
              <Text style={styles.reviewComment}>
                "{rev.comment || 'Great food and delivery!'}"
              </Text>
              <View style={styles.reviewFooter}>
                <Text style={styles.reviewMeta}>
                  {rev.order ? `Order #${rev.order}` : 'Verified Dining'}
                </Text>
                <Text style={styles.reviewDate}>
                  {new Date(rev.created_at).toLocaleDateString()}
                </Text>
              </View>
            </Card>
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
    marginBottom: SPACING.md,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  restaurantName: {
    ...TYPOGRAPHY.h2,
    color: COLORS.dark,
  },
  branchName: {
    fontSize: 14,
    color: COLORS.branchManager.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  statusChip: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  statusChipText: {
    color: COLORS.successDark,
    fontSize: 11,
    fontWeight: '700',
  },
  headerAddress: {
    fontSize: 12,
    color: COLORS.neutral600,
    marginTop: 4,
  },
  headerPhone: {
    fontSize: 12,
    color: COLORS.neutral600,
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
    marginBottom: SPACING.md,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  statIcon: {
    fontSize: 18,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.neutral500,
    fontWeight: '600',
  },
  statSubText: {
    fontSize: 11,
    color: COLORS.branchManager.primary,
    fontWeight: '600',
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
    borderRadius: RADIUS.xs,
    backgroundColor: COLORS.neutral100,
  },
  tfChipActive: {
    backgroundColor: COLORS.branchManager.primary,
  },
  tfText: {
    fontSize: 9,
    color: COLORS.neutral600,
    fontWeight: '600',
  },
  tfTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.dark,
  },
  seeAllText: {
    fontSize: 13,
    color: COLORS.branchManager.primary,
    fontWeight: '700',
  },
  emptyCard: {
    padding: SPACING.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.neutral500,
    fontSize: 13,
  },
  recentOrderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  recentLeft: {
    flex: 1,
  },
  recentIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: 2,
  },
  recentId: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  recentCustomer: {
    fontSize: 13,
    color: COLORS.neutral700,
    fontWeight: '500',
  },
  recentTime: {
    fontSize: 11,
    color: COLORS.neutral400,
    marginTop: 2,
  },
  recentRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  recentTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.branchManager.primary,
  },
  reviewsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    flexWrap: 'wrap',
    gap: 6,
  },
  reviewsSectionTitle: {
    ...TYPOGRAPHY.h3,
    fontSize: 16,
    color: COLORS.dark,
    flexShrink: 1,
  },
  reviewsCountPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
  },
  reviewsCountPillText: {
    fontSize: 11,
    color: COLORS.neutral600,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.neutral500,
    fontWeight: '600',
  },
  emptyReviewsCard: {
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyReviewsText: {
    fontSize: 12,
    color: COLORS.neutral400,
    textAlign: 'center',
  },
  reviewCard: {
    padding: SPACING.sm + 4,
    marginBottom: SPACING.sm,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: RADIUS.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  reviewUser: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.dark,
  },
  reviewStars: {
    fontSize: 12,
  },
  reviewComment: {
    fontSize: 12,
    color: COLORS.neutral700,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 4,
  },
  reviewMeta: {
    fontSize: 10,
    color: COLORS.neutral400,
    fontWeight: '600',
  },
  reviewDate: {
    fontSize: 10,
    color: COLORS.neutral400,
  },
});
