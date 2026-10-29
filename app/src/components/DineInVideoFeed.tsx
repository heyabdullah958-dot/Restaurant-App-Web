import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  Modal,
  FlatList,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppDispatch } from '../store';
import { addItemToCart } from '../store/cartSlice';
import api from '../services/api';
import { COLORS, SHADOWS, SPACING } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// 9:16 card proportions for the home screen carousel
const PREVIEW_WIDTH = 142;
const PREVIEW_HEIGHT = Math.round(PREVIEW_WIDTH * (16 / 9)); // ~252px

export interface DineInFeedPost {
  id: number;
  restaurant: number;
  restaurant_name: string;
  restaurant_slug?: string;
  restaurant_logo?: string | null;
  branch?: number | null;
  branch_name?: string;
  title: string;
  caption: string;
  media_type: 'VIDEO' | 'IMAGE';
  media_url: string;
  cloudinary_public_id?: string;
  thumbnail_url?: string;
  linked_menu_item?: number | null;
  linked_item_details?: {
    id: number;
    name: string;
    price: number;
    image: string | null;
    is_available: boolean;
    category_name: string;
  } | null;
  is_active: boolean;
  created_at: string;
}

interface DineInVideoFeedProps {
  fulfillmentMode: string;
  onSelectRestaurant?: (slug: string) => void;
}

const BRAND_SLUG_MAP: Record<string, string> = {
  'jushhpk': 'jushhpk',
  'jush pk': 'jushhpk',
  'tandooristoppk': 'tandooristoppk',
  'tandoori stop': 'tandooristoppk',
  'getafomo': 'getafomo',
  'get a fomo': 'getafomo',
  'dineatblue': 'dineatblue',
  'blue': 'dineatblue',
};

const resolveBrandSlug = (post: DineInFeedPost): string => {
  if (post.restaurant_slug) return post.restaurant_slug;
  const normalized = (post.restaurant_name || '').toLowerCase().trim();
  for (const [key, slug] of Object.entries(BRAND_SLUG_MAP)) {
    if (normalized.includes(key) || key.includes(normalized)) return slug;
  }
  return 'jushhpk';
};

export const DineInVideoFeed: React.FC<DineInVideoFeedProps> = ({
  fulfillmentMode,
  onSelectRestaurant,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [posts, setPosts] = useState<DineInFeedPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeReelIndex, setActiveReelIndex] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [addedItemMap, setAddedItemMap] = useState<Record<number, boolean>>({});

  const verticalFlatListRef = useRef<FlatList>(null);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/dine-in-posts/');
      const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      const activeList = data.filter((p: any) => p.is_active);
      setPosts(activeList);
    } catch (err) {
      if (__DEV__) console.warn('[DineInVideoFeed] Could not load video posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleOpenPlayer = (index: number) => {
    setActiveReelIndex(index);
    setIsModalOpen(true);
  };

  const handleClosePlayer = () => {
    setIsModalOpen(false);
  };

  const handleAddToCart = (post: DineInFeedPost) => {
    const item = post.linked_item_details;
    if (!item || !item.is_available) return;

    dispatch(
      addItemToCart({
        restaurantId: post.restaurant,
        item: {
          id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: 1,
          image: item.image || undefined,
        },
      })
    );

    setAddedItemMap((prev) => ({ ...prev, [post.id]: true }));
    setTimeout(() => {
      setAddedItemMap((prev) => ({ ...prev, [post.id]: false }));
    }, 2200);
  };

  const handleExploreStorefront = (post: DineInFeedPost) => {
    const slug = resolveBrandSlug(post);
    setIsModalOpen(false);
    if (onSelectRestaurant) {
      onSelectRestaurant(slug);
    }
  };

  if (loading && posts.length === 0) {
    return null;
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Entry Point Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Crave & Watch 🔥</Text>
            <View style={styles.livePulsePill}>
              <View style={styles.livePulseDot} />
              <Text style={styles.livePulseText}>LIVE REELS</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>
            Real kitchen vibes & sizzling dishes
          </Text>
        </View>
      </View>

      {/* 9:16 Horizontal Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {posts.map((post, idx) => {
          const hasLinkedItem = Boolean(post.linked_item_details);

          return (
            <TouchableOpacity
              key={post.id}
              activeOpacity={0.88}
              style={styles.previewCard}
              onPress={() => handleOpenPlayer(idx)}
            >
              {/* Card Background / Video Thumbnail */}
              <View style={styles.previewMediaWrap}>
                {post.thumbnail_url ? (
                  <Image source={{ uri: post.thumbnail_url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                ) : (
                  <LinearGradient
                    colors={['#1F2937', '#111827', '#0F172A']}
                    style={StyleSheet.absoluteFill}
                  />
                )}

                {/* Subtle dark gradient overlay for text readability */}
                <LinearGradient
                  colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.85)']}
                  locations={[0, 0.45, 1]}
                  style={StyleSheet.absoluteFill}
                />
              </View>

              {/* Card Top: Brand Badge & REEL Pill */}
              <View style={styles.cardTopBar}>
                <View style={styles.cardBrandPill}>
                  {post.restaurant_logo ? (
                    <Image source={{ uri: post.restaurant_logo }} style={styles.cardBrandLogo} />
                  ) : (
                    <Text style={styles.cardBrandEmoji}>🍽️</Text>
                  )}
                  <Text style={styles.cardBrandText} numberOfLines={1}>
                    {post.restaurant_name}
                  </Text>
                </View>
                <View style={styles.reelTag}>
                  <Text style={styles.reelTagText}>REEL</Text>
                </View>
              </View>

              {/* Center Play Icon Indicator */}
              <View style={styles.centerPlayIcon}>
                <View style={styles.playIconBubble}>
                  <Ionicons name="play" size={16} color="#FFFFFF" style={{ marginLeft: 2 }} />
                </View>
              </View>

              {/* Card Bottom: Caption & Price Pill */}
              <View style={styles.cardBottomBar}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {post.title}
                </Text>
                {hasLinkedItem && (
                  <View style={styles.cardPriceRow}>
                    <Text style={styles.cardPriceText}>
                      Rs. {Number(post.linked_item_details!.price).toLocaleString()}
                    </Text>
                    <Ionicons name="arrow-forward-circle" size={14} color="#FBBF24" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Full-Screen Vertical Swipeable TikTok / Reels Player Modal */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        statusBarTranslucent={true}
        onRequestClose={handleClosePlayer}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <View style={styles.modalBackdrop}>
          <FlatList
            ref={verticalFlatListRef}
            data={posts}
            keyExtractor={(item) => String(item.id)}
            pagingEnabled={true}
            showsVerticalScrollIndicator={false}
            initialScrollIndex={activeReelIndex}
            getItemLayout={(_, index) => ({
              length: SCREEN_HEIGHT,
              offset: SCREEN_HEIGHT * index,
              index,
            })}
            onMomentumScrollEnd={(e) => {
              const newIdx = Math.round(e.nativeEvent.contentOffset.y / SCREEN_HEIGHT);
              if (newIdx >= 0 && newIdx < posts.length) {
                setActiveReelIndex(newIdx);
              }
            }}
            renderItem={({ item, index }) => {
              const isCurrentlyPlaying = index === activeReelIndex && isModalOpen;
              const hasLinkedItem = Boolean(item.linked_item_details);
              const isItemAdded = addedItemMap[item.id];

              return (
                <View style={styles.fullScreenReelPage}>
                  {/* Full-bleed HTML5 Video Player */}
                  {isCurrentlyPlaying && item.media_type === 'VIDEO' ? (
                    <WebView
                      source={{
                        html: `
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                              <style>
                                * { margin: 0; padding: 0; box-sizing: border-box; }
                                html, body { width: 100%; height: 100%; background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; }
                                video { width: 100%; height: 100%; object-fit: cover; }
                              </style>
                            </head>
                            <body>
                              <video
                                src="${item.media_url}"
                                autoplay
                                loop
                                ${isMuted ? 'muted' : ''}
                                playsinline
                                webkit-playsinline
                              ></video>
                            </body>
                          </html>
                        `,
                      }}
                      allowsInlineMediaPlayback={true}
                      mediaPlaybackRequiresUserAction={false}
                      androidLayerType="hardware"
                      style={StyleSheet.absoluteFill}
                    />
                  ) : (
                    <Image
                      source={{ uri: item.thumbnail_url || item.media_url }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                  )}

                  {/* Gradient vignettes for top controls and bottom overlays */}
                  <LinearGradient
                    colors={['rgba(0,0,0,0.65)', 'transparent', 'rgba(0,0,0,0.85)']}
                    locations={[0, 0.35, 0.85]}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  />

                  {/* Top Bar: Close, Live Badge & Mute Toggle */}
                  <SafeAreaView style={styles.modalTopBar} pointerEvents="box-none">
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleClosePlayer}
                      style={styles.modalIconBtn}
                    >
                      <Ionicons name="close" size={24} color="#FFFFFF" />
                    </TouchableOpacity>

                    <View style={styles.modalBrandBadge}>
                      <Text style={styles.modalBrandBadgeText}>Crave & Watch 🔥</Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setIsMuted((prev) => !prev)}
                      style={styles.modalIconBtn}
                    >
                      <Ionicons
                        name={isMuted ? 'volume-mute' : 'volume-high'}
                        size={22}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  </SafeAreaView>

                  {/* Bottom Info & Action Sheet */}
                  <SafeAreaView style={styles.modalBottomArea} edges={['bottom']}>
                    {/* Brand Pill */}
                    <View style={styles.modalBrandRow}>
                      {item.restaurant_logo ? (
                        <Image source={{ uri: item.restaurant_logo }} style={styles.modalBrandLogo} />
                      ) : (
                        <View style={styles.modalBrandLogoFallback}>
                          <Text style={{ fontSize: 14 }}>🍽️</Text>
                        </View>
                      )}
                      <View style={{ marginLeft: 8 }}>
                        <Text style={styles.modalBrandName}>{item.restaurant_name}</Text>
                        <Text style={styles.modalBranchName}>
                          {item.branch_name || 'Signature Experience'}
                        </Text>
                      </View>
                    </View>

                    {/* Reel Title & Caption */}
                    <Text style={styles.modalReelTitle}>{item.title}</Text>
                    {item.caption ? (
                      <Text style={styles.modalReelCaption} numberOfLines={2}>
                        {item.caption}
                      </Text>
                    ) : null}

                    {/* Linked Dish 1-Tap Cart Card (if attached to item) */}
                    {hasLinkedItem && item.linked_item_details && (
                      <View style={styles.modalDishCard}>
                        {item.linked_item_details.image && (
                          <Image
                            source={{ uri: item.linked_item_details.image }}
                            style={styles.modalDishImg}
                          />
                        )}
                        <View style={{ flex: 1, paddingHorizontal: 10 }}>
                          <Text style={styles.modalDishName} numberOfLines={1}>
                            {item.linked_item_details.name}
                          </Text>
                          <Text style={styles.modalDishPrice}>
                            Rs. {Number(item.linked_item_details.price).toLocaleString()}
                          </Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.85}
                          style={[
                            styles.modalAddToCartBtn,
                            isItemAdded && { backgroundColor: '#10B981' },
                          ]}
                          onPress={() => handleAddToCart(item)}
                        >
                          <Ionicons
                            name={isItemAdded ? 'checkmark-circle' : 'cart-outline'}
                            size={16}
                            color="#FFFFFF"
                          />
                          <Text style={styles.modalAddToCartText}>
                            {isItemAdded ? 'Added' : 'Add +'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Full-Width "Explore Menu / Order Now" CTA Button */}
                    <TouchableOpacity
                      activeOpacity={0.9}
                      style={styles.modalOrderNowCTA}
                      onPress={() => handleExploreStorefront(item)}
                    >
                      <LinearGradient
                        colors={['#E11D48', '#BE123C']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.modalOrderNowGradient}
                      >
                        <Text style={styles.modalOrderNowText}>
                          Explore Menu / Order Now
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                      </LinearGradient>
                    </TouchableOpacity>
                  </SafeAreaView>
                </View>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  headerRow: {
    paddingHorizontal: SPACING.md,
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.dark,
    letterSpacing: -0.3,
  },
  livePulsePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 5,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
  },
  livePulseText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.gray,
    fontWeight: '500',
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    gap: 12,
  },
  previewCard: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    borderRadius: 18,
    backgroundColor: '#0F172A',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...SHADOWS.medium,
  },
  previewMediaWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 8,
    zIndex: 10,
  },
  cardBrandPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 3,
    maxWidth: 95,
  },
  cardBrandLogo: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 4,
  },
  cardBrandEmoji: {
    fontSize: 10,
    marginRight: 4,
  },
  cardBrandText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reelTag: {
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  reelTagText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  centerPlayIcon: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  playIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBottomBar: {
    padding: 10,
    zIndex: 10,
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    lineHeight: 16,
  },
  cardPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  cardPriceText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FBBF24',
  },

  // Modal Full Screen Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
  },
  fullScreenReelPage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 12,
    zIndex: 20,
  },
  modalIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBrandBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalBrandBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  modalBottomArea: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    zIndex: 20,
  },
  modalBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalBrandLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  modalBrandLogoFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBrandName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  modalBranchName: {
    fontSize: 11,
    color: '#E5E7EB',
    fontWeight: '500',
  },
  modalReelTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  modalReelCaption: {
    fontSize: 13,
    color: '#D1D5DB',
    lineHeight: 18,
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  modalDishCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 14,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  modalDishImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  modalDishName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalDishPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FBBF24',
    marginTop: 2,
  },
  modalAddToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#BE123C',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  modalAddToCartText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOrderNowCTA: {
    borderRadius: 14,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  modalOrderNowGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  modalOrderNowText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
