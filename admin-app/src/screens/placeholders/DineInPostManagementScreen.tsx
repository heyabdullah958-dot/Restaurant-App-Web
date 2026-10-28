import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Platform,
  RefreshControl,
  Switch,
  ImageStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppSelector } from '../../store';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../theme';
import {
  fetchDineInPosts,
  createDineInPost,
  updateDineInPost,
  deleteDineInPost,
  DineInMediaPost,
  fetchRestaurants,
  api
} from '../../services/api';

export const DineInPostManagementScreen = () => {
  const { user, role } = useAppSelector((state) => state.auth);
  const isSuper = role === 'super_admin' || Boolean(user?.isSuperuser);
  const theme = isSuper
    ? COLORS.superAdmin
    : { ...COLORS.branchManager, accent: COLORS.branchManager.primary };

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(
    user?.restaurantId || null
  );

  const [posts, setPosts] = useState<DineInMediaPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Menu items for tagging
  const [menuItems, setMenuItems] = useState<any[]>([]);

  // Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [title, setTitle] = useState<string>('');
  const [caption, setCaption] = useState<string>('');
  const [mediaType, setMediaType] = useState<'VIDEO' | 'IMAGE'>('VIDEO');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  const [pickedAsset, setPickedAsset] = useState<any>(null);
  const [linkedItemId, setLinkedItemId] = useState<number | null>(null);
  const [isPostActive, setIsPostActive] = useState<boolean>(true);

  // Initial load
  useEffect(() => {
    const init = async () => {
      try {
        const res: any = await fetchRestaurants();
        const rests: any[] = Array.isArray(res) ? res : (res?.results || []);
        setRestaurants(rests);
        if (!selectedBrandId && rests.length > 0) {
          setSelectedBrandId(rests[0].id);
        }
      } catch (e) {
        console.warn('Failed to load restaurants:', e);
      }
    };
    init();
  }, []);

  // Load menu items when restaurant changes
  const loadMenuCatalog = useCallback(async (restId: number) => {
    try {
      const res = await api.get(`/restaurants/${restId}/menu/`);
      const items: any[] = [];
      const cats = Array.isArray(res.data) ? res.data : (res.data?.categories || res.data?.results || []);
      cats.forEach((c: any) => {
        if (Array.isArray(c.items)) {
          c.items.forEach((item: any) => {
            items.push({ id: item.id, name: item.name, price: item.price, categoryName: c.name });
          });
        }
      });
      setMenuItems(items);
    } catch (e) {
      console.warn('Failed to load menu items for tagging:', e);
    }
  }, []);

  const loadPosts = useCallback(async () => {
    const targetBrand = isSuper ? selectedBrandId : user?.restaurantId;
    if (!targetBrand) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await fetchDineInPosts({
        restaurant_id: targetBrand,
        include_inactive: true
      });
      setPosts(data);
      loadMenuCatalog(targetBrand);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to load video posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isSuper, selectedBrandId, user?.restaurantId, loadMenuCatalog]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPosts();
  };

  const quotaUsed = posts.filter((p) => p.is_active).length;

  const handlePickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera roll permissions are required to select videos or photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPickedAsset(asset);
        if (asset.type === 'video' || asset.uri.toLowerCase().endsWith('.mp4')) {
          setMediaType('VIDEO');
        } else {
          setMediaType('IMAGE');
        }
      }
    } catch (err) {
      Alert.alert('Media Picker Error', 'Could not open media library.');
    }
  };

  const handleCreatePost = async () => {
    if (!title.trim()) {
      Alert.alert('Validation Error', 'Highlight title is required.');
      return;
    }

    if (!pickedAsset && !mediaUrl.trim()) {
      Alert.alert('Validation Error', 'Please select a media file or provide a video URL.');
      return;
    }

    const targetBrand = isSuper ? selectedBrandId : user?.restaurantId;
    if (!targetBrand) {
      Alert.alert('Error', 'No restaurant brand selected.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('restaurant', String(targetBrand));
      formData.append('title', title.trim());
      formData.append('caption', caption.trim());
      formData.append('media_type', mediaType);
      formData.append('is_active', String(isPostActive));

      if (linkedItemId) {
        formData.append('linked_menu_item', String(linkedItemId));
      }

      if (pickedAsset) {
        const uri = pickedAsset.uri;
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        const isVid = mediaType === 'VIDEO';

        (formData as any).append('media_file', {
          uri,
          name: `upload_${Date.now()}.${fileType || (isVid ? 'mp4' : 'jpg')}`,
          type: isVid ? `video/${fileType || 'mp4'}` : `image/${fileType || 'jpeg'}`,
        });
      } else {
        formData.append('media_url', mediaUrl.trim());
      }

      await createDineInPost(formData);
      Alert.alert(
        'Success',
        quotaUsed >= 10
          ? 'Post published! Oldest post was automatically retired (10-video FIFO quota).'
          : 'Dine-In Highlight reel published successfully!'
      );
      setModalVisible(false);
      resetModal();
      loadPosts();
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.response?.data?.error || err?.message || 'Could not upload post.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setTitle('');
    setCaption('');
    setMediaType('VIDEO');
    setMediaUrl('');
    setPickedAsset(null);
    setLinkedItemId(null);
    setIsPostActive(true);
  };

  const handleToggleStatus = async (post: DineInMediaPost) => {
    try {
      await updateDineInPost(post.id, { is_active: !post.is_active });
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, is_active: !p.is_active } : p))
      );
    } catch (err: any) {
      Alert.alert('Error', 'Failed to update post status.');
    }
  };

  const handleDelete = (post: DineInMediaPost) => {
    Alert.alert(
      'Delete Reel',
      `Are you sure you want to delete "${post.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDineInPost(post.id);
              setPosts((prev) => prev.filter((p) => p.id !== post.id));
            } catch (err: any) {
              Alert.alert('Error', 'Failed to delete post.');
            }
          },
        },
      ]
    );
  };

  const renderPostItem = ({ item }: { item: DineInMediaPost }) => (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Media Image / Thumbnail */}
      <View style={styles.mediaContainer}>
        <Image
          source={{ uri: item.thumbnail_url || item.media_url }}
          style={styles.mediaImage}
          resizeMode="cover"
        />
        <View style={styles.mediaBadges}>
          <View style={[styles.typeBadge, { backgroundColor: item.media_type === 'VIDEO' ? '#EF4444' : '#3B82F6' }]}>
            <Ionicons name={item.media_type === 'VIDEO' ? 'videocam' : 'image'} size={12} color="#FFF" />
            <Text style={styles.typeBadgeText}>{item.media_type}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: item.is_active ? '#10B981' : '#6B7280' }]}>
            <Text style={styles.statusBadgeText}>{item.is_active ? 'LIVE' : 'HIDDEN'}</Text>
          </View>
        </View>
      </View>

      {/* Info Body */}
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.caption ? (
          <Text style={[styles.cardCaption, { color: theme.muted }]} numberOfLines={2}>
            {item.caption}
          </Text>
        ) : null}

        {/* Linked Dish Bar */}
        {item.linked_item_details ? (
          <View style={[styles.dishBar, { backgroundColor: isSuper ? '#1E293B' : '#F1F5F9' }]}>
            <Ionicons name="link-outline" size={14} color="#EF4444" style={{ marginRight: 6 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.dishName, { color: theme.text }]} numberOfLines={1}>
                {item.linked_item_details.name}
              </Text>
              <Text style={styles.dishPrice}>Rs. {Math.round(item.linked_item_details.price)}</Text>
            </View>
            <View style={styles.dishCartPill}>
              <Text style={styles.dishCartText}>1-Tap Buy</Text>
            </View>
          </View>
        ) : null}

        {/* Footer Actions */}
        <View style={styles.cardFooter}>
          <Text style={[styles.dateText, { color: theme.muted }]}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.actionBtn,
                { backgroundColor: item.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)' }
              ]}
              onPress={() => handleToggleStatus(item)}
            >
              <Ionicons
                name={item.is_active ? 'eye-outline' : 'eye-off-outline'}
                size={16}
                color={item.is_active ? '#10B981' : '#6B7280'}
              />
              <Text style={[styles.actionBtnText, { color: item.is_active ? '#10B981' : '#6B7280' }]}>
                {item.is_active ? 'Active' : 'Hidden'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)', marginLeft: 8 }]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isSuper ? 'light-content' : 'dark-content'} />

      {/* Brand Selector for Super Admin */}
      {isSuper && restaurants.length > 0 && (
        <View style={[styles.brandSelectorRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandChipsContainer}>
            {restaurants.map((r) => {
              const selected = r.id === selectedBrandId;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.brandChip,
                    selected && { backgroundColor: theme.accent, borderColor: theme.accent }
                  ]}
                  onPress={() => setSelectedBrandId(r.id)}
                >
                  <Text style={[styles.brandChipText, selected && { color: '#FFF', fontWeight: 'bold' }]}>
                    {r.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Quota Header Bar */}
      <View style={[styles.quotaContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.quotaHeader}>
          <View style={styles.quotaTitleRow}>
            <Ionicons name="film-outline" size={18} color="#EF4444" style={{ marginRight: 6 }} />
            <Text style={[styles.quotaTitle, { color: theme.text }]}>Dine-In Highlights Quota</Text>
          </View>
          <View
            style={[
              styles.quotaBadge,
              { backgroundColor: quotaUsed >= 10 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)' }
            ]}
          >
            <Text
              style={[
                styles.quotaBadgeText,
                { color: quotaUsed >= 10 ? '#EF4444' : '#10B981' }
              ]}
            >
              {quotaUsed} / 10 Active
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(100, (quotaUsed / 10) * 100)}%`,
                backgroundColor: quotaUsed >= 10 ? '#EF4444' : '#10B981'
              }
            ]}
          />
        </View>
        <Text style={[styles.quotaHelpText, { color: theme.muted }]}>
          {quotaUsed >= 10
            ? 'Quota full. Publishing a new video will automatically retire the oldest video (FIFO).'
            : 'Videos showcase signature dishes and sizzle clips directly in the Customer mobile app.'}
        </Text>
      </View>

      {/* Main List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#EF4444" />
        </View>
      ) : posts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-outline" size={48} color={theme.muted} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No Reels Uploaded</Text>
          <Text style={[styles.emptySubtitle, { color: theme.muted }]}>
            Upload short video reels to engage guests browsing the Dine-In restaurant feed.
          </Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderPostItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => {
          resetModal();
          setModalVisible(true);
        }}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>New Dine-In Reel</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              {/* Media Picker Button */}
              <TouchableOpacity style={styles.mediaPickerBtn} onPress={handlePickMedia}>
                {pickedAsset ? (
                  <View style={styles.pickedContainer}>
                    <Image source={{ uri: pickedAsset.uri }} style={styles.pickedThumbnail} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.pickedLabel, { color: theme.text }]} numberOfLines={1}>
                        {pickedAsset.fileName || 'Selected Media'}
                      </Text>
                      <Text style={styles.pickedSub}>
                        {pickedAsset.type?.toUpperCase() || 'VIDEO'} · Tap to change
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.mediaPickerPlaceholder}>
                    <Ionicons name="cloud-upload-outline" size={32} color="#EF4444" />
                    <Text style={[styles.pickerBtnText, { color: theme.text }]}>Select Video or Photo</Text>
                    <Text style={styles.pickerSubText}>MP4, MOV, or JPG from your camera roll</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Direct URL Fallback */}
              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 12 }]}>
                Or Direct Video URL (Optional CDN link)
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]}
                placeholder="https://.../video.mp4"
                placeholderTextColor={theme.muted}
                value={mediaUrl}
                onChangeText={setMediaUrl}
              />

              {/* Title */}
              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 12 }]}>Highlight Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]}
                placeholder="e.g. Sizzling Kunafa Prawns or Naan Pull"
                placeholderTextColor={theme.muted}
                value={title}
                onChangeText={setTitle}
                maxLength={120}
              />

              {/* Caption */}
              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 12 }]}>Description / Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]}
                placeholder="Describe the dish or preparation..."
                placeholderTextColor={theme.muted}
                value={caption}
                onChangeText={setCaption}
                multiline
                numberOfLines={3}
                maxLength={350}
              />

              {/* Linked Dish Selector */}
              <Text style={[styles.inputLabel, { color: theme.text, marginTop: 12 }]}>
                Tag Menu Item (Enables 1-Tap Customer Add-to-Cart)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dishChipsRow}>
                <TouchableOpacity
                  style={[styles.dishChip, linkedItemId === null && styles.dishChipSelected]}
                  onPress={() => setLinkedItemId(null)}
                >
                  <Text style={[styles.dishChipText, linkedItemId === null && styles.dishChipTextSelected]}>
                    None (General Reel)
                  </Text>
                </TouchableOpacity>
                {menuItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.dishChip, linkedItemId === item.id && styles.dishChipSelected]}
                    onPress={() => setLinkedItemId(item.id)}
                  >
                    <Text style={[styles.dishChipText, linkedItemId === item.id && styles.dishChipTextSelected]}>
                      {item.name} (Rs. {Math.round(item.price)})
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Publish Active Switch */}
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: theme.text }]}>Make Reel Live Immediately</Text>
                <Switch
                  value={isPostActive}
                  onValueChange={setIsPostActive}
                  trackColor={{ false: '#767577', true: '#10B981' }}
                  thumbColor="#FFF"
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { borderColor: theme.border }]}
                  onPress={() => setModalVisible(false)}
                  disabled={submitting}
                >
                  <Text style={[styles.modalCancelText, { color: theme.text }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalSubmitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleCreatePost}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.modalSubmitText}>Publish Reel</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  brandSelectorRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  brandChipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  brandChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: 'transparent',
  },
  brandChipText: {
    fontSize: 12,
    color: '#64748B',
  },
  quotaContainer: {
    margin: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  quotaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  quotaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quotaTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  quotaBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  quotaBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  quotaHelpText: {
    fontSize: 11,
    lineHeight: 15,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 90,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    ...SHADOWS.small,
  },
  mediaContainer: {
    height: 180,
    width: '100%',
    backgroundColor: '#000',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  } as ImageStyle,
  mediaBadges: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  typeBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardContent: {
    padding: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardCaption: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  dishBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  dishName: {
    fontSize: 12,
    fontWeight: '600',
  },
  dishPrice: {
    fontSize: 11,
    color: '#10B981',
    fontWeight: '700',
  },
  dishCartPill: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dishCartText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  dateText: {
    fontSize: 11,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#EF4444',
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  mediaPickerBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#EF4444',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  mediaPickerPlaceholder: {
    alignItems: 'center',
  },
  pickerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 6,
  },
  pickerSubText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  pickedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  pickedThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#000',
  } as ImageStyle,
  pickedLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  pickedSub: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  dishChipsRow: {
    marginVertical: 4,
  },
  dishChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginRight: 8,
  },
  dishChipSelected: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  dishChipText: {
    fontSize: 12,
    color: '#64748B',
  },
  dishChipTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalSubmitBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
