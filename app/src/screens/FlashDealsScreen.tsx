import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { COLORS, FONTS, SPACING, SHADOWS } from '../theme';
import api from '../services/api';
import { applyPromo, AppliedPromo } from '../store/cartSlice';

const { width } = Dimensions.get('window');

interface FlashDealItem {
  id: number;
  title: string;
  description?: string;
  deal_type?: 'percentage' | 'flat';
  discount_value?: number;
  discount_percentage?: number;
  max_discount?: number | null;
  min_subtotal?: number;
  restaurant?: number | { id: number; name: string; slug: string };
  restaurant_id?: number;
  restaurant_name?: string;
  restaurant_slug?: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  is_dine_in_only?: boolean;
}

// Brand mapping helpers
const BRAND_DATA: Record<string, { name: string; slug: string; emoji: string; colors: readonly [string, string, ...string[]] }> = {
  'jushhpk': { name: 'Jush PK', slug: 'jushhpk', emoji: '🍔', colors: ['#1A0A00', '#D2691E'] },
  'tandooristoppk': { name: 'Tandoori Stop', slug: 'tandooristoppk', emoji: '🍗🔥', colors: ['#FF9900', '#E65100'] },
  'getafomo': { name: 'Get A Fomo', slug: 'getafomo', emoji: '☕🍰', colors: ['#E0C3FC', '#8EC5FC'] },
  'seenbanao': { name: 'Seen Banao', slug: 'seenbanao', emoji: '🔥', colors: ['#3E1F00', '#FF5722'] },
  'dineatblue': { name: 'Dine At Blue', slug: 'dineatblue', emoji: '🐟', colors: ['#001529', '#0055A4'] },
  'sandmelts': { name: 'Sand Melts', slug: 'sandmelts', emoji: '🥪', colors: ['#FF6B00', '#FF3CAC'] },
  'birdmanfoodspk': { name: 'Birdman Foods', slug: 'birdmanfoodspk', emoji: '🍗', colors: ['#7A0000', '#FF1744'] },
};

const resolveBrandInfo = (deal: FlashDealItem) => {
  if (typeof deal.restaurant === 'object' && deal.restaurant?.slug) {
    const key = deal.restaurant.slug.toLowerCase().replace(/\s+/g, '');
    return BRAND_DATA[key] || { name: deal.restaurant.name || 'FoodSphere', slug: deal.restaurant.slug, emoji: '🍽️', colors: ['#e11d48', '#f43f5e'] };
  }
  if (deal.restaurant_slug) {
    const key = deal.restaurant_slug.toLowerCase().replace(/\s+/g, '');
    return BRAND_DATA[key] || { name: deal.restaurant_name || 'FoodSphere', slug: deal.restaurant_slug, emoji: '🍽️', colors: ['#e11d48', '#f43f5e'] };
  }
  // Default to Jush PK or Tandoori Stop
  if (deal.title?.toLowerCase().includes('burger')) return BRAND_DATA['jushhpk'];
  if (deal.title?.toLowerCase().includes('tandoori') || deal.title?.toLowerCase().includes('boti') || deal.title?.toLowerCase().includes('naan')) return BRAND_DATA['tandooristoppk'];
  if (deal.title?.toLowerCase().includes('coffee') || deal.title?.toLowerCase().includes('fomo')) return BRAND_DATA['getafomo'];
  return BRAND_DATA['jushhpk'];
};

const useCountdown = (targetDateStr: string) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const calculate = () => {
      const now = new Date().getTime();
      const target = new Date(targetDateStr).getTime();
      const diff = target - now;

      if (diff <= 0 || isNaN(diff)) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDateStr]);

  return timeLeft;
};

const DealCard = React.memo(({ deal, onClaim }: { deal: FlashDealItem; onClaim: (deal: FlashDealItem) => void }) => {
  const brand = useMemo(() => resolveBrandInfo(deal), [deal]);
  const countdown = useCountdown(deal.end_time);

  const discountText = useMemo(() => {
    const val = deal.discount_value || deal.discount_percentage || 20;
    return deal.deal_type === 'flat' ? `Rs. ${val} OFF` : `${val}% OFF`;
  }, [deal]);

  const minOrderText = useMemo(() => {
    if (deal.min_subtotal && deal.min_subtotal > 0) {
      return `Min. order: Rs. ${Number(deal.min_subtotal).toFixed(0)}`;
    }
    return 'No minimum order';
  }, [deal.min_subtotal]);

  if (countdown.isExpired) {
    return null;
  }

  return (
    <View style={styles.cardContainer}>
      <LinearGradient
        colors={brand.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardHeaderGradient}
      >
        <View style={styles.cardHeaderRow}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandEmoji}>{brand.emoji}</Text>
            <Text style={styles.brandNameText}>{brand.name}</Text>
          </View>

          <View style={styles.discountPill}>
            <Ionicons name="flash" size={12} color="#FFFFFF" />
            <Text style={styles.discountPillText}>{discountText}</Text>
          </View>
        </View>

        <Text style={styles.dealTitleText}>{deal.title}</Text>
        {deal.description ? (
          <Text style={styles.dealDescText} numberOfLines={2}>{deal.description}</Text>
        ) : null}
      </LinearGradient>

      <View style={styles.cardBody}>
        {/* Live Timer Row */}
        <View style={styles.timerRow}>
          <View style={styles.timerLabelWrap}>
            <Ionicons name="time-outline" size={16} color="#e11d48" />
            <Text style={styles.timerLabel}>Ends In:</Text>
          </View>

          <View style={styles.timerBoxesContainer}>
            {countdown.days > 0 && (
              <>
                <View style={styles.timerBox}>
                  <Text style={styles.timerValue}>{String(countdown.days).padStart(2, '0')}</Text>
                  <Text style={styles.timerUnit}>D</Text>
                </View>
                <Text style={styles.timerColon}>:</Text>
              </>
            )}
            <View style={styles.timerBox}>
              <Text style={styles.timerValue}>{String(countdown.hours).padStart(2, '0')}</Text>
              <Text style={styles.timerUnit}>H</Text>
            </View>
            <Text style={styles.timerColon}>:</Text>
            <View style={styles.timerBox}>
              <Text style={styles.timerValue}>{String(countdown.minutes).padStart(2, '0')}</Text>
              <Text style={styles.timerUnit}>M</Text>
            </View>
            <Text style={styles.timerColon}>:</Text>
            <View style={[styles.timerBox, { backgroundColor: '#fee2e2' }]}>
              <Text style={[styles.timerValue, { color: '#e11d48' }]}>{String(countdown.seconds).padStart(2, '0')}</Text>
              <Text style={[styles.timerUnit, { color: '#e11d48' }]}>S</Text>
            </View>
          </View>
        </View>

        {/* Details & Terms */}
        <View style={styles.detailsRow}>
          <View style={styles.detailTag}>
            <Ionicons name="receipt-outline" size={13} color={COLORS.gray} />
            <Text style={styles.detailTagText}>{minOrderText}</Text>
          </View>

          <View style={[styles.detailTag, deal.is_dine_in_only ? styles.dineInTag : styles.deliveryTag]}>
            <Ionicons
              name={deal.is_dine_in_only ? 'restaurant-outline' : 'bicycle-outline'}
              size={13}
              color={deal.is_dine_in_only ? '#7c3aed' : '#2563eb'}
            />
            <Text style={[styles.detailTagText, { color: deal.is_dine_in_only ? '#7c3aed' : '#2563eb', fontWeight: '700' }]}>
              {deal.is_dine_in_only ? '🍽️ Dine-In Only' : '🛵 Delivery & Takeaway'}
            </Text>
          </View>
        </View>

        {/* Claim Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.claimButton}
          onPress={() => onClaim(deal)}
        >
          <LinearGradient
            colors={['#e11d48', '#be123c']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.claimGradient}
          >
            <Text style={styles.claimButtonText}>⚡ Claim & Order Now</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function FlashDealsScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch();

  const [deals, setDeals] = useState<FlashDealItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DELIVERY' | 'DINE_IN'>('ALL');

  const fetchDeals = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get('/promotions/flash-deals/');
      const raw = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setDeals(raw);
    } catch (e) {
      console.warn('Failed to fetch flash deals:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  const filteredDeals = useMemo(() => {
    if (activeFilter === 'DELIVERY') {
      return deals.filter(d => !d.is_dine_in_only);
    }
    if (activeFilter === 'DINE_IN') {
      return deals.filter(d => d.is_dine_in_only);
    }
    return deals;
  }, [deals, activeFilter]);

  const handleClaim = useCallback((deal: FlashDealItem) => {
    const brand = resolveBrandInfo(deal);
    const promoCode = `FLASH-${(deal.title || 'SALE').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8)}`;
    
    const promoPayload: AppliedPromo = {
      code: promoCode,
      discount_type: deal.deal_type === 'flat' ? 'fixed' : 'percentage',
      discount_value: Number(deal.discount_value || deal.discount_percentage || 20),
      max_discount: deal.max_discount ? Number(deal.max_discount) : null,
      min_subtotal: Number(deal.min_subtotal || 0),
      discount: 0,
    };

    dispatch(applyPromo(promoPayload));

    // Navigate to restaurant screen with alert banner
    navigation.navigate('Restaurant', {
      slug: brand.slug,
      flashDealClaimed: {
        id: deal.id,
        title: deal.title,
        discount: promoPayload.discount_value,
        type: promoPayload.discount_type,
      }
    });
  }, [dispatch, navigation]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#be123c" />

      {/* Header Banner */}
      <LinearGradient
        colors={['#e11d48', '#be123c']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerBanner}
      >
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleWrap}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 20 }}>⚡</Text>
              <Text style={styles.headerTitle}>Flash Sales & Specials</Text>
            </View>
            <Text style={styles.headerSubtitle}>Limited-time countdown discounts before stock runs out!</Text>
          </View>
        </View>

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'ALL' && styles.filterPillActive]}
            onPress={() => setActiveFilter('ALL')}
          >
            <Text style={[styles.filterPillText, activeFilter === 'ALL' && styles.filterPillTextActive]}>
              🔥 All Deals ({deals.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'DELIVERY' && styles.filterPillActive]}
            onPress={() => setActiveFilter('DELIVERY')}
          >
            <Text style={[styles.filterPillText, activeFilter === 'DELIVERY' && styles.filterPillTextActive]}>
              🛵 Delivery
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'DINE_IN' && styles.filterPillActive]}
            onPress={() => setActiveFilter('DINE_IN')}
          >
            <Text style={[styles.filterPillText, activeFilter === 'DINE_IN' && styles.filterPillTextActive]}>
              🍽️ Dine-In
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#e11d48" />
          <Text style={styles.loadingText}>Fetching active flash deals...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDeals}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchDeals(true)}
              tintColor="#e11d48"
              colors={['#e11d48']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>⏳</Text>
              <Text style={styles.emptyTitle}>No Active Flash Deals</Text>
              <Text style={styles.emptySubtitle}>
                Check back soon! Restaurant managers schedule daily flash sales and happy hour discounts.
              </Text>
              <TouchableOpacity
                style={styles.exploreBtn}
                onPress={() => navigation.navigate('Main', { screen: 'Home' })}
              >
                <Text style={styles.exploreBtnText}>Explore All Restaurants</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <DealCard deal={item} onClaim={handleClaim} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerBanner: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.md,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...SHADOWS.medium,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#ffe4e6',
    fontWeight: '500',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  filterPillActive: {
    backgroundColor: '#FFFFFF',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterPillTextActive: {
    color: '#be123c',
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: SPACING.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.medium,
  },
  cardHeaderGradient: {
    padding: SPACING.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  brandEmoji: {
    fontSize: 14,
  },
  brandNameText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  discountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e11d48',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  discountPillText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dealTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  dealDescText: {
    fontSize: 12,
    color: '#F1F5F9',
    fontWeight: '500',
  },
  cardBody: {
    padding: SPACING.md,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF1F2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  timerLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#9F1239',
  },
  timerBoxesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timerBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
    borderWidth: 1,
    borderColor: '#FDA4AF',
  },
  timerValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#881337',
  },
  timerUnit: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9F1239',
  },
  timerColon: {
    fontSize: 12,
    fontWeight: '800',
    color: '#E11D48',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 6,
  },
  detailTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flex: 1,
  },
  detailTagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },
  dineInTag: {
    backgroundColor: '#F5F3FF',
  },
  deliveryTag: {
    backgroundColor: '#EFF6FF',
  },
  claimButton: {
    borderRadius: 10,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  claimGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 6,
  },
  claimButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.gray,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  exploreBtn: {
    backgroundColor: '#e11d48',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
