import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  FlatList,
  Image,
  ActivityIndicator,
  RefreshControl,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { logoutUser } from '../store/userSlice';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, FONTS, SPACING, SHADOWS } from '../theme';
import { fetchRestaurants } from '../store/restaurantSlice';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { StatusBar } from 'expo-status-bar';
import { getImageUrl } from '../services/fallbackData';
import { RestaurantCardSkeleton } from '../components/SkeletonLoader';
import * as Location from 'expo-location';
import LocationPromptModal from '../components/LocationPromptModal';

const { width } = Dimensions.get('window');

const categories = [
  { id: 'All', name: 'All', icon: '🍽️' },
  { id: 'BBQ', name: 'BBQ', icon: '🍖' },
  { id: 'Seafood', name: 'Seafood', icon: '🐟' },
  { id: 'Burgers', name: 'Burgers', icon: '🍔' },
  { id: 'Tandoori', name: 'Tandoori', icon: '🍗' },
  { id: 'Sandwiches', name: 'Melts', icon: '🥪' },
  { id: 'Desserts', name: 'Café', icon: '☕' },
];

// Shimmering card components are imported from SkeletonLoader for GPU accelerated performance.

export default function HomeScreen({ navigation }: { navigation: any }) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.user);
  const { restaurants, loading } = useSelector((state: RootState) => state.restaurant);

  // APP-01: STEP 1 — State add karo
  const [selectedCategory, setSelectedCategory] = React.useState<string>('All');

  // APP-28: Pull-to-refresh state
  const [refreshing, setRefreshing] = React.useState(false);

  // APP-01: STEP 2 — Filtered list compute karo
  const filteredRestaurants = React.useMemo(() => {
    if (selectedCategory === 'All') return restaurants;
    return restaurants.filter((r: any) =>
      r.cuisine_type?.toLowerCase().includes(selectedCategory.toLowerCase()) ||
      r.name?.toLowerCase().includes(selectedCategory.toLowerCase())
    );
  }, [restaurants, selectedCategory]);

  const [showLocationPrompt, setShowLocationPrompt] = React.useState(false);

  React.useEffect(() => {
    const checkLocation = async () => {
      let { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        setShowLocationPrompt(true);
      }
    };
    checkLocation();
  }, []);

  const handleAllowLocation = async () => {
    setShowLocationPrompt(false);
    await Location.requestForegroundPermissionsAsync();
  };

  const handleDenyLocation = () => {
    setShowLocationPrompt(false);
  };

  // APP-02: STEP 1 — State aur data add karo
  const [bannerIndex, setBannerIndex] = React.useState(0);
  const BANNERS = [
    {
      icon: 'fast-food' as const,
      title: '7 Brands, One Cart!',
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

  // APP-02: STEP 2 — Auto-rotate effect add karo
  React.useEffect(() => {
    const timer = setInterval(() => {
      setBannerIndex(prev => (prev + 1) % BANNERS.length);
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    dispatch(fetchRestaurants());
  }, [dispatch]);

  // APP-28: Pull-to-refresh handler
  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await dispatch(fetchRestaurants());
    setRefreshing(false);
  }, [dispatch]);

  // APP-01: STEP 3 — renderCategoryChip function REPLACE karo
  const renderCategoryChip = ({ item }: { item: typeof categories[0] }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        item.id === selectedCategory && styles.activeCategoryChip,
        SHADOWS.small,
      ]}
      onPress={() => setSelectedCategory(item.id)}
      activeOpacity={0.75}
    >
      <View style={{flexDirection: 'row', alignItems: 'center'}}>
        <Text style={{fontSize: 16, marginRight: 6}}>{item.icon}</Text>
        <Text style={[
          styles.categoryText,
          item.id === selectedCategory && styles.activeCategoryText,
        ]}>
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Top Welcome Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>
            Deliver to {user?.is_guest ? 'Guest' : user?.username || 'Guest'}
          </Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location-sharp" size={16} color={COLORS.primary} />
            <Text style={styles.locationText} numberOfLines={1}>
              Street 45, Blue Area, Islamabad
            </Text>
            <Ionicons name="chevron-down" size={14} color={COLORS.gray} />
          </View>
        </View>

        {/* APP-03: Header Search Icon Button */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Search')}
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        
        {/* APP-02: STEP 3 — Banner JSX block REPLACE karo */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={[styles.promoBanner, { backgroundColor: BANNERS[bannerIndex].bg }, SHADOWS.medium]}
          onPress={() => navigation.navigate('Search')}
        >
          <View style={styles.bannerContent}>
            <View style={{ flex: 1, paddingRight: SPACING.xs }}>
              <Text style={styles.bannerTitle}>{BANNERS[bannerIndex].title}</Text>
              <Text style={styles.bannerSubtitle}>{BANNERS[bannerIndex].subtitle}</Text>
              <View style={styles.bannerCTARow}>
                <Text style={styles.bannerCTAText}>Order Now</Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.white} />
              </View>
            </View>
            <View style={styles.bannerIconWrap}>
              <Ionicons name={BANNERS[bannerIndex].icon} size={72} color="rgba(255,255,255,0.25)" />
            </View>
          </View>
          {/* Dot Indicators */}
          <View style={styles.bannerDots}>
            {BANNERS.map((_, i) => (
              <View key={i} style={[styles.bannerDot, i === bannerIndex && styles.bannerDotActive]} />
            ))}
          </View>
        </TouchableOpacity>

        {/* Categories Chips */}
        <FlatList
          data={categories}
          renderItem={renderCategoryChip}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesList}
          contentContainerStyle={{ paddingRight: SPACING.md }}
        />

        {/* Featured Brands Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Explore Brands</Text>
          <Text style={styles.sectionLink}>View All</Text>
        </View>

        {/* APP-04 & APP-05: Loading / Empty / Content block */}
        {loading ? (
          <View style={{ paddingHorizontal: 0 }}>
            {[1, 2, 3].map(i => <RestaurantCardSkeleton key={i} />)}
          </View>
        ) : filteredRestaurants.length === 0 ? (
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
        ) : (
          filteredRestaurants.map((brand: any, index: number) => {
            // Web Prototype matching gradients and emojis
            const prototypeStyles: Record<string, { colors: readonly [string, string, ...string[]], emoji?: string }> = {
              'seenbanao': { colors: ['#3E1F00', '#FF5722'] as const, emoji: '🔥' },
              'jushhpk': { colors: ['#1A0A00', '#D2691E'] as const, emoji: '🍔' },
              'dineatblue': { colors: ['#001529', '#0055A4'] as const, emoji: '🐟' },
              'sandmelts': { colors: ['#FF6B00', '#FF3CAC'] as const, emoji: '🥪🧀' },
              'tandooristoppk': { colors: ['#FF9900', '#E65100'] as const, emoji: '🍗🔥' },
              'getafomo': { colors: ['#E0C3FC', '#8EC5FC'] as const, emoji: '☕🍰' },
              'default': { colors: ['#FF5722', '#E91E63'] as const, emoji: '🍽️' }
            };

            const styleData = prototypeStyles[brand.slug] || prototypeStyles['default'];
            
            return (
              <TouchableOpacity
                key={brand.id}
                style={[styles.brandCard, SHADOWS.medium]}
                activeOpacity={0.95}
                onPress={() => navigation.navigate('Restaurant', { slug: brand.slug })}
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
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={14} color="#FFC107" />
                    <Text style={styles.ratingText}>{Number(brand.rating).toFixed(1)}</Text>
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
                  <Text style={styles.brandCuisine}>{brand.cuisine_type}</Text>
                  <Text style={styles.brandTagline} numberOfLines={2}>
                    {brand.description || brand.address}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Guest Login Banner */}
      {user?.is_guest && (
        <View style={styles.stickyLoginCard}>
          <View style={styles.stickyLoginLeft}>
            <View style={styles.stickyLoginIconBg}>
              <Ionicons name="person" size={16} color="#d97706" />
            </View>
            <View style={{ marginLeft: SPACING.sm }}>
              <Text style={styles.stickyLoginTitle}>Browsing as Guest</Text>
              <Text style={styles.stickyLoginSubtitle}>Sign in to earn loyalty points</Text>
            </View>
          </View>
          <TouchableOpacity activeOpacity={0.8}
            style={styles.stickyLoginBtn}
            onPress={async () => {
              await dispatch(logoutUser());
              navigation.replace('Auth');
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
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === 'android' ? (RNStatusBar.currentHeight || 24) + SPACING.sm : SPACING.sm,
    paddingBottom: SPACING.sm,
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
  stickyLoginSubtitle: {
    fontSize: 11,
    color: '#b45309', // text-amber-700
    marginTop: 1,
  },
  stickyLoginBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  stickyLoginBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
