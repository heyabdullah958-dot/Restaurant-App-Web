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
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
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

const POPULAR_SEARCHES = ['Burgers', 'BBQ', 'Seafood', 'Naan', 'Melt', 'Coffee', 'Tikka', 'Karahi'];

interface MatchingDish {
  item: MenuItem;
  restaurantName: string;
  restaurantSlug: string;
}

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useDispatch<AppDispatch>();

  const { restaurants, loading } = useSelector((state: RootState) => state.restaurant);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Ensure restaurants list is populated
  useEffect(() => {
    dispatch(fetchRestaurants());
  }, [dispatch]);

  // Simulate API search latency or real-time query fetching
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setIsSearching(true);
      const timer = setTimeout(() => {
        setIsSearching(false);
      }, 300); // 300ms debounce
      return () => clearTimeout(timer);
    } else {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Get active source of restaurants (API state or local fallback)
  const activeSource = useMemo(() => {
    return restaurants && restaurants.length > 0 ? restaurants : FALLBACK_RESTAURANTS;
  }, [restaurants]);

  // Filter matching restaurants and dishes
  const { matchingRestaurants, matchingDishes } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { matchingRestaurants: [], matchingDishes: [] };
    }

    const query = searchQuery.toLowerCase().trim();

    // 1. Filter Restaurants matching name or cuisine type
    const matchedRest = activeSource.filter(
      (r) =>
        r.name.toLowerCase().includes(query) ||
        r.cuisine_type.toLowerCase().includes(query) ||
        r.description.toLowerCase().includes(query)
    );

    // 2. Filter Dishes (menu items) matching name or description
    const matchedDishes: MatchingDish[] = [];
    activeSource.forEach((r) => {
      // Use categories inside restaurant details
      // If the restaurant in the store list doesn't have categories (e.g. from general list API),
      // we check if we can match it from the FALLBACK_RESTAURANTS which has nested categories.
      const restaurantDetail = FALLBACK_RESTAURANTS.find((fr) => fr.slug === r.slug) || r;
      
      if (restaurantDetail.categories) {
        restaurantDetail.categories.forEach((cat: any) => {
          if (cat.items) {
            cat.items.forEach((item: any) => {
              if (
                item.name.toLowerCase().includes(query) ||
                item.description.toLowerCase().includes(query)
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

  const handlePopularSearchPress = (keyword: string) => {
    setSearchQuery(keyword);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />

      {/* Search Header */}
      <View style={styles.searchHeader}>
        <TouchableOpacity
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
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Content Area */}
      {searchQuery.trim().length === 0 ? (
        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Popular Searches */}
          <View style={styles.popularContainer}>
            <Text style={styles.sectionTitle}>Popular Searches</Text>
            <View style={styles.chipsContainer}>
              {POPULAR_SEARCHES.map((keyword) => (
                <TouchableOpacity
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
              <Text style={styles.loadingText}>Searching for food sphere...</Text>
            </View>
          ) : matchingRestaurants.length === 0 && matchingDishes.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={COLORS.lightGray} />
              <Text style={styles.emptyStateTitle}>No results for "{searchQuery}"</Text>
              <Text style={styles.emptyStateDesc}>
                Check spelling, try other keywords, or browse popular cuisines.
              </Text>
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
                    <TouchableOpacity
                      key={restaurant.id}
                      activeOpacity={0.8}
                      style={styles.restaurantRowCard}
                      onPress={() =>
                        navigation.navigate('Restaurant', { slug: restaurant.slug })
                      }
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
                            {Number(restaurant.rating).toFixed(1)}
                          </Text>
                          <View style={styles.dividerDot} />
                          <Text style={styles.restaurantRowDelivery}>
                            {restaurant.delivery_time_min}-{restaurant.delivery_time_max} mins
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={COLORS.lightGray} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Dishes Section */}
              {matchingDishes.length > 0 && (
                <View style={[styles.resultsSection, { marginTop: SPACING.md }]}>
                  <Text style={styles.resultsSectionTitle}>Dishes & Items</Text>
                  {matchingDishes.map(({ item, restaurantName, restaurantSlug }) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      style={styles.dishRowCard}
                      onPress={() =>
                        navigation.navigate('Restaurant', { slug: restaurantSlug })
                      }
                    >
                      <View style={styles.dishTextContent}>
                        <Text style={styles.dishName}>{item.name}</Text>
                        <Text style={styles.dishRestaurantName}>from {restaurantName}</Text>
                        <Text style={styles.dishDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                        <Text style={styles.dishPrice}>Rs. {item.price}</Text>
                      </View>
                      {item.image && (
                        <Image source={getImageUrl(item.image)} style={styles.dishImage} />
                      )}
                    </TouchableOpacity>
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
    paddingVertical: SPACING.sm,
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
});
