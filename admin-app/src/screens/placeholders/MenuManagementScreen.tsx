import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Modal,
  Image,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchMenuThunk,
  toggleItemAvailabilityThunk,
  createCategoryThunk,
  deleteCategoryThunk,
  createItemThunk,
  updateItemThunk,
  deleteItemThunk,
  setSelectedBrand,
  setSearchTerm,
} from '../../store/menuSlice';
import { MenuCategoryData, MenuItemData, getFullImageUrl } from '../../services/api';
import { LoadingState, ErrorState, EmptyState } from '../../components/ui';

const BRAND_LIST = [
  { id: 3, name: 'Jushh PK', slug: 'jushhpk', icon: '🍔' },
  { id: 4, name: 'Tandoori Stop', slug: 'tandooristoppk', icon: '🫓' },
  { id: 7, name: 'Get A Fomo', slug: 'getafomo', icon: '☕' },
];

const getFallbackEmoji = (itemName: string, categoryName: string): string => {
  const name = (itemName + ' ' + categoryName).toLowerCase();
  if (name.includes('burger') || name.includes('sandwich') || name.includes('melt')) return '🍔';
  if (name.includes('bbq') || name.includes('boti') || name.includes('kebab') || name.includes('tikka') || name.includes('handi')) return '🍖';
  if (name.includes('chicken') || name.includes('broast') || name.includes('wings')) return '🍗';
  if (name.includes('naan') || name.includes('roti') || name.includes('paratha') || name.includes('tandoori')) return '🫓';
  if (name.includes('fish') || name.includes('seafood') || name.includes('prawn')) return '🐟';
  if (name.includes('drink') || name.includes('soda') || name.includes('shake') || name.includes('beverage') || name.includes('tea') || name.includes('coffee')) return '🥤';
  if (name.includes('fries') || name.includes('side')) return '🍟';
  if (name.includes('sweet') || name.includes('dessert') || name.includes('cake') || name.includes('ice')) return '🍰';
  return '🍽️';
};

// ─── Memoized MenuItemCard for 60fps rendering ──────────────────────────────
const MenuItemCard = React.memo<{
  item: MenuItemData;
  catName: string;
  isSuper: boolean;
  themeCard: string;
  themeBorder: string;
  themeText: string;
  themeAccent: string;
  themeMuted: string;
  onToggleStock: (item: MenuItemData) => void;
  onEdit: (item: MenuItemData) => void;
  onDelete: (id: number, name: string) => void;
}>(({ item, catName, isSuper, themeCard, themeBorder, themeText, themeAccent, themeMuted, onToggleStock, onEdit, onDelete }) => {
  const fallbackEmoji = getFallbackEmoji(item.name, catName);
  const imageUrl = getFullImageUrl(item.image_url || item.image);

  return (
    <View style={[styles.itemCard, { backgroundColor: themeCard, borderColor: themeBorder }]}>
      <View style={styles.imageBox}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.itemImage} resizeMode="cover" />
        ) : (
          <Text style={styles.fallbackEmoji}>{fallbackEmoji}</Text>
        )}
      </View>

      <View style={styles.itemDetails}>
        <View style={styles.titlePriceRow}>
          <Text style={[styles.itemName, { color: themeText }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.itemPrice, { color: themeAccent }]}>
            Rs. {parseFloat(item.price).toLocaleString()}
          </Text>
        </View>

        {item.description ? (
          <Text style={[styles.itemDescription, { color: themeMuted }]} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>

      <View style={styles.itemActionCol}>
        {!isSuper ? (
          <View style={styles.toggleContainer}>
            <View
              style={[
                styles.stockBadge,
                { backgroundColor: item.is_available ? COLORS.successLight : COLORS.dangerLight },
              ]}
            >
              <Text
                style={[
                  styles.stockLabel,
                  { color: item.is_available ? COLORS.successDark : COLORS.danger },
                ]}
              >
                {item.is_available ? 'In Stock' : 'Out'}
              </Text>
            </View>
            <Switch
              value={item.is_available}
              onValueChange={() => onToggleStock(item)}
              trackColor={{ false: COLORS.neutral300, true: 'rgba(16, 185, 129, 0.4)' }}
              thumbColor={item.is_available ? COLORS.success : COLORS.neutral500}
            />
          </View>
        ) : (
          <View style={styles.superActionRow}>
            <TouchableOpacity style={styles.editBtn} onPress={() => onEdit(item)}>
              <Text style={styles.editBtnText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(item.id, item.name)}>
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
});

export const MenuManagementScreen = () => {
  const dispatch = useAppDispatch();
  const { role, restaurantId, branchId } = useAppSelector((state) => state.auth);
  const { categories, selectedBrandSlug, isLoading, isRefreshing, searchTerm, error } = useAppSelector((state) => state.menu);

  const isSuper = role === 'super_admin';

  // Role-based theme tokens
  const themeBg = isSuper ? COLORS.superAdmin.bg : COLORS.branchManager.bg;
  const themeCard = isSuper ? COLORS.superAdmin.card : COLORS.branchManager.card;
  const themeText = isSuper ? COLORS.superAdmin.text : COLORS.branchManager.text;
  const themeMuted = isSuper ? COLORS.superAdmin.muted : COLORS.branchManager.muted;
  const themeAccent = isSuper ? COLORS.superAdmin.accent : COLORS.branchManager.primary;
  const themeBorder = isSuper ? COLORS.superAdmin.border : COLORS.branchManager.border;

  // Local state for Modals (Super Admin)
  const [addCatModalVisible, setAddCatModalVisible] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [itemModalVisible, setItemModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItemData | null>(null);
  const [targetCatId, setTargetCatId] = useState<number | null>(null);

  // Form fields for Item Modal
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemImageUri, setItemImageUri] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const activeSlug = isSuper
    ? selectedBrandSlug
    : restaurantId
    ? String(restaurantId)
    : 'jushhpk';

  useEffect(() => {
    dispatch(fetchMenuThunk({ restaurantSlugOrId: activeSlug, branchId: branchId ?? undefined }));
  }, [dispatch, activeSlug, branchId]);

  const handleRefresh = () => {
    dispatch(fetchMenuThunk({ restaurantSlugOrId: activeSlug, branchId: branchId ?? undefined, isRefresh: true }));
  };

  const handleBrandSelect = (brand: { id: number; name: string; slug: string }) => {
    dispatch(setSelectedBrand({ brandId: brand.id, brandSlug: brand.slug }));
  };

  const handleToggleStock = (item: MenuItemData) => {
    if (!branchId && !isSuper) return;
    const targetBranch = branchId || 1; // Default fallback branch
    dispatch(
      toggleItemAvailabilityThunk({
        branchId: targetBranch,
        menuItemId: item.id,
        isAvailable: !item.is_available,
      })
    );
  };

  // Image Picker for Super Admin
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required to upload food photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setItemImageUri(result.assets[0].uri);
    }
  };

  // Category Modal Handlers
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const activeBrand = BRAND_LIST.find((b) => b.slug === selectedBrandSlug);
      const resId = activeBrand ? activeBrand.id : restaurantId || 1;
      await dispatch(createCategoryThunk({ restaurant: resId, name: newCatName.trim() })).unwrap();
      setAddCatModalVisible(false);
      setNewCatName('');
      handleRefresh();
    } catch (err: any) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to create category');
    }
  };

  const handleDeleteCategory = (catId: number, catName: string) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${catName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteCategoryThunk(catId)).unwrap();
            } catch (err: any) {
              Alert.alert('Error', typeof err === 'string' ? err : 'Failed to delete category');
            }
          },
        },
      ]
    );
  };

  // Item Modal Handlers
  const openAddItemModal = (categoryId: number) => {
    setEditingItem(null);
    setTargetCatId(categoryId);
    setItemName('');
    setItemDescription('');
    setItemPrice('');
    setItemImageUri(null);
    setItemModalVisible(true);
  };

  const openEditItemModal = (item: MenuItemData) => {
    setEditingItem(item);
    setTargetCatId(item.category);
    setItemName(item.name);
    setItemDescription(item.description || '');
    setItemPrice(String(item.price));
    setItemImageUri(item.image_url || item.image || null);
    setItemModalVisible(true);
  };

  const handleSaveItem = async () => {
    if (!itemName.trim() || !itemPrice.trim()) {
      Alert.alert('Validation Error', 'Item name and price are required.');
      return;
    }

    setFormSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('name', itemName.trim());
      formData.append('description', itemDescription.trim());
      formData.append('price', itemPrice.trim());
      if (targetCatId) formData.append('category', String(targetCatId));

      if (itemImageUri && !itemImageUri.startsWith('http')) {
        const filename = itemImageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('image', { uri: itemImageUri, name: filename, type } as any);
      }

      if (editingItem) {
        await dispatch(updateItemThunk({ id: editingItem.id, data: formData })).unwrap();
      } else {
        await dispatch(createItemThunk(formData)).unwrap();
      }

      setItemModalVisible(false);
      handleRefresh();
    } catch (err: any) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to save item');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteItem = (itemId: number, itemName: string) => {
    Alert.alert('Delete Item', `Delete "${itemName}" from menu?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await dispatch(deleteItemThunk(itemId)).unwrap();
          } catch (err: any) {
            Alert.alert('Error', typeof err === 'string' ? err : 'Failed to delete item');
          }
        },
      },
    ]);
  };

  // Filter Categories & Items based on Search Term
  const filteredCategories = categories
    .map((cat) => {
      const filteredItems = (cat.items || []).filter(
        (it) =>
          it.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (it.description && it.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      return { ...cat, items: filteredItems };
    })
    .filter((cat) => (searchTerm ? cat.items.length > 0 : true));

  const renderCategorySection = ({ item: cat }: { item: MenuCategoryData }) => (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeaderRow}>
        <Text style={[styles.categoryTitle, { color: themeText }]}>
          {cat.name} ({cat.items.length})
        </Text>

        {isSuper ? (
          <View style={styles.catActionRow}>
            <TouchableOpacity
              style={styles.addItemBtn}
              onPress={() => openAddItemModal(cat.id)}
            >
              <Text style={styles.addItemBtnText}>+ Item</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteCatBtn}
              onPress={() => handleDeleteCategory(cat.id, cat.name)}
            >
              <Text style={styles.deleteCatBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {cat.items.map((item) => (
        <MenuItemCard
          key={item.id}
          item={item}
          catName={cat.name}
          isSuper={isSuper}
          themeCard={themeCard}
          themeBorder={themeBorder}
          themeText={themeText}
          themeAccent={themeAccent}
          themeMuted={themeMuted}
          onToggleStock={handleToggleStock}
          onEdit={openEditItemModal}
          onDelete={handleDeleteItem}
        />
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeBg }]}>
      <StatusBar barStyle={isSuper ? 'light-content' : 'dark-content'} backgroundColor={themeBg} />

      {/* Super Admin Brand Selector Bar */}
      {isSuper ? (
        <View style={styles.brandBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandScroll}>
            {BRAND_LIST.map((b) => (
              <TouchableOpacity
                key={b.slug}
                style={[
                  styles.brandChip,
                  selectedBrandSlug === b.slug && styles.brandChipActive,
                ]}
                onPress={() => handleBrandSelect(b)}
              >
                <Text style={styles.brandIcon}>{b.icon}</Text>
                <Text
                  style={[
                    styles.brandChipText,
                    selectedBrandSlug === b.slug && styles.brandChipTextActive,
                  ]}
                >
                  {b.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Search Input Bar */}
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBox, { backgroundColor: themeCard, borderColor: themeBorder }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: themeText }]}
            placeholder="Search menu items..."
            placeholderTextColor={themeMuted}
            value={searchTerm}
            onChangeText={(text) => dispatch(setSearchTerm(text))}
          />
          {searchTerm ? (
            <TouchableOpacity onPress={() => dispatch(setSearchTerm(''))}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {isSuper ? (
          <TouchableOpacity
            style={styles.addCatHeaderBtn}
            onPress={() => setAddCatModalVisible(true)}
          >
            <Text style={styles.addCatBtnText}>+ Category</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Catalog Grouped List */}
      {error && categories.length === 0 ? (
        <ErrorState
          title="Menu Sync Notice"
          message={error}
          onRetry={handleRefresh}
          retryLabel="Retry Catalog"
          themeMode={isSuper ? 'super' : 'branch'}
        />
      ) : isLoading && categories.length === 0 ? (
        <LoadingState
          message="Loading Menu Catalog..."
          themeMode={isSuper ? 'super' : 'branch'}
        />
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item: MenuCategoryData) => String(item.id)}
          renderItem={renderCategorySection}
          contentContainerStyle={styles.scrollContent}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews={Platform.OS === 'android'}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[themeAccent]} tintColor={themeAccent} />
          }
          ListEmptyComponent={
            <EmptyState
              icon={searchTerm ? '🔍' : '🍳'}
              title={searchTerm ? 'No Matching Items' : 'No Menu Items Found'}
              description={
                searchTerm
                  ? `No items match "${searchTerm}". Try searching another keyword.`
                  : 'No categories or items configured for this brand yet.'
              }
              themeMode={isSuper ? 'super' : 'branch'}
            />
          }
        />
      )}

      {/* Add Category Modal (Super Admin) */}
      <Modal visible={addCatModalVisible} transparent animationType="fade" onRequestClose={() => setAddCatModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeCard }]}>
            <Text style={[styles.modalTitle, { color: themeText }]}>Add Menu Category</Text>
            <TextInput
              style={[styles.modalInput, { color: themeText, borderColor: themeBorder, backgroundColor: themeBg }]}
              placeholder="Category Name (e.g. Desserts, BBQ Combos)"
              placeholderTextColor={themeMuted}
              value={newCatName}
              onChangeText={setNewCatName}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setAddCatModalVisible(false)}>
                <Text style={{ color: themeMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSaveBtn, { backgroundColor: themeAccent }]} onPress={handleCreateCategory}>
                <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Create Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add / Edit Item Modal (Super Admin) */}
      <Modal visible={itemModalVisible} transparent animationType="slide" onRequestClose={() => setItemModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.itemModalScroll}>
            <View style={[styles.modalCard, { backgroundColor: themeCard }]}>
              <Text style={[styles.modalTitle, { color: themeText }]}>
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </Text>

              <Text style={[styles.inputLabel, { color: themeMuted }]}>Item Name *</Text>
              <TextInput
                style={[styles.modalInput, { color: themeText, borderColor: themeBorder, backgroundColor: themeBg }]}
                placeholder="e.g. Zinger Burger"
                placeholderTextColor={themeMuted}
                value={itemName}
                onChangeText={setItemName}
              />

              <Text style={[styles.inputLabel, { color: themeMuted }]}>Price (Rs.) *</Text>
              <TextInput
                style={[styles.modalInput, { color: themeText, borderColor: themeBorder, backgroundColor: themeBg }]}
                placeholder="e.g. 450"
                placeholderTextColor={themeMuted}
                keyboardType="numeric"
                value={itemPrice}
                onChangeText={setItemPrice}
              />

              <Text style={[styles.inputLabel, { color: themeMuted }]}>Description</Text>
              <TextInput
                style={[styles.modalInput, { color: themeText, borderColor: themeBorder, backgroundColor: themeBg, height: 70 }]}
                placeholder="Item ingredients, combo details..."
                placeholderTextColor={themeMuted}
                multiline
                value={itemDescription}
                onChangeText={setItemDescription}
              />

              <Text style={[styles.inputLabel, { color: themeMuted }]}>Food Photo</Text>
              <TouchableOpacity style={styles.imagePickerBtn} onPress={pickImage}>
                {itemImageUri ? (
                  <Image source={{ uri: itemImageUri }} style={styles.pickerPreview} />
                ) : (
                  <Text style={{ color: themeAccent, fontWeight: '600' }}>📷 Pick Image from Gallery</Text>
                )}
              </TouchableOpacity>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setItemModalVisible(false)}>
                  <Text style={{ color: themeMuted }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: themeAccent }]}
                  onPress={handleSaveItem}
                  disabled={formSubmitting}
                >
                  {formSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Save Item</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  brandBar: {
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  brandScroll: {
    paddingHorizontal: SPACING.sm,
  },
  brandChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    marginRight: SPACING.xs,
    borderWidth: 1,
    borderColor: '#334155',
  },
  brandChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#3B82F6',
  },
  brandIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  brandChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  brandChipTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  searchBarContainer: {
    flexDirection: 'row',
    padding: SPACING.sm,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    height: 42,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  clearSearchText: {
    color: '#94A3B8',
    fontSize: 16,
    paddingHorizontal: 4,
  },
  addCatHeaderBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.xs,
  },
  addCatBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: SPACING.sm,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  categorySection: {
    marginBottom: SPACING.lg,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    paddingHorizontal: 4,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  catActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addItemBtn: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    marginRight: 6,
  },
  addItemBtnText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: 'bold',
  },
  deleteCatBtn: {
    padding: 2,
  },
  deleteCatBtnText: {
    fontSize: 14,
  },
  itemCard: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  imageBox: {
    width: 58,
    height: 58,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    overflow: 'hidden',
  },
  itemImage: {
    width: '100%',
    height: '100%',
  },
  fallbackEmoji: {
    fontSize: 28,
  },
  itemDetails: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  titlePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
  itemDescription: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  itemActionCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  toggleContainer: {
    alignItems: 'center',
    gap: 4,
  },
  stockBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.round,
  },
  stockLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  superActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: RADIUS.xs,
    marginRight: 4,
  },
  editBtnText: {
    color: '#3B82F6',
    fontSize: 11,
    fontWeight: 'bold',
  },
  deleteBtn: {
    padding: 4,
  },
  deleteBtnText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  itemModalScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
  },
  modalCard: {
    width: '100%',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.large,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: RADIUS.xs,
    padding: SPACING.sm,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  imagePickerBtn: {
    height: 80,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: RADIUS.xs,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  pickerPreview: {
    width: '100%',
    height: '100%',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalCancelBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
  },
  modalSaveBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xs,
  },
});
