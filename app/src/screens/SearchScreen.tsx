import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, SHADOWS, FONTS } from '../theme';
import { AppDispatch, RootState } from '../store';
import { fetchRestaurants } from '../store/restaurantSlice';
import { FALLBACK_RESTAURANTS, getImageUrl, Restaurant, MenuItem } from '../services/fallbackData';

type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  Restaurant: { slug: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Search'>;

interface MatchingDish {
  item: MenuItem;
  restaurantName: string;
  restaurantSlug: string;
}

// Helper to derive authentic active items as popular tags if API is unreachable
const getFallbackPopularTags = (source: any[]): string[] => {
  const activeBrands = ['tandooristoppk', 'jushhpk', 'getafomo'];
  const src = source && source.length > 0 ? source : FALLBACK_RESTAURANTS;
  const activeSource = src.filter((r: any) => activeBrands.includes(r.slug || r.name?.toLowerCase().replace(/\s+/g, '')));

  const tags: string[] = [];
  const seen = new Set<string>();

  activeSource.forEach((r: any) => {
    const detail = FALLBACK_RESTAURANTS.find((fr) => fr.slug === r.slug) || r;
    if (detail.categories) {
      detail.categories.forEach((cat: any) => {
        if (cat.items) {
          cat.items.forEach((item: any) => {
            if (item.is_available !== false && item.name) {
              const name = item.name.trim();
              if (!seen.has(name.toLowerCase())) {
                seen.add(name.toLowerCase());
                tags.push(name);
              }
            }
          });
        }
      });
    }
  });

  return tags.length > 0 ? tags.slice(0, 8) : ['Tandoori Chicken', 'Reshmi Kabab', 'Double Smash Burger', 'Special Roghani Naan'];
};

// Memoized Search Result Components
const RestaurantResultCard = React.memo(({ restaurant, onPress }: { restaurant: any, onPress: (slug: string) => void }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    style={styles.restaurantRowCard}
    onPress={() => onPress(restaurant.slug)}
  >
    <Image
      source={getImageUrl(restaurant.logo)}
      style={styles.restaurantRowLogo}
    />
    <View style={styles.restaurantRowInfo}>
      <Text style={styles.restaurantRowName}>{restaurant.name}</Text>
      <Text style={styles.restaurantRowCuisine}>{restaurant.cuisine_type}</Text>
      <View style={styles.restaurantRowMeta}>
        <Ionicons name="star" size={12} color={COLORS.warning} />
        <Text style={styles.restaurantRowRating}>
          {Number(restaurant.rating || 4.5).toFixed(1)}
        </Text>
        <View style={styles.dividerDot} />
        <Text style={styles.restaurantRowDelivery}>
          {restaurant.delivery_time_min}-{restaurant.delivery_time_max} mins
        </Text>
      </View>
    </View>
    <Ionicons name="chevron-forward" size={20} color={COLORS.lightGray} />
  </TouchableOpacity>
));

const DishResultCard = React.memo(({ dish, onPress }: { dish: MatchingDish, onPress: (slug: string) => void }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    style={styles.dishRowCard}
    onPress={() => onPress(dish.restaurantSlug)}
  >
    <View style={styles.dishTextContent}>
      <Text style={styles.dishName}>{dish.item.name}</Text>
      <Text style={styles.dishRestaurantName}>from {dish.restaurantName}</Text>
      <Text style={styles.dishDescription} numberOfLines={2}>
        {dish.item.description}
      </Text>
      <Text style={styles.dishPrice}>Rs. {dish.item.price}</Text>
    </View>
    {(dish.item.image_url || dish.item.image) && (
      <Image source={getImageUrl(dish.item.image_url || dish.item.image)} style={styles.dishImage} />
    )}
  </TouchableOpacity>
));

import api from '../services/api';

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();

  const restaurants = useSelector((state: RootState) => state.restaurant.restaurants);
  const loading = useSelector((state: RootState) => state.restaurant.loading);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [popularTags, setPopularTags] = useState<string[]>([]);

  const [recentSearches, setRecentSearches] = React.useState<string[]>([]);

  useEffect(() => {
    dispatch(fetchRestaurants());

    // Dynamically fetch top popular search tags from backend API
    api.get('/restaurants/popular-tags/')
      .then((res) => {
        if (res.data && Array.isArray(res.data.tags) && res.data.tags.length > 0) {
          setPopularTags(res.data.tags);
        } else if (res.data && Array.isArray(res.data.results) && res.data.results.length > 0) {
          setPopularTags(res.data.results.map((r: any) => r.name));
        } else {
          setPopularTags(getFallbackPopularTags(restaurants));
        }
      })
      .catch(() => {
        setPopularTags(getFallbackPopularTags(restaurants));
      });
  }, [dispatch, restaurants]);


  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        setIsSearching(false);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const activeSource = useMemo(() => {
    const src = restaurants && restaurants.length > 0 ? restaurants : FALLBACK_RESTAURANTS;
    const activeBrands = ['tandooristoppk', 'jushhpk', 'getafomo'];
    return src.filter((r: any) => activeBrands.includes(r.slug || r.name?.toLowerCase().replace(/\s+/g, '')));
  }, [restaurants]);

  const { matchingRestaurants, matchingDishes } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { matchingRestaurants: [], matchingDishes: [] };
    }

    const query = searchQuery.toLowerCase().trim();

    const matchedRest = activeSource.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.cuisine_type.toLowerCase().includes(query) ||
        (r.description && r.description.toLowerCase().includes(query))
    );

    const matchedDishes: MatchingDish[] = [];
    activeSource.forEach((r) => {
      const restaurantDetail = FALLBACK_RESTAURANTS.find((fr) => fr.slug === r.slug) || r;
      
      if (restaurantDetail.categories) {
        restaurantDetail.categories.forEach((cat: any) => {
          if (cat.items) {
            cat.items.forEach((item: any) => {
              if (
                item.name.toLowerCase().includes(query) ||
                (item.description && item.description.toLowerCase().includes(query))
              ) {
                matchedDishes.push({
                  item,
                  restaurantName: r.name,
                  restaurantSlug: r.slug,
                });
              }
            });
          }
        });
      }
    });

    return {
      matchingRestaurants: matchedRest,
      matchingDishes: matchedDishes,
    };
  }, [searchQuery, activeSource]);

  const handlePopularSearchPress = React.useCallback((keyword: string) => {
    setSearchQuery(keyword);
    setRecentSearches(prev => {
      const updated = [keyword.trim(), ...prev.filter(s => s !== keyword.trim())].slice(0, 5);
      return updated;
    });
  }, []);

  const handleSelectRestaurant = React.useCallback((slug: string) => {
    navigation.navigate('Restaurant', { slug });
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TouchableOpacity activeOpacity={0.75}
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.dark} />
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <Ionicons name="search" size={20} color={COLORS.gray} style={styles.inputSearchIcon} />
          <TextInput
            placeholder="Search for restaurants or dishes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.textInput}
            placeholderTextColor={COLORS.gray}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity activeOpacity={0.75} onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      {searchQuery.trim().length === 0 ? (
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.recentContainer}>
              <View style={styles.recentHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <TouchableOpacity activeOpacity={0.75} onPress={() => setRecentSearches([])}>
                  <Text style={{ color: COLORS.gray, fontSize: 12 }}>Clear</Text>
                </TouchableOpacity>
              </View>
              {recentSearches.map(term => (
                <TouchableOpacity activeOpacity={0.75}
                  key={term}
                  style={styles.recentItem}
                  onPress={() => handlePopularSearchPress(term)}
                >
                  <Ionicons name="time-outline" size={16} color={COLORS.gray} />
                  <Text style={styles.recentItemText}>{term}</Text>
                  <Ionicons name="arrow-up-outline" size={14} color={COLORS.lightGray} style={{ transform: [{ rotate: '45deg' }] }} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Popular Searches */}
          <View style={styles.popularContainer}>
            <Text style={styles.sectionTitle}>Popular Searches</Text>
            <View style={styles.chipsContainer}>
              {(popularTags.length > 0 ? popularTags : getFallbackPopularTags(restaurants)).map((keyword) => (
                <TouchableOpacity activeOpacity={0.75}
                  key={keyword}
                  style={styles.chip}
                  onPress={() => handlePopularSearchPress(keyword)}
                >
                  <Ionicons name="trending-up-outline" size={14} color={COLORS.primary} style={styles.chipIcon} />
                  <Text style={styles.chipText}>{keyword}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

        </ScrollView>
      ) : (
        <View style={styles.resultsContainer}>
          {isSearching || loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Searching GetFood...</Text>
            </View>
          ) : matchingRestaurants.length === 0 && matchingDishes.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconRing}>
                <Ionicons name="search-outline" size={40} color={COLORS.primary} />
              </View>
              <Text style={styles.emptyStateTitle}>No results for "{searchQuery}"</Text>
              <Text style={styles.emptyStateDesc}>
                Check spelling, try other keywords, or browse popular cuisines.
              </Text>
              <TouchableOpacity activeOpacity={0.75}
                style={styles.emptyStateBtn}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.emptyStateBtnText}>Clear Search</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.resultsScroll}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Restaurants Section */}
              {matchingRestaurants.length > 0 && (
                <View style={styles.resultsSection}>
                  <Text style={styles.resultsSectionTitle}>Restaurants</Text>
                  {matchingRestaurants.map((restaurant) => (
                    <RestaurantResultCard
                      key={restaurant.id}
                      restaurant={restaurant}
                      onPress={handleSelectRestaurant}
                    />
                  ))}
                </View>
              )}

              {/* Dishes Section */}
              {matchingDishes.length > 0 && (
                <View style={[styles.resultsSection, { marginTop: SPACING.md }]}>
                  <Text style={styles.resultsSectionTitle}>Dishes & Items</Text>
                  {matchingDishes.map((dish) => (
                    <DishResultCard
                      key={dish.item.id}
                      dish={dish}
                      onPress={handleSelectRestaurant}
                    />
                  ))}
                </View>
              )}
            </ScrollView>
          )}
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
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    ...SHADOWS.small,
  },
  backButton: {
    marginRight: SPACING.sm,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light,
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    height: 40,
  },
  inputSearchIcon: {
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    ...FONTS.body,
    color: COLORS.dark,
    height: '100%',
    padding: 0, // Reset default padding
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: SPACING.md,
    paddingBottom: 100,
  },
  popularContainer: {
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    ...FONTS.subtitle,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  chipIcon: {
    marginRight: 4,
  },
  chipText: {
    ...FONTS.body,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...FONTS.body,
    color: COLORS.gray,
    marginTop: SPACING.sm,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    marginTop: 60,
  },
  emptyStateTitle: {
    ...FONTS.subtitle,
    fontWeight: 'bold',
    marginTop: SPACING.md,
    textAlign: 'center',
  },
  emptyStateDesc: {
    ...FONTS.body,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  resultsScroll: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingBottom: 100,
  },
  resultsSection: {
    marginTop: SPACING.sm,
  },
  resultsSectionTitle: {
    ...FONTS.subtitle,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    color: COLORS.gray,
  },
  restaurantRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  restaurantRowLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: SPACING.sm,
  },
  restaurantRowInfo: {
    flex: 1,
  },
  restaurantRowName: {
    ...FONTS.body,
    fontWeight: 'bold',
  },
  restaurantRowCuisine: {
    ...FONTS.caption,
    color: COLORS.gray,
    marginVertical: 2,
  },
  restaurantRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  restaurantRowRating: {
    ...FONTS.caption,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  restaurantRowDelivery: {
    ...FONTS.caption,
    color: COLORS.gray,
  },
  dividerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 6,
  },
  dishRowCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  dishTextContent: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  dishName: {
    ...FONTS.body,
    fontWeight: 'bold',
  },
  dishRestaurantName: {
    fontSize: 11,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  dishDescription: {
    ...FONTS.caption,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
  dishPrice: {
    ...FONTS.body,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginTop: SPACING.sm,
  },
  dishImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    alignSelf: 'center',
  },
  recentContainer: {
    marginBottom: SPACING.lg,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    gap: SPACING.sm,
  },
  recentItemText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.dark,
  },
  emptyIconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,87,34,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1.5,
    borderColor: 'rgba(255,87,34,0.15)',
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
});
