import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootState, AppDispatch } from '../store';
import { fetchOrderDetails, clearCurrentOrder } from '../store/orderSlice';
import { COLORS, SPACING, SHADOWS, FONTS } from '../theme';

const STEPS = [
  { key: 'received', label: 'Received', icon: 'receipt-outline', desc: 'We have received your order' },
  { key: 'preparing', label: 'Preparing', icon: 'restaurant-outline', desc: 'Kitchen is preparing your fresh meal' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: 'bicycle-outline', desc: 'Rider is carrying your hot meal' },
  { key: 'delivered', label: 'Delivered', icon: 'home-outline', desc: 'Order delivered. Bon appétit!' },
];

export default function TrackingScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  // Retrieve orderId from navigation params or default to activeOrder from store
  const { activeOrder, currentOrder, loading, error } = useSelector((state: RootState) => state.order);
  const { restaurants } = useSelector((state: RootState) => state.restaurant);
  
  const orderId = route.params?.orderId || activeOrder?.id;

  // Fetch order details on mount or ID change
  useEffect(() => {
    if (orderId) {
      dispatch(fetchOrderDetails(orderId));
    }

    return () => {
      // Cleanup current order in store on unmount
      dispatch(clearCurrentOrder());
    };
  }, [dispatch, orderId]);

  // Set up polling (refreshes order status every 15 seconds while not delivered)
  useEffect(() => {
    if (!orderId || (currentOrder && currentOrder.status === 'delivered')) {
      return;
    }

    const interval = setInterval(() => {
      dispatch(fetchOrderDetails(orderId));
    }, 15000);

    return () => clearInterval(interval);
  }, [dispatch, orderId, currentOrder]);

  const onRefresh = React.useCallback(() => {
    if (orderId) {
      dispatch(fetchOrderDetails(orderId));
    }
  }, [dispatch, orderId]);

  // Look up restaurant name from restaurant list
  const restaurantName = useMemo(() => {
    if (!currentOrder) return 'Restaurant';
    const restId = currentOrder.restaurant?.id || currentOrder.restaurant;
    const restObj = restaurants.find((r) => r.id === restId);
    return restObj?.name || currentOrder.restaurant_name || 'Restaurant';
  }, [currentOrder, restaurants]);

  // Determine current active step
  const activeStep = useMemo(() => {
    if (!currentOrder) return 0;
    const status = currentOrder.status?.toLowerCase();
    if (status === 'received') return 0;
    if (status === 'preparing') return 1;
    if (status === 'out_for_delivery' || status === 'out for delivery') return 2;
    if (status === 'delivered') return 3;
    return 0;
  }, [currentOrder]);

  // Rider animation state and memo commented out to resolve UI-12 map placeholder change
  /*
  const [riderProgress, setRiderProgress] = useState(0);

  useEffect(() => {
    if (activeStep === 0 || activeStep === 1) {
      setRiderProgress(0); // Rider at restaurant
    } else if (activeStep === 3) {
      setRiderProgress(1); // Rider at customer home
    } else if (activeStep === 2) {
      // Loop rider movement from 10% to 90% to simulate transit
      let current = 0.1;
      setRiderProgress(current);
      const interval = setInterval(() => {
        current += 0.025;
        if (current > 0.9) current = 0.1;
        setRiderProgress(current);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [activeStep]);

  const riderPosition = useMemo(() => {
    if (riderProgress <= 0.5) {
      const segProgress = riderProgress / 0.5;
      const left = 15 + (80 - 15) * segProgress;
      const top = 25;
      return { left: `${left}%`, top: `${top}%` };
    } else {
      const segProgress = (riderProgress - 0.5) / 0.5;
      const left = 80;
      const top = 25 + (75 - 25) * segProgress;
      return { left: `${left}%`, top: `${top}%` };
    }
  }, [riderProgress]);
  */

  // Calculate dynamic ETA based on status
  const etaText = useMemo(() => {
    switch (currentOrder?.status?.toLowerCase()) {
      case 'received':
        return '35 - 45 mins';
      case 'preparing':
        return '25 - 35 mins';
      case 'out_for_delivery':
      case 'out for delivery':
        return '10 - 15 mins';
      case 'delivered':
        return 'Delivered';
      default:
        return '30 - 45 mins';
    }
  }, [currentOrder]);

  // Format order date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (loading && !currentOrder) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Fetching order details...</Text>
      </SafeAreaView>
    );
  }

  if (error || !orderId) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Ionicons name="alert-circle-outline" size={80} color={COLORS.danger} />
        <Text style={styles.errorTitle}>Order Tracking Unavailable</Text>
        <Text style={styles.errorSubtitle}>
          {error || "We couldn't find a valid active order to track."}
        </Text>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate('Orders')}
        >
          <Text style={styles.actionBtnText}>Go to Order History</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Order Tracking</Text>
          <Text style={styles.headerSubtitle}>Order #{orderId}</Text>
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[COLORS.primary]} />
        }
      >
        {/* Restaurant banner */}
        <View style={styles.restaurantBanner}>
          <View>
            <Text style={styles.bannerSub}>Order from</Text>
            <Text style={styles.bannerTitle}>{restaurantName}</Text>
          </View>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>
              {currentOrder?.payment_method?.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* ETA & Live Map Card */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.etaLabel}>ESTIMATED DELIVERY</Text>
              <Text style={styles.etaTime}>{etaText}</Text>
            </View>
            <Ionicons name="time-outline" size={32} color={COLORS.primary} />
          </View>

          {/* UI-12 Map Placeholder */}
          <View style={styles.mapPlaceholder}>
            <View style={styles.mapPlaceholderInner}>
              <Ionicons name="map-outline" size={48} color={COLORS.primary} />
              <Text style={styles.mapPlaceholderTitle}>Live Tracking Map</Text>
              <Text style={styles.mapPlaceholderSub}>Map integration coming soon</Text>
              <View style={styles.mapPulseDot} />
            </View>
          </View>
        </View>

        {/* Stepper Stepper Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Status</Text>
          
          <View style={styles.stepperContainer}>
            {STEPS.map((step, index) => {
              const isCompleted = index < activeStep;
              const isActive = index === activeStep;
              const isFuture = index > activeStep;

              return (
                <View key={step.key} style={styles.stepRow}>
                  {/* Left Column: Icon and connecting line */}
                  <View style={styles.stepVisualContainer}>
                    <View
                      style={[
                        styles.stepIconWrapper,
                        isCompleted && styles.stepIconCompleted,
                        isActive && styles.stepIconActive,
                        isFuture && styles.stepIconFuture,
                      ]}
                    >
                      <Ionicons
                        name={step.icon as any}
                        size={20}
                        color={
                          isCompleted || isActive ? COLORS.white : COLORS.gray
                        }
                      />
                    </View>
                    {index < STEPS.length - 1 && (
                      <View
                        style={[
                          styles.stepConnectorLine,
                          isCompleted && styles.lineCompleted,
                        ]}
                      />
                    )}
                  </View>

                  {/* Right Column: Status Text details */}
                  <View style={styles.stepInfoContainer}>
                    <Text
                      style={[
                        styles.stepLabel,
                        isActive && styles.stepLabelActive,
                        isFuture && styles.stepLabelFuture,
                      ]}
                    >
                      {step.label}
                    </Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                    {isActive && (
                      <View style={styles.liveIndicatorContainer}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>In Progress</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Delivery Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Delivery Information</Text>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={COLORS.gray} />
            <Text style={styles.infoValueText}>{currentOrder?.delivery_address}</Text>
          </View>
          {currentOrder?.special_instructions && (
            <View style={[styles.infoRow, { marginTop: SPACING.sm }]}>
              <Ionicons name="chatbox-ellipses-outline" size={20} color={COLORS.gray} />
              <Text style={styles.infoValueText}>
                Note: {currentOrder.special_instructions}
              </Text>
            </View>
          )}
          <View style={[styles.infoRow, { marginTop: SPACING.sm }]}>
            <Ionicons name="time-outline" size={20} color={COLORS.gray} />
            <Text style={styles.infoValueText}>
              Placed on: {formatDate(currentOrder?.created_at)}
            </Text>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          {currentOrder?.items?.map((item: any, idx: number) => (
            <View key={item.id || idx} style={styles.itemRow}>
              <Text style={styles.itemQuantity}>{item.quantity}x</Text>
              <View style={styles.itemNameContainer}>
                <Text style={styles.itemName}>{item.menu_item_name || 'Menu Item'}</Text>
                {item.special_notes ? (
                  <Text style={styles.itemNotes}>{item.special_notes}</Text>
                ) : null}
              </View>
              <Text style={styles.itemPrice}>
                Rs. {(item.total_price || item.unit_price * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.priceSummaryRow}>
            <Text style={styles.priceSummaryLabel}>Subtotal</Text>
            <Text style={styles.priceSummaryVal}>
              Rs. {parseFloat(currentOrder?.subtotal || 0).toFixed(2)}
            </Text>
          </View>
          <View style={styles.priceSummaryRow}>
            <Text style={styles.priceSummaryLabel}>Delivery Fee</Text>
            <Text style={styles.priceSummaryVal}>
              Rs. {parseFloat(currentOrder?.delivery_fee || 0).toFixed(2)}
            </Text>
          </View>
          {parseFloat(currentOrder?.discount || 0) > 0 && (
            <View style={styles.priceSummaryRow}>
              <Text style={styles.priceSummaryLabel}>Discount</Text>
              <Text style={[styles.priceSummaryVal, styles.discountText]}>
                -Rs. {parseFloat(currentOrder?.discount || 0).toFixed(2)}
              </Text>
            </View>
          )}
          <View style={[styles.priceSummaryRow, { marginTop: SPACING.sm }]}>
            <Text style={styles.totalSummaryLabel}>Total</Text>
            <Text style={styles.totalSummaryVal}>
              Rs. {parseFloat(currentOrder?.total || 0).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Live Testing Guide */}
        <View style={[styles.card, styles.testingGuideCard]}>
          <Text style={styles.guideTitle}>💡 Live Testing Guide</Text>
          <Text style={styles.guideText}>
            This order is connected to the live backend. To test the status update flow:
          </Text>
          <View style={styles.guideSteps}>
            <Text style={styles.guideStep}>
              1. Open the Admin Panel at <Text style={styles.guideCode}>https://restaurant-app-web.onrender.com/admin/</Text> and log in.
            </Text>
            <Text style={styles.guideStep}>
              2. Go to the <Text style={styles.guideBold}>Orders</Text> section and select Order <Text style={styles.guideBold}>#{orderId}</Text>.
            </Text>
            <Text style={styles.guideStep}>
              3. Update the status field from <Text style={styles.guideBold}>Received</Text> to <Text style={styles.guideBold}>Preparing</Text> or <Text style={styles.guideBold}>Out for Delivery</Text> and save.
            </Text>
            <Text style={styles.guideStep}>
              4. Watch the map in the app automatically update the rider's position and route in real-time!
            </Text>
          </View>
        </View>

        {/* Close Button / Go to History */}
        <TouchableOpacity
          style={styles.doneBtn}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.doneBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.light,
  },
  loadingText: {
    marginTop: SPACING.md,
    ...FONTS.body,
    color: COLORS.gray,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.light,
  },
  errorTitle: {
    ...FONTS.title,
    marginTop: SPACING.md,
    color: COLORS.dark,
  },
  errorSubtitle: {
    ...FONTS.body,
    color: COLORS.gray,
    textAlign: 'center',
    marginVertical: SPACING.md,
    lineHeight: 20,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 8,
    ...SHADOWS.small,
  },
  actionBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  header: {
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
    padding: SPACING.xs,
  },
  headerTitleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    ...FONTS.subtitle,
    fontSize: 16,
  },
  headerSubtitle: {
    ...FONTS.caption,
    fontWeight: 'bold',
  },
  refreshButton: {
    padding: SPACING.xs,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  restaurantBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.dark,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  bannerSub: {
    ...FONTS.caption,
    color: COLORS.lightGray,
  },
  bannerTitle: {
    ...FONTS.title,
    color: COLORS.white,
    fontSize: 18,
    marginTop: 2,
  },
  badgeContainer: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  cardTitle: {
    ...FONTS.subtitle,
    fontSize: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: SPACING.xs,
    marginBottom: SPACING.md,
  },
  stepperContainer: {
    paddingLeft: SPACING.sm,
  },
  stepRow: {
    flexDirection: 'row',
    minHeight: 70,
  },
  stepVisualContainer: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  stepIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  stepIconCompleted: {
    backgroundColor: COLORS.success,
  },
  stepIconActive: {
    backgroundColor: COLORS.primary,
  },
  stepIconFuture: {
    backgroundColor: COLORS.lightGray,
  },
  stepConnectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 2,
  },
  lineCompleted: {
    backgroundColor: COLORS.success,
  },
  stepInfoContainer: {
    flex: 1,
    paddingTop: 4,
  },
  stepLabel: {
    ...FONTS.body,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  stepLabelActive: {
    color: COLORS.primary,
  },
  stepLabelFuture: {
    color: COLORS.gray,
  },
  stepDesc: {
    ...FONTS.caption,
    marginTop: 2,
  },
  liveIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 6,
  },
  liveText: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoValueText: {
    ...FONTS.body,
    marginLeft: SPACING.sm,
    flex: 1,
    color: COLORS.dark,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  itemQuantity: {
    ...FONTS.body,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: SPACING.sm,
  },
  itemNameContainer: {
    flex: 1,
  },
  itemName: {
    ...FONTS.body,
    fontWeight: '500',
  },
  itemNotes: {
    ...FONTS.caption,
    color: COLORS.secondary,
    marginTop: 2,
  },
  itemPrice: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.dark,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: SPACING.md,
  },
  priceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  priceSummaryLabel: {
    ...FONTS.body,
    color: COLORS.gray,
  },
  priceSummaryVal: {
    ...FONTS.body,
    fontWeight: '500',
  },
  discountText: {
    color: COLORS.success,
  },
  totalSummaryLabel: {
    ...FONTS.subtitle,
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalSummaryVal: {
    ...FONTS.subtitle,
    fontSize: 18,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  doneBtn: {
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
    ...SHADOWS.small,
  },
  doneBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  mapCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  etaLabel: {
    ...FONTS.caption,
    color: COLORS.gray,
    letterSpacing: 0.8,
  },
  etaTime: {
    ...FONTS.title,
    color: COLORS.primary,
    fontSize: 20,
    marginTop: 2,
  },
  mapContainer: {
    height: 180,
    backgroundColor: '#EAEDF1',
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginTop: SPACING.xs,
  },
  mapGridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#DCDFE4',
  },
  mapGridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#DCDFE4',
  },
  roadOverlayH: {
    position: 'absolute',
    height: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BDC3C7',
    borderRadius: 6,
    opacity: 0.8,
  },
  roadOverlayV: {
    position: 'absolute',
    width: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BDC3C7',
    borderRadius: 6,
    opacity: 0.8,
  },
  mapMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    zIndex: 2,
    marginLeft: -16,
    marginTop: -16,
  },
  restaurantMarkerPos: {
    left: '15%',
    top: '25%',
  },
  homeMarkerPos: {
    left: '80%',
    top: '75%',
  },
  mapMarkerRider: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
    zIndex: 3,
    marginLeft: -16,
    marginTop: -16,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  mapMarkerIcon: {
    fontSize: 15,
  },
  mapMarkerIconRider: {
    fontSize: 16,
  },
  mapMarkerLabel: {
    position: 'absolute',
    top: 34,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    minWidth: 45,
  },
  mapMarkerLabelText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: 'bold',
  },
  riderMarkerLabel: {
    position: 'absolute',
    bottom: 34,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    minWidth: 40,
  },
  riderMarkerLabelText: {
    color: COLORS.white,
    fontSize: 8,
    fontWeight: 'bold',
  },
  testingGuideCard: {
    backgroundColor: 'rgba(255, 87, 34, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 34, 0.15)',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  guideTitle: {
    ...FONTS.subtitle,
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  guideText: {
    ...FONTS.body,
    fontSize: 13,
    color: COLORS.dark,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  guideSteps: {
    paddingLeft: 4,
  },
  guideStep: {
    ...FONTS.caption,
    fontSize: 11.5,
    color: COLORS.gray,
    lineHeight: 16,
    marginBottom: 6,
  },
  guideCode: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  guideBold: {
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  mapPlaceholder: {
    height: 240,
    backgroundColor: 'rgba(255,87,34,0.04)',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,87,34,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    margin: SPACING.md,
  },
  mapPlaceholderInner: {
    alignItems: 'center',
  },
  mapPlaceholderTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: 8,
  },
  mapPlaceholderSub: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
  },
  mapPulseDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    marginTop: 12,
  },
});
