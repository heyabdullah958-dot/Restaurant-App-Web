import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootState, AppDispatch } from '../store';
import { fetchOrderDetails, clearCurrentOrder } from '../store/orderSlice';
import { COLORS, SPACING, SHADOWS, FONTS } from '../theme';

const { width } = Dimensions.get('window');

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

  // Determine current active step
  const activeStep = useMemo(() => {
    if (!currentOrder) return 0;
    const status = currentOrder.status?.toLowerCase();
    if (status === 'received') return 0;
    if (status === 'preparing') return 1;
    if (status === 'out_for_delivery' || status === 'out for delivery') return 2;
    if (status === 'delivered') return 4; // All 4 steps (0, 1, 2, 3) completed
    return 0;
  }, [currentOrder]);

  // Animation Values
  const pulseAnim = React.useRef(new Animated.Value(1)).current;
  const driveAnim = React.useRef(new Animated.Value(0)).current;
  const bounceAnim = React.useRef(new Animated.Value(0)).current;
  const steamAnim = React.useRef(new Animated.Value(0)).current;

  // Animation Side Effects
  useEffect(() => {
    // 1. Radar Pulse (for Received / Pending)
    if (activeStep === 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    // 2. Chef Pot Steam & Bounce (for Preparing)
    if (activeStep === 1) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(steamAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(steamAnim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(bounceAnim, {
              toValue: -8,
              duration: 400,
              easing: Easing.quad,
              useNativeDriver: true,
            }),
            Animated.timing(bounceAnim, {
              toValue: 0,
              duration: 400,
              easing: Easing.quad,
              useNativeDriver: true,
            }),
          ])
        ])
      ).start();
    }

    // 3. Scooter Drive (for Out for Delivery)
    if (activeStep === 2) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(driveAnim, {
            toValue: 1,
            duration: 2500,
            easing: Easing.linear,
            useNativeDriver: true,
          })
        ])
      ).start();
    }

    // 4. Success Pop (for Delivered)
    if (activeStep === 4) {
      bounceAnim.setValue(0);
      Animated.spring(bounceAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      pulseAnim.setValue(1);
      driveAnim.setValue(0);
      bounceAnim.setValue(0);
      steamAnim.setValue(0);
    };
  }, [activeStep]);

  const renderStatusAnimation = () => {
    // 1. RECEIVED STAGE
    if (activeStep === 0) {
      return (
        <View style={styles.animCard}>
          <View style={styles.radarContainer}>
            <Animated.View style={[styles.radarRing, { transform: [{ scale: pulseAnim }] }]} />
            <Animated.View style={[styles.radarRingOuter, { transform: [{ scale: Animated.multiply(pulseAnim, 1.2) }] }]} />
            <View style={styles.animIconBg}>
              <Ionicons name="receipt-outline" size={40} color={COLORS.primary} />
            </View>
          </View>
          <Text style={styles.animTitle}>Order Accepted!</Text>
          <Text style={styles.animDesc}>The kitchen is reviewing your order details...</Text>
        </View>
      );
    }

    // 2. PREPARING STAGE
    if (activeStep === 1) {
      const steamY = steamAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -25],
      });
      const steamOpacity = steamAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.8, 0],
      });

      return (
        <View style={styles.animCard}>
          <View style={styles.preparingContainer}>
            {/* Animated Steam */}
            <Animated.View style={[styles.steamLine, { transform: [{ translateY: steamY }], opacity: steamOpacity, left: '42%' }]} />
            <Animated.View style={[styles.steamLine, { transform: [{ translateY: steamY }], opacity: steamOpacity, left: '50%' }]} />
            <Animated.View style={[styles.steamLine, { transform: [{ translateY: steamY }], opacity: steamOpacity, left: '58%' }]} />

            <Animated.View style={[styles.animIconBg, { transform: [{ translateY: bounceAnim }] }]}>
              <Ionicons name="restaurant-outline" size={40} color={COLORS.primary} />
            </Animated.View>
          </View>
          <Text style={styles.animTitle}>Kitchen is Cooking!</Text>
          <Text style={styles.animDesc}>Chef is preparing your fresh meal with top secret ingredients...</Text>
        </View>
      );
    }

    // 3. OUT FOR DELIVERY (RIDER ANIMATION)
    if (activeStep === 2) {
      const driveX = driveAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-60, width - 40],
      });

      return (
        <View style={[styles.animCard, { overflow: 'hidden' }]}>
          <View style={styles.roadContainer}>
            <Animated.View style={[styles.riderContainer, { transform: [{ translateX: driveX }] }]}>
              <Ionicons name="bicycle" size={32} color={COLORS.primary} />
              <View style={styles.exhaustPuff} />
            </Animated.View>
            <View style={styles.roadLine} />
            <View style={styles.roadDashesContainer}>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={styles.roadDash} />
              ))}
            </View>
          </View>
          <Text style={styles.animTitle}>Rider is on the Way!</Text>
          <Text style={styles.animDesc}>Rider is speeding through traffic to deliver your food piping hot...</Text>
        </View>
      );
    }

    // 4. DELIVERED STAGE (SUCCESS STAGE)
    if (activeStep === 4) {
      const successScale = bounceAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 1],
      });

      return (
        <View style={styles.animCard}>
          <Animated.View style={[styles.animIconBg, { backgroundColor: COLORS.success, transform: [{ scale: successScale }] }]}>
            <Ionicons name="checkmark" size={32} color={COLORS.white} />
          </Animated.View>
          <Text style={[styles.animTitle, { color: COLORS.success }]}>Order Delivered!</Text>
          <Text style={styles.animDesc}>Bon appétit! We hope you love your delicious meal.</Text>
        </View>
      );
    }

    return null;
  };

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

  // Set up polling (refreshes order status every 3 seconds while not delivered)
  useEffect(() => {
    if (!orderId || (currentOrder && currentOrder.status?.toLowerCase() === 'delivered')) {
      return;
    }

    const interval = setInterval(() => {
      dispatch(fetchOrderDetails(orderId));
    }, 3000);

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





  // Calculate dynamic ETA based on status
  const etaText = useMemo(() => {
    switch (currentOrder?.status?.toLowerCase()) {
      case 'pending':
        return 'Awaiting Confirmation...';
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
        <TouchableOpacity activeOpacity={0.75}
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
        <TouchableOpacity activeOpacity={0.75} onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Order Tracking</Text>
          <Text style={styles.headerSubtitle}>Order #{orderId}</Text>
        </View>
        <TouchableOpacity activeOpacity={0.75} onPress={onRefresh} style={styles.refreshButton}>
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

        {/* ETA Card */}
        <View style={styles.mapCard}>
          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.etaLabel}>
                {currentOrder?.status?.toLowerCase() === 'pending' ? 'STATUS' : 'ESTIMATED DELIVERY'}
              </Text>
              <Text style={styles.etaTime}>{etaText}</Text>
            </View>
            <Ionicons name="time-outline" size={32} color={COLORS.primary} />
          </View>
        </View>

        {/* Foodpanda Style Status Animation */}
        {renderStatusAnimation()}

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
          {(currentOrder?.branch_name || currentOrder?.branch?.name) && (
            <View style={[styles.infoRow, { marginTop: SPACING.sm }]}>
              <Ionicons name="storefront-outline" size={20} color={COLORS.primary} />
              <Text style={[styles.infoValueText, { fontWeight: 'bold', color: COLORS.primary }]}>
                Branch: {currentOrder.branch_name || currentOrder.branch.name}
              </Text>
            </View>
          )}
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
                Rs. {parseFloat(item.total_price || (parseFloat(item.unit_price || 0) * item.quantity) || 0).toFixed(2)}
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
              4. Watch the order status in the app automatically update in real-time!
            </Text>
          </View>
        </View>

        {/* Close Button / Go to History */}
        <TouchableOpacity activeOpacity={0.75}
          style={styles.doneBtn}
          onPress={() => navigation.navigate('Main')}
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  bannerSub: {
    ...FONTS.caption,
    color: COLORS.gray,
  },
  bannerTitle: {
    ...FONTS.title,
    color: COLORS.dark,
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
  animCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  animTitle: {
    ...FONTS.title,
    fontSize: 18,
    color: COLORS.dark,
    marginTop: SPACING.md,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  animDesc: {
    ...FONTS.caption,
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
    paddingHorizontal: SPACING.md,
  },
  radarContainer: {
    width: 90,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  radarRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 87, 34, 0.25)',
    backgroundColor: 'rgba(255, 87, 34, 0.04)',
  },
  radarRingOuter: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 34, 0.12)',
  },
  animIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 87, 34, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  preparingContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  steamLine: {
    position: 'absolute',
    top: 5,
    width: 2,
    height: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  roadContainer: {
    width: '100%',
    height: 60,
    justifyContent: 'flex-end',
    position: 'relative',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  riderContainer: {
    position: 'absolute',
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 3,
  },
  exhaustPuff: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.lightGray,
    marginLeft: 4,
    opacity: 0.6,
  },
  roadLine: {
    height: 3,
    backgroundColor: COLORS.lightGray,
    width: '100%',
    position: 'absolute',
    bottom: 6,
  },
  roadDashesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    paddingHorizontal: SPACING.sm,
  },
  roadDash: {
    width: 14,
    height: 2,
    backgroundColor: COLORS.lightGray,
    opacity: 0.4,
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
    height: 200,
    backgroundColor: 'rgba(255,87,34,0.04)',
    borderRadius: 16,
    margin: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255,87,34,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  mapPlaceholderInner: {
    alignItems: 'center',
  },
  mapIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,87,34,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  mapPlaceholderTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  mapPlaceholderSub: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  mapRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: 4,
  },
  mapRouteDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success,
  },
  mapRouteLine: {
    height: 2,
    width: 60,
    backgroundColor: COLORS.lightGray,
  },
});
