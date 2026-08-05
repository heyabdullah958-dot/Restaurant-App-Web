import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  PanResponder,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, SPACING, SHADOWS, FONTS } from '../theme';
import { AppDispatch, RootState } from '../store';
import { updateQuantity, removeItemFromCart, clearCart } from '../store/cartSlice';
import { placeOrder } from '../store/orderSlice';
import { fetchRestaurants } from '../store/restaurantSlice';
import { getImageUrl } from '../services/fallbackData';
import api from '../services/api';

type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  Restaurant: { slug: string };
  Cart: undefined;
  Checkout: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Cart'>;

const SwipeableRow = ({ children, onSwipeLeft }: { children: React.ReactNode; onSwipeLeft: () => void }) => {
  const pan = React.useRef(new Animated.ValueXY()).current;
  const panResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 8;
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -80) {
          Animated.timing(pan, {
            toValue: { x: -Dimensions.get('window').width, y: 0 },
            duration: 200,
            useNativeDriver: false,
          }).start(onSwipeLeft);
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={{ transform: [{ translateX: pan.x }] }}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
};

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();

  const cart = useSelector((state: RootState) => state.cart);
  const { restaurants } = useSelector((state: RootState) => state.restaurant);

  // Promo code state
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discount: number;
    discount_type: string;
  } | null>(null);
  const [promoError, setPromoError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shakePromoInput = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const res = await api.post('/coupons/validate/', {
        code: promoCode.trim().toUpperCase(),
        subtotal: cart.totalAmount,
        restaurant_id: cart.restaurantId,
      });
      setAppliedPromo({
        code: res.data.code,
        discount: parseFloat(res.data.discount),
        discount_type: res.data.discount_type,
      });
      setPromoCode('');
      setPromoError('');
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.code?.[0] ||
        'Invalid or expired promo code.';
      setPromoError(msg);
      shakePromoInput();
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError('');
  };

  React.useEffect(() => {
    dispatch(fetchRestaurants());
  }, [dispatch]);

  const activeRestaurant = restaurants.find((r) => r.id === cart.restaurantId);

  const handleIncrement = (item: any) => {
    dispatch(
      updateQuantity({
        id: item.id,
        selectedOptions: item.selectedOptions || [],
        quantity: item.quantity + 1,
      })
    );
  };

  const handleDecrement = (item: any) => {
    if (item.quantity <= 1) {
      dispatch(
        removeItemFromCart({
          id: item.id,
          selectedOptions: item.selectedOptions || [],
        })
      );
    } else {
      dispatch(
        updateQuantity({
          id: item.id,
          selectedOptions: item.selectedOptions || [],
          quantity: item.quantity - 1,
        })
      );
    }
  };

  const handleRemove = (item: any) => {
    dispatch(
      removeItemFromCart({
        id: item.id,
        selectedOptions: item.selectedOptions || [],
      })
    );
  };

  const promoDiscount = appliedPromo ? appliedPromo.discount : 0;
  const deliveryFee = activeRestaurant ? Number(activeRestaurant.delivery_fee) : 0;
  const grandTotal = Math.max(0, cart.totalAmount - promoDiscount + deliveryFee);

  const handleProceedToCheckout = () => {
    navigation.navigate('Checkout', {
      coupon_code: appliedPromo?.code || null,
      discount_amount: promoDiscount,
    });
  };

  if (cart.items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.75} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Basket</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconRing}>
            <Ionicons name="basket-outline" size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.emptyTitle}>Your Basket is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Explore 3 unique restaurant brands and add your favorite items to get started!
          </Text>
          <TouchableOpacity activeOpacity={0.75}
            style={styles.browseButton}
            onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          >
            <Ionicons name="restaurant-outline" size={16} color={COLORS.white} style={{ marginRight: 6 }} />
            <Text style={styles.browseButtonText}>Browse Restaurants</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.75}
            style={styles.browseSecondary}
            onPress={() => navigation.navigate('Main', { screen: 'Search' })}
          >
            <Text style={styles.browseSecondaryText}>🔍 Search for a specific dish</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity activeOpacity={0.75} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Basket</Text>
        <TouchableOpacity activeOpacity={0.75} onPress={() => dispatch(clearCart())}>
          <Text style={styles.clearAllText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Restaurant Tag */}
        {activeRestaurant && (
          <View style={styles.restaurantTag}>
            <Image source={getImageUrl(activeRestaurant.logo)} style={styles.restLogo} />
            <View>
              <Text style={styles.restName}>{activeRestaurant.name}</Text>
              <Text style={styles.restCuisine}>{activeRestaurant.cuisine_type}</Text>
            </View>
          </View>
        )}

        {/* Cart Items List */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Selected Items</Text>
          {cart.items.map((item: any) => {
            const itemKey = `${item.id}-${JSON.stringify(item.selectedOptions)}`;
            return (
              <SwipeableRow key={itemKey} onSwipeLeft={() => handleRemove(item)}>
                <View style={styles.cartItemRow}>
                  <View style={styles.itemMeta}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemUnitPrice}>Rs. {item.price} each</Text>
                  </View>
                  
                  <View style={styles.qtyContainer}>
                    <TouchableOpacity activeOpacity={0.75}
                      style={styles.qtyBtn}
                      onPress={() => handleDecrement(item)}
                    >
                      <Ionicons name="remove" size={14} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity activeOpacity={0.75}
                      style={styles.qtyBtn}
                      onPress={() => handleIncrement(item)}
                    >
                      <Ionicons name="add" size={14} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.itemTotalPrice}>Rs. {item.price * item.quantity}</Text>
                  
                  <TouchableOpacity activeOpacity={0.75} onPress={() => handleRemove(item)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              </SwipeableRow>
            );
          })}
        </View>

        {/* Promo Code Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Promo Code</Text>
          {appliedPromo ? (
            <View style={styles.promoAppliedRow}>
              <View style={styles.promoAppliedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                <Text style={styles.promoAppliedCode}>{appliedPromo.code}</Text>
                <Text style={styles.promoAppliedSaving}>— Rs. {appliedPromo.discount.toFixed(0)} saved!</Text>
              </View>
              <TouchableOpacity activeOpacity={0.75} onPress={handleRemovePromo} style={styles.promoRemoveBtn}>
                <Ionicons name="close" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ) : (
            <Animated.View style={[styles.promoInputRow, { transform: [{ translateX: shakeAnim }] }]}>
              <TextInput
                style={styles.promoInput}
                placeholder="Enter promo code"
                placeholderTextColor={COLORS.gray}
                value={promoCode}
                onChangeText={(t) => { setPromoCode(t.toUpperCase()); setPromoError(''); }}
                autoCapitalize="characters"
                returnKeyType="done"
                onSubmitEditing={handleApplyPromo}
              />
              <TouchableOpacity
                activeOpacity={0.85}
                style={[styles.promoApplyBtn, (!promoCode.trim() || promoLoading) && { opacity: 0.5 }]}
                onPress={handleApplyPromo}
                disabled={!promoCode.trim() || promoLoading}
              >
                {promoLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.promoApplyText}>Apply</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          )}
          {!!promoError && (
            <Text style={styles.promoErrorText}>{promoError}</Text>
          )}
        </View>

        {/* Bill Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Bill Summary</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Subtotal</Text>
            <Text style={styles.billValue}>Rs. {cart.totalAmount}</Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={styles.billValue}>
              {activeRestaurant && Number(activeRestaurant.delivery_fee) === 0
                ? '🎉 Free!'
                : `Rs. ${deliveryFee}`}
            </Text>
          </View>
          {promoDiscount > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: COLORS.success }]}>
                Promo ({appliedPromo?.code})
              </Text>
              <Text style={[styles.billValue, { color: COLORS.success, fontWeight: '700' }]}>
                — Rs. {promoDiscount.toFixed(0)}
              </Text>
            </View>
          )}
          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>Rs. {grandTotal.toFixed(0)}</Text>
          </View>
          {/* Loyalty Points Earn Preview */}
          <View style={styles.loyaltyHint}>
            <Ionicons name="gift-outline" size={14} color={COLORS.secondary} />
            <Text style={styles.loyaltyHintText}>
              You'll earn{' '}
              <Text style={{ fontWeight: 'bold' }}>
                {Math.floor(grandTotal / 100)}
              </Text>{' '}
              loyalty points on this order!
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Proceed to Checkout Button */}
      <View style={[styles.checkoutFooter, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
        <TouchableOpacity
          style={styles.checkoutButton}
          activeOpacity={0.9}
          onPress={handleProceedToCheckout}
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
          <Text style={styles.checkoutBtnAmount}>Rs. {grandTotal.toFixed(0)}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.light,
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
    ...SHADOWS.small,
  },
  headerTitle: {
    ...FONTS.subtitle,
    fontWeight: 'bold',
  },
  clearAllText: {
    color: COLORS.danger,
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 100,
  },
  emptyTitle: {
    ...FONTS.subtitle,
    fontWeight: 'bold',
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    ...FONTS.body,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    marginTop: SPACING.lg,
    ...SHADOWS.small,
  },
  browseButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  restaurantTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    padding: SPACING.sm,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  restLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SPACING.sm,
  },
  restName: {
    ...FONTS.body,
    fontWeight: 'bold',
  },
  restCuisine: {
    ...FONTS.caption,
    color: COLORS.gray,
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    ...SHADOWS.small,
  },
  sectionHeader: {
    ...FONTS.subtitle,
    fontWeight: 'bold',
    color: COLORS.dark,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cartItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.light,
  },
  itemMeta: {
    flex: 1.5,
  },
  itemName: {
    ...FONTS.body,
    fontWeight: '600',
  },
  itemUnitPrice: {
    fontSize: 10,
    color: COLORS.gray,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 4,
    height: 24,
  },
  qtyBtn: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginHorizontal: 8,
    fontSize: 12,
  },
  itemTotalPrice: {
    ...FONTS.body,
    fontWeight: 'bold',
    flex: 0.8,
    textAlign: 'right',
  },
  deleteBtn: {
    marginLeft: SPACING.sm,
    padding: 4,
  },
  inputLabel: {
    ...FONTS.caption,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: SPACING.sm,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    paddingHorizontal: SPACING.sm,
    height: 40,
    ...FONTS.body,
    color: COLORS.dark,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: SPACING.sm,
  },
  paymentOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 87, 34, 0.05)',
  },
  paymentTextCol: {
    marginLeft: SPACING.sm,
  },
  paymentName: {
    ...FONTS.body,
    fontWeight: '600',
  },
  paymentDesc: {
    fontSize: 10,
    color: COLORS.gray,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  billLabel: {
    ...FONTS.body,
    color: COLORS.gray,
  },
  billValue: {
    ...FONTS.body,
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    paddingTop: SPACING.sm,
    marginTop: SPACING.sm,
  },
  totalLabel: {
    ...FONTS.body,
    fontWeight: 'bold',
  },
  totalValue: {
    ...FONTS.subtitle,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  checkoutFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: 28, // Safe area padding
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    ...SHADOWS.large,
  },
  checkoutButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    height: 52,
    ...SHADOWS.medium,
  },
  checkoutBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  checkoutBtnAmount: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyIconRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,87,34,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: 'rgba(255,87,34,0.12)',
  },
  browseSecondary: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  browseSecondaryText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: '500',
  },
  loyaltyHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,152,0,0.08)',
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.sm,
  },
  loyaltyHintText: {
    fontSize: 11,
    color: COLORS.secondary,
    marginLeft: 6,
    flex: 1,
    fontWeight: '500',
  },
  // Promo Code styles
  promoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    color: COLORS.dark,
    backgroundColor: COLORS.neutral50,
  },
  promoApplyBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 11,
    borderRadius: 10,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoApplyText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },
  promoAppliedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,196,140,0.08)',
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,196,140,0.25)',
  },
  promoAppliedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  promoAppliedCode: {
    fontWeight: '700',
    color: COLORS.success,
    fontSize: 13,
    letterSpacing: 0.8,
  },
  promoAppliedSaving: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '500',
  },
  promoRemoveBtn: {
    padding: 4,
  },
  promoErrorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
});
