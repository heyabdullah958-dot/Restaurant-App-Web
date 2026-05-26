import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, SHADOWS, FONTS } from '../theme';
import { AppDispatch, RootState } from '../store';
import { updateQuantity, removeItemFromCart, clearCart } from '../store/cartSlice';
import { placeOrder } from '../store/orderSlice';
import { fetchRestaurants } from '../store/restaurantSlice';
import { getImageUrl } from '../services/fallbackData';

type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  Restaurant: { slug: string };
  Cart: undefined;
  OrderConfirmation: { orderId: number };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Cart'>;

export default function CartScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();

  const cart = useSelector((state: RootState) => state.cart);
  const { user } = useSelector((state: RootState) => state.user);
  const { loading: orderLoading } = useSelector((state: RootState) => state.order);
  const { restaurants } = useSelector((state: RootState) => state.restaurant);

  // Form states for delivery
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(
    user?.addresses && user.addresses.length > 0 ? user.addresses[0] : ''
  );
  const [paymentMethod, setPaymentMethod] = useState('cod'); // cod / stripe / payfast

  React.useEffect(() => {
    dispatch(fetchRestaurants());
  }, [dispatch]);

  const activeRestaurant = restaurants.find((r) => r.id === cart.restaurantId);

  const handleIncrement = (itemId: number, currentQty: number) => {
    dispatch(
      updateQuantity({
        id: itemId,
        selectedOptions: [],
        quantity: currentQty + 1,
      })
    );
  };

  const handleDecrement = (itemId: number, currentQty: number) => {
    if (currentQty <= 1) {
      dispatch(
        removeItemFromCart({
          id: itemId,
          selectedOptions: [],
        })
      );
    } else {
      dispatch(
        updateQuantity({
          id: itemId,
          selectedOptions: [],
          quantity: currentQty - 1,
        })
      );
    }
  };

  const handleRemove = (itemId: number) => {
    dispatch(
      removeItemFromCart({
        id: itemId,
        selectedOptions: [],
      })
    );
  };

  const handleCheckout = async () => {
    if (!address.trim()) {
      Alert.alert('Missing Address', 'Please provide a delivery address.');
      return;
    }
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Contact Details Required', 'Please enter your name and phone number for delivery.');
      return;
    }

    const orderData = {
      restaurant: cart.restaurantId!,
      guest_name: !user ? name : undefined,
      guest_phone: !user ? phone : undefined,
      items: cart.items.map((item: any) => ({
        menu_item: item.id,
        quantity: item.quantity,
        special_notes: '',
      })),
      payment_method: paymentMethod,
      delivery_address: address,
    };

    try {
      const resultAction = await dispatch(placeOrder(orderData));
      if (placeOrder.fulfilled.match(resultAction)) {
        const createdOrder = resultAction.payload;
        const orderId = createdOrder?.data?.id || createdOrder?.id;
        
        Alert.alert(
          'Order Placed!',
          `Your order has been received. Order ID: #${orderId || 'N/A'}.`,
          [
            {
              text: 'OK',
              onPress: () => {
                dispatch(clearCart());
                navigation.navigate('Home');
              },
            },
          ]
        );
      } else {
        const errorMsg = resultAction.payload as string;
        Alert.alert('Checkout Failed', errorMsg || 'Something went wrong while placing your order.');
      }
    } catch (err) {
      Alert.alert('Checkout Error', 'Unable to reach servers. Please check your network.');
    }
  };

  if (cart.items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Basket</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="basket-outline" size={80} color={COLORS.lightGray} />
          <Text style={styles.emptyTitle}>Your basket is empty</Text>
          <Text style={styles.emptySubtitle}>
            Add items from your favorite restaurants to place an order.
          </Text>
          <TouchableOpacity style={styles.browseButton} onPress={() => navigation.navigate('Home')}>
            <Text style={styles.browseButtonText}>Browse Restaurants</Text>
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Basket</Text>
        <TouchableOpacity onPress={() => dispatch(clearCart())}>
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
          {cart.items.map((item: any) => (
            <View key={item.id} style={styles.cartItemRow}>
              <View style={styles.itemMeta}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemUnitPrice}>Rs. {item.price} each</Text>
              </View>
              
              <View style={styles.qtyContainer}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => handleDecrement(item.id, item.quantity)}
                >
                  <Ionicons name="remove" size={14} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => handleIncrement(item.id, item.quantity)}
                >
                  <Ionicons name="add" size={14} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <Text style={styles.itemTotalPrice}>Rs. {item.price * item.quantity}</Text>
              
              <TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Delivery Details Form */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Delivery Information</Text>
          
          <Text style={styles.inputLabel}>Recipient Name</Text>
          <TextInput
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            style={styles.textInput}
            placeholderTextColor={COLORS.gray}
          />

          <Text style={styles.inputLabel}>Mobile Phone</Text>
          <TextInput
            placeholder="e.g. +92 300 1234567"
            value={phone}
            onChangeText={setPhone}
            style={styles.textInput}
            keyboardType="phone-pad"
            placeholderTextColor={COLORS.gray}
          />

          <Text style={styles.inputLabel}>Delivery Address</Text>
          <TextInput
            placeholder="Street Address, Block, Area, City"
            value={address}
            onChangeText={setAddress}
            style={[styles.textInput, { height: 60, textAlignVertical: 'top' }]}
            multiline
            numberOfLines={3}
            placeholderTextColor={COLORS.gray}
          />
        </View>

        {/* Payment Methods */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Payment Method</Text>
          
          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'cod' && styles.paymentOptionSelected]}
            onPress={() => setPaymentMethod('cod')}
          >
            <Ionicons
              name={paymentMethod === 'cod' ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={paymentMethod === 'cod' ? COLORS.primary : COLORS.gray}
            />
            <View style={styles.paymentTextCol}>
              <Text style={styles.paymentName}>Cash on Delivery (COD)</Text>
              <Text style={styles.paymentDesc}>Pay cash when order is delivered (Primary)</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentOption, paymentMethod === 'stripe' && styles.paymentOptionSelected, { marginTop: SPACING.sm }]}
            onPress={() => setPaymentMethod('stripe')}
          >
            <Ionicons
              name={paymentMethod === 'stripe' ? 'radio-button-on' : 'radio-button-off'}
              size={18}
              color={paymentMethod === 'stripe' ? COLORS.primary : COLORS.gray}
            />
            <View style={styles.paymentTextCol}>
              <Text style={styles.paymentName}>Pay with Credit Card (Stripe)</Text>
              <Text style={styles.paymentDesc}>Secure online checkout via Stripe</Text>
            </View>
          </TouchableOpacity>
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
              Rs. {activeRestaurant ? Number(activeRestaurant.delivery_fee) : 0}
            </Text>
          </View>
          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              Rs. {cart.totalAmount + (activeRestaurant ? Number(activeRestaurant.delivery_fee) : 0)}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.checkoutFooter}>
        <TouchableOpacity
          style={styles.checkoutButton}
          activeOpacity={0.9}
          onPress={handleCheckout}
          disabled={orderLoading}
        >
          {orderLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.checkoutBtnText}>Place Delivery Order</Text>
              <Text style={styles.checkoutBtnAmount}>
                Rs. {cart.totalAmount + (activeRestaurant ? Number(activeRestaurant.delivery_fee) : 0)}
              </Text>
            </>
          )}
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
});
