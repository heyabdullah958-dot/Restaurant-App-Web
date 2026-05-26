import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, SHADOWS, FONTS } from '../theme';
import { AppDispatch, RootState } from '../store';
import { fetchRestaurantDetail, clearCurrentRestaurant } from '../store/restaurantSlice';
import { addItemToCart, updateQuantity, removeItemFromCart } from '../store/cartSlice';
import { getImageUrl, Restaurant, MenuItem, MenuCategory, FALLBACK_RESTAURANTS } from '../services/fallbackData';

type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  Restaurant: { slug: string };
  Cart: undefined; // Add Cart route mapping
};

type RestaurantScreenRouteProp = RouteProp<RootStackParamList, 'Restaurant'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Restaurant'>;

export default function RestaurantScreen() {
  const route = useRoute<RestaurantScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { slug } = route.params;

  const { currentRestaurant, loading } = useSelector((state: RootState) => state.restaurant);
  const cart = useSelector((state: RootState) => state.cart);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  // Load details on mount or slug change
  useEffect(() => {
    dispatch(fetchRestaurantDetail(slug));
    return () => {
      dispatch(clearCurrentRestaurant());
    };
  }, [dispatch, slug]);

  // Determine active restaurant data from Redux with fallback to local mock data
  const restaurant: Restaurant | null = useMemo(() => {
    if (currentRestaurant && currentRestaurant.slug === slug) {
      return currentRestaurant;
    }
    // Return local fallback data for robust offline & prototype testing
    const localFallback = FALLBACK_RESTAURANTS.find((r) => r.slug === slug);
    return localFallback || null;
  }, [currentRestaurant, slug]);

  // Set default category to 'All' or first available when restaurant loads
  useEffect(() => {
    if (restaurant && restaurant.categories && restaurant.categories.length > 0) {
      setSelectedCategory('All');
    }
  }, [restaurant]);

  // List of active categories
  const categoriesList = useMemo(() => {
    if (!restaurant || !restaurant.categories) return [];
    return restaurant.categories.filter((cat) => cat.is_active);
  }, [restaurant]);

  // Filtered menu items to display
  const menuItems = useMemo(() => {
    if (!restaurant || !restaurant.categories) return [];
    
    if (selectedCategory === 'All') {
      // Flatten all items from active categories
      return restaurant.categories
        .filter((cat) => cat.is_active)
        .flatMap((cat) => cat.items.map(item => ({ ...item, categoryName: cat.name })));
    }
    
    const matchedCategory = restaurant.categories.find(
      (cat) => cat.name === selectedCategory && cat.is_active
    );
    
    return matchedCategory ? matchedCategory.items.map(item => ({ ...item, categoryName: matchedCategory.name })) : [];
  }, [restaurant, selectedCategory]);

  if (loading) {
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
          <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Cart helper functions
  const handleAddToCart = (item: MenuItem) => {
    // If adding an item from a different restaurant, show confirmation to reset cart
    if (cart.restaurantId && cart.restaurantId !== restaurant.id) {
      Alert.alert(
        'Reset Cart?',
        'You have items from another restaurant in your cart. Adding this item will clear your current cart. Do you want to proceed?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Reset',
            onPress: () => {
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
  };

  const handleIncrement = (item: MenuItem, currentQty: number) => {
    dispatch(
      updateQuantity({
        id: item.id,
        selectedOptions: [],
        quantity: currentQty + 1,
      })
    );
  };

  const handleDecrement = (item: MenuItem, currentQty: number) => {
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
  };

  const getItemQuantity = (itemId: number) => {
    if (cart.restaurantId !== restaurant.id) return 0;
    const cartItem = cart.items.find((i: any) => i.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {/* Cover Image & Header Controls */}
        <View style={styles.coverContainer}>
          <Image source={getImageUrl(restaurant.cover_image)} style={styles.coverImage} />
          <View style={styles.coverOverlay} />

          {/* Floating Header buttons */}
          <View style={styles.headerButtonsRow}>
            <TouchableOpacity style={styles.circleButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={20} color={COLORS.dark} />
            </TouchableOpacity>
            
            <View style={styles.headerRightButtons}>
              <TouchableOpacity style={styles.circleButton}>
                <Ionicons name="share-outline" size={20} color={COLORS.dark} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.circleButton, { marginLeft: SPACING.sm }]}>
                <Ionicons name="heart-outline" size={20} color={COLORS.dark} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Restaurant Details Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.logoContainer}>
            <Image source={getImageUrl(restaurant.logo)} style={styles.logoImage} />
          </View>
          
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          <Text style={styles.cuisineText}>{restaurant.cuisine_type}</Text>
          
          {restaurant.description ? (
            <Text style={styles.descriptionText}>{restaurant.description}</Text>
          ) : null}

          {/* Ratings & Quick Specs Row */}
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

          {/* Address & Hours Detail Info */}
          <View style={styles.moreInfoSection}>
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={14} color={COLORS.gray} />
              <Text style={styles.moreInfoText} numberOfLines={1}>
                {restaurant.address}
              </Text>
            </View>
            <View style={[styles.infoRow, { marginTop: 6 }]}>
              <Ionicons name="alarm-outline" size={14} color={COLORS.gray} />
              <Text style={styles.moreInfoText}>
                Working hours: {restaurant.opens_at.slice(0, 5)} - {restaurant.closes_at.slice(0, 5)}
              </Text>
            </View>
          </View>
        </View>

        {/* Category Selector Tabs */}
        {categoriesList.length > 0 && (
          <View style={styles.tabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsScrollContent}
            >
              <TouchableOpacity
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
                <TouchableOpacity
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

        {/* Menu Items List */}
        <View style={styles.menuContainer}>
          <Text style={styles.menuSectionHeader}>
            {selectedCategory === 'All' ? 'Menu' : selectedCategory}
          </Text>
          
          {menuItems.map((item: MenuItem & { categoryName?: string }) => {
            const quantity = getItemQuantity(item.id);
            return (
              <View key={item.id} style={styles.menuItemCard}>
                <View style={styles.menuItemTextContent}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {selectedCategory === 'All' && item.categoryName && (
                    <Text style={styles.itemCategoryName}>{item.categoryName}</Text>
                  )}
                  <Text style={styles.itemDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <Text style={styles.itemPrice}>Rs. {Number(item.price)}</Text>
                  
                  {item.preparation_time > 0 && (
                    <Text style={styles.itemPrepTime}>
                      ⏱️ Ready in {item.preparation_time} mins
                    </Text>
                  )}
                </View>

                <View style={styles.menuItemImageContainer}>
                  {item.image ? (
                    <Image source={getImageUrl(item.image)} style={styles.itemImage} />
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons name="pizza-outline" size={24} color={COLORS.gray} />
                    </View>
                  )}

                  {/* Quantity Selector overlay / add button */}
                  <View style={styles.quantitySelectorContainer}>
                    {quantity > 0 ? (
                      <View style={styles.quantityRow}>
                        <TouchableOpacity
                          style={styles.quantityBtn}
                          onPress={() => handleDecrement(item, quantity)}
                        >
                          <Ionicons name="remove" size={16} color={COLORS.white} />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{quantity}</Text>
                        <TouchableOpacity
                          style={styles.quantityBtn}
                          onPress={() => handleIncrement(item, quantity)}
                        >
                          <Ionicons name="add" size={16} color={COLORS.white} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.addButton}
                        activeOpacity={0.8}
                        onPress={() => handleAddToCart(item)}
                      >
                        <Ionicons name="add" size={14} color={COLORS.white} style={{ marginRight: 2 }} />
                        <Text style={styles.addButtonText}>ADD</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            );
          })}

          {menuItems.length === 0 && (
            <View style={styles.emptyMenu}>
              <Ionicons name="fast-food-outline" size={48} color={COLORS.lightGray} />
              <Text style={styles.emptyMenuText}>No items available in this category</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Sticky Bottom Cart Bar */}
      {cart.restaurantId === restaurant.id && cart.totalQuantity > 0 && (
        <View style={styles.bottomCartBar}>
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
    height: 200,
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
    backgroundColor: COLORS.light,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
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
});
