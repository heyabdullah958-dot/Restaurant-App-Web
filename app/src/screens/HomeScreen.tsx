import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { logoutUser, fetchUserProfile } from '../store/userSlice';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, SHADOWS } from '../theme';
import { fetchRestaurants } from '../store/restaurantSlice';
import { setFulfillmentMode } from '../store/cartSlice';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { StatusBar } from 'expo-status-bar';
import { getImageUrl, FALLBACK_RESTAURANTS } from '../services/fallbackData';
import { RestaurantCardSkeleton } from '../components/SkeletonLoader';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import LocationPromptModal from '../components/LocationPromptModal';
import NotificationModal from '../components/NotificationModal';
import ErrorState from '../components/ErrorState';
import api from '../services/api';
import {
  loadInAppNotifications,
  subscribeNotifications,
  checkOrderStatusUpdates,
  InAppNotification,
} from '../services/inAppNotificationService';


const { width } = Dimensions.get('window');

const categories = [
  { id: 'All', name: 'All', icon: '🍽️' },
  { id: 'FlashDeals', name: '⚡ Flash Deals', icon: '⚡' },
  { id: 'Tandoori', name: 'Tandoori', icon: '🍗' },
  { id: 'Burgers', name: 'Burgers', icon: '🍔' },
  { id: 'Café', name: 'Café', icon: '☕' },
];

// Reliable slug map — category chip → restaurant slug
// Works even when the API list endpoint omits cuisine_type
const CATEGORY_SLUG_MAP: Record<string, string> = {
  'Tandoori': 'tandooristoppk',
  'Burgers':  'jushhpk',
  'Café':     'getafomo',
};


/**
 * Determines whether a brand is currently open and accepting orders.
 * A brand is open if at least ONE of its branches is active AND current time is within operating hours.
 */
const isBrandOpen = (brand: any): boolean => {
  try {
    // 0. Super-Admin Master Override Check
    if (brand.is_force_closed === true) return false;

    // 1. Derived Branch Status Check: Open as long as at least ONE branch is active
    if (brand.branches && Array.isArray(brand.branches) && brand.branches.length > 0) {
      return brand.branches.some((b: any) => b.is_active !== false);
    }
    
    // Fallback if no branches array is present
    return brand.is_active !== false;
  } catch {
    return true; // Safe default
  }
};


// Shimmering card components are imported from SkeletonLoader for GPU accelerated performance.

// --- MEMOIZED SUB-COMPONENTS FOR 60 FPS PERFORMANCE ---

const BANNERS = [
  {
    icon: 'fast-food' as const,
    title: '3 Brands, One Cart!',
    subtitle: 'Mix cuisines in a single order.',
    bg: COLORS.primary,
  },
  {
    icon: 'gift' as const,
    title: 'Earn Loyalty Points!',
    subtitle: '1 point per Rs.100 — redeem anytime.',
    bg: COLORS.accent,
  },
  {
    icon: 'bicycle' as const,
    title: 'Fast Delivery!',
    subtitle: 'Hot & fresh at your doorstep.',
    bg: COLORS.secondary,
  },
];

const PROTOTYPE_STYLES: Record<string, { colors: readonly [string, string, ...string[]], emoji?: string }> = {
  'seenbanao': { colors: ['#3E1F00', '#FF5722'] as const, emoji: '🔥' },
  'jushhpk': { colors: ['#1A0A00', '#D2691E'] as const, emoji: '🍔' },
  'dineatblue': { colors: ['#001529', '#0055A4'] as const, emoji: '🐟' },
  'sandmelts': { colors: ['#FF6B00', '#FF3CAC'] as const, emoji: '🥪🧀' },
  'tandooristoppk': { colors: ['#FF9900', '#E65100'] as const, emoji: '🍗🔥' },
  'getafomo': { colors: ['#E0C3FC', '#8EC5FC'] as const, emoji: '☕🍰' },
  'default': { colors: ['#FF5722', '#E91E63'] as const, emoji: '🍽️' }
};

// Isolated Banner Carousel — dynamically consumes live active flash deals & promotional banners
const BannerCarousel = React.memo(({ onPressBanner }: { onPressBanner: () => void }) => {
  const [bannerIndex, setBannerIndex] = React.useState(0);
  const [flashDeals, setFlashDeals] = React.useState<any[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    api.get('/promotions/flash-deals/')
      .then((res: any) => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        if (isMounted && data.length > 0) {
          setFlashDeals(data.filter((d: any) => !d.is_dine_in_only));
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const activeBanners = React.useMemo(() => {
    if (flashDeals.length > 0) {
      return flashDeals.map((deal: any) => ({
        icon: 'flash-outline' as const,
        title: deal.title || 'Flash Deal Special',
        subtitle: deal.description || `${deal.discount_value}% OFF on all orders!`,
        bg: '#e11d48',
        tag: '⚡ FLASH SALE',
      }));
    }
    return BANNERS;
  }, [flashDeals]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % activeBanners.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const banner = activeBanners[bannerIndex] || activeBanners[0];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.promoBanner, { backgroundColor: banner.bg }, SHADOWS.medium]}
      onPress={onPressBanner}
    >
      <View style={styles.bannerContent}>
        <View style={{ flex: 1, paddingRight: SPACING.xs }}>
          <Text style={styles.bannerTitle}>{banner.title}</Text>
          <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
          <View style={styles.bannerCTARow}>
            <Text style={styles.bannerCTAText}>Order Now</Text>
            <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
          </View>
        </View>
        <View style={styles.bannerIconWrap}>
          <Ionicons name={banner.icon as any} size={72} color="rgba(255,255,255,0.25)" />
        </View>
      </View>
      {/* Dot Indicators */}
      <View style={styles.bannerDots}>
        {activeBanners.map((_, i) => (
          <View key={i} style={[styles.bannerDot, i === bannerIndex && styles.bannerDotActive]} />
        ))}
      </View>
    </TouchableOpacity>
  );
});

const DINE_IN_FALLBACK_BANNERS = [
  {
    icon: 'restaurant-outline' as const,
    title: 'Exclusive Dine-In Offers',
    subtitle: 'Flat 15% OFF when you eat in at DHA Phase 1 & Johar Town!',
    bg: '#7c3aed',
    tag: 'DINE-IN EXCLUSIVE',
  },
  {
    icon: 'wine-outline' as const,
    title: 'Table Service Perks',
    subtitle: 'Complimentary Welcome Drinks & Free Dessert over Rs.1500!',
    bg: '#4c1d95',
    tag: 'TABLE SERVICE SPECIAL',
  },
];

const DineInBannerCarousel = React.memo(({ onPressBanner }: { onPressBanner: () => void }) => {
  const [bannerIndex, setBannerIndex] = React.useState(0);
  const [flashDeals, setFlashDeals] = React.useState<any[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    // Fetch live active flash deals (universal & dine-in)
    api.get('/promotions/flash-deals/')
      .then((res: any) => {
        const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        if (isMounted && data.length > 0) {
          setFlashDeals(data);
        }
      })
      .catch((err: any) => {
        // Safe fallback
      });
    return () => { isMounted = false; };
  }, []);

  const activeBanners = React.useMemo(() => {
    if (flashDeals.length > 0) {
      return flashDeals.map((deal: any) => ({
        icon: 'restaurant-outline' as const,
        title: deal.title || deal.name || 'Exclusive Dine-In Deal',
        subtitle: deal.description || `${deal.discount_value}% OFF on Dine-In orders!`,
        bg: '#6d28d9',
        tag: deal.tag || 'DINE-IN EXCLUSIVE',
      }));
    }
    return DINE_IN_FALLBACK_BANNERS;
  }, [flashDeals]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % activeBanners.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [activeBanners.length]);

  const banner = activeBanners[bannerIndex] || activeBanners[0];

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.promoBanner, { backgroundColor: banner.bg }, SHADOWS.medium]}
      onPress={onPressBanner}
    >
      <View style={styles.bannerContent}>
        <View style={{ flex: 1, paddingRight: SPACING.xs }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.25)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#fef08a', letterSpacing: 0.5 }}>
                🍽️ {banner.tag || 'DINE-IN EXCLUSIVE'}
              </Text>
            </View>
          </View>
          <Text style={styles.bannerTitle}>{banner.title}</Text>
          <Text style={styles.bannerSubtitle}>{banner.subtitle}</Text>
          <View style={styles.bannerCTARow}>
            <Text style={styles.bannerCTAText}>Explore Dine-In Deals</Text>
            <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
          </View>
        </View>
        <View style={styles.bannerIconWrap}>
          <Ionicons name={banner.icon || 'restaurant-outline'} size={72} color="rgba(255,255,255,0.25)" />
        </View>
      </View>
      <View style={styles.bannerDots}>
        {activeBanners.map((_, i) => (
          <View key={i} style={[styles.bannerDot, i === bannerIndex && styles.bannerDotActive]} />
        ))}
      </View>
    </TouchableOpacity>
  );
});

// Unified Hero Banner Container — smooth transition between Delivery/Takeaway and Dine-In without container unmounting
const HeroBannerSection = React.memo(({ fulfillmentMode, onPressBanner }: { fulfillmentMode: string, onPressBanner: () => void }) => {
  if (fulfillmentMode === 'DINE_IN') {
    return <DineInBannerCarousel onPressBanner={onPressBanner} />;
  }
  return <BannerCarousel onPressBanner={onPressBanner} />;
});

// Memoized Category Chip Component
const CategoryChip = React.memo(({ item, isSelected, onSelect }: { item: typeof categories[0], isSelected: boolean, onSelect: (id: string) => void }) => (
  <TouchableOpacity
    style={[
      styles.categoryChip,
      isSelected && styles.activeCategoryChip,
      SHADOWS.small,
    ]}
    onPress={() => onSelect(item.id)}
    activeOpacity={0.75}
  >
    <View style={{flexDirection: 'row', alignItems: 'center'}}>
      <Text style={{fontSize: 16, marginRight: 6}}>{item.icon}</Text>
      <Text style={[
        styles.categoryText,
        isSelected && styles.activeCategoryText,
      ]}>
        {item.name}
      </Text>
    </View>
  </TouchableOpacity>
));

// Memoized Restaurant Card Component with Dine-In Badges
const RestaurantCard = React.memo(({ brand, fulfillmentMode, onPress }: { brand: any, fulfillmentMode: string, onPress: (slug: string) => void }) => {
  if (!brand || !brand.name || !brand.slug) return null;
  const styleData = PROTOTYPE_STYLES[brand.slug] || PROTOTYPE_STYLES['default'];
  const isOpen = isBrandOpen(brand);
  const isDineInAvailable = brand.is_dine_in_enabled !== false;

  return (
    <TouchableOpacity
      style={[
        styles.brandCard, 
        SHADOWS.medium,
        fulfillmentMode === 'DINE_IN' && { borderColor: '#c084fc', borderWidth: 1.5 }
      ]}
      activeOpacity={0.95}
      onPress={() => onPress(brand.slug)}
    >
      <LinearGradient 
        colors={styleData.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.brandBand, { alignItems: 'center', justifyContent: 'center' }]}
      >
        <Image 
          source={getImageUrl(brand.banner_image || brand.cover_image)} 
          style={[StyleSheet.absoluteFill, { opacity: (brand.banner_image || brand.cover_image) ? 0.8 : 0.2 }]} 
          resizeMode="cover"
        />
        {!(brand.banner_image || brand.cover_image) && (
          <Text style={{ fontSize: 40, position: 'absolute', zIndex: 2 }}>{styleData.emoji}</Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 10 }}>
          {!isOpen && (
            <View style={{ backgroundColor: 'rgba(225, 29, 72, 0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#FFFFFF' }}>CLOSED</Text>
            </View>
          )}
          {fulfillmentMode === 'DINE_IN' && isDineInAvailable && (
            <View style={{ backgroundColor: 'rgba(124, 58, 237, 0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>🍽️ DINE-IN</Text>
            </View>
          )}
          {fulfillmentMode === 'TAKEAWAY' && (
            <View style={{ backgroundColor: 'rgba(234, 88, 12, 0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>🛍️ TAKEAWAY</Text>
            </View>
          )}
          {fulfillmentMode === 'DELIVERY' && (
            <View style={{ backgroundColor: 'rgba(37, 99, 235, 0.9)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFFFFF' }}>🛵 DELIVERY</Text>
            </View>
          )}
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={14} color="#FFC107" />
            <Text style={styles.ratingText}>{Number(brand.rating || 4.5).toFixed(1)}</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.brandDetails}>
        <View style={styles.brandTitleRow}>
          <Text style={styles.brandName}>{brand.name}</Text>
          <View style={styles.deliveryBadge}>
            <Ionicons name="time-outline" size={12} color={COLORS.gray} />
            <Text style={styles.deliveryText}>
              {brand.delivery_time_min}-{brand.delivery_time_max} min
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, marginBottom: 4 }}>
          <Text style={styles.brandCuisine}>{brand.cuisine_type}</Text>
          {fulfillmentMode === 'DINE_IN' && isDineInAvailable && (
            <View style={{ backgroundColor: '#f3e8ff', borderWidth: 1, borderColor: '#ddd6fe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#7c3aed' }}>🍽️ Dine-In Available</Text>
            </View>
          )}
          {fulfillmentMode === 'TAKEAWAY' && (
            <View style={{ backgroundColor: '#ffedd5', borderWidth: 1, borderColor: '#fed7aa', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#c2410c' }}>🛍️ Self Pickup</Text>
            </View>
          )}
          {fulfillmentMode === 'DELIVERY' && (
            <View style={{ backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#bfdbfe', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#1d4ed8' }}>🛵 Delivery Available</Text>
            </View>
          )}
        </View>

        <Text style={styles.brandTagline} numberOfLines={2}>
          {brand.description || brand.address}
        </Text>
      </View>
    </TouchableOpacity>
  );
});


export default function HomeScreen({ navigation }: { navigation: any }) {
  const dispatch = useDispatch<AppDispatch>();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.user);
  const { restaurants, loading, error } = useSelector((state: RootState) => state.restaurant);
  const fulfillmentMode = useSelector((state: RootState) => state.cart.fulfillmentMode || 'DELIVERY');
  const insets = useSafeAreaInsets();

  const [selectedCategory, setSelectedCategory] = React.useState<string>('All');
  const [refreshing, setRefreshing] = React.useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = React.useState(false);
  const [currentAddress, setCurrentAddress] = React.useState<string | null>(null);
  const [unratedOrder, setUnratedOrder] = React.useState<any | null>(null);
  const [showNotifModal, setShowNotifModal] = React.useState(false);
  const [notifications, setNotifications] = React.useState<InAppNotification[]>([]);
  const [activeGuestOrder, setActiveGuestOrder] = React.useState<any>(null);
  const [isTabSwitching, setIsTabSwitching] = React.useState(false);

  const checkActiveGuestOrder = React.useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem('@getfood_active_guest_order');
      if (!raw) {
        setActiveGuestOrder(null);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.orderId) {
        setActiveGuestOrder(null);
        return;
      }

      const orderId = parsed.orderId;
      const trackingToken = parsed.trackingToken;
      let url = `/orders/${orderId}/track/`;
      if (trackingToken) url += `?token=${trackingToken}`;

      const res = await api.get(url);
      const liveOrder = res.data?.data || res.data;
      const liveStatus = (liveOrder?.status || 'received').toLowerCase();

      if (['delivered', 'completed', 'cancelled'].includes(liveStatus)) {
        await AsyncStorage.removeItem('@getfood_active_guest_order');
        setActiveGuestOrder(null);
      } else {
        const updated = {
          ...parsed,
          status: liveStatus,
          displayOrderId: liveOrder.display_order_id || parsed.displayOrderId
        };
        await AsyncStorage.setItem('@getfood_active_guest_order', JSON.stringify(updated));
        setActiveGuestOrder(updated);
      }
    } catch (e) {
      try {
        const raw = await AsyncStorage.getItem('@getfood_active_guest_order');
        if (raw) setActiveGuestOrder(raw ? JSON.parse(raw) : null);
      } catch {}
    }
  }, []);

  const handleSwitchFulfillmentMode = React.useCallback((mode: 'DELIVERY' | 'TAKEAWAY' | 'DINE_IN') => {
    if (mode === fulfillmentMode) return;
    setIsTabSwitching(true);
    dispatch(setFulfillmentMode(mode));
    setTimeout(() => {
      setIsTabSwitching(false);
    }, 200);
  }, [dispatch, fulfillmentMode]);

  React.useEffect(() => {
    loadInAppNotifications();
    const unsub = subscribeNotifications((list) => setNotifications(list));
    return unsub;
  }, []);

  const checkUnratedDeliveredOrders = React.useCallback(async () => {
    if (!isAuthenticated || !user || user.is_guest) return;
    try {
      const res = await api.get('/orders/');
      const results = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      const deliveredOrders = results.filter((o: any) => o.status?.toLowerCase() === 'delivered');

      // Batch check all delivered orders' review status at once
      const reviewKeys = deliveredOrders.map((o: any) => `reviewed_order_${o.id}`);
      const dismissKeys = deliveredOrders.map((o: any) => `dismissed_feedback_order_${o.id}`);
      const allKeys = [...reviewKeys, ...dismissKeys];
      const storageResults = await AsyncStorage.multiGet(allKeys);
      const statusMap: Record<string, string | null> = {};
      storageResults.forEach(([key, val]: [string, string | null]) => { statusMap[key] = val; });

      for (const order of deliveredOrders) {
        const reviewed = statusMap[`reviewed_order_${order.id}`];
        const dismissed = statusMap[`dismissed_feedback_order_${order.id}`];
        if (reviewed !== 'true' && dismissed !== 'true') {
          setUnratedOrder(order);
          return;
        }
      }
      setUnratedOrder(null);
    } catch (e) {
      try {
        const activeOrderId = await AsyncStorage.getItem('foodsphere_guest_active_order_id');
        if (activeOrderId) {
          const orderId = Number(activeOrderId);
          const reviewed = await AsyncStorage.getItem(`reviewed_order_${orderId}`);
          const dismissed = await AsyncStorage.getItem(`dismissed_feedback_order_${orderId}`);
          if (reviewed !== 'true' && dismissed !== 'true') {
            const guestRes = await api.get(`/orders/${orderId}/`);
            if (guestRes.data?.status?.toLowerCase() === 'delivered') {
              setUnratedOrder(guestRes.data);
              return;
            }
          }
        }
      } catch (guestErr) {}
      setUnratedOrder(null);
    }
  }, []);

  const filteredRestaurants = React.useMemo(() => {
    const activeBrands = ['tandooristoppk', 'jushhpk', 'getafomo'];
    const src = restaurants && restaurants.length > 0 ? restaurants : FALLBACK_RESTAURANTS;
    let available = src.filter((r: any) => activeBrands.includes(r.slug || r.name?.toLowerCase().replace(/\s+/g, '')));

    if (fulfillmentMode === 'DINE_IN') {
      available = available.filter((r: any) => r.is_dine_in_enabled !== false);
    }

    if (selectedCategory === 'All') return available;

    const targetSlug = CATEGORY_SLUG_MAP[selectedCategory];
    if (targetSlug) {
      return available.filter((r: any) => 
        r.slug === targetSlug || 
        r.name?.toLowerCase().replace(/\s+/g, '') === targetSlug
      );
    }

    return available.filter((r: any) =>
      r.cuisine_type?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      r.name?.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  }, [restaurants, selectedCategory, fulfillmentMode]);

  const fetchCurrentLocation = React.useCallback(async () => {
    try {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (reverseGeocode.length > 0) {
        const addressObj = reverseGeocode[0];
        const formattedAddress = [addressObj.name, addressObj.street, addressObj.district, addressObj.city].filter(Boolean).join(', ');
        setCurrentAddress(formattedAddress);
      }
    } catch (e) {
      if (__DEV__) console.log('Location fetch error', e);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      dispatch(fetchRestaurants() as any);
      if (user && !user.is_guest) {
        dispatch(fetchUserProfile() as any);
      }
      checkUnratedDeliveredOrders();
      checkOrderStatusUpdates();
      checkActiveGuestOrder();
      const interval = setInterval(() => {
        dispatch(fetchRestaurants() as any);
        if (user && !user.is_guest) {
          dispatch(fetchUserProfile() as any);
        }
        checkUnratedDeliveredOrders();
        checkOrderStatusUpdates();
        checkActiveGuestOrder();
      }, 30000);
      return () => clearInterval(interval);
    }, [dispatch, user, checkUnratedDeliveredOrders, checkActiveGuestOrder])
  );


  const handleAllowLocation = React.useCallback(async () => {
    setShowLocationPrompt(false);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      fetchCurrentLocation();
    }
  }, [fetchCurrentLocation]);

  const handleDenyLocation = React.useCallback(() => {
    setShowLocationPrompt(false);
  }, []);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchRestaurants());
    setRefreshing(false);
  }, [dispatch]);

  const handleSelectCategory = React.useCallback((id: string) => {
    if (id === 'FlashDeals') {
      navigation.navigate('FlashDeals');
      return;
    }
    setSelectedCategory(id);
  }, [navigation]);

  const handlePressBrand = React.useCallback((slug: string) => {
    navigation.navigate('Restaurant', { slug });
  }, [navigation]);

  const handlePressBanner = React.useCallback(() => {
    navigation.navigate('FlashDeals');
  }, [navigation]);

  const renderCategoryChipItem = React.useCallback(({ item }: { item: typeof categories[0] }) => (
    <CategoryChip 
      item={item} 
      isSelected={item.id === selectedCategory} 
      onSelect={handleSelectCategory} 
    />
  ), [selectedCategory, handleSelectCategory]);

  const renderRestaurantItem = React.useCallback(({ item }: { item: any }) => (
    <RestaurantCard brand={item} fulfillmentMode={fulfillmentMode} onPress={handlePressBrand} />
  ), [fulfillmentMode, handlePressBrand]);

  const getItemLayout = React.useCallback((_: any, index: number) => ({
    length: 220,
    offset: 220 * index,
    index,
  }), []);

  const keyExtractor = React.useCallback((item: any) => String(item.id || item.slug), []);

  const ListHeader = React.useMemo(() => (
    <View>
      <HeroBannerSection fulfillmentMode={fulfillmentMode} onPressBanner={handlePressBanner} />

      {activeGuestOrder && (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.activeGuestOrderBanner}
          onPress={() => navigation.navigate('Tracking', { 
            orderId: activeGuestOrder.orderId || activeGuestOrder.id,
            trackingToken: activeGuestOrder.trackingToken || activeGuestOrder.tracking_token
          })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Text style={{ fontSize: 22 }}>🛵</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '800' }}>
                Active Order {activeGuestOrder.displayOrderId || `#${activeGuestOrder.orderId}`}
              </Text>
              <Text style={{ color: '#E0F2FE', fontSize: 11, fontWeight: '600' }}>
                Status: {(activeGuestOrder.status || 'PREPARING').toUpperCase().replace('_', ' ')}
              </Text>
            </View>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
            <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>Track →</Text>
          </View>
        </TouchableOpacity>
      )}

      {unratedOrder && (
        <View style={styles.feedbackBannerContainer}>
          <LinearGradient
            colors={['#166534', '#15803d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.feedbackBannerGradient}
          >
            <View style={styles.feedbackBannerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>🍕</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feedbackBannerTitle}>Bon Appétit! How was your meal?</Text>
                  <Text style={styles.feedbackBannerSub}>
                    Rate your recent order from {unratedOrder.restaurant?.name || unratedOrder.restaurant_name || 'GetFood'} (#{unratedOrder.id}) ⭐
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  await AsyncStorage.setItem(`dismissed_feedback_order_${unratedOrder.id}`, 'true');
                  setUnratedOrder(null);
                }}
                style={styles.feedbackDismissBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle-outline" size={22} color="#bbf7d0" />
              </TouchableOpacity>
            </View>

            <View style={styles.feedbackBannerActionRow}>
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Ionicons key={star} name="star" size={16} color="#f59e0b" />
                ))}
              </View>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  navigation.navigate('Tracking', {
                    orderId: unratedOrder.id,
                    rate: true,
                    openReviewModal: true,
                  });
                }}
                style={styles.feedbackRateNowBtn}
              >
                <Text style={styles.feedbackRateNowText}>Rate Meal ⭐</Text>
                <Ionicons name="arrow-forward" size={14} color="#166534" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}

      <FlatList
        data={categories}
        renderItem={renderCategoryChipItem}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesList}
        contentContainerStyle={{ paddingRight: SPACING.md }}
      />

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {fulfillmentMode === 'DINE_IN' ? '🍽️ Dine-In Restaurants' : 'Explore Brands'}
        </Text>
        <Text style={styles.sectionLink}>View All</Text>
      </View>
    </View>
  ), [fulfillmentMode, handlePressBanner, unratedOrder, activeGuestOrder, navigation, renderCategoryChipItem]);


  const ListEmpty = React.useMemo(() => {
    if (error && (!restaurants || restaurants.length === 0)) {
      return (
        <ErrorState
          title="Unable to Load Restaurants"
          message={error}
          onRetry={() => dispatch(fetchRestaurants() as any)}
          retryLabel="Retry Feed"
        />
      );
    }
    if ((loading || isTabSwitching) || filteredRestaurants.length === 0) {
      if (loading || isTabSwitching) {
        return (
          <View style={{ paddingHorizontal: 0, minHeight: 400 }}>
            {[1, 2, 3].map(i => <RestaurantCardSkeleton key={i} />)}
          </View>
        );
      }
    }
    return (
      <View style={styles.emptyStateBox}>
        <Ionicons name="restaurant-outline" size={60} color={COLORS.lightGray} />
        <Text style={styles.emptyStateTitle}>
          {selectedCategory === 'All'
            ? 'No Restaurants Available'
            : `No ${selectedCategory} Restaurants`}
        </Text>
        <Text style={styles.emptyStateText}>
          {selectedCategory === 'All'
            ? 'Check your internet connection and pull down to refresh.'
            : 'Try another cuisine category.'}
        </Text>
        {selectedCategory !== 'All' && (
          <TouchableOpacity activeOpacity={0.75}
            style={styles.emptyStateBtn}
            onPress={() => setSelectedCategory('All')}
          >
            <Text style={styles.emptyStateBtnText}>Show All</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [loading, isTabSwitching, filteredRestaurants.length, selectedCategory, error, restaurants, dispatch]);

  return (
    <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? 40 : insets.top }]}>
      <StatusBar style="dark" />
      
      {/* Top Welcome Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.welcomeText}>
            Deliver to {user?.is_guest ? 'Guest' : user?.username || 'Guest'}
          </Text>
          <TouchableOpacity 
            style={styles.locationContainer} 
            activeOpacity={0.7} 
            onPress={() => setShowLocationPrompt(true)}
          >
            <Ionicons name="location-sharp" size={16} color={COLORS.primary} />
            <Text style={styles.locationText} numberOfLines={1}>
              {currentAddress || (user?.addresses && user.addresses.length > 0 ? user.addresses[0] : 'Set your delivery location')}
            </Text>
            <Ionicons name="chevron-down" size={14} color={COLORS.gray} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerActions}>
          {(!isAuthenticated || user?.is_guest) && (
            <TouchableOpacity
              style={{ backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, marginRight: 6 }}
              onPress={() => navigation.navigate('Auth')}
              activeOpacity={0.8}
            >
              <Text style={{ color: COLORS.white, fontSize: 11, fontWeight: '700' }}>Sign In</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => setShowNotifModal(true)}
            activeOpacity={0.75}
          >
            <Ionicons name="notifications-outline" size={22} color={COLORS.dark} />
            {notifications.filter((n) => !n.read).length > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {notifications.filter((n) => !n.read).length > 9
                    ? '9+'
                    : notifications.filter((n) => !n.read).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Main', { screen: 'Search' })}
            activeOpacity={0.75}
          >
            <Ionicons name="search-outline" size={22} color={COLORS.dark} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rewardsButton}
            onPress={() => navigation.navigate('Rewards')}
            activeOpacity={0.75}
          >
            <Ionicons name="ribbon-sharp" size={22} color={COLORS.primary} />
            {!user?.is_guest && (user?.loyalty_points ?? 0) > 0 && (
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsText}>{user?.loyalty_points || 0}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Universal Top Bar Fulfillment Switcher (Delivery / Takeaway / Dine-In) */}
      <View style={styles.fulfillmentSegmentContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, fulfillmentMode === 'DELIVERY' && styles.segmentBtnActive]}
          onPress={() => handleSwitchFulfillmentMode('DELIVERY')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, fulfillmentMode === 'DELIVERY' && styles.segmentTextActive]}>🛵 Delivery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, fulfillmentMode === 'TAKEAWAY' && styles.segmentBtnActive]}
          onPress={() => handleSwitchFulfillmentMode('TAKEAWAY')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, fulfillmentMode === 'TAKEAWAY' && styles.segmentTextActive]}>🛍️ Takeaway</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, fulfillmentMode === 'DINE_IN' && styles.segmentBtnActive]}
          onPress={() => handleSwitchFulfillmentMode('DINE_IN')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, fulfillmentMode === 'DINE_IN' && styles.segmentTextActive]}>🍽️ Dine-In</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <FlatList
          key={`home_restaurant_list_${fulfillmentMode}_${selectedCategory}`}
          data={filteredRestaurants}
          extraData={[fulfillmentMode, selectedCategory, loading, isTabSwitching, filteredRestaurants]}
          renderItem={renderRestaurantItem}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={7}
          removeClippedSubviews={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        />
      </View>

      {/* Guest Login Banner */}
      {user?.is_guest && (
        <View style={styles.stickyLoginCard}>
          <View style={styles.stickyLoginLeft}>
            <View style={styles.stickyLoginIconBg}>
              <Ionicons name="person" size={16} color="#d97706" />
            </View>
            <View style={{ marginLeft: SPACING.sm }}>
              <Text style={styles.stickyLoginTitle}>Browsing as Guest</Text>
              <Text style={styles.stickyLoginText}>Sign in to earn loyalty points</Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.8}
            style={styles.stickyLoginBtn}
            onPress={async () => {
              await dispatch(logoutUser());
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
            }}
          >
            <Text style={styles.stickyLoginBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Location Prompt Modal */}
      <LocationPromptModal
        visible={showLocationPrompt}
        onAllow={handleAllowLocation}
        onDeny={handleDenyLocation}
      />

      {/* In-App Notification Center Modal */}
      <NotificationModal
        visible={showNotifModal}
        onClose={() => setShowNotifModal(false)}
        notifications={notifications}
        navigation={navigation}
      />
    </View>
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
    paddingHorizontal: SPACING.md,
    paddingTop: 10,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  welcomeText: {
    ...FONTS.caption,
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    ...FONTS.body,
    fontSize: 14,
    fontWeight: '600',
    maxWidth: width * 0.5,
    marginHorizontal: 4,
  },
  rewardsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.light,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pointsBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  pointsText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 100,
    minHeight: Dimensions.get('window').height - 180,
    backgroundColor: '#f8fafc',
  },
  promoBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    position: 'relative',
  },
  bannerInfo: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: SPACING.md,
    lineHeight: 16,
  },
  bannerGraphic: {
    width: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoriesList: {
    marginBottom: SPACING.md,
  },
  categoryChip: {
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  activeCategoryChip: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  activeCategoryText: {
    color: COLORS.white,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    ...FONTS.subtitle,
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionLink: {
    color: COLORS.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  brandCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  brandBand: {
    height: 120,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    position: 'relative',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginLeft: 2,
  },
  brandDetails: {
    padding: SPACING.md,
  },
  brandTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  brandName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryText: {
    fontSize: 12,
    color: COLORS.gray,
    marginLeft: 2,
    fontWeight: '500',
  },
  brandCuisine: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 6,
  },
  brandTagline: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.light,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#ea580c',
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  notifBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerIconWrap: {
    opacity: 0.9,
  },
  bannerCTARow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs,
    gap: 4,
  },
  bannerCTAText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '700',
  },
  bannerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    gap: 4,
  },
  bannerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  bannerDotActive: {
    backgroundColor: COLORS.white,
    width: 18,
  },
  skeletonCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  skeletonImage: {
    height: 160,
    backgroundColor: COLORS.lightGray,
  },
  skeletonBody: {
    padding: SPACING.md,
  },
  skeletonTitle: {
    height: 16,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    marginBottom: 8,
    width: '60%',
  },
  skeletonSubtitle: {
    height: 12,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    marginBottom: 8,
    width: '40%',
  },
  skeletonMeta: {
    height: 10,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    width: '30%',
  },
  emptyStateBox: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 13,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: SPACING.xs,
    lineHeight: 20,
  },
  emptyStateBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  emptyStateBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  stickyLoginCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fffbeb', // bg-amber-50
    borderTopWidth: 1,
    borderColor: '#fde68a', // border-amber-200
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
  },
  stickyLoginLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  stickyLoginIconBg: {
    backgroundColor: '#fef3c7', // bg-amber-100
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyLoginTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#92400e', // text-amber-800
  },
  stickyLoginText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 16,
  },
  stickyLoginBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: 8,
  },
  stickyLoginBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  feedbackBannerContainer: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#166534',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  feedbackBannerGradient: {
    padding: SPACING.md,
    borderRadius: 14,
  },
  feedbackBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  feedbackBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  feedbackBannerSub: {
    fontSize: 12,
    color: '#dcfce7',
    marginTop: 2,
  },
  feedbackDismissBtn: {
    padding: 2,
    marginLeft: 6,
  },
  feedbackBannerActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  feedbackRateNowBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedbackRateNowText: {
    color: '#166534',
    fontWeight: 'bold',
    fontSize: 12,
  },
  fulfillmentSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },
  segmentBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  activeGuestOrderBanner: {
    backgroundColor: '#10B981',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.medium,
  },
});
