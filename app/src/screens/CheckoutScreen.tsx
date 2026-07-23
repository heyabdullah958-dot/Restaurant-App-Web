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
  Linking,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootState, AppDispatch } from '../store';
import { placeOrder, confirmCODPayment, createStripeIntent, createPayFastPayment } from '../store/orderSlice';
import { clearCart } from '../store/cartSlice';
import { guestLogin, updateUserProfile } from '../store/userSlice';
import { COLORS, SPACING, SHADOWS, FONTS } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlertModal from '../components/CustomAlertModal';
import api from '../services/api';

const DATE_OPTIONS = ['Today', 'Tomorrow', 'Day After'];
const TIME_OPTIONS = [
  'ASAP (Immediate)',
  '12:00 PM - 1:00 PM',
  '1:00 PM - 2:00 PM',
  '2:00 PM - 3:00 PM',
  '3:00 PM - 4:00 PM',
  '4:00 PM - 5:00 PM',
  '5:00 PM - 6:00 PM',
  '6:00 PM - 7:00 PM',
  '7:00 PM - 8:00 PM',
  '8:00 PM - 9:00 PM',
  '9:00 PM - 10:00 PM',
];

export default function CheckoutScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();

  // Fetch state from store
  const { items, restaurantId, totalAmount } = useSelector((state: RootState) => state.cart);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.user);
  const { restaurants } = useSelector((state: RootState) => state.restaurant);

  // Determine if we are in guest checkout mode (either unauthenticated or logged in as a guest user)
  const isGuestMode = !isAuthenticated || user?.is_guest;

  // Form states
  const [address, setAddress] = useState(user?.addresses?.[0] || '');
  const [instructions, setInstructions] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'stripe' | 'payfast'>('cod');
  
  // Guest / Customer details state
  const initialName = (user?.name && !user.name.startsWith('guest_')) 
    ? user.name 
    : (user?.username && !user.username.startsWith('guest_'))
    ? user.username
    : '';

  const [guestName, setGuestName] = useState(initialName);
  const [guestPhone, setGuestPhone] = useState(user?.phone || '');

  // Branch Selection State (null = Auto-Detect)
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  // Delivery scheduling states
  const [isScheduled, setIsScheduled] = useState(false);
  const [schedDate, setSchedDate] = useState('Today');
  const [schedTime, setSchedTime] = useState('ASAP (Immediate)');
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  // Temporary picker states
  const [tempDate, setTempDate] = useState('Today');
  const [tempTime, setTempTime] = useState('ASAP (Immediate)');

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    actions?: any[];
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string, actions?: any[]) => {
    setAlertConfig({ visible: true, title, message, actions });
  };

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const handleDetectLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showAlert('Permission Denied', 'Please grant location permission to detect your address automatically.');
        return;
      }
      
      setIsDetectingLocation(true);
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      
      setIsDetectingLocation(false);
      
      if (reverseGeocode.length > 0) {
        const addressObj = reverseGeocode[0];
        const formattedAddress = [
          addressObj.name,
          addressObj.street,
          addressObj.district,
          addressObj.city,
          addressObj.region,
          addressObj.country
        ].filter(Boolean).join(', ');
        
        setAddress(formattedAddress);
        showAlert('Location Detected', `Auto-filled address:\n${formattedAddress}`);
      } else {
        showAlert('Error', 'Could not resolve coordinates to a readable address.');
      }
    } catch (e) {
      setIsDetectingLocation(false);
      showAlert('Error', 'Failed to fetch location. Please ensure GPS is turned on.');
    }
  };

  // Calculate pricing
  const restaurant = useMemo(() => {
    return restaurants.find((r) => r.id === restaurantId);
  }, [restaurantId, restaurants]);

  // Load branches for selected restaurant
  React.useEffect(() => {
    const slugKey = restaurant?.slug || String(restaurantId || 'tandooristoppk');
    const fallbackMap: Record<string, any[]> = {
      tandooristoppk: [
        { id: 1, name: 'Johar Town', address: 'PIA Road, Hakim Chowk, Johar Town, Lahore', phone: '0327-4945947' },
        { id: 2, name: 'Lake City', address: 'Opposite Lake City Mall, Raiwind Road, Lahore', phone: '0324-4441735' },
        { id: 3, name: 'GT Road Baghbanpura', address: 'GT Road, Baghbanpura, Lahore', phone: '0326-6811177' },
      ],
      jushhpk: [
        { id: 4, name: 'DHA Phase 1', address: 'F9JW+R3G, Sector H Dha Phase 1, Lahore', phone: '03257217221' },
        { id: 5, name: 'Johar Town', address: 'Block R2, 256 / A, Near Shaukat Khanum Hospital Rd, Johar Town, Lahore', phone: '03269946142' },
        { id: 6, name: 'Lake City', address: 'C 4-6 plaza Number, business bay, M1, Block M 1 Lake City, Lahore', phone: '03244441735' },
      ],
      getafomo: [
        { id: 7, name: 'Gulberg III', address: '65, Block D1 Gulberg III, Lahore', phone: '03212784841' },
      ],
      '4': [
        { id: 1, name: 'Johar Town', address: 'PIA Road, Hakim Chowk, Johar Town, Lahore', phone: '0327-4945947' },
        { id: 2, name: 'Lake City', address: 'Opposite Lake City Mall, Raiwind Road, Lahore', phone: '0324-4441735' },
        { id: 3, name: 'GT Road Baghbanpura', address: 'GT Road, Baghbanpura, Lahore', phone: '0326-6811177' },
      ],
      '3': [
        { id: 4, name: 'DHA Phase 1', address: 'F9JW+R3G, Sector H Dha Phase 1, Lahore', phone: '03257217221' },
        { id: 5, name: 'Johar Town', address: 'Block R2, 256 / A, Near Shaukat Khanum Hospital Rd, Johar Town, Lahore', phone: '03269946142' },
        { id: 6, name: 'Lake City', address: 'C 4-6 plaza Number, business bay, M1, Block M 1 Lake City, Lahore', phone: '03244441735' },
      ],
      '7': [
        { id: 7, name: 'Gulberg III', address: '65, Block D1 Gulberg III, Lahore', phone: '03212784841' },
      ],
      '73': [
        { id: 1, name: 'Johar Town', address: 'PIA Road, Hakim Chowk, Johar Town, Lahore', phone: '0327-4945947' },
        { id: 2, name: 'Lake City', address: 'Opposite Lake City Mall, Raiwind Road, Lahore', phone: '0324-4441735' },
        { id: 3, name: 'GT Road Baghbanpura', address: 'GT Road, Baghbanpura, Lahore', phone: '0326-6811177' },
      ],
      '72': [
        { id: 4, name: 'DHA Phase 1', address: 'F9JW+R3G, Sector H Dha Phase 1, Lahore', phone: '03257217221' },
        { id: 5, name: 'Johar Town', address: 'Block R2, 256 / A, Near Shaukat Khanum Hospital Rd, Johar Town, Lahore', phone: '03269946142' },
        { id: 6, name: 'Lake City', address: 'C 4-6 plaza Number, business bay, M1, Block M 1 Lake City, Lahore', phone: '03244441735' },
      ],
      '76': [
        { id: 7, name: 'Gulberg III', address: '65, Block D1 Gulberg III, Lahore', phone: '03212784841' },
      ],
    };

    const initialBranches = (restaurant?.branches && Array.isArray(restaurant.branches) && restaurant.branches.length > 0)
      ? restaurant.branches
      : (fallbackMap[slugKey] || fallbackMap['tandooristoppk']);

    setBranches(initialBranches);
    if (Array.isArray(initialBranches) && initialBranches.length > 0) {
      setSelectedBranchId(initialBranches[0].id);
    }

    const targetSlug = restaurant?.slug;
    const targetUrl = targetSlug 
      ? `/branches/?restaurant_slug=${targetSlug}` 
      : (restaurantId ? `/branches/?restaurant_id=${restaurantId}` : '/branches/');

    api.get(targetUrl)
      .then((res: any) => {
        let list = res?.data?.data || res?.data || [];
        if (typeof list === 'object' && !Array.isArray(list) && 'results' in list) {
          list = list.results;
        }
        if (Array.isArray(list) && list.length > 0) {
          setBranches(list);
          setSelectedBranchId((prev) => {
            const exists = list.some((b: any) => b.id === prev);
            return exists ? prev : list[0].id;
          });
        }
      })
      .catch((e) => {
        console.warn('Failed to fetch live branches, using default branches:', e);
      });
  }, [restaurant, restaurantId]);

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
    const effectiveName = guestName.trim() || ((user?.name && !user.name.startsWith('guest_')) ? user.name : '');
    if (!effectiveName || effectiveName.startsWith('guest_')) {
      showAlert('Required Field', 'Please enter your full name for delivery.');
      return;
    }

    const effectivePhone = guestPhone.trim() || user?.phone || '';
    if (!effectivePhone || effectivePhone.length < 10) {
      showAlert('Required Field', 'Please enter a valid contact phone number (at least 10 digits).');
      return;
    }

    if (!address.trim()) {
      showAlert('Required Field', 'Please enter a delivery address.');
      return;
    }

    if (!selectedBranchId) {
      showAlert('Branch Required', 'Please select a branch to prepare and deliver your order.');
      return;
    }

    if (!items || items.length === 0) {
      showAlert('Cart Error', 'Your cart is empty or invalid.');
      return;
    }

    setIsSubmitting(true);

    // 2. Map cart items to payload
    const orderItems = items.map((item) => {
      const selected_options = [];
      let notes = '';

      if (item.selectedOptions && Array.isArray(item.selectedOptions)) {
        selected_options.push(...item.selectedOptions);
        notes = item.selectedOptions.map((opt: any) => `${opt.name || 'Option'} (+Rs. ${opt.price_modifier || 0})`).join(', ');
      }

      return {
        menu_item: item.id,
        quantity: item.quantity,
        special_notes: notes,
        selected_options: selected_options,
      };
    });

    // 3. Assemble order payload
    let finalInstructions = instructions.trim();
    if (isScheduled) {
      const schedulePrefix = `[SCHEDULED: ${schedDate} at ${schedTime}]`;
      finalInstructions = finalInstructions 
        ? `${schedulePrefix} - ${finalInstructions}`
        : schedulePrefix;
    }

    const orderData: any = {
      restaurant: restaurantId,
      branch: selectedBranchId || undefined,
      items: orderItems,
      payment_method: paymentMethod,
      delivery_address: address.trim(),
      special_instructions: finalInstructions || undefined,
      guest_name: effectiveName,
      guest_phone: effectivePhone,
    };

    try {
      // 4. Automatically perform guest login if anonymous to bind it to a persistent guest session
      if (!isAuthenticated || isGuestMode) {
        try {
          await dispatch(guestLogin()).unwrap();
        } catch (e) {
          console.warn('Guest login error in checkout, proceeding with guest payload:', e);
        }
      }

      // 5. Dispatch placeOrder
      const resultAction = await dispatch(placeOrder(orderData));
      
      if (placeOrder.fulfilled.match(resultAction)) {
        const createdOrder = resultAction.payload;
        const orderId = createdOrder.id;

        // Save delivery address locally for future use
        try {
          if (user?.id) {
            await AsyncStorage.setItem(`user_address_${user.id}`, address.trim());
          } else {
            await AsyncStorage.setItem('guest_address', address.trim());
          }
          dispatch(updateUserProfile({ name: effectiveName, phone: effectivePhone, addresses: [address.trim()] }));
        } catch (e) {
          console.error('Failed to save delivery address on checkout:', e);
        }

        const branchName = createdOrder.branch_name || createdOrder.branch?.name;

        // 5. Handle payments integration based on choice
        if (paymentMethod === 'cod') {
          await dispatch(confirmCODPayment(orderId));
          showAlert('Success', 'Order placed successfully! Cash on Delivery confirmed.', [
             { text: 'OK', onPress: () => { hideAlert(); navigation.replace('OrderConfirmation', { orderId, loyaltyPointsEarned, branchName }); } }
          ]);
        } else if (paymentMethod === 'stripe') {
          const stripeResult = await dispatch(createStripeIntent(orderId));
          if (createStripeIntent.fulfilled.match(stripeResult)) {
            const checkoutUrl = stripeResult.payload.checkout_url;
            if (checkoutUrl) {
              showAlert(
                'Redirecting to Stripe',
                'We are opening Stripe secure checkout to complete the payment.',
                [{ text: 'OK', onPress: () => { hideAlert(); Linking.openURL(checkoutUrl); navigation.replace('Orders'); } }]
              );
            } else {
              showAlert('Payment Error', 'Failed to retrieve Stripe checkout URL.');
            }
          } else {
            const errMsg = stripeResult.payload || 'Failed to initialize Stripe payment';
            showAlert('Payment Error', String(errMsg));
            setIsSubmitting(false);
            return;
          }
        } else if (paymentMethod === 'payfast') {
          const payFastResult = await dispatch(createPayFastPayment(orderId));
          if (createPayFastPayment.fulfilled.match(payFastResult)) {
            const redirectUrl = payFastResult.payload.redirect_url;
            if (redirectUrl) {
              showAlert(
                'Redirecting to PayFast',
                'Redirecting you to PayFast secure portal to complete your payment.',
                [{ text: 'OK', onPress: () => { hideAlert(); Linking.openURL(redirectUrl); navigation.replace('Orders'); } }]
              );
            } else {
              showAlert('Payment Error', 'Failed to retrieve PayFast checkout URL.');
            }
          } else {
            const errMsg = payFastResult.payload || 'Failed to initialize PayFast payment';
            showAlert('Payment Error', String(errMsg));
            setIsSubmitting(false);
            return;
          }
        }

        // 6. Clear cart & redirect to order confirmation success page
        dispatch(clearCart());
        setIsSubmitting(false);
      } else {
        setIsSubmitting(false);
        const errMsg = resultAction.payload || 'Failed to place order';
        showAlert('Checkout Error', String(errMsg));
      }
    } catch (err: any) {
      setIsSubmitting(false);
      showAlert('Checkout Error', err.message || 'Something went wrong.');
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
          <TouchableOpacity activeOpacity={0.75} onPress={() => navigation.goBack()} style={styles.backButton}>
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
            
            <Text style={styles.fieldLabel}>Full Name (Required)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name (e.g. Ali Khan)"
              placeholderTextColor={COLORS.gray}
              value={guestName}
              onChangeText={setGuestName}
            />

            <Text style={styles.fieldLabel}>Contact Phone (Required)</Text>
            <TextInput
              style={styles.input}
              placeholder="Phone Number (e.g. 03001234567)"
              placeholderTextColor={COLORS.gray}
              keyboardType="phone-pad"
              value={guestPhone}
              onChangeText={setGuestPhone}
            />

            <Text style={styles.fieldLabel}>Delivery Address</Text>
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={20} color={COLORS.primary} style={{ marginTop: 10 }} />
              <View style={{ flex: 1 }}>
                <TextInput
                  style={[styles.input, styles.textArea, { marginLeft: SPACING.sm }]}
                  placeholder="Street No., Area, City — e.g. House 5, Block B, Gulberg, Lahore"
                  placeholderTextColor={COLORS.gray}
                  multiline
                  numberOfLines={3}
                  value={address}
                  onChangeText={setAddress}
                />
                <Text style={styles.addressHintText}>
                  💡 Exact address likho — rider ko dhundne mein asaani hogi
                </Text>
                
                <TouchableOpacity activeOpacity={0.8}
                  style={[styles.detectLocationBtn, isDetectingLocation && { opacity: 0.7 }]}
                  onPress={handleDetectLocation}
                  disabled={isDetectingLocation}
                >
                  {isDetectingLocation ? (
                    <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 6 }} />
                  ) : (
                    <Ionicons name="locate-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                  )}
                  <Text style={styles.detectLocationBtnText}>
                    {isDetectingLocation ? 'Detecting Location...' : 'Auto-Detect Address'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>



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

          {/* Preferred Branch Selection */}
          <View style={styles.sectionCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <Text style={styles.sectionTitle}>Select Fulfill Branch</Text>
              <View style={styles.badgeAuto}>
                <Ionicons name="location" size={12} color={COLORS.primary} />
                <Text style={styles.badgeAutoText}>Select Branch</Text>
              </View>
            </View>
            <Text style={styles.branchSubText}>
              Choose the exact branch that will prepare and deliver your order:
            </Text>

            {/* Specific Branches */}
            {branches.map((b) => {
              const isSelected = selectedBranchId === b.id;
              return (
                <TouchableOpacity 
                  key={b.id}
                  activeOpacity={0.8}
                  style={[
                    styles.branchCardOption,
                    isSelected && styles.branchCardSelected
                  ]}
                  onPress={() => setSelectedBranchId(b.id)}
                >
                  <Ionicons 
                    name={isSelected ? "radio-button-on" : "radio-button-off"} 
                    size={20} 
                    color={isSelected ? COLORS.primary : COLORS.gray} 
                  />
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <Text style={styles.branchOptionTitle}>{b.name} Branch</Text>
                    {!!b.address && <Text style={styles.branchOptionDesc}>{b.address}</Text>}
                  </View>
                  {isSelected && (
                    <View style={styles.selectedCheckBadge}>
                      <Ionicons name="checkmark" size={12} color={COLORS.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Payment Methods */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Payment Method</Text>

            {/* COD option */}
            <TouchableOpacity activeOpacity={0.75}
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
            <TouchableOpacity activeOpacity={0.75}
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
            <TouchableOpacity activeOpacity={0.75}
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
          <TouchableOpacity activeOpacity={0.9}
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
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        actions={alertConfig.actions}
        onClose={hideAlert}
      />
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
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressHintText: {
    fontSize: 11,
    color: COLORS.gray,
    marginLeft: SPACING.sm,
    marginTop: 2,
    marginBottom: SPACING.md,
    fontStyle: 'italic',
  },
  detectLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 87, 34, 0.06)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 87, 34, 0.15)',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.sm,
  },
  detectLocationBtnText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  scheduleOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  scheduleOptionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
    gap: SPACING.xs,
  },
  scheduleOptionBtnActive: {
    backgroundColor: COLORS.primary,
  },
  scheduleOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  scheduleOptionTextActive: {
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: SPACING.sm,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  modalScrollContent: {
    paddingBottom: SPACING.lg,
  },
  modalSectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: SPACING.sm,
  },
  modalOptionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  modalOptionPill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  modalOptionPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modalOptionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.dark,
  },
  modalOptionPillTextActive: {
    color: COLORS.white,
  },
  modalOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  modalOptionGridItem: {
    width: '48%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.light,
    alignItems: 'center',
    marginBottom: SPACING.xs,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  modalOptionGridItemActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  modalOptionGridItemText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.dark,
  },
  modalOptionGridItemTextActive: {
    color: COLORS.white,
  },
  modalConfirmBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.small,
  },
  modalConfirmBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  badgeAuto: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0ED',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeAutoText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  branchSubText: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: SPACING.md,
  },
  branchCardOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
    marginBottom: SPACING.xs,
  },
  branchCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF9F8',
  },
  branchOptionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  branchOptionDesc: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 2,
  },
  recommendedTag: {
    fontSize: 10,
    fontWeight: 'bold',
    color: COLORS.primary,
    backgroundColor: '#FFE3DE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
    overflow: 'hidden',
  },
  selectedCheckBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SPACING.xs,
  },
});
