import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootState, AppDispatch } from '../store';
import { placeOrder, confirmCODPayment, createStripeIntent } from '../store/orderSlice';
import { clearCart } from '../store/cartSlice';
import { COLORS, SPACING, SHADOWS, FONTS } from '../theme';

export default function CheckoutScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();

  // Fetch state from store
  const { items, restaurantId, totalAmount } = useSelector((state: RootState) => state.cart);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.user);
  const { restaurants } = useSelector((state: RootState) => state.restaurant);

  // Form states
  const [address, setAddress] = useState(user?.addresses?.[0] || '');
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'stripe' | 'payfast'>('cod');
  
  // Guest details state
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate pricing
  const restaurant = useMemo(() => {
    return restaurants.find((r) => r.id === restaurantId);
  }, [restaurantId, restaurants]);

  const deliveryFee = useMemo(() => {
    if (restaurant && restaurant.delivery_fee) {
      return parseFloat(restaurant.delivery_fee);
    }
    return 150; // Fallback delivery fee
  }, [restaurant]);

  const subtotal = totalAmount;
  const discount = 0; // Loyalty or promo discounts can be calculated here
  const finalTotal = subtotal + deliveryFee - discount;

  // Potential loyalty points earned (1 point per 100 Rs spent)
  const loyaltyPointsEarned = Math.floor(finalTotal / 100);

  const handlePlaceOrder = async () => {
    // 1. Validations
    if (!address.trim()) {
      Alert.alert('Required Field', 'Please enter a delivery address.');
      return;
    }

    if (!isAuthenticated) {
      if (!guestName.trim()) {
        Alert.alert('Required Field', 'Please enter your name.');
        return;
      }
      if (!guestPhone.trim()) {
        Alert.alert('Required Field', 'Please enter your phone number.');
        return;
      }
    }

    if (!restaurantId || items.length === 0) {
      Alert.alert('Cart Error', 'Your cart is empty or invalid.');
      return;
    }

    setIsSubmitting(true);

    // 2. Map cart items to payload
    const orderItems = items.map((item) => ({
      menu_item: item.id,
      quantity: item.quantity,
      special_notes: item.selectedOptions
        ? (typeof item.selectedOptions === 'object'
            ? Object.entries(item.selectedOptions)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ')
            : String(item.selectedOptions))
        : '',
    }));

    // 3. Assemble order payload
    const orderData: any = {
      restaurant: restaurantId,
      items: orderItems,
      payment_method: paymentMethod,
      delivery_address: address,
      special_instructions: instructions || undefined,
    };

    if (!isAuthenticated) {
      orderData.guest_name = guestName;
      orderData.guest_phone = guestPhone;
    }

    try {
      // 4. Dispatch placeOrder
      const resultAction = await dispatch(placeOrder(orderData));
      
      if (placeOrder.fulfilled.match(resultAction)) {
        const createdOrder = resultAction.payload;
        const orderId = createdOrder.id;

        // 5. Handle payments integration based on choice
        if (paymentMethod === 'cod') {
          await dispatch(confirmCODPayment(orderId));
          Alert.alert('Success', 'Order placed successfully! Cash on Delivery confirmed.');
        } else if (paymentMethod === 'stripe') {
          // Simulation of payment intent
          await dispatch(createStripeIntent(orderId));
          Alert.alert('Stripe Payment', 'Simulating card payment via Stripe checkout flow.');
        } else if (paymentMethod === 'payfast') {
          Alert.alert('PayFast Payment', 'Redirecting to local payment gateway simulator...');
        }

        // 6. Clear cart & redirect to order confirmation success page
        dispatch(clearCart());
        setIsSubmitting(false);
        navigation.replace('OrderConfirmation', { orderId, loyaltyPointsEarned });
      } else {
        setIsSubmitting(false);
        const errMsg = resultAction.payload || 'Failed to place order';
        Alert.alert('Checkout Error', String(errMsg));
      }
    } catch (err: any) {
      setIsSubmitting(false);
      Alert.alert('Checkout Error', err.message || 'Something went wrong.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Restaurant Banner */}
          {restaurant && (
            <View style={styles.restaurantInfo}>
              <Ionicons name="restaurant-outline" size={20} color={COLORS.primary} />
              <Text style={styles.restaurantName}>Ordering from {restaurant.name}</Text>
            </View>
          )}

          {/* Delivery Details */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Delivery Details</Text>
            
            {isAuthenticated ? (
              <View style={styles.profileSummary}>
                <Ionicons name="person-circle-outline" size={24} color={COLORS.gray} />
                <View style={styles.profileTextContainer}>
                  <Text style={styles.profileName}>{user?.name || 'Authenticated User'}</Text>
                  <Text style={styles.profilePhone}>{user?.phone || 'No phone set'}</Text>
                </View>
              </View>
            ) : (
              <View style={styles.guestForm}>
                <Text style={styles.guestLabel}>Contact Information (Guest Checkout)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor={COLORS.gray}
                  value={guestName}
                  onChangeText={setGuestName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Phone Number (e.g. +92 300 1234567)"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="phone-pad"
                  value={guestPhone}
                  onChangeText={setGuestPhone}
                />
              </View>
            )}

            <Text style={styles.fieldLabel}>Delivery Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter your complete home or office address"
              placeholderTextColor={COLORS.gray}
              multiline
              numberOfLines={3}
              value={address}
              onChangeText={setAddress}
            />

            <Text style={styles.fieldLabel}>Delivery Instructions (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="e.g. Ring the bell, leave at the gate, call upon arrival"
              placeholderTextColor={COLORS.gray}
              multiline
              numberOfLines={2}
              value={instructions}
              onChangeText={setInstructions}
            />
          </View>

          {/* Payment Methods */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Payment Method</Text>

            {/* COD option */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'cod' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('cod')}
            >
              <Ionicons
                name="cash-outline"
                size={24}
                color={paymentMethod === 'cod' ? COLORS.primary : COLORS.gray}
              />
              <View style={styles.paymentOptionDetails}>
                <Text style={styles.paymentOptionTitle}>Cash on Delivery (COD)</Text>
                <Text style={styles.paymentOptionDesc}>Pay when order is delivered</Text>
              </View>
              {paymentMethod === 'cod' && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
              )}
            </TouchableOpacity>

            {/* Stripe option */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'stripe' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('stripe')}
            >
              <Ionicons
                name="card-outline"
                size={24}
                color={paymentMethod === 'stripe' ? COLORS.primary : COLORS.gray}
              />
              <View style={styles.paymentOptionDetails}>
                <Text style={styles.paymentOptionTitle}>Stripe Credit/Debit Card</Text>
                <Text style={styles.paymentOptionDesc}>Supports Visa, Mastercard, etc.</Text>
              </View>
              {paymentMethod === 'stripe' && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
              )}
            </TouchableOpacity>

            {/* PayFast option */}
            <TouchableOpacity
              style={[
                styles.paymentOption,
                paymentMethod === 'payfast' && styles.paymentOptionSelected,
              ]}
              onPress={() => setPaymentMethod('payfast')}
            >
              <Ionicons
                name="wallet-outline"
                size={24}
                color={paymentMethod === 'payfast' ? COLORS.primary : COLORS.gray}
              />
              <View style={styles.paymentOptionDetails}>
                <Text style={styles.paymentOptionTitle}>PayFast Wallet / Bank</Text>
                <Text style={styles.paymentOptionDesc}>Local Pakistani online payments</Text>
              </View>
              {paymentMethod === 'payfast' && (
                <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Pricing Summary */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>Rs. {subtotal.toFixed(2)}</Text>
            </View>

            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery Fee</Text>
              <Text style={styles.priceValue}>Rs. {deliveryFee.toFixed(2)}</Text>
            </View>

            {discount > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Discount</Text>
                <Text style={[styles.priceValue, styles.discountText]}>
                  -Rs. {discount.toFixed(2)}
                </Text>
              </View>
            )}

            <View style={styles.divider} />

            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>Rs. {finalTotal.toFixed(2)}</Text>
            </View>

            {/* Loyalty points notification */}
            <View style={styles.loyaltyAlert}>
              <Ionicons name="gift-outline" size={20} color={COLORS.secondary} />
              <Text style={styles.loyaltyAlertText}>
                You will earn <Text style={{ fontWeight: 'bold' }}>{loyaltyPointsEarned}</Text>{' '}
                loyalty points from this order!
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer sticky place order button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.placeOrderBtn, isSubmitting && styles.placeOrderBtnDisabled]}
            onPress={handlePlaceOrder}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.placeOrderText}>Place Order (Rs. {finalTotal.toFixed(2)})</Text>
                <Ionicons name="checkbox-outline" size={20} color={COLORS.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    ...FONTS.title,
    fontSize: 18,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  restaurantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  restaurantName: {
    ...FONTS.body,
    fontWeight: 'bold',
    marginLeft: SPACING.sm,
    color: COLORS.primary,
  },
  sectionCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  sectionTitle: {
    ...FONTS.subtitle,
    fontSize: 16,
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: SPACING.sm,
  },
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light,
    padding: SPACING.sm,
    borderRadius: 8,
    marginBottom: SPACING.md,
  },
  profileTextContainer: {
    marginLeft: SPACING.sm,
  },
  profileName: {
    ...FONTS.body,
    fontWeight: '600',
  },
  profilePhone: {
    ...FONTS.caption,
  },
  guestForm: {
    marginBottom: SPACING.md,
  },
  guestLabel: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.secondary,
    marginBottom: SPACING.sm,
  },
  fieldLabel: {
    ...FONTS.body,
    fontWeight: '500',
    marginBottom: SPACING.xs,
    color: COLORS.dark,
  },
  input: {
    backgroundColor: COLORS.light,
    borderRadius: 8,
    padding: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginBottom: SPACING.md,
    color: COLORS.dark,
  },
  textArea: {
    textAlignVertical: 'top',
    minHeight: 60,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 10,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  paymentOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(255, 87, 34, 0.05)',
  },
  paymentOptionDetails: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  paymentOptionTitle: {
    ...FONTS.body,
    fontWeight: 'bold',
  },
  paymentOptionDesc: {
    ...FONTS.caption,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  priceLabel: {
    ...FONTS.body,
    color: COLORS.gray,
  },
  priceValue: {
    ...FONTS.body,
    fontWeight: '600',
  },
  discountText: {
    color: COLORS.success,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: SPACING.sm,
  },
  totalLabel: {
    ...FONTS.subtitle,
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalValue: {
    ...FONTS.subtitle,
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: 'bold',
  },
  loyaltyAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 152, 0, 0.08)',
    borderRadius: 8,
    padding: SPACING.sm,
    marginTop: SPACING.md,
  },
  loyaltyAlertText: {
    ...FONTS.caption,
    color: COLORS.secondary,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  footer: {
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  placeOrderBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    ...SHADOWS.small,
  },
  placeOrderBtnDisabled: {
    backgroundColor: COLORS.gray,
    opacity: 0.7,
  },
  placeOrderText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: SPACING.sm,
  },
});
