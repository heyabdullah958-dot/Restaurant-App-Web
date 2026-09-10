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
  Modal,
  Linking,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchAnalyticsThunk } from '../../store/analyticsSlice';
import { fetchReviews, CustomerReview, fetchRestaurantAnalytics, RestaurantAnalyticsData, BranchAnalyticsData } from '../../services/api';
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

  // Brand Drill-Down Modal State
  const [selectedBrandModal, setSelectedBrandModal] = React.useState<any | null>(null);
  const [brandAnalytics, setBrandAnalytics] = React.useState<RestaurantAnalyticsData | null>(null);
  const [loadingBrandAnalytics, setLoadingBrandAnalytics] = React.useState<boolean>(false);

  const handleOpenBrandModal = async (brand: any) => {
    setSelectedBrandModal(brand);
    setBrandAnalytics(null);
    setLoadingBrandAnalytics(true);
    try {
      const details = await fetchRestaurantAnalytics(brand.id);
      setBrandAnalytics(details);
    } catch (e) {
      console.log('Error fetching restaurant analytics:', e);
    } finally {
      setLoadingBrandAnalytics(false);
    }
  };

  // Status Insight Modal State
  const [selectedStatusModal, setSelectedStatusModal] = React.useState<{
    status: string;
    label: string;
    count: number;
    color: string;
    description: string;
    slaTip: string;
  } | null>(null);

  const STATUS_DETAILS: Record<string, { label: string; color: string; description: string; slaTip: string }> = {
    received: {
      label: 'Received Orders',
      color: '#6366F1',
      description: 'Incoming customer orders awaiting branch confirmation.',
      slaTip: 'Branch managers must review and accept received orders within 3 minutes per SLA.',
    },
    preparing: {
      label: 'Kitchen Preparing',
      color: '#F97316',
      description: 'Orders actively being cooked or assembled at branch kitchen stations.',
      slaTip: 'Standard kitchen preparation window is 15-20 minutes before rider handoff.',
    },
    out_for_delivery: {
      label: 'Out for Delivery',
      color: '#0284C7',
      description: 'Orders picked up by assigned riders and currently in transit to customer addresses.',
      slaTip: 'Target delivery transit window is under 25 minutes.',
    },
    delivered: {
      label: 'Delivered Orders',
      color: '#10B981',
      description: 'Completed orders delivered to customer with payment received/settled.',
      slaTip: 'Delivered orders trigger automated customer review prompts and loyalty credits.',
    },
  };

  const handleOpenStatusModal = (statusKey: string) => {
    const info = STATUS_DETAILS[statusKey] || {
      label: statusKey.toUpperCase(),
      color: '#3B82F6',
      description: `Orders currently categorized under ${statusKey}.`,
      slaTip: 'Track status lifecycle in accordance with standard platform SLAs.',
    };
    setSelectedStatusModal({
      status: statusKey,
      label: info.label,
      count: statusBreakdown[statusKey] || 0,
      color: info.color,
      description: info.description,
      slaTip: info.slaTip,
    });
  };

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
          <View style={{ flex: 1, marginRight: SPACING.sm }}>
            <Text style={styles.headerTitle}>HQ Command Center</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>Real-time Platform Aggregate Intelligence</Text>
          </View>
          <View style={[styles.liveBadge, { flexShrink: 0 }]}>
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
                <View style={{ flex: 1, marginRight: SPACING.xs }}>
                  <Text style={styles.sectionTitle} numberOfLines={1}>📊 7-Day Revenue & Order Trend</Text>
                  <Text style={styles.sectionSubtitle} numberOfLines={2}>
                    Daily aggregated sales across all active tenant brands
                  </Text>
                </View>
                <View style={[styles.trendSummaryPill, { flexShrink: 0 }]}>
                  <Text style={styles.trendSummaryText} numberOfLines={1}>
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
              <Text style={styles.statusSectionSubtitle}>Platform-wide operational pipeline overview</Text>
              <View style={styles.statusRow}>
                <TouchableOpacity
                  style={[styles.statusPill, { borderColor: '#6366F1' }]}
                  onPress={() => handleOpenStatusModal('received')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.statusPillTitle}>Received</Text>
                  <Text style={[styles.statusPillValue, { color: '#6366F1' }]}>
                    {statusBreakdown['received'] || 0}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusPill, { borderColor: '#F97316' }]}
                  onPress={() => handleOpenStatusModal('preparing')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.statusPillTitle}>Preparing</Text>
                  <Text style={[styles.statusPillValue, { color: '#F97316' }]}>
                    {statusBreakdown['preparing'] || 0}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusPill, { borderColor: '#0284C7' }]}
                  onPress={() => handleOpenStatusModal('out_for_delivery')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.statusPillTitle}>On Delivery</Text>
                  <Text style={[styles.statusPillValue, { color: '#0284C7' }]}>
                    {statusBreakdown['out_for_delivery'] || 0}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.statusPill, { borderColor: '#10B981' }]}
                  onPress={() => handleOpenStatusModal('delivered')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.statusPillTitle}>Delivered</Text>
                  <Text style={[styles.statusPillValue, { color: '#10B981' }]}>
                    {statusBreakdown['delivered'] || 0}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.tapHintText}>👆 Tap any status pill to inspect SLA guidelines & operational advice</Text>
            </Card>

            {/* Brand-Wise Performance Breakdown */}
            <Card style={styles.sectionCard} themeMode="super">
              <View style={styles.brandRankingHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>🏆 Brand Performance Ranking (30 Days)</Text>
                  <Text style={styles.sectionSubtitle}>Top revenue generating restaurant brands</Text>
                </View>
                <View style={styles.brandTapBadge}>
                  <Text style={styles.brandTapBadgeText}>Interactive</Text>
                </View>
              </View>

              {restaurantBreakdown.map((rest, idx) => (
                <TouchableOpacity
                  key={rest.id || idx}
                  style={styles.brandRow}
                  onPress={() => handleOpenBrandModal(rest)}
                  activeOpacity={0.7}
                >
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
                  <Text style={styles.brandChevron}>›</Text>
                </TouchableOpacity>
              ))}
              <Text style={styles.tapHintText}>👆 Tap any brand row to view branch breakdown & rider fleet</Text>
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

      {/* ─── Enterprise Brand & Branch Drill-Down Modal ─── */}
      <Modal
        visible={!!selectedBrandModal}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedBrandModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.modalTitle}>🏪 {selectedBrandModal?.name}</Text>
                  <View style={styles.modalLivePill}>
                    <Text style={styles.modalLiveText}>ACTIVE BRAND</Text>
                  </View>
                </View>
                <Text style={styles.modalSubtitle}>@{selectedBrandModal?.slug} • Multi-Branch Performance</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSelectedBrandModal(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent} showsVerticalScrollIndicator={false}>
              {/* Brand Summary 2x2 Grid */}
              <View style={styles.drillGrid}>
                <View style={styles.drillCard}>
                  <Text style={styles.drillLabel}>30-DAY REVENUE</Text>
                  <Text style={[styles.drillValue, { color: '#38BDF8' }]}>
                    Rs. {selectedBrandModal?.revenue_30d?.toLocaleString() || '0'}
                  </Text>
                  <Text style={styles.drillSub}>Delivered Sales</Text>
                </View>

                <View style={styles.drillCard}>
                  <Text style={styles.drillLabel}>30-DAY ORDERS</Text>
                  <Text style={[styles.drillValue, { color: '#FCD34D' }]}>
                    {selectedBrandModal?.orders_30d || 0}
                  </Text>
                  <Text style={styles.drillSub}>Total Completed</Text>
                </View>

                <View style={styles.drillCard}>
                  <Text style={styles.drillLabel}>AVG ORDER VALUE</Text>
                  <Text style={[styles.drillValue, { color: '#34D399' }]}>
                    Rs. {Math.round(selectedBrandModal?.avg_order || 0)}
                  </Text>
                  <Text style={styles.drillSub}>Ticket Size</Text>
                </View>

                <View style={styles.drillCard}>
                  <Text style={styles.drillLabel}>PLATFORM SHARE</Text>
                  <Text style={[styles.drillValue, { color: '#A78BFA' }]}>
                    {summary?.revenue_30d && summary.revenue_30d > 0
                      ? `${Math.round(((selectedBrandModal?.revenue_30d || 0) / summary.revenue_30d) * 100)}%`
                      : '0%'}
                  </Text>
                  <Text style={styles.drillSub}>30-Day Contribution</Text>
                </View>
              </View>

              {/* All-Time Performance Strip */}
              <View style={styles.allTimeStrip}>
                <Text style={styles.allTimeText}>
                  📈 All-Time Total: <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Rs. {selectedBrandModal?.revenue_all_time?.toLocaleString() || '0'}</Text> across <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{selectedBrandModal?.orders_all_time || 0} orders</Text>
                </Text>
              </View>

              {/* Operational Branches Section */}
              <View style={styles.branchSectionHeader}>
                <Text style={styles.branchSectionTitle}>🏢 Operational Branches Breakdown</Text>
                <Text style={styles.branchSectionCount}>
                  {brandAnalytics?.branches?.length || 0} Locations
                </Text>
              </View>

              {loadingBrandAnalytics ? (
                <View style={styles.branchLoadingBox}>
                  <ActivityIndicator color={COLORS.superAdmin.accent} size="small" />
                  <Text style={styles.branchLoadingText}>Loading branch metrics & rider status...</Text>
                </View>
              ) : !brandAnalytics?.branches || brandAnalytics.branches.length === 0 ? (
                <View style={styles.emptyBranchCard}>
                  <Text style={styles.emptyBranchText}>No branch locations registered under this brand.</Text>
                </View>
              ) : (
                brandAnalytics.branches.map((b) => (
                  <View key={b.id} style={styles.branchCard}>
                    <View style={styles.branchCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.branchNameText}>📍 {b.name}</Text>
                        <Text style={styles.branchAddressText} numberOfLines={1}>{b.address || 'Address not listed'}</Text>
                      </View>
                      <View style={[styles.branchActivePill, { backgroundColor: b.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}>
                        <Text style={[styles.branchActiveText, { color: b.is_active ? '#10B981' : '#EF4444' }]}>
                          {b.is_active ? '🟢 OPERATIONAL' : '🔴 CLOSED'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.branchStatsGrid}>
                      <View style={styles.branchStatItem}>
                        <Text style={styles.branchStatLabel}>30-DAY REVENUE</Text>
                        <Text style={styles.branchStatValue}>Rs. {b.revenue_30d.toLocaleString()}</Text>
                        <Text style={styles.branchStatShare}>{b.revenue_share_pct}% of brand sales</Text>
                      </View>

                      <View style={styles.branchStatItem}>
                        <Text style={styles.branchStatLabel}>DELIVERED ORDERS</Text>
                        <Text style={styles.branchStatValue}>{b.orders_30d} orders</Text>
                        <Text style={styles.branchStatShare}>30-Day Period</Text>
                      </View>
                    </View>

                    <View style={styles.branchFooterBar}>
                      <View style={styles.branchPersonnel}>
                        <Text style={styles.branchPersonnelText}>
                          👤 Manager: <Text style={{ color: '#E2E8F0', fontWeight: 'bold' }}>@{b.manager_username}</Text>
                        </Text>
                        <Text style={styles.branchPersonnelText}>
                          🛵 Fleet: <Text style={{ color: '#38BDF8', fontWeight: 'bold' }}>{b.active_riders_count} active riders</Text>
                        </Text>
                      </View>
                      {b.phone ? (
                        <TouchableOpacity
                          style={styles.branchCallBtn}
                          onPress={() => Linking.openURL(`tel:${b.phone}`)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.branchCallText}>📞 Call Branch</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalBottomCloseBtn}
              onPress={() => setSelectedBrandModal(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalBottomCloseText}>Done Viewing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Global Status SLA Insight Modal ─── */}
      <Modal
        visible={!!selectedStatusModal}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedStatusModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.statusModalCard}>
            <View style={styles.statusModalHeader}>
              <Text style={styles.statusModalEmoji}>📋</Text>
              <Text style={[styles.statusModalTitle, { color: selectedStatusModal?.color }]}>
                {selectedStatusModal?.label}
              </Text>
            </View>

            <View style={styles.statusCountBox}>
              <Text style={[styles.statusBigCount, { color: selectedStatusModal?.color }]}>
                {selectedStatusModal?.count}
              </Text>
              <Text style={styles.statusCountSub}>Orders currently in this pipeline stage</Text>
            </View>

            <View style={styles.statusDescBox}>
              <Text style={styles.statusDescText}>{selectedStatusModal?.description}</Text>
            </View>

            <View style={styles.slaGuidanceBox}>
              <Text style={styles.slaGuidanceTitle}>⏱️ Operational SLA Benchmark</Text>
              <Text style={styles.slaGuidanceText}>{selectedStatusModal?.slaTip}</Text>
            </View>

            <TouchableOpacity
              style={[styles.statusModalCloseBtn, { backgroundColor: selectedStatusModal?.color || COLORS.superAdmin.accent }]}
              onPress={() => setSelectedStatusModal(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.statusModalCloseText}>Close Insight</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingBottom: 130,
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
    alignItems: 'center',
    marginBottom: SPACING.xs,
    width: '100%',
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
    flexShrink: 0,
    maxWidth: 175,
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
  statusSectionSubtitle: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    marginBottom: SPACING.xs,
  },
  tapHintText: {
    color: '#64748B',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xs,
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
  brandRankingHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  brandTapBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
  },
  brandTapBadgeText: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomColor: COLORS.superAdmin.border,
    borderBottomWidth: 1,
  },
  brandChevron: {
    fontSize: 18,
    color: '#64748B',
    fontWeight: 'bold',
    marginLeft: SPACING.xs,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#1E293B',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  modalLivePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  modalLiveText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '800',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: SPACING.sm,
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalScrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  drillGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  drillCard: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    borderWidth: 1,
    borderColor: '#334155',
  },
  drillLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  drillValue: {
    fontSize: 17,
    fontWeight: '800',
    marginVertical: 3,
  },
  drillSub: {
    fontSize: 10,
    color: '#64748B',
  },
  allTimeStrip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  allTimeText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
  },
  branchSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingTop: SPACING.xs,
  },
  branchSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  branchSectionCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.round,
  },
  branchLoadingBox: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchLoadingText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: SPACING.sm,
  },
  emptyBranchCard: {
    padding: SPACING.lg,
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.md,
  },
  emptyBranchText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  branchCard: {
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#334155',
  },
  branchCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  branchNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  branchAddressText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  branchActivePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
    marginLeft: SPACING.xs,
  },
  branchActiveText: {
    fontSize: 9,
    fontWeight: '800',
  },
  branchStatsGrid: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.sm,
    padding: SPACING.xs + 2,
    marginVertical: SPACING.xs,
  },
  branchStatItem: {
    flex: 1,
    paddingHorizontal: 4,
  },
  branchStatLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748B',
  },
  branchStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F1F5F9',
    marginTop: 1,
  },
  branchStatShare: {
    fontSize: 9,
    color: '#38BDF8',
  },
  branchFooterBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  branchPersonnel: {
    flex: 1,
    gap: 2,
  },
  branchPersonnelText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  branchCallBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.xs,
    marginLeft: SPACING.xs,
  },
  branchCallText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalBottomCloseBtn: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#475569',
  },
  modalBottomCloseText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  statusModalCard: {
    width: '90%',
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statusModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statusModalEmoji: {
    fontSize: 22,
    marginRight: SPACING.xs,
  },
  statusModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusCountBox: {
    backgroundColor: '#0F172A',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statusBigCount: {
    fontSize: 36,
    fontWeight: '900',
  },
  statusCountSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  statusDescBox: {
    marginBottom: SPACING.md,
  },
  statusDescText: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 18,
  },
  slaGuidanceBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.08)',
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  slaGuidanceTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#93C5FD',
    marginBottom: 2,
  },
  slaGuidanceText: {
    fontSize: 11,
    color: '#BFDBFE',
    lineHeight: 16,
  },
  statusModalCloseBtn: {
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  statusModalCloseText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
