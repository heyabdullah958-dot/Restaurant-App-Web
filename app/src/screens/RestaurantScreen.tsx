import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  Platform,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import { COLORS, SPACING, SHADOWS, FONTS } from '../theme';
import { AppDispatch, RootState } from '../store';
import { fetchRestaurantDetail, fetchRestaurants, clearCurrentRestaurant } from '../store/restaurantSlice';
import CustomAlertModal from '../components/CustomAlertModal';
import { addItemToCart, updateQuantity, removeItemFromCart, clearCart } from '../store/cartSlice';
import { getImageUrl, Restaurant, MenuItem, MenuCategory, FALLBACK_RESTAURANTS } from '../services/fallbackData';
import { resolveItemImage, resolveItemImageWithLogoFallback } from '../services/mediaAssetService';
import api from '../services/api';

type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  Restaurant: { slug: string };
  Cart: undefined; // Add Cart route mapping
};

type RestaurantScreenRouteProp = RouteProp<RootStackParamList, 'Restaurant'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Restaurant'>;

const isRestaurantOpen = (restaurant: any): boolean => {
  try {
    if (restaurant.is_force_closed === true) return false;
    if (restaurant.is_active === false) return false;
    if (restaurant.is_currently_open === false) return false;

    if (restaurant.branches && Array.isArray(restaurant.branches) && restaurant.branches.length > 0) {
      return restaurant.branches.some((b: any) => b.is_active !== false && b.is_currently_open !== false);
    }

    return restaurant.is_active !== false;
  } catch {
    return true;
  }
};


// Memoized Menu Item Card component for zero frame drop menu scrolling
const MenuItemCard = React.memo(({ 
  item, 
  quantity, 
  showCategoryName,
  isClosed,
  restaurantSlug,
  onAddToCart, 
  onIncrement, 
  onDecrement 
}: {
  item: MenuItem & { categoryName?: string };
  quantity: number;
  showCategoryName: boolean;
  isClosed?: boolean;
  restaurantSlug?: string | number;
  onAddToCart: (item: MenuItem) => void;
  onIncrement: (item: MenuItem, qty: number) => void;
  onDecrement: (item: MenuItem, qty: number) => void;
}) => {
  const isOutOfStock = item.is_available === false;
  const isUnavailable = isOutOfStock || isClosed;

  return (
    <View style={[styles.menuItemCard, isUnavailable && { opacity: 0.65 }]}>
      <View style={styles.menuItemTextContent}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={[styles.itemName, isUnavailable && { color: COLORS.gray }]}>{item.name}</Text>
          {item.active_flash_deal ? (
            <View style={{ backgroundColor: 'rgba(225, 29, 72, 0.12)', borderColor: '#e11d48', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ color: '#e11d48', fontSize: 10, fontWeight: '800' }}>
                {item.active_flash_deal.badge || '⚡ FLASH DEAL'}
              </Text>
            </View>
          ) : null}
          {isOutOfStock ? (
            <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ color: '#dc2626', fontSize: 10, fontWeight: '700' }}>OUT OF STOCK</Text>
            </View>
          ) : isClosed ? (
            <View style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ color: '#64748b', fontSize: 10, fontWeight: '700' }}>CLOSED</Text>
            </View>
          ) : null}
        </View>
        {showCategoryName && item.categoryName && (
          <Text style={styles.itemCategoryName}>{item.categoryName}</Text>
        )}
        <Text style={styles.itemDescription} numberOfLines={2}>
          {item.description}
        </Text>
        {item.active_flash_deal ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 }}>
            <Text style={[styles.itemPrice, { color: '#e11d48', fontWeight: '800' }]}>
              Rs. {Math.round(item.active_flash_deal.discounted_price)}
            </Text>
            <Text style={{ fontSize: 13, color: '#94a3b8', textDecorationLine: 'line-through' }}>
              Rs. {Number(item.price)}
            </Text>
          </View>
        ) : (
          <Text style={[styles.itemPrice, isUnavailable && { color: COLORS.gray }]}>Rs. {Number(item.price)}</Text>
        )}
        
        {item.preparation_time > 0 && (
          <Text style={styles.itemPrepTime}>
            ⏱️ Ready in {item.preparation_time} mins
          </Text>
        )}
      </View>

      {(() => {
        const resKey = restaurantSlug;
        const { uri, isLogoFallback } = resolveItemImageWithLogoFallback(item, resKey);
        const itemImgSource = getImageUrl(uri);
        return (
          <View style={[styles.menuItemImageContainer, isLogoFallback && { backgroundColor: '#1E1216', justifyContent: 'center', alignItems: 'center' }]}>
            {itemImgSource ? (
              <Image 
                source={itemImgSource} 
                style={[styles.itemImage, isLogoFallback && { width: '75%', height: '75%', resizeMode: 'contain' }]} 
              />
            ) : (
              <View style={styles.itemImageBlank} />
            )}

            <View style={styles.quantitySelectorContainer}>
              {isClosed ? (
                <View style={[styles.addButton, { backgroundColor: '#94a3b8' }]}>
                  <Text style={[styles.addButtonText, { fontSize: 11 }]}>CLOSED</Text>
                </View>
              ) : isOutOfStock ? (
                <View style={[styles.addButton, { backgroundColor: '#94a3b8' }]}>
                  <Text style={[styles.addButtonText, { fontSize: 11 }]}>OUT OF STOCK</Text>
                </View>
              ) : quantity > 0 && !item.options?.has_variants ? (
                <View style={styles.quantityRow}>
                  <TouchableOpacity activeOpacity={0.75}
                    style={styles.quantityBtn}
                    onPress={() => onDecrement(item, quantity)}
                  >
                    <Ionicons name="remove" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                  <Text style={styles.quantityText}>{quantity}</Text>
                  <TouchableOpacity activeOpacity={0.75}
                    style={styles.quantityBtn}
                    onPress={() => onIncrement(item, quantity)}
                  >
                    <Ionicons name="add" size={16} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.addButton}
                  activeOpacity={0.8}
                  onPress={() => onAddToCart(item)}
                >
                  <Ionicons name="add" size={14} color={COLORS.white} style={{ marginRight: 2 }} />
                  <Text style={styles.addButtonText}>
                    {item.options?.has_variants && quantity > 0 ? `ADD MORE (${quantity})` : 'ADD'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })()}
    </View>
  );
});


export default function RestaurantScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RestaurantScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const slug = route.params?.slug ?? '';

  // Guard: if slug is empty (edge case in Hermes native nav), show error UI
  if (!slug) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.danger} />
          <Text style={styles.errorTitle}>Invalid Restaurant</Text>
          <TouchableOpacity activeOpacity={0.75} style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentRestaurant = useSelector((state: RootState) => state.restaurant.currentRestaurant);
  const loading = useSelector((state: RootState) => state.restaurant.loading);
  const cart = useSelector((state: RootState) => state.cart);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedItemForOptions, setSelectedItemForOptions] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    actions?: any[];
  }>({ visible: false, title: '', message: '' });

  const showAlert = useCallback((title: string, message: string, actions?: any[]) => {
    setAlertConfig({ visible: true, title, message, actions });
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [showBranchModal, setShowBranchModal] = useState(false);

  const hideAlert = useCallback(() => setAlertConfig(prev => ({ ...prev, visible: false })), []);

  const restaurant: Restaurant | null = useMemo(() => {
    if (currentRestaurant && currentRestaurant.slug === slug) {
      return currentRestaurant;
    }
    const localFallback = FALLBACK_RESTAURANTS.find((r) => r.slug === slug);
    return localFallback || null;
  }, [currentRestaurant, slug]);

  const currentBranch = useMemo(() => {
    if (!restaurant || !restaurant.branches || restaurant.branches.length === 0) return null;
    if (selectedBranchId) {
      const found = restaurant.branches.find((b: any) => b.id === selectedBranchId);
      if (found) return found;
    }
    return restaurant.branches.find((b: any) => b.is_active !== false) || restaurant.branches[0];
  }, [restaurant, selectedBranchId]);

  // Auto-initialize selectedBranchId if not yet set
  useEffect(() => {
    if (restaurant && restaurant.branches && restaurant.branches.length > 0 && !selectedBranchId) {
      const activeBranches = restaurant.branches.filter((b: any) => b.is_active !== false);
      const defaultBranch = activeBranches[0] || restaurant.branches[0];
      if (defaultBranch) {
        setSelectedBranchId(defaultBranch.id);
      }
    }
  }, [restaurant, selectedBranchId]);

  // Whenever selectedBranchId is set or changed, fetch menu with that branch context
  useEffect(() => {
    if (slug && selectedBranchId) {
      dispatch(fetchRestaurantDetail({ slug, branchId: selectedBranchId }));
    }
  }, [dispatch, slug, selectedBranchId]);

  const confirmAddVariantToCart = useCallback((item: MenuItem | null, variant: any) => {
    if (!restaurant || !item) return;
    if (item.is_available === false) {
      showAlert('Item Out of Stock', `${item.name} is currently sold out at ${currentBranch?.name || 'this branch'}.`);
      return;
    }
    const itemToAdd = {
      id: item.id,
      name: `${item.name} (${variant.name})`,
      price: Number(variant.price),
      quantity: 1,
      selectedOptions: [{
        name: variant.name,
        price_modifier: Number(variant.price) - Number(item.price),
        specifications: variant.specifications || {}
      }]
    };

    if (cart.restaurantId && cart.restaurantId !== restaurant.id) {
      showAlert(
        'Start New Order?',
        `Your cart contains items from another brand. Do you want to clear your cart and order from ${restaurant.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Start New Order',
            onPress: () => {
              dispatch(clearCart());
              dispatch(
                addItemToCart({
                  item: itemToAdd,
                  restaurantId: restaurant.id,
                })
              );
              setSelectedItemForOptions(null);
            },
          },
        ]
      );
    } else {
      dispatch(
        addItemToCart({
          item: itemToAdd,
          restaurantId: restaurant.id,
        })
      );
      setSelectedItemForOptions(null);
    }
  }, [restaurant, cart.restaurantId, dispatch, showAlert, hideAlert, currentBranch]);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchRestaurantDetail(selectedBranchId ? { slug, branchId: selectedBranchId } : slug));
      dispatch(fetchRestaurants() as any);
    }, [dispatch, slug, selectedBranchId])
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      dispatch(fetchRestaurantDetail(selectedBranchId ? { slug, branchId: selectedBranchId } : slug));
      dispatch(fetchRestaurants() as any);
    }, 10000);

    return () => {
      clearInterval(intervalId);
      dispatch(clearCurrentRestaurant());
    };
  }, [dispatch, slug, selectedBranchId]);

  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (slug) {
      api.get(`/restaurants/${slug}/reviews/`)
        .then((res: any) => {
          const list = res?.data?.data || res?.data || [];
          setReviews(Array.isArray(list) ? list : (list.results || []));
        })
        .catch(() => setReviews([]));
    }
  }, [slug]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchRestaurantDetail(selectedBranchId ? { slug, branchId: selectedBranchId } : slug));
    if (slug) {
      api.get(`/restaurants/${slug}/reviews/`)
        .then((res: any) => {
          const list = res?.data?.data || res?.data || [];
          setReviews(Array.isArray(list) ? list : (list.results || []));
        })
        .catch(() => {});
    }
    setRefreshing(false);
  }, [dispatch, slug, selectedBranchId]);

  useEffect(() => {
    if (restaurant && restaurant.categories && restaurant.categories.length > 0) {
      setSelectedCategory('All');
    }
  }, [restaurant]);

  const categoriesList = useMemo(() => {
    if (!restaurant || !restaurant.categories) return [];
    return restaurant.categories.filter((cat) => cat.is_active);
  }, [restaurant]);

  const menuItems = useMemo(() => {
    if (!restaurant || !restaurant.categories) return [];
    
    if (selectedCategory === 'All') {
      return restaurant.categories
        .filter((cat) => cat.is_active)
        .flatMap((cat) => cat.items.map(item => ({ ...item, categoryName: cat.name })));
    }
    
    const matchedCategory = restaurant.categories.find(
      (cat) => cat.name === selectedCategory && cat.is_active
    );
    
    return matchedCategory ? matchedCategory.items.map(item => ({ ...item, categoryName: matchedCategory.name })) : [];
  }, [restaurant, selectedCategory]);

  // Fast O(1) quantity lookup map for high FPS list updates
  const cartQuantityMap = useMemo(() => {
    const map: Record<number, number> = {};
    if (!restaurant || cart.restaurantId !== restaurant.id) return map;
    for (const item of cart.items) {
      map[item.id] = (map[item.id] || 0) + item.quantity;
    }
    return map;
  }, [cart, restaurant]);

  const handleAddToCart = useCallback((item: MenuItem) => {
    if (!restaurant) return;
    if (item.is_available === false) {
      showAlert('Item Out of Stock', `${item.name} is currently sold out at ${currentBranch?.name || 'this branch'}.`);
      return;
    }
    if (!isRestaurantOpen(restaurant)) {
      showAlert('Restaurant Closed', `${restaurant.name} is currently closed and not accepting orders.`);
      return;
    }
    if (item.options?.has_variants && item.options.variants && item.options.variants.length > 0) {
      setSelectedItemForOptions(item);
      setSelectedVariant(item.options.variants[0]);
    } else if (cart.restaurantId && cart.restaurantId !== restaurant.id) {
      showAlert(
        'Reset Cart?',
        'You have items from another restaurant in your cart. Adding this item will clear your current cart. Do you want to proceed?',
        [
          { text: 'Cancel', style: 'cancel', onPress: hideAlert },
          {
            text: 'Yes, Reset',
            onPress: () => {
              hideAlert();
              dispatch(
                addItemToCart({
                  item: {
                    id: item.id,
                    name: item.name,
                    price: Number(item.price),
                    quantity: 1,
                    selectedOptions: [],
                  },
                  restaurantId: restaurant.id,
                })
              );
            },
          },
        ]
      );
    } else {
      dispatch(
        addItemToCart({
          item: {
            id: item.id,
            name: item.name,
            price: Number(item.price),
            quantity: 1,
            selectedOptions: [],
          },
          restaurantId: restaurant.id,
        })
      );
    }
  }, [restaurant, cart.restaurantId, dispatch, showAlert, hideAlert, currentBranch]);

  const handleIncrement = useCallback((item: MenuItem, currentQty: number) => {
    if (item.is_available === false) {
      showAlert('Item Out of Stock', `${item.name} is currently sold out at ${currentBranch?.name || 'this branch'}.`);
      return;
    }
    if (restaurant && !isRestaurantOpen(restaurant)) {
      showAlert('Restaurant Closed', `${restaurant.name} is currently closed and not accepting orders.`);
      return;
    }
    dispatch(
      updateQuantity({
        id: item.id,
        selectedOptions: [],
        quantity: currentQty + 1,
      })
    );
  }, [restaurant, dispatch, showAlert, currentBranch]);

  const handleDecrement = useCallback((item: MenuItem, currentQty: number) => {
    if (currentQty <= 1) {
      dispatch(
        removeItemFromCart({
          id: item.id,
          selectedOptions: [],
        })
      );
    } else {
      dispatch(
        updateQuantity({
          id: item.id,
          selectedOptions: [],
          quantity: currentQty - 1,
        })
      );
    }
  }, [dispatch]);

  const isOpen = restaurant ? isRestaurantOpen(restaurant) : true;

  const renderMenuItem = useCallback(({ item }: { item: MenuItem & { categoryName?: string } }) => (
    <MenuItemCard
      item={item}
      quantity={cartQuantityMap[item.id] || 0}
      showCategoryName={selectedCategory === 'All'}
      isClosed={!isOpen}
      restaurantSlug={restaurant?.slug || restaurant?.id}
      onAddToCart={handleAddToCart}
      onIncrement={handleIncrement}
      onDecrement={handleDecrement}
    />
  ), [cartQuantityMap, selectedCategory, isOpen, handleAddToCart, handleIncrement, handleDecrement]);

  const keyExtractor = useCallback((item: MenuItem) => String(item.id), []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: 120,
    offset: 120 * index,
    index,
  }), []);

  if (loading && !restaurant) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Preparing menu...</Text>
      </View>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={COLORS.danger} />
          <Text style={styles.errorTitle}>Restaurant Not Found</Text>
          <TouchableOpacity activeOpacity={0.75} style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const ListHeaderComponent = (
    <View>
      {!isOpen && (
        <View style={{ backgroundColor: '#dc2626', paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <Ionicons name="time" size={20} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 13, letterSpacing: 0.5 }}>
            CLOSED NOW — STORE IS CURRENTLY CLOSED FOR ORDERS
          </Text>
        </View>
      )}
      <View style={styles.coverContainer}>
        <Image 
          source={getImageUrl(restaurant.banner_image || restaurant.cover_image)} 
          style={styles.coverImage} 
        />
        <View style={styles.coverOverlay} />

        <View style={styles.headerButtonsRow}>
          <TouchableOpacity activeOpacity={0.75} style={styles.circleButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={COLORS.dark} />
          </TouchableOpacity>
          
          <View style={styles.headerRightButtons}>
            <TouchableOpacity activeOpacity={0.75} style={styles.circleButton}>
              <Ionicons name="share-outline" size={20} color={COLORS.dark} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.75} style={[styles.circleButton, { marginLeft: SPACING.sm }]}>
              <Ionicons name="heart-outline" size={20} color={COLORS.dark} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.logoContainer}>
          <Image source={getImageUrl(restaurant.logo)} style={styles.logoImage} />
        </View>
        
        <Text style={styles.restaurantName}>{restaurant.name}</Text>
        <Text style={styles.cuisineText}>{restaurant.cuisine_type}</Text>

        <View style={[styles.openBadge, { backgroundColor: isOpen ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)' }]}>
          <View style={[styles.openDot, { backgroundColor: isOpen ? COLORS.success : COLORS.danger }]} />
          <Text style={[styles.openText, { color: isOpen ? COLORS.success : COLORS.danger }]}>
            {isOpen ? 'Open Now' : 'Currently Closed'}
          </Text>
        </View>
        
        {restaurant.description ? (
          <Text style={styles.descriptionText}>{restaurant.description}</Text>
        ) : null}

        {(route.params as any)?.flashDealClaimed && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#FFF1F2',
            borderColor: '#FECDD3',
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            marginTop: 10,
            gap: 8,
          }}>
            <Text style={{ fontSize: 16 }}>⚡</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#9F1239' }}>
                Flash Deal Claimed! ({(route.params as any).flashDealClaimed.discount}% OFF)
              </Text>
              <Text style={{ fontSize: 10, color: '#BE123C', fontWeight: '500' }}>
                Discount automatically applied to your basket!
              </Text>
            </View>
            <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
          </View>
        )}

        <View style={styles.specsContainer}>
          <View style={styles.specItem}>
            <Ionicons name="star" size={16} color={COLORS.warning} />
            <Text style={styles.specValue}>{Number(restaurant.rating).toFixed(1)}</Text>
            <Text style={styles.specLabel}>({restaurant.total_reviews}+ reviews)</Text>
          </View>
          <View style={styles.specDivider} />
          <View style={styles.specItem}>
            <Ionicons name="time" size={16} color={COLORS.primary} />
            <Text style={styles.specValue}>
              {restaurant.delivery_time_min}-{restaurant.delivery_time_max}
            </Text>
            <Text style={styles.specLabel}>mins</Text>
          </View>
          <View style={styles.specDivider} />
          <View style={styles.specItem}>
            <Ionicons name="bicycle" size={16} color={COLORS.success} />
            <Text style={styles.specValue}>
              {Number(restaurant.delivery_fee) === 0 ? 'Free' : `Rs. ${Number(restaurant.delivery_fee)}`}
            </Text>
            <Text style={styles.specLabel}>delivery</Text>
          </View>
        </View>

        <View style={styles.moreInfoSection}>
          <TouchableOpacity
            style={styles.branchSelectRow}
            activeOpacity={restaurant.branches && restaurant.branches.length > 1 ? 0.75 : 1}
            onPress={() => {
              if (restaurant.branches && restaurant.branches.length > 1) {
                setShowBranchModal(true);
              }
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 6 }}>
              <Ionicons name="location-sharp" size={16} color={COLORS.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.branchSelectLabel}>
                  Branch: <Text style={{ fontWeight: '800', color: COLORS.dark }}>{currentBranch?.name || restaurant.name}</Text>
                </Text>
                <Text style={styles.moreInfoText} numberOfLines={1}>
                  {currentBranch?.address || restaurant.address}
                </Text>
              </View>
            </View>
            {restaurant.branches && restaurant.branches.length > 1 && (
              <View style={styles.changeBranchBadge}>
                <Text style={styles.changeBranchBadgeText}>Change ▾</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={[styles.infoRow, { marginTop: 6 }]}>
            <Ionicons name="alarm-outline" size={14} color={COLORS.gray} />
            <Text style={styles.moreInfoText}>
              Working hours: {restaurant.opens_at && restaurant.closes_at ? `${restaurant.opens_at.slice(0, 5)} - ${restaurant.closes_at.slice(0, 5)}` : 'Closed / N/A'}
            </Text>
          </View>
        </View>

        {/* Customer Reviews Preview */}
        {reviews.length > 0 && (
          <View style={styles.reviewsCardSection}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={styles.reviewsSectionTitle}>⭐ Customer Reviews ({reviews.length})</Text>
              <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '700' }}>
                {Number(restaurant.rating).toFixed(1)} ★ Average
              </Text>
            </View>
            {reviews.slice(0, 3).map((rev: any, idx: number) => (
              <View key={rev.id || idx} style={styles.reviewItemRow}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={styles.reviewAuthor}>{rev.user_name || rev.username || 'Verified Customer'}</Text>
                  <Text style={styles.reviewRatingStars}>{'⭐'.repeat(Math.min(5, Math.max(1, rev.rating || 5)))}</Text>
                </View>
                {rev.comment ? (
                  <Text style={styles.reviewCommentText}>"{rev.comment}"</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </View>

      {categoriesList.length > 0 && (
        <View style={[styles.tabsContainer, styles.tabsSticky]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsScrollContent}
          >
            <TouchableOpacity activeOpacity={0.75}
              style={[
                styles.tabButton,
                selectedCategory === 'All' && styles.tabButtonActive,
              ]}
              onPress={() => setSelectedCategory('All')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  selectedCategory === 'All' && styles.tabButtonTextActive,
                ]}
              >
                All Dishes
              </Text>
            </TouchableOpacity>

            {categoriesList.map((cat) => (
              <TouchableOpacity activeOpacity={0.75}
                key={cat.id}
                style={[
                  styles.tabButton,
                  selectedCategory === cat.name && styles.tabButtonActive,
                ]}
                onPress={() => setSelectedCategory(cat.name)}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    selectedCategory === cat.name && styles.tabButtonTextActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={[styles.menuSectionHeader, { paddingHorizontal: SPACING.md, marginTop: SPACING.md }]}>
        {selectedCategory === 'All' ? 'Menu' : selectedCategory}
      </Text>
    </View>
  );

  const ListEmptyComponent = (
    <View style={styles.emptyMenu}>
      <Ionicons name="fast-food-outline" size={48} color={COLORS.lightGray} />
      <Text style={styles.emptyMenuText}>No items available in this category</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <FlatList
        data={menuItems}
        renderItem={renderMenuItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        ListHeaderComponent={ListHeaderComponent}
        ListEmptyComponent={ListEmptyComponent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />

      {cart.restaurantId === restaurant.id && cart.totalQuantity > 0 && (
        <View style={[styles.bottomCartBar, { bottom: Math.max(insets.bottom + 12, 24) }]}>
          <TouchableOpacity
            style={styles.cartBarButton}
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Cart')}
          >
            <View style={styles.cartBarLeft}>
              <View style={styles.cartQtyBadge}>
                <Text style={styles.cartQtyText}>{cart.totalQuantity}</Text>
              </View>
              <Text style={styles.viewCartText}>View Cart</Text>
            </View>
            <View style={styles.cartBarRight}>
              <Text style={styles.cartTotalText}>Rs. {cart.totalAmount}</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Custom Option/Variant Selection Sheet */}
      {selectedItemForOptions && (
        <Modal
          visible={true}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSelectedItemForOptions(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{selectedItemForOptions.name}</Text>
                  <Text style={styles.modalSubtitle}>{selectedItemForOptions.categoryName || 'Item Details'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedItemForOptions(null)}
                >
                  <Ionicons name="close" size={20} color={COLORS.gray} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.modalDesc}>{selectedItemForOptions.description}</Text>
                
                <Text style={styles.optionSectionHeader}>Select Variant / Size</Text>
                {selectedItemForOptions.options?.variants?.map((v: any) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <TouchableOpacity
                      key={v.id}
                      activeOpacity={0.8}
                      style={[
                        styles.variantCard,
                        isSelected && styles.variantCardSelected
                      ]}
                      onPress={() => setSelectedVariant(v)}
                    >
                      <View style={styles.variantRadioRow}>
                        <View style={[
                          styles.radioOuter,
                          isSelected && styles.radioOuterSelected
                        ]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[
                            styles.variantName,
                            isSelected && styles.variantNameSelected
                          ]}>
                            {v.name}
                          </Text>
                          {v.specifications && Object.keys(v.specifications).length > 0 && (
                            <View style={styles.specsBadgeRow}>
                              {Object.entries(v.specifications).map(([key, val]) => (
                                val ? (
                                  <View key={key} style={styles.specBadge}>
                                    <Text style={styles.specBadgeText}>
                                      {key.replace('_', ' ')}: {String(val)}
                                    </Text>
                                  </View>
                                ) : null
                              ))}
                            </View>
                          )}
                        </View>
                        <Text style={styles.variantPrice}>Rs. {v.price}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.modalAddBtn}
                  onPress={() => {
                    if (selectedVariant) {
                      confirmAddVariantToCart(selectedItemForOptions, selectedVariant);
                    }
                  }}
                >
                  <Text style={styles.modalAddBtnText}>
                    Add to Cart - Rs. {selectedVariant?.price}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {/* Branch Selection Modal */}
      {restaurant && restaurant.branches && restaurant.branches.length > 0 && (
        <Modal
          visible={showBranchModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowBranchModal(false)}
        >
          <View style={styles.branchModalOverlay}>
            <View style={styles.branchModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Branch</Text>
                <TouchableOpacity
                  onPress={() => setShowBranchModal(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={24} color={COLORS.dark} />
                </TouchableOpacity>
              </View>

              <Text style={styles.branchModalSub}>
                Choose your nearest branch to see real-time menu availability and fast delivery.
              </Text>

              <ScrollView style={{ maxHeight: 350, marginVertical: 8 }}>
                {restaurant.branches
                  .filter((b: any) => b.is_active !== false)
                  .map((b: any) => {
                    const isSelected = (currentBranch?.id === b.id);
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          styles.branchOptionCard,
                          isSelected && styles.branchOptionCardSelected,
                        ]}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelectedBranchId(b.id);
                          setShowBranchModal(false);
                          dispatch(fetchRestaurantDetail({ slug, branchId: b.id }));
                        }}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Ionicons
                              name="business"
                              size={16}
                              color={isSelected ? COLORS.primary : COLORS.gray}
                            />
                            <Text
                              style={[
                                styles.branchOptionName,
                                isSelected && styles.branchOptionNameSelected,
                              ]}
                            >
                              {b.name}
                            </Text>
                          </View>
                          {b.address ? (
                            <Text style={styles.branchOptionAddress} numberOfLines={2}>
                              {b.address}
                            </Text>
                          ) : null}
                          {b.phone ? (
                            <Text style={styles.branchOptionPhone}>📞 {b.phone}</Text>
                          ) : null}
                        </View>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={22}
                            color={COLORS.primary}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

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
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.light,
  },
  loadingText: {
    ...FONTS.body,
    color: COLORS.gray,
    marginTop: SPACING.sm,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  errorTitle: {
    ...FONTS.subtitle,
    fontWeight: 'bold',
    marginTop: SPACING.md,
  },
  errorButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    marginTop: SPACING.md,
  },
  errorButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  scrollContainer: {
    paddingBottom: 100, // Leave room for sticky cart bar
  },
  coverContainer: {
    height: 260,
    width: '100%',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  headerButtonsRow: {
    position: 'absolute',
    top: 50, // Accounts for StatusBar on most devices
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  circleButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  headerRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.large,
  },
  logoContainer: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: COLORS.white,
    marginTop: -38,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  restaurantName: {
    ...FONTS.title,
    fontWeight: 'bold',
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  cuisineText: {
    ...FONTS.caption,
    color: COLORS.gray,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  descriptionText: {
    ...FONTS.body,
    color: COLORS.gray,
    textAlign: 'center',
    marginVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  specsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    width: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.lightGray,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
  },
  specItem: {
    alignItems: 'center',
    flex: 1,
  },
  specValue: {
    ...FONTS.body,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: 2,
  },
  specLabel: {
    fontSize: 10,
    color: COLORS.gray,
  },
  specDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.lightGray,
  },
  moreInfoSection: {
    width: '100%',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  moreInfoText: {
    fontSize: 11,
    color: COLORS.gray,
    marginLeft: 6,
  },
  tabsContainer: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  tabsScrollContent: {
    paddingHorizontal: SPACING.md,
  },
  tabButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  tabButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  tabButtonText: {
    ...FONTS.body,
    fontWeight: '600',
    color: COLORS.dark,
  },
  tabButtonTextActive: {
    color: COLORS.white,
  },
  menuContainer: {
    padding: SPACING.md,
  },
  menuSectionHeader: {
    ...FONTS.subtitle,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    color: COLORS.dark,
  },
  menuItemCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  menuItemTextContent: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  itemName: {
    ...FONTS.body,
    fontWeight: 'bold',
  },
  itemCategoryName: {
    fontSize: 10,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  itemDescription: {
    ...FONTS.caption,
    color: COLORS.gray,
    marginTop: 4,
  },
  itemPrice: {
    ...FONTS.body,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: 8,
  },
  itemPrepTime: {
    fontSize: 11,
    color: COLORS.gray,
    marginTop: 6,
  },
  menuItemImageContainer: {
    width: 90,
    height: 90,
    position: 'relative',
    alignSelf: 'center',
  },
  itemImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: 'rgba(255, 87, 34, 0.06)',  // Light primary tint
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 34, 0.15)',
  },
  itemImageBlank: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  quantitySelectorContainer: {
    position: 'absolute',
    bottom: -10,
    left: 5,
    right: 5,
    height: 28,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    ...SHADOWS.small,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: 'bold',
  },
  quantityRow: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
    paddingHorizontal: 4,
    ...SHADOWS.small,
  },
  quantityBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyMenu: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  emptyMenuText: {
    ...FONTS.body,
    color: COLORS.gray,
    marginTop: SPACING.sm,
  },
  bottomCartBar: {
    position: 'absolute',
    bottom: 24,
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: SPACING.sm,
    ...SHADOWS.large,
  },
  cartBarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm,
    height: 44,
  },
  cartBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartQtyBadge: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartQtyText: {
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  viewCartText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginLeft: SPACING.sm,
    fontSize: 16,
  },
  cartBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartTotalText: {
    color: COLORS.white,
    fontWeight: 'bold',
    marginRight: 6,
    fontSize: 16,
  },
  tabsSticky: {
    zIndex: 10,
    elevation: 4,
  },
  stickyTabs: {
    backgroundColor: COLORS.white,
    zIndex: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
  },
  openDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  openText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: SPACING.lg,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: SPACING.md,
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '600',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  modalScroll: {
    marginBottom: SPACING.lg,
  },
  modalDesc: {
    fontSize: 13,
    color: COLORS.gray,
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  optionSectionHeader: {
    fontSize: 14,
    fontWeight: '900',
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  variantCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  variantCardSelected: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
  },
  variantRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#3b82f6',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  variantName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
  },
  variantNameSelected: {
    color: '#1e40af',
  },
  variantPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  specsBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
  specBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  specBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#475569',
  },
  modalFooter: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: SPACING.md,
  },
  modalAddBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAddBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  reviewsCardSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  reviewsSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  reviewItemRow: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reviewAuthor: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  reviewRatingStars: {
    fontSize: 11,
  },
  reviewCommentText: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  branchSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  branchSelectLabel: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 2,
  },
  changeBranchBadge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(234, 88, 12, 0.3)',
    marginLeft: 6,
  },
  changeBranchBadgeText: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  branchModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  branchModalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.lg,
    maxHeight: '80%',
  },
  branchModalSub: {
    fontSize: 12,
    color: COLORS.gray,
    marginBottom: 12,
    lineHeight: 18,
  },
  branchOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: SPACING.sm,
  },
  branchOptionCardSelected: {
    backgroundColor: '#ffedd5',
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  branchOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  branchOptionNameSelected: {
    color: COLORS.primary,
  },
  branchOptionAddress: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 4,
    lineHeight: 16,
  },
  branchOptionPhone: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
    fontWeight: '600',
  },
});
