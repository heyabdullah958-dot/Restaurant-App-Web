import React, { useState, useMemo, useRef } from 'react';
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { fetchRestaurants } from '../store/restaurantSlice';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootState, AppDispatch } from '../store';
import { placeOrder, confirmCODPayment, createStripeIntent, createPayFastPayment } from '../store/orderSlice';
import { clearCart, applyPromo, removePromo, clearPromoNotice, setUseLoyaltyPoints } from '../store/cartSlice';
import { guestLogin, updateUserProfile, fetchUserProfile } from '../store/userSlice';
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
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();

  // Fetch state from store
  const cart = useSelector((state: RootState) => state.cart);
  const { items, restaurantId, totalAmount, fulfillmentMode, tableNumber } = cart;
  const { user, isAuthenticated, loading: userLoading } = useSelector((state: RootState) => state.user);
  const { restaurants } = useSelector((state: RootState) => state.restaurant);

  // Determine if we are in guest checkout mode (either unauthenticated or logged in as a guest user)
  const isGuestMode = !isAuthenticated || user?.is_guest;

  // Form states
  const [address, setAddress] = useState(user?.addresses?.[0] || '');
  const [tableNumberInput, setTableNumberInput] = useState(tableNumber || '');
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
  const [isLoadingBranches, setIsLoadingBranches] = useState<boolean>(true);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);

  const selectedBranch = useMemo(() => {
    return branches.find((b: any) => b.id === selectedBranchId) || null;
  }, [branches, selectedBranchId]);

  // Delivery scheduling states
  const [isScheduled, setIsScheduled] = useState(false);
  const [schedDate, setSchedDate] = useState('Today');
  const [schedTime, setSchedTime] = useState('ASAP (Immediate)');
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);

  // Temporary picker states
  const [tempDate, setTempDate] = useState('Today');
  const [tempTime, setTempTime] = useState('ASAP (Immediate)');

  // Loyalty Points & Promo Code State (Derived from Cart Redux Store)
  const useLoyaltyPoints = cart.useLoyaltyPoints;
  const appliedPromo = cart.appliedPromo;

  // Location Coordinates State
  const [customerCoords, setCustomerCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
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

  const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

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

      setCustomerCoords({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
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

  // Keep a stable ref to the latest restaurant object so the polling closure
  // can always read current branch data without being listed as a dependency.
  // Listing `restaurant` (an object) as a useFocusEffect dependency would cause
  // the callback to be recreated on every background poll (since Redux gives it a
  // new reference each time), triggering setBranches → re-render → loop.
  const restaurantRef = React.useRef(restaurant);
  React.useEffect(() => { restaurantRef.current = restaurant; }, [restaurant]);

  // Distance radius computation
  const distanceInfo = useMemo(() => {
    if (fulfillmentMode !== 'DELIVERY' || !customerCoords || !selectedBranchId) {
      return null;
    }
    const selectedBranch = branches.find((b: any) => b.id === selectedBranchId);
    if (!selectedBranch) return null;
    const bLat = selectedBranch.latitude ? parseFloat(selectedBranch.latitude) : null;
    const bLng = selectedBranch.longitude ? parseFloat(selectedBranch.longitude) : null;
    const maxRadius = selectedBranch.delivery_radius_km ? parseFloat(selectedBranch.delivery_radius_km) : 10.0;
    if (bLat === null || bLng === null) return null;
    const dist = calculateHaversineDistance(customerCoords.latitude, customerCoords.longitude, bLat, bLng);
    return {
      distanceKm: dist,
      maxRadiusKm: maxRadius,
      isOutOfRadius: dist > maxRadius,
      branchName: selectedBranch.name,
    };
  }, [fulfillmentMode, customerCoords, selectedBranchId, branches]);

  // Smart Checkout Branch Selection Guard
  const branchEligibilityMap = useMemo(() => {
    const map: Record<number, { isEligible: boolean; unavailableCount: number; unavailableNames: string[] }> = {};
    branches.forEach((branch) => {
      const unavailable: string[] = [];
      cart.items.forEach((item) => {
        if (item.branch_availability_map && item.branch_availability_map[String(branch.id)] === false) {
          unavailable.push(item.name || 'Unknown Item');
        }
      });
      map[branch.id] = {
        isEligible: unavailable.length === 0,
        unavailableCount: unavailable.length,
        unavailableNames: unavailable,
      };
    });
    return map;
  }, [branches, cart.items]);

  React.useEffect(() => {
    if (selectedBranchId && branchEligibilityMap[selectedBranchId] && !branchEligibilityMap[selectedBranchId].isEligible) {
      const firstEligible = branches.find((b) => branchEligibilityMap[b.id]?.isEligible);
      if (firstEligible) {
        setSelectedBranchId(firstEligible.id);
      }
    }
  }, [branchEligibilityMap, selectedBranchId, branches]);

  // Real-time branch inventory pre-flight validation
  const [unavailableItems, setUnavailableItems] = React.useState<string[]>([]);
  const [isCheckingStock, setIsCheckingStock] = React.useState(false);

  React.useEffect(() => {
    if (!restaurant?.slug || !selectedBranchId || !cart.items || cart.items.length === 0) {
      setUnavailableItems([]);
      return;
    }

    let isMounted = true;
    setIsCheckingStock(true);
    api.get(`/restaurants/${restaurant.slug}/?branch_id=${selectedBranchId}`)
      .then((res: any) => {
        if (!isMounted) return;
        const restData = res?.data?.data || res?.data || {};
        const categories = restData.categories || [];
        const allItems = categories.flatMap((c: any) => c.items || []);
        
        const outOfStock: string[] = [];
        for (const cartItem of cart.items) {
          const matched = allItems.find((i: any) => i.id === cartItem.id);
          if (matched && matched.is_available === false) {
            outOfStock.push(cartItem.name || matched.name);
          }
        }
        setUnavailableItems(outOfStock);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsCheckingStock(false);
      });

    return () => {
      isMounted = false;
    };
  }, [restaurant?.slug, selectedBranchId, cart.items]);

  // Hydrate user profile or saved checkout form info on mount / post-auth
  React.useEffect(() => {
    const routeParams = (navigation as any).getState?.()?.routes?.find((r: any) => r.name === 'Checkout')?.params || {};
    
    const restoreSavedForm = async () => {
      let savedObj: any = null;
      try {
        const storedJson = await AsyncStorage.getItem('@getfood_checkout_saved_form');
        if (storedJson) {
          savedObj = JSON.parse(storedJson);
          await AsyncStorage.removeItem('@getfood_checkout_saved_form');
        }
      } catch (e) {}

      const name = savedObj?.savedGuestName || routeParams?.savedGuestName;
      const phone = savedObj?.savedGuestPhone || routeParams?.savedGuestPhone;
      const addr = savedObj?.savedAddress || routeParams?.savedAddress;
      const inst = savedObj?.savedInstructions || routeParams?.savedInstructions;
      const branchId = savedObj?.savedBranchId || routeParams?.savedBranchId;
      const tableNum = savedObj?.savedTableNumber || routeParams?.savedTableNumber;
      const payMethod = savedObj?.savedPaymentMethod || routeParams?.savedPaymentMethod;
      const sched = savedObj?.savedIsScheduled || routeParams?.savedIsScheduled;
      const sDate = savedObj?.savedSchedDate || routeParams?.savedSchedDate;
      const sTime = savedObj?.savedSchedTime || routeParams?.savedSchedTime;
      const loyalty = savedObj?.savedUseLoyaltyPoints || routeParams?.savedUseLoyaltyPoints;
      const promo = savedObj?.savedPromoCode || routeParams?.savedPromoCode;

      if (user && !user.is_guest) {
        setGuestName(user.name || user.username || name || '');
        setGuestPhone(user.phone || phone || '');
        setAddress(user.addresses?.[0] || addr || '');
      } else {
        if (name) setGuestName(name);
        if (phone) setGuestPhone(phone);
        if (addr) setAddress(addr);
      }

      if (inst) setInstructions(inst);
      if (branchId) setSelectedBranchId(branchId);
      if (tableNum) setTableNumberInput(tableNum);
      if (payMethod) setPaymentMethod(payMethod);
      if (sched !== undefined && typeof sched === 'boolean') setIsScheduled(sched);
      if (sDate) setSchedDate(sDate);
      if (sTime) setSchedTime(sTime);
      if (loyalty !== undefined && typeof loyalty === 'boolean') dispatch(setUseLoyaltyPoints(loyalty));
    };

    restoreSavedForm();
  }, [user, navigation]);

  // Watch for reactive promo removal if cart subtotal drops below minimum order requirement
  React.useEffect(() => {
    if (cart.promoRemovalNotice) {
      showAlert('Promo Removed', cart.promoRemovalNotice);
      dispatch(clearPromoNotice());
    }
  }, [cart.promoRemovalNotice, dispatch]);

  // Load branches for selected restaurant on focus & poll every 10s
  useFocusEffect(
    React.useCallback(() => {
      dispatch(fetchRestaurants() as any);

      const currentRestaurant = restaurantRef.current;
      const initialBranches = (currentRestaurant?.branches && Array.isArray(currentRestaurant.branches))
        ? currentRestaurant.branches.filter((b: any) => 
            b.is_active !== false && 
            !b.is_closed && 
            !b.is_force_closed && 
            !b.name?.toLowerCase().includes('(closed)') && 
            !b.name?.toLowerCase().endsWith('closed')
          )
        : [];

      if (initialBranches.length > 0) {
        setBranches(initialBranches);
        setSelectedBranchId((prev) => prev && initialBranches.some((b: any) => b.id === prev) ? prev : initialBranches[0].id);
        setIsLoadingBranches(false);
      } else {
        setIsLoadingBranches(true);
      }

      const fetchLiveBranches = () => {
        const targetSlug = restaurantRef.current?.slug;
        const targetRestId = restaurantRef.current?.id || restaurantId;

        // Strictly enforce restaurant scoping: do NOT make un-scoped API calls
        if (!targetSlug && !targetRestId) {
          setIsLoadingBranches(false);
          return;
        }

        const targetUrl = targetSlug 
          ? `/branches/?restaurant_slug=${targetSlug}` 
          : `/branches/?restaurant_id=${targetRestId}`;

        api.get(targetUrl)
          .then((res: any) => {
            let list = res?.data?.data || res?.data || [];
            if (typeof list === 'object' && !Array.isArray(list) && 'results' in list) {
              list = list.results;
            }
            if (Array.isArray(list)) {
              // Filter out closed, inactive, and dummy branches completely
              const activeOnly = list.filter((b: any) => 
                b.is_active !== false && 
                b.is_closed !== true && 
                b.is_force_closed !== true && 
                !b.name?.toLowerCase().includes('(closed)') && 
                !b.name?.toLowerCase().endsWith('closed')
              );
              setBranches(activeOnly);
              setSelectedBranchId((prev) => {
                const activePrev = activeOnly.find((b: any) => b.id === prev);
                if (activePrev) return prev;
                return activeOnly.length > 0 ? activeOnly[0].id : null;
              });
            }
          })
          .catch((e) => {
            if (__DEV__) console.warn('Failed to fetch live branches:', e);
          })
          .finally(() => {
            setIsLoadingBranches(false);
          });
      };

      fetchLiveBranches();
      const interval = setInterval(fetchLiveBranches, 10000);

      return () => clearInterval(interval);
    // IMPORTANT: `restaurant` intentionally excluded from deps — it is accessed via
    // restaurantRef.current to avoid recreating the interval on every background poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dispatch, restaurantId])
  );

  const areAllBranchesClosed = useMemo(() => {
    if (isLoadingBranches) return false;
    return branches.length === 0;
  }, [branches, isLoadingBranches]);

  const deliveryFee = useMemo(() => {
    if (fulfillmentMode === 'DINE_IN' || fulfillmentMode === 'TAKEAWAY') {
      return 0;
    }
    if (restaurant && restaurant.delivery_fee) {
      return parseFloat(restaurant.delivery_fee);
    }
    return 150; // Fallback delivery fee
  }, [restaurant, fulfillmentMode]);

  const subtotal = totalAmount;

  // Loyalty points & promo coupon redemption calculations
  const availablePoints = (user && !user.is_guest) ? (user.loyalty_points || 0) : 0;
  const promoDiscount = appliedPromo ? appliedPromo.discount : 0;
  const remSubtotal = Math.max(0, subtotal - promoDiscount);
  const maxRedeemablePoints = Math.min(availablePoints, Math.floor(remSubtotal));
  const loyaltyDiscount = useLoyaltyPoints ? maxRedeemablePoints : 0;
  const totalDiscount = promoDiscount + loyaltyDiscount;
  const finalTotal = Math.max(0, subtotal + deliveryFee - totalDiscount);

  // Potential loyalty points earned (1 point per 100 Rs spent)
  const loyaltyPointsEarned = Math.floor(finalTotal / 100);

  const handlePlaceOrder = async () => {
    if (isSubmittingRef.current) return;
    // 1. Validation checks
    const effectivePhone = guestPhone ? guestPhone.trim() : (user?.phone || '');
    if (!effectivePhone) {
      showAlert('Phone Number Required', 'Please provide a contact phone number so our team can reach you.');
      return;
    }

    const effectiveName = guestName ? guestName.trim() : (user?.name || user?.username || 'Guest Customer');
    if (isGuestMode && !effectiveName) {
      showAlert('Name Required', 'Please provide your full name for order reference.');
      return;
    }

    if (fulfillmentMode === 'DELIVERY' && !address.trim()) {
      showAlert('Delivery Address Required', 'Please provide a valid delivery address.');
      return;
    }

    if (!selectedBranchId) {
      showAlert('Branch Required', 'Please select an open branch to prepare your order.');
      return;
    }

    const selectedBranch = branches.find((b: any) => b.id === selectedBranchId);
    if (!selectedBranch || selectedBranch.is_active === false) {
      showAlert('Branch Closed', 'The selected branch is currently closed and not accepting orders. Please select an active branch.');
      return;
    }

    // Client-side Haversine distance radius check (Delivery only)
    if (fulfillmentMode === 'DELIVERY' && customerCoords && selectedBranch) {
      const bLat = selectedBranch.latitude ? parseFloat(selectedBranch.latitude) : null;
      const bLng = selectedBranch.longitude ? parseFloat(selectedBranch.longitude) : null;
      const maxRadius = selectedBranch.delivery_radius_km ? parseFloat(selectedBranch.delivery_radius_km) : 10.0;
      if (bLat !== null && bLng !== null) {
        const dist = calculateHaversineDistance(customerCoords.latitude, customerCoords.longitude, bLat, bLng);
        if (dist > maxRadius) {
          showAlert(
            'Outside Delivery Radius',
            `Your location is ${dist.toFixed(1)} km away from ${selectedBranch.name} branch, which only delivers up to ${maxRadius.toFixed(1)} km. Please select a closer address or branch.`
          );
          return;
        }
      }
    }

    if (!items || items.length === 0) {
      showAlert('Cart Error', 'Your cart is empty or invalid.');
      return;
    }

    // Intercept unauthenticated / guest user order execution
    if (!isAuthenticated || !user || user.is_guest) {
      const returnParams = {
        savedGuestName: effectiveName,
        savedGuestPhone: effectivePhone,
        savedAddress: address.trim(),
        savedInstructions: instructions.trim(),
        savedBranchId: selectedBranchId,
        savedFulfillmentMode: fulfillmentMode,
        savedTableNumber: tableNumberInput,
        savedPaymentMethod: paymentMethod,
        savedIsScheduled: isScheduled,
        savedSchedDate: schedDate,
        savedSchedTime: schedTime,
        savedUseLoyaltyPoints: useLoyaltyPoints,
        savedPromoCode: appliedPromo?.code || null,
      };

      showAlert(
        'Sign In Required to Complete Order',
        'Account registration is required to place an order. Please sign in or register to complete your order — your delivery details and cart will be saved!',
        [
          {
            text: 'Sign In / Register',
            onPress: async () => {
              hideAlert();
              try {
                await AsyncStorage.setItem('@getfood_checkout_saved_form', JSON.stringify(returnParams));
              } catch (e) {}
              (navigation as any).navigate('Auth', {
                returnScreen: 'Checkout',
                returnParams,
              });
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: hideAlert,
          },
        ]
      );
      return;
    }

    if (unavailableItems.length > 0) {
      showAlert(
        'Items Out of Stock',
        `The following item(s) are currently sold out at ${selectedBranch?.name || 'this branch'}:\n\n• ${unavailableItems.join('\n• ')}\n\nPlease remove them from your cart or select a different branch to proceed.`
      );
      return;
    }

    setIsSubmitting(true);
    isSubmittingRef.current = true;

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

    let finalAddress = address.trim();
    if (fulfillmentMode === 'DINE_IN') {
      const tbl = tableNumberInput.trim() || 'N/A';
      finalAddress = finalAddress || `Dine-In (Table #${tbl}) - ${selectedBranch?.name || 'In-House'}`;
    } else if (fulfillmentMode === 'TAKEAWAY') {
      finalAddress = finalAddress || `Takeaway Pickup - ${selectedBranch?.name || 'Counter'}`;
    }

    const orderData: any = {
      restaurant: restaurantId,
      branch: selectedBranchId || undefined,
      items: orderItems,
      payment_method: paymentMethod,
      order_type: fulfillmentMode,
      table_number: fulfillmentMode === 'DINE_IN' ? (tableNumberInput.trim() || 'N/A') : undefined,
      delivery_address: finalAddress,
      delivery_lat: fulfillmentMode === 'DELIVERY' && customerCoords?.latitude != null ? Number(customerCoords.latitude.toFixed(6)) : undefined,
      delivery_lng: fulfillmentMode === 'DELIVERY' && customerCoords?.longitude != null ? Number(customerCoords.longitude.toFixed(6)) : undefined,
      special_instructions: finalInstructions || undefined,
      guest_name: effectiveName,
      guest_phone: effectivePhone,
      use_loyalty_points: useLoyaltyPoints,
      points_to_redeem: useLoyaltyPoints ? maxRedeemablePoints : 0,
      coupon_code: appliedPromo ? appliedPromo.code : undefined,
    };

    try {
      // 4. Dispatch placeOrder directly for authenticated user
      const resultAction = await dispatch(placeOrder(orderData));
      
      if (placeOrder.fulfilled.match(resultAction)) {
        const createdOrder = resultAction.payload;
        const orderId = createdOrder.id;

        const token = createdOrder?.tracking_token;
        if (token) {
          try {
            await AsyncStorage.setItem('guest_tracking_token', token);
            await AsyncStorage.setItem(`order_token_${orderId}`, token);
            if (createdOrder?.display_order_id) {
              await AsyncStorage.setItem(`order_token_${createdOrder.display_order_id}`, token);
            }
          } catch (e) {
            if (__DEV__) console.error('Failed to save guest tracking token:', e);
          }
        }

        try {
          await AsyncStorage.setItem('@getfood_active_guest_order', JSON.stringify({
            orderId: createdOrder.id,
            displayOrderId: createdOrder.display_order_id || (`#FS-${createdOrder.id}`),
            trackingToken: token || '',
            status: createdOrder.status || 'received',
            createdAt: new Date().toISOString()
          }));
        } catch (e) {
          if (__DEV__) console.error('Failed to save active guest order object:', e);
        }

        // Refresh user profile so loyalty points update live
        dispatch(fetchUserProfile());

        // Save delivery address & guest details locally for future checkouts
        try {
          if (effectiveName) await AsyncStorage.setItem('@foodsphere_guest_name', effectiveName);
          if (effectivePhone) await AsyncStorage.setItem('@foodsphere_guest_phone', effectivePhone);
          if (address.trim()) await AsyncStorage.setItem('@foodsphere_guest_address', address.trim());

          if (user?.id) {
            await AsyncStorage.setItem(`user_address_${user.id}`, address.trim());
          } else {
            await AsyncStorage.setItem('guest_address', address.trim());
          }
          dispatch(updateUserProfile({ name: effectiveName, phone: effectivePhone, addresses: [address.trim()] }));
        } catch (e) {
          if (__DEV__) console.error('Failed to save delivery address on checkout:', e);
        }

        const branchName = createdOrder.branch_name || createdOrder.branch?.name;

        // 5. Handle payments integration based on choice
        if (paymentMethod === 'cod') {
          const codResult = await dispatch(confirmCODPayment(orderId));
          if (confirmCODPayment.fulfilled.match(codResult)) {
            showAlert('Success', 'Order placed successfully! Cash on Delivery confirmed.', [
              { text: 'OK', onPress: () => { dispatch(clearCart()); hideAlert(); navigation.replace('OrderConfirmation', { orderId: createdOrder.display_order_id || orderId, loyaltyPointsEarned, branchName }); } }
            ]);
          } else {
            showAlert('COD Error', String(codResult.payload || 'Failed to confirm Cash on Delivery payment. Your order was placed — please contact support.'));
            setIsSubmitting(false);
            isSubmittingRef.current = false;
            return;
          }
        } else if (paymentMethod === 'stripe') {
          const stripeResult = await dispatch(createStripeIntent(orderId));
          if (createStripeIntent.fulfilled.match(stripeResult)) {
            const checkoutUrl = stripeResult.payload.checkout_url;
            if (checkoutUrl) {
              showAlert(
                'Redirecting to Stripe',
                'We are opening Stripe secure checkout to complete the payment.',
                [{ text: 'OK', onPress: () => { dispatch(clearCart()); hideAlert(); Linking.openURL(checkoutUrl); navigation.replace('Orders'); } }]
              );
            } else {
              showAlert('Payment Error', 'Failed to retrieve Stripe checkout URL.');
              setIsSubmitting(false);
              isSubmittingRef.current = false;
              return;
            }
          } else {
            const errMsg = stripeResult.payload || 'Failed to initialize Stripe payment';
            showAlert('Payment Error', String(errMsg));
            setIsSubmitting(false);
            isSubmittingRef.current = false;
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
                [{ text: 'OK', onPress: () => { dispatch(clearCart()); hideAlert(); Linking.openURL(redirectUrl); navigation.replace('Orders'); } }]
              );
            } else {
              showAlert('Payment Error', 'Failed to retrieve PayFast checkout URL.');
              setIsSubmitting(false);
              isSubmittingRef.current = false;
              return;
            }
          } else {
            const errMsg = payFastResult.payload || 'Failed to initialize PayFast payment';
            showAlert('Payment Error', String(errMsg));
            setIsSubmitting(false);
            isSubmittingRef.current = false;
            return;
          }
        }

        setIsSubmitting(false);
        isSubmittingRef.current = false;
      } else {
        setIsSubmitting(false);
        isSubmittingRef.current = false;
        const rawPayload = resultAction.payload;
        const formatCheckoutError = (payload: any): string => {
          if (!payload) return 'Failed to place order. Please try again.';
          if (typeof payload === 'string') return payload;
          if (payload.non_field_errors) {
            return Array.isArray(payload.non_field_errors) ? payload.non_field_errors.join(' ') : String(payload.non_field_errors);
          }
          if (payload.items) {
            return Array.isArray(payload.items) ? payload.items.join(' ') : String(payload.items);
          }
          if (payload.message) return String(payload.message);
          if (payload.detail) return String(payload.detail);
          if (typeof payload === 'object') {
            const values = Object.values(payload).flat();
            if (values.length > 0) {
              return values.map(v => String(v)).join(' ');
            }
          }
          return 'An unexpected error occurred during checkout.';
        };
        const errMsg = formatCheckoutError(rawPayload);
        showAlert('Checkout Error', errMsg);
      }
    } catch (err: any) {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
      showAlert('Checkout Error', err.message || 'Something went wrong.');
    }
  };

  if (userLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, color: COLORS.gray, fontSize: 14, fontWeight: '500' }}>
          Restoring user session...
        </Text>
      </SafeAreaView>
    );
  }

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
          {/* Guest Mode Banner */}
          {isGuestMode && (
            <View style={styles.guestBannerRow}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="sparkles" size={18} color={COLORS.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.guestBannerTitle}>Guest Checkout Mode</Text>
                  <Text style={styles.guestBannerSub}>Sign in now to earn loyalty rewards on this order!</Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.guestBannerBtn}
                onPress={() => navigation.navigate('Auth', { returnScreen: 'Checkout' })}
              >
                <Text style={styles.guestBannerBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

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

            {/* Specific Active Operational Branches */}
            {branches.map((b) => {
              const isSelected = selectedBranchId === b.id;
              const eligibility = branchEligibilityMap[b.id];
              const isEligible = !eligibility || eligibility.isEligible;
              return (
                <TouchableOpacity 
                  key={b.id}
                  activeOpacity={0.8}
                  style={[
                    styles.branchCardOption,
                    isSelected && styles.branchCardSelected,
                    !isEligible && { opacity: 0.55, borderColor: '#fcd34d', backgroundColor: '#fffbeb' }
                  ]}
                  onPress={() => {
                    if (!isEligible) {
                      showAlert('Branch Unavailable for Cart', `The following item(s) in your cart are currently out of stock at ${b.name} Branch:\n\n${eligibility.unavailableNames.map(n => '• ' + n).join('\n')}\n\nPlease select another branch or adjust your cart items.`);
                      return;
                    }
                    setSelectedBranchId(b.id);
                  }}
                >
                  <Ionicons 
                    name={isSelected ? "radio-button-on" : "radio-button-off"} 
                    size={20} 
                    color={isSelected ? COLORS.primary : (!isEligible ? '#f59e0b' : COLORS.gray)} 
                  />
                  <View style={{ flex: 1, marginLeft: SPACING.sm }}>
                    <Text style={styles.branchOptionTitle}>{b.name} Branch</Text>
                    {!!b.address && <Text style={styles.branchOptionDesc}>{b.address}</Text>}
                    {!isEligible && (
                      <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' }}>
                        <Text style={{ fontSize: 10, color: '#b45309', fontWeight: 'bold' }}>⚠️ {eligibility.unavailableCount} item{eligibility.unavailableCount > 1 ? 's' : ''} sold out here</Text>
                      </View>
                    )}
                  </View>
                  {isSelected && (
                    <View style={styles.selectedCheckBadge}>
                      <Ionicons name="checkmark" size={12} color={COLORS.white} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {areAllBranchesClosed && (
              <View style={{ marginTop: 10, padding: 12, backgroundColor: '#fef2f2', borderRadius: 10, borderWidth: 1, borderColor: '#fca5a5', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="alert-circle" size={20} color="#dc2626" />
                <Text style={{ flex: 1, fontSize: 12, fontWeight: 'bold', color: '#991b1b' }}>
                  No active operational branches are currently accepting orders for this restaurant.
                </Text>
              </View>
            )}

          </View>

          {/* Applied Promo Code Card (Applied in Basket) */}
          {appliedPromo && (
            <View style={[styles.sectionCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="pricetag" size={18} color="#166534" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#15803d' }}>
                      Promo Code '{appliedPromo.code}' Applied
                    </Text>
                    <Text style={{ fontSize: 12, color: '#166534' }}>
                      Discount Saved: Rs. {appliedPromo.discount.toFixed(2)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => dispatch(removePromo())}
                  style={{ backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: 'bold' }}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

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

            {appliedPromo && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: COLORS.success, fontWeight: '600' }]}>
                  Promo Discount ({appliedPromo.code})
                </Text>
                <Text style={[styles.priceValue, { color: COLORS.success, fontWeight: 'bold' }]}>
                  -Rs. {promoDiscount.toFixed(2)}
                </Text>
              </View>
            )}

            {useLoyaltyPoints && loyaltyDiscount > 0 && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: COLORS.success, fontWeight: '600' }]}>
                  Loyalty Discount ({loyaltyDiscount} pts)
                </Text>
                <Text style={[styles.priceValue, { color: COLORS.success, fontWeight: 'bold' }]}>
                  -Rs. {loyaltyDiscount.toFixed(2)}
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
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
          {distanceInfo?.isOutOfRadius && (
            <View style={{
              backgroundColor: '#fef2f2',
              borderColor: '#fca5a5',
              borderWidth: 1,
              borderRadius: 10,
              padding: 10,
              marginBottom: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}>
              <Ionicons name="warning-outline" size={20} color={COLORS.danger} />
              <Text style={{ fontSize: 12, color: '#991b1b', flex: 1, fontWeight: '600' }}>
                Outside Delivery Radius ({distanceInfo.distanceKm.toFixed(1)} km vs {distanceInfo.maxRadiusKm.toFixed(1)} km max limit for {distanceInfo.branchName}). Select takeaway or a closer address.
              </Text>
            </View>
          )}

          {unavailableItems.length > 0 && (
            <View style={{
              backgroundColor: '#fef2f2',
              borderColor: '#f87171',
              borderWidth: 1,
              borderRadius: 10,
              padding: 10,
              marginBottom: 8,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
            }}>
              <Ionicons name="alert-circle" size={20} color="#dc2626" />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#991b1b' }}>
                  Items Sold Out at {selectedBranch?.name || 'Branch'}
                </Text>
                <Text style={{ fontSize: 11, color: '#b91c1c', marginTop: 2 }}>
                  {unavailableItems.join(', ')} {unavailableItems.length === 1 ? 'is' : 'are'} out of stock. Remove from cart to proceed.
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity activeOpacity={0.9}
            style={[
              styles.placeOrderBtn,
              (isSubmitting || areAllBranchesClosed || distanceInfo?.isOutOfRadius || unavailableItems.length > 0) && styles.placeOrderBtnDisabled
            ]}
            onPress={handlePlaceOrder}
            disabled={isSubmitting || areAllBranchesClosed || Boolean(distanceInfo?.isOutOfRadius) || unavailableItems.length > 0}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.placeOrderText}>
                  {areAllBranchesClosed
                    ? 'All Branches Closed'
                    : unavailableItems.length > 0
                    ? 'Item Sold Out at Branch'
                    : distanceInfo?.isOutOfRadius
                    ? 'Outside Delivery Radius'
                    : `Place Order (Rs. ${finalTotal.toFixed(2)})`}
                </Text>
                <Ionicons name={areAllBranchesClosed || distanceInfo?.isOutOfRadius || unavailableItems.length > 0 ? "lock-closed-outline" : "checkbox-outline"} size={20} color={COLORS.white} />
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
  guestBannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#ffedd5',
    borderRadius: 12,
    padding: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  guestBannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#c2410c',
  },
  guestBannerSub: {
    fontSize: 11,
    color: '#9a3412',
  },
  guestBannerBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 6,
    borderRadius: 8,
  },
  guestBannerBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
});
