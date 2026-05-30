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
  Modal,
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

const isRestaurantOpen = (opensAt: string, closesAt: string): boolean => {
  try {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const [openH, openM] = opensAt.split(':').map(Number);
    const [closeH, closeM] = closesAt.split(':').map(Number);
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    return nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
  } catch {
    return true; // Default to open if error
  }
};

export default function RestaurantScreen() {
  const route = useRoute<RestaurantScreenRouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();
  const { slug } = route.params;

  const { currentRestaurant, loading } = useSelector((state: RootState) => state.restaurant);
  const cart = useSelector((state: RootState) => state.cart);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedItemForOptions, setSelectedItemForOptions] = useState<MenuItem | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

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
          <TouchableOpacity activeOpacity={0.75} style={styles.errorButton} onPress={() => navigation.goBack()}>
            <Text style={styles.errorButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Cart helper functions
  const confirmAddVariantToCart = (item: MenuItem, variant: any) => {
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
      Alert.alert(
        'Reset Cart?',
        'You have items from another restaurant in your cart. Adding this item will clear your current cart. Do you want to proceed?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Yes, Reset',
            onPress: () => {
              dispatch(addItemToCart({ item: itemToAdd, restaurantId: restaurant.id }));
              setSelectedItemForOptions(null);
            },
          },
        ]
      );
    } else {
      dispatch(addItemToCart({ item: itemToAdd, restaurantId: restaurant.id }));
      setSelectedItemForOptions(null);
    }
  };

  const handleAddToCart = (item: MenuItem) => {
    // If the item has variants, open the options selection modal
    if (item.options?.has_variants && item.options?.variants?.length > 0) {
      setSelectedItemForOptions(item);
      setSelectedVariant(item.options.variants[0]);
      return;
    }

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
        stickyHeaderIndices={[1]}
      >
        <View>
          {/* Cover Image & Header Controls */}
          <View style={styles.coverContainer}>
            <Image source={getImageUrl(restaurant.cover_image)} style={styles.coverImage} />
            <View style={styles.coverOverlay} />

            {/* Floating Header buttons */}
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

          {/* Restaurant Details Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.logoContainer}>
              <Image source={getImageUrl(restaurant.logo)} style={styles.logoImage} />
            </View>
            
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            <Text style={styles.cuisineText}>{restaurant.cuisine_type}</Text>

            {/* UI-16: Open/Closed status badge */}
            {(() => {
              const open = isRestaurantOpen(restaurant.opens_at, restaurant.closes_at);
              return (
                <View style={[styles.openBadge, { backgroundColor: open ? 'rgba(76,175,80,0.1)' : 'rgba(244,67,54,0.1)' }]}>
                  <View style={[styles.openDot, { backgroundColor: open ? COLORS.success : COLORS.danger }]} />
                  <Text style={[styles.openText, { color: open ? COLORS.success : COLORS.danger }]}>
                    {open ? 'Open Now' : 'Currently Closed'}
                  </Text>
                </View>
              );
            })()}
            
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
        </View>

        {/* Category Tabs Selector (Sticky Index 1) */}
        <View style={[styles.tabsContainer, styles.tabsSticky, styles.stickyTabs, categoriesList.length === 0 && { height: 0, paddingVertical: 0, borderBottomWidth: 0 }]}>
          {categoriesList.length > 0 && (
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
          )}
        </View>

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
                      <Ionicons name="fast-food-outline" size={28} color={COLORS.primary} />
                      <Text style={{ fontSize: 9, color: COLORS.primary, marginTop: 2, opacity: 0.7 }}>
                        No Image
                      </Text>
                    </View>
                  )}

                  {/* Quantity Selector overlay / add button */}
                  <View style={styles.quantitySelectorContainer}>
                    {quantity > 0 && !item.options?.has_variants ? (
                      <View style={styles.quantityRow}>
                        <TouchableOpacity activeOpacity={0.75}
                          style={styles.quantityBtn}
                          onPress={() => handleDecrement(item, quantity)}
                        >
                          <Ionicons name="remove" size={16} color={COLORS.white} />
                        </TouchableOpacity>
                        <Text style={styles.quantityText}>{quantity}</Text>
                        <TouchableOpacity activeOpacity={0.75}
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
                        <Text style={styles.addButtonText}>
                          {item.options?.has_variants && quantity > 0 ? `ADD MORE (${quantity})` : 'ADD'}
                        </Text>
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
});
