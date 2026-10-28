import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store';
import { addItemToCart } from '../store/cartSlice';
import api from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 360);

export interface DineInFeedPost {
  id: number;
  restaurant: number;
  restaurant_name: string;
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

export const DineInVideoFeed: React.FC<DineInVideoFeedProps> = ({
  fulfillmentMode,
  onSelectRestaurant,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [posts, setPosts] = useState<DineInFeedPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [addedItemMap, setAddedItemMap] = useState<Record<number, boolean>>({});

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/dine-in-posts/');
      const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setPosts(data.filter((p: any) => p.is_active));
    } catch (err) {
      console.warn('[DineInVideoFeed] Could not load video posts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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

    // Provide visual feedback
    setAddedItemMap((prev) => ({ ...prev, [post.id]: true }));
    setTimeout(() => {
      setAddedItemMap((prev) => ({ ...prev, [post.id]: false }));
    }, 2000);
  };

  if (loading && posts.length === 0) {
    return null;
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>Dine-In Highlights</Text>
          </View>
          <Text style={styles.sectionTitle}>Live Sizzle & Food Reels</Text>
          <Text style={styles.sectionSubtitle}>
            Watch dishes sizzle at the table & add them to your order in 1 tap
          </Text>
        </View>
      </View>

      {/* Horizontal Reels Carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 14}
        snapToAlignment="start"
      >
        {posts.map((post) => {
          const isPlaying = playingId === post.id;
          const isItemAdded = addedItemMap[post.id];
          const hasLinkedItem = Boolean(post.linked_item_details);

          return (
            <View key={post.id} style={styles.card}>
              {/* Card Top: Brand Header */}
              <View style={styles.brandRow}>
                {post.restaurant_logo ? (
                  <Image source={{ uri: post.restaurant_logo }} style={styles.brandAvatar} />
                ) : (
                  <View style={styles.brandAvatarFallback}>
                    <Text style={styles.brandFallbackText}>
                      {post.restaurant_name ? post.restaurant_name[0] : '🍽️'}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.brandName} numberOfLines={1}>
                    {post.restaurant_name}
                  </Text>
                  <Text style={styles.branchPill} numberOfLines={1}>
                    {post.branch_name || 'Signature Experience'}
                  </Text>
                </View>
                <View style={styles.reelTag}>
                  <Text style={styles.reelTagText}>REEL</Text>
                </View>
              </View>

              {/* Video Player / Media Container */}
              <View style={styles.mediaContainer}>
                {isPlaying && post.media_type === 'VIDEO' ? (
                  <View style={styles.webviewWrapper}>
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
                                src="${post.media_url}"
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
                      allowsInlineMediaPlayback
                      mediaPlaybackRequiresUserAction={false}
                      style={styles.webview}
                      scrollEnabled={false}
                    />
                    {/* Floating Mute Toggle Button */}
                    <TouchableOpacity
                      style={styles.floatingMuteBtn}
                      activeOpacity={0.8}
                      onPress={() => setIsMuted((m) => !m)}
                    >
                      <Text style={styles.floatingMuteIcon}>{isMuted ? '🔇' : '🔊'}</Text>
                    </TouchableOpacity>

                    {/* Pause / Close Video Button */}
                    <TouchableOpacity
                      style={styles.floatingPauseBtn}
                      activeOpacity={0.8}
                      onPress={() => setPlayingId(null)}
                    >
                      <Text style={styles.floatingPauseText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.posterContainer}
                    activeOpacity={0.9}
                    onPress={() => {
                      if (post.media_type === 'VIDEO') {
                        setPlayingId(post.id);
                      }
                    }}
                  >
                    <Image
                      source={{ uri: post.thumbnail_url || post.media_url }}
                      style={styles.posterImage}
                      resizeMode="cover"
                    />
                    {post.media_type === 'VIDEO' && (
                      <View style={styles.playOverlay}>
                        <View style={styles.playCircle}>
                          <Text style={styles.playArrow}>▶</Text>
                        </View>
                        <Text style={styles.playLabel}>Tap to Watch</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                )}
              </View>

              {/* Title & Caption */}
              <View style={styles.detailsContainer}>
                <Text style={styles.postTitle} numberOfLines={1}>
                  {post.title}
                </Text>
                {post.caption ? (
                  <Text style={styles.postCaption} numberOfLines={2}>
                    {post.caption}
                  </Text>
                ) : null}
              </View>

              {/* 1-Tap Add to Cart Dish Bar */}
              {hasLinkedItem && post.linked_item_details ? (
                <View style={styles.cartBar}>
                  {post.linked_item_details.image && (
                    <Image
                      source={{ uri: post.linked_item_details.image }}
                      style={styles.dishThumbnail}
                      resizeMode="cover"
                    />
                  )}
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.dishName} numberOfLines={1}>
                      {post.linked_item_details.name}
                    </Text>
                    <Text style={styles.dishPrice}>
                      Rs. {Math.round(post.linked_item_details.price)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.addBtn,
                      !post.linked_item_details.is_available && styles.disabledBtn,
                      isItemAdded && styles.addedBtn,
                    ]}
                    activeOpacity={0.85}
                    disabled={!post.linked_item_details.is_available}
                    onPress={() => handleAddToCart(post)}
                  >
                    <Text style={styles.addBtnText}>
                      {isItemAdded
                        ? '✓ Added'
                        : !post.linked_item_details.is_available
                        ? 'Sold Out'
                        : '+ Add'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 14,
  },
  headerRow: {
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  headerLeft: {
    flex: 1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 5,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
    paddingBottom: 8,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  brandAvatarFallback: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandFallbackText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
  brandName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  branchPill: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  reelTag: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  reelTagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  mediaContainer: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  webviewWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  webview: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  floatingMuteBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
  },
  floatingMuteIcon: {
    fontSize: 14,
  },
  floatingPauseBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingPauseText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  posterContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  posterImage: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 16,
    padding: 8,
  },
  playCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  playArrow: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  playLabel: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  detailsContainer: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  postCaption: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginTop: 3,
  },
  cartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 10,
    marginBottom: 10,
    marginTop: 4,
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dishThumbnail: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  dishName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  dishPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
    marginTop: 1,
  },
  addBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addedBtn: {
    backgroundColor: '#10B981',
  },
  disabledBtn: {
    backgroundColor: '#94A3B8',
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
