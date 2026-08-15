import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchAnalyticsThunk } from '../../store/analyticsSlice';
import { fetchReviews, CustomerReview } from '../../services/api';
import { Card, StatusBadge, LoadingState, ErrorState, EmptyState } from '../../components/ui';

const { width } = Dimensions.get('window');

export const SuperDashboardScreen = () => {
  const dispatch = useAppDispatch();
  const { data, isLoading, isRefreshing, error } = useAppSelector((state) => state.analytics);

  const [reviews, setReviews] = React.useState<CustomerReview[]>([]);
  const [loadingReviews, setLoadingReviews] = React.useState(false);

  const loadReviews = () => {
    setLoadingReviews(true);
    fetchReviews()
      .then((revs) => setReviews(revs))
      .catch(() => setReviews([]))
      .finally(() => setLoadingReviews(false));
  };

  useEffect(() => {
    dispatch(fetchAnalyticsThunk());
    loadReviews();
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchAnalyticsThunk({ isRefresh: true }));
    loadReviews();
  };

  const LAUNCH_BRAND_SLUGS = ['jushhpk', 'tandooristoppk', 'getafomo'];

  const summary = data?.summary;
  const dailyTrend = data?.daily_trend || [];
  const rawRestaurantBreakdown = data?.restaurant_breakdown || [];
  const restaurantBreakdown = rawRestaurantBreakdown.filter(
    (r) => !r.slug || LAUNCH_BRAND_SLUGS.includes(r.slug.toLowerCase())
  );
  const statusBreakdown = data?.status_breakdown || {};

  // Maximum revenue for trend scaling (with minimum scale of 1000)
  const maxRevenue = Math.max(...dailyTrend.map((d) => d.revenue), 1000);
  const totalTrendRevenue = dailyTrend.reduce((sum, d) => sum + d.revenue, 0);
  const totalTrendOrders = dailyTrend.reduce((sum, d) => sum + d.orders, 0);
  const isSparseData = dailyTrend.every((d) => d.revenue === 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.superAdmin.bg} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.superAdmin.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>HQ Command Center</Text>
            <Text style={styles.headerSubtitle}>Real-time Platform Aggregate Intelligence</Text>
          </View>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>LIVE API</Text>
          </View>
        </View>

        {error && !data ? (
          <ErrorState
            title="Analytics Sync Notice"
            message={error}
            onRetry={handleRefresh}
            retryLabel="Retry Analytics"
            themeMode="super"
          />
        ) : null}

        {isLoading && !data ? (
          <LoadingState
            message="Connecting to HQ Analytics Command Center..."
            themeMode="super"
          />
        ) : data ? (
          <>
            {/* Top 4 Summary Metric Cards (2x2 Grid) */}
            <View style={styles.grid}>
              <Card style={styles.metricCard} themeMode="super">
                <View style={styles.metricHeader}>
                  <Text style={styles.metricIcon}>💰</Text>
                  <Text style={styles.metricLabel}>Revenue Today</Text>
                </View>
                <Text style={styles.metricValue}>
                  Rs. {summary?.revenue_today.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                </Text>
                <Text style={styles.metricSub}>
                  {summary?.orders_today || 0} Orders Today
                </Text>
              </Card>

              <Card style={styles.metricCard} themeMode="super">
                <View style={styles.metricHeader}>
                  <Text style={styles.metricIcon}>📈</Text>
                  <Text style={styles.metricLabel}>30-Day Revenue</Text>
                </View>
                <Text style={styles.metricValue}>
                  Rs. {summary?.revenue_30d.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '0'}
                </Text>
                <Text style={styles.metricSub}>
                  {summary?.orders_30d || 0} Orders (30 Days)
                </Text>
              </Card>

              <Card style={styles.metricCard} themeMode="super">
                <View style={styles.metricHeader}>
                  <Text style={styles.metricIcon}>👥</Text>
                  <Text style={styles.metricLabel}>Total Customers</Text>
                </View>
                <Text style={styles.metricValue}>{summary?.total_customers || 0}</Text>
                <Text style={styles.metricSub}>
                  + {summary?.total_guests || 0} Guest Accounts
                </Text>
              </Card>

              <Card style={styles.metricCard} themeMode="super">
                <View style={styles.metricHeader}>
                  <Text style={styles.metricIcon}>🏪</Text>
                  <Text style={styles.metricLabel}>Active Brands</Text>
                </View>
                <Text style={styles.metricValue}>{summary?.total_restaurants || 0}</Text>
                <Text style={styles.metricSub}>
                  {summary?.total_loyalty_points.toLocaleString() || 0} Loyalty Points
                </Text>
              </Card>
            </View>

            {/* 7-Day Revenue & Order Trend Bar Chart */}
            <Card style={styles.sectionCard} themeMode="super">
              <View style={styles.sectionTitleRow}>
                <View>
                  <Text style={styles.sectionTitle}>📊 7-Day Revenue & Order Trend</Text>
                  <Text style={styles.sectionSubtitle}>
                    Daily aggregated sales across all active tenant brands
                  </Text>
                </View>
                <View style={styles.trendSummaryPill}>
                  <Text style={styles.trendSummaryText}>
                    Rs. {Math.round(totalTrendRevenue).toLocaleString()} ({totalTrendOrders} ord)
                  </Text>
                </View>
              </View>

              <View style={styles.chartContainer}>
                {dailyTrend.map((day, idx) => {
                  const hasRevenue = day.revenue > 0;
                  const barHeightPercent = hasRevenue
                    ? Math.max((day.revenue / maxRevenue) * 100, 12)
                    : 6;

                  return (
                    <View key={idx} style={styles.barColumn}>
                      <Text style={[styles.barValueText, hasRevenue && styles.barValueActive]}>
                        {hasRevenue
                          ? day.revenue >= 1000
                            ? `${(day.revenue / 1000).toFixed(1)}k`
                            : `Rs.${day.revenue}`
                          : '0'}
                      </Text>

                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { height: `${barHeightPercent}%` },
                            !hasRevenue && styles.barFillZero,
                          ]}
                        />
                      </View>

                      <Text style={styles.barLabel}>{day.date}</Text>
                      <Text style={styles.barOrderCount}>{day.orders} ord</Text>
                    </View>
                  );
                })}
              </View>

              {isSparseData ? (
                <View style={styles.sparseBanner}>
                  <Text style={styles.sparseText}>
                    ℹ️ Real-time 7-day rolling window is active. Data populates automatically as orders arrive.
                  </Text>
                </View>
              ) : null}
            </Card>

            {/* Order Status Breakdown */}
            <Card style={styles.sectionCard} themeMode="super">
              <Text style={styles.sectionTitle}>📦 Global Order Status Breakdown</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusPill, { borderColor: '#6366F1' }]}>
                  <Text style={styles.statusPillTitle}>Received</Text>
                  <Text style={[styles.statusPillValue, { color: '#6366F1' }]}>
                    {statusBreakdown['received'] || 0}
                  </Text>
                </View>

                <View style={[styles.statusPill, { borderColor: '#F97316' }]}>
                  <Text style={styles.statusPillTitle}>Preparing</Text>
                  <Text style={[styles.statusPillValue, { color: '#F97316' }]}>
                    {statusBreakdown['preparing'] || 0}
                  </Text>
                </View>

                <View style={[styles.statusPill, { borderColor: '#0284C7' }]}>
                  <Text style={styles.statusPillTitle}>On Delivery</Text>
                  <Text style={[styles.statusPillValue, { color: '#0284C7' }]}>
                    {statusBreakdown['out_for_delivery'] || 0}
                  </Text>
                </View>

                <View style={[styles.statusPill, { borderColor: '#10B981' }]}>
                  <Text style={styles.statusPillTitle}>Delivered</Text>
                  <Text style={[styles.statusPillValue, { color: '#10B981' }]}>
                    {statusBreakdown['delivered'] || 0}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Brand-Wise Performance Breakdown */}
            <Card style={styles.sectionCard} themeMode="super">
              <Text style={styles.sectionTitle}>🏆 Brand Performance Ranking (30 Days)</Text>
              <Text style={styles.sectionSubtitle}>Top revenue generating restaurant brands</Text>

              {restaurantBreakdown.map((rest, idx) => (
                <View key={rest.id || idx} style={styles.brandRow}>
                  <View style={styles.brandRankBadge}>
                    <Text style={styles.brandRankText}>#{idx + 1}</Text>
                  </View>
                  <View style={styles.brandInfo}>
                    <Text style={styles.brandName}>{rest.name}</Text>
                    <Text style={styles.brandSlug}>@{rest.slug}</Text>
                  </View>
                  <View style={styles.brandStats}>
                    <Text style={styles.brandRevenue}>
                      Rs. {rest.revenue_30d.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </Text>
                    <Text style={styles.brandOrders}>
                      {rest.orders_30d} orders (Avg: Rs.{Math.round(rest.avg_order)})
                    </Text>
                  </View>
                </View>
              ))}
            </Card>

            {/* Customer Reviews & Feedback Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Customer Feedback & Ratings</Text>
              <Text style={styles.sectionBadge}>
                {reviews.length} Verified Reviews
              </Text>
            </View>

            {loadingReviews ? (
              <ActivityIndicator color={COLORS.superAdmin.accent} style={{ marginVertical: 16 }} />
            ) : reviews.length === 0 ? (
              <Card style={styles.emptyCard} themeMode="super">
                <Text style={styles.emptyText}>No customer reviews received yet.</Text>
              </Card>
            ) : (
              reviews.slice(0, 6).map((rev) => (
                <Card key={rev.id} style={styles.reviewCard} themeMode="super">
                  <View style={styles.reviewHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewUser}>👤 {rev.user_name || 'Customer'}</Text>
                      <Text style={styles.reviewBrandTag}>🏪 {rev.restaurant_name}</Text>
                    </View>
                    <Text style={styles.reviewStars}>
                      {'⭐'.repeat(Math.min(Math.max(rev.rating, 1), 5))}
                    </Text>
                  </View>
                  <Text style={styles.reviewComment}>
                    "{rev.comment || 'Great food!'}"
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
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.superAdmin.bg,
  },
  content: {
    padding: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingTop: SPACING.xs,
  },
  headerTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.superAdmin.text,
  },
  headerSubtitle: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    marginTop: 2,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  liveBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.superAdmin.muted,
    fontSize: 14,
    marginTop: SPACING.md,
  },
  errorCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: COLORS.danger,
    borderWidth: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#F87171',
    fontSize: 13,
    flex: 1,
  },
  retryButton: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
  },
  retryText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  metricCard: {
    width: (width - SPACING.md * 3) / 2,
    marginBottom: SPACING.md,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  metricIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  metricLabel: {
    color: COLORS.superAdmin.muted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: COLORS.superAdmin.text,
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 4,
  },
  metricSub: {
    color: COLORS.superAdmin.accent,
    fontSize: 11,
  },
  sectionCard: {
    marginBottom: SPACING.md,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    ...TYPOGRAPHY.h3,
    color: COLORS.superAdmin.text,
  },
  sectionSubtitle: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    marginBottom: SPACING.sm,
    marginTop: 2,
  },
  trendSummaryPill: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  trendSummaryText: {
    color: '#60A5FA',
    fontSize: 11,
    fontWeight: '700',
  },
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
    paddingTop: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    paddingBottom: SPACING.xs,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barValueText: {
    color: COLORS.superAdmin.muted,
    fontSize: 9,
    marginBottom: 4,
  },
  barValueActive: {
    color: '#60A5FA',
    fontWeight: '700',
  },
  barTrack: {
    width: 14,
    height: 80,
    backgroundColor: COLORS.superAdmin.bg,
    borderRadius: RADIUS.xs,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: COLORS.superAdmin.accent,
    borderRadius: RADIUS.xs,
  },
  barFillZero: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  barLabel: {
    color: COLORS.superAdmin.text,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  barOrderCount: {
    color: COLORS.superAdmin.muted,
    fontSize: 9,
  },
  sparseBanner: {
    marginTop: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: RADIUS.sm,
  },
  sparseText: {
    color: COLORS.superAdmin.muted,
    fontSize: 11,
    fontStyle: 'italic',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  statusPill: {
    flex: 1,
    marginHorizontal: 3,
    backgroundColor: COLORS.superAdmin.bg,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    padding: SPACING.xs,
    alignItems: 'center',
  },
  statusPillTitle: {
    color: COLORS.superAdmin.muted,
    fontSize: 9,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  statusPillValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomColor: COLORS.superAdmin.border,
    borderBottomWidth: 1,
  },
  brandRankBadge: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.superAdmin.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  brandRankText: {
    color: COLORS.superAdmin.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  brandInfo: {
    flex: 1,
  },
  brandName: {
    color: COLORS.superAdmin.text,
    fontSize: 14,
    fontWeight: '700',
  },
  brandSlug: {
    color: COLORS.superAdmin.muted,
    fontSize: 11,
  },
  brandStats: {
    alignItems: 'flex-end',
  },
  brandRevenue: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '700',
  },
  brandOrders: {
    color: COLORS.superAdmin.muted,
    fontSize: 10,
  },
  reviewCard: {
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  reviewUser: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.superAdmin.text,
  },
  reviewBrandTag: {
    fontSize: 11,
    color: COLORS.superAdmin.accent,
    fontWeight: '600',
    marginTop: 2,
  },
  reviewStars: {
    fontSize: 12,
  },
  reviewComment: {
    fontSize: 12,
    color: COLORS.superAdmin.text,
    fontStyle: 'italic',
    marginBottom: 6,
  },
  reviewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.superAdmin.border,
    paddingTop: 4,
  },
  reviewMeta: {
    fontSize: 10,
    color: COLORS.superAdmin.muted,
  },
  reviewDate: {
    fontSize: 10,
    color: COLORS.superAdmin.muted,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sectionBadge: {
    fontSize: 12,
    color: COLORS.superAdmin.accent,
    fontWeight: '700',
  },
  emptyCard: {
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyText: {
    color: COLORS.superAdmin.muted,
    fontSize: 13,
    textAlign: 'center',
  },
});
