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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SHADOWS } from '../theme';
import { fetchRestaurants } from '../store/restaurantSlice';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { StatusBar } from 'expo-status-bar';
import { getImageUrl } from '../services/fallbackData';

const { width } = Dimensions.get('window');

const categories = ['All', 'BBQ', 'Seafood', 'Burgers', 'Tandoori', 'Sandwiches', 'Desserts'];

export default function HomeScreen({ navigation }: { navigation: any }) {
  const dispatch = useDispatch<AppDispatch>();
  const { user } = useSelector((state: RootState) => state.user);
  const { restaurants, loading } = useSelector((state: RootState) => state.restaurant);

  React.useEffect(() => {
    dispatch(fetchRestaurants());
  }, [dispatch]);

  const renderCategoryChip = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        item === 'All' ? styles.activeCategoryChip : null,
        SHADOWS.small,
      ]}
    >
      <Text
        style={[
          styles.categoryText,
          item === 'All' ? styles.activeCategoryText : null,
        ]}
      >
        {item}
      </Text>
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

        <TouchableOpacity 
          style={styles.rewardsButton}
          onPress={() => navigation.navigate('Rewards')}
        >
          <Ionicons name="ribbon-sharp" size={22} color={COLORS.primary} />
          {!user?.is_guest && (
            <View style={styles.pointsBadge}>
              <Text style={styles.pointsText}>{user?.loyalty_points || 0}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Banner Promotion */}
        <View style={[styles.promoBanner, SHADOWS.medium]}>
          <View style={styles.bannerInfo}>
            <Text style={styles.bannerTitle}>7 Brands, One Cart!</Text>
            <Text style={styles.bannerSubtitle}>Mix and match cuisines from all restaurants in a single delivery order.</Text>
            <TouchableOpacity style={styles.bannerCTA}>
              <Text style={styles.bannerCTAText}>Order Now</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bannerGraphic}>
            <Ionicons name="fast-food" size={80} color="rgba(255,255,255,0.2)" />
          </View>
        </View>

        {/* Categories Chips */}
        <FlatList
          data={categories}
          renderItem={renderCategoryChip}
          keyExtractor={(item) => item}
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

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.xl }} />
        ) : (
          restaurants.map((brand: any, index: number) => {
            // Cycle through some default colors and icons if not provided
            const colors = ['#FF5722', '#2196F3', '#E91E63', '#FF9800', '#4CAF50', '#9C27B0', '#795548'];
            const icons = ['flame', 'boat', 'fast-food', 'leaf', 'beer', 'egg', 'cafe'];
            const color = colors[index % colors.length];
            const icon = icons[index % icons.length];
            
            return (
              <TouchableOpacity
                key={brand.id}
                style={[styles.brandCard, SHADOWS.medium]}
                activeOpacity={0.95}
                onPress={() => navigation.navigate('Restaurant', { slug: brand.slug })}
              >
                {/* Top styled color band representing brand theme */}
                <View style={[styles.brandBand, { backgroundColor: color }]}>
                  {brand.cover_image ? (
                    <Image 
                      source={getImageUrl(brand.cover_image)} 
                      style={[StyleSheet.absoluteFill, { opacity: 0.8 }]} 
                    />
                  ) : (
                    <Ionicons name={icon as any} size={32} color={COLORS.white} />
                  )}
                  <View style={styles.ratingBadge}>
                    <Ionicons name="star" size={14} color="#FFC107" />
                    <Text style={styles.ratingText}>{Number(brand.rating).toFixed(1)}</Text>
                  </View>
                </View>

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
    paddingVertical: SPACING.sm,
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
    maxWidth: width * 0.6,
    marginHorizontal: 4,
  },
  rewardsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    paddingBottom: SPACING.xl,
  },
  promoBanner: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    padding: SPACING.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
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
  bannerCTA: {
    backgroundColor: COLORS.white,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bannerCTAText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
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
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
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
});
