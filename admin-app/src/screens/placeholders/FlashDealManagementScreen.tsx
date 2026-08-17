import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Alert,
  Switch,
  ScrollView,
  Platform,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchFlashDealsThunk,
  createFlashDealThunk,
  updateFlashDealThunk,
  deleteFlashDealThunk,
} from '../../store/promoSlice';
import { FlashDeal, api } from '../../services/api';
import { Card, formatHumanDateTime, LoadingState, ErrorState, EmptyState, DateTimePickerModal } from '../../components/ui';

const DAYS_OF_WEEK = [
  { key: 'MON', label: 'Mon' },
  { key: 'TUE', label: 'Tue' },
  { key: 'WED', label: 'Wed' },
  { key: 'THU', label: 'Thu' },
  { key: 'FRI', label: 'Fri' },
  { key: 'SAT', label: 'Sat' },
  { key: 'SUN', label: 'Sun' },
];

const TIME_OPTIONS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

const formatTimeLabel = (timeStr: string) => {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${ampm}`;
};

const getDealStatus = (deal: FlashDeal) => {
  if (!deal.is_active) {
    return { label: 'DISABLED', bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: '#475569', icon: '⚪' };
  }
  if (deal.is_currently_active !== undefined) {
    if (deal.is_currently_active) {
      return { label: 'LIVE NOW', bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: '#22c55e', icon: '🟢' };
    }
    if (deal.timing_type === 'RECURRING_DAILY') {
      return { label: 'SCHEDULED (Daily)', bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: '#f59e0b', icon: '🌙' };
    }
  }
  const now = new Date();
  const start = deal.start_time ? new Date(deal.start_time) : now;
  const end = deal.end_time ? new Date(deal.end_time) : new Date(now.getTime() + 86400000);

  if (end < now) {
    return { label: 'EXPIRED', bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: '#ef4444', icon: '🔴' };
  }
  if (start > now) {
    return { label: 'SCHEDULED', bg: 'rgba(245, 158, 11, 0.15)', text: '#f59e0b', border: '#f59e0b', icon: '🟡' };
  }
  return { label: 'LIVE NOW', bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: '#22c55e', icon: '🟢' };
};

export const FlashDealManagementScreen = () => {
  const dispatch = useAppDispatch();
  const { flashDeals, isLoading, isRefreshing, error } = useAppSelector((state) => state.promo);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingDeal, setEditingDeal] = useState<FlashDeal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dealType, setDealType] = useState<'percentage' | 'flat' | 'bogo'>('percentage');
  const [discountValue, setDiscountValue] = useState('25');
  const [maxDiscount, setMaxDiscount] = useState('');
  const [minSubtotal, setMinSubtotal] = useState('');
  
  // Scope State
  const [restaurantsList, setRestaurantsList] = useState<any[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(null);
  const [orderMode, setOrderMode] = useState<'ALL' | 'DELIVERY' | 'DINE_IN'>('ALL');
  
  // Item Scope State
  const [itemScopeType, setItemScopeType] = useState<'ENTIRE_MENU' | 'CATEGORY' | 'SPECIFIC_ITEMS'>('ENTIRE_MENU');
  const [brandCategories, setBrandCategories] = useState<any[]>([]);
  const [brandMenuItems, setBrandMenuItems] = useState<any[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedMenuItemIds, setSelectedMenuItemIds] = useState<number[]>([]);
  const [searchItemQuery, setSearchItemQuery] = useState('');
  const [isLoadingMenu, setIsLoadingMenu] = useState(false);

  // Schedule State
  const [timingType, setTimingType] = useState<'ONE_TIME' | 'RECURRING_DAILY'>('ONE_TIME');
  const [startTime, setStartTime] = useState(new Date().toISOString());
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 59, 0);
    return d.toISOString();
  });
  const [dailyStartTime, setDailyStartTime] = useState('00:00');
  const [dailyEndTime, setDailyEndTime] = useState('06:00');
  const [activeDays, setActiveDays] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [priority, setPriority] = useState('0');
  const [maxOrders, setMaxOrders] = useState('0');
  const [redemptionResetFrequency, setRedemptionResetFrequency] = useState<'DAILY' | 'LIFETIME'>('DAILY');
  
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | 'valid_from' | 'valid_until' | null>(null);

  useEffect(() => {
    dispatch(fetchFlashDealsThunk());
    loadRestaurants();
  }, [dispatch]);

  const loadRestaurants = async () => {
    try {
      const res = await api.get('/restaurants/');
      const list = Array.isArray(res.data) ? res.data : (res.data?.results || []);
      setRestaurantsList(list);
    } catch (e) {}
  };

  // Load menu items & categories when brand selection changes
  useEffect(() => {
    if (selectedBrandId) {
      loadBrandMenu(selectedBrandId);
    } else {
      setBrandCategories([]);
      setBrandMenuItems([]);
    }
  }, [selectedBrandId]);

  const loadBrandMenu = async (brandId: number) => {
    setIsLoadingMenu(true);
    try {
      const res = await api.get(`/restaurants/${brandId}/menu/`);
      const cats = res.data?.data || (Array.isArray(res.data) ? res.data : res.data?.results || []);
      setBrandCategories(cats);
      const items: any[] = [];
      cats.forEach((cat: any) => {
        (cat.items || []).forEach((item: any) => {
          items.push({ ...item, category_name: cat.name });
        });
      });
      setBrandMenuItems(items);
    } catch (e) {
      setBrandCategories([]);
      setBrandMenuItems([]);
    } finally {
      setIsLoadingMenu(false);
    }
  };

  const selectedBrandObj = useMemo(() => {
    return restaurantsList.find((r) => r.id === selectedBrandId);
  }, [restaurantsList, selectedBrandId]);

  const branchesForSelectedBrand = useMemo(() => {
    return selectedBrandObj?.branches || [];
  }, [selectedBrandObj]);

  const filteredMenuItems = useMemo(() => {
    if (!searchItemQuery.trim()) return brandMenuItems;
    const q = searchItemQuery.toLowerCase();
    return brandMenuItems.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        (item.category_name && item.category_name.toLowerCase().includes(q))
    );
  }, [brandMenuItems, searchItemQuery]);

  const handleRefresh = () => {
    dispatch(fetchFlashDealsThunk({ isRefresh: true }));
    loadRestaurants();
  };

  const handleToggleActive = (deal: FlashDeal) => {
    dispatch(
      updateFlashDealThunk({
        id: deal.id,
        data: { is_active: !deal.is_active },
      })
    );
  };

  const openAddModal = () => {
    setEditingDeal(null);
    setTitle('');
    setDescription('');
    setDealType('percentage');
    setDiscountValue('25');
    setMaxDiscount('');
    setMinSubtotal('');
    setSelectedBrandId(null);
    setSelectedBranchId(null);
    setOrderMode('ALL');
    setItemScopeType('ENTIRE_MENU');
    setSelectedCategoryIds([]);
    setSelectedMenuItemIds([]);
    setSearchItemQuery('');
    setTimingType('ONE_TIME');
    const now = new Date();
    setStartTime(now.toISOString());
    const end = new Date();
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 0);
    setEndTime(end.toISOString());
    setDailyStartTime('00:00');
    setDailyEndTime('06:00');
    setActiveDays(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
    setValidFrom('');
    setValidUntil('');
    setPriority('0');
    setMaxOrders('0');
    setRedemptionResetFrequency('DAILY');
    setModalVisible(true);
  };

  const openEditModal = (deal: FlashDeal) => {
    setEditingDeal(deal);
    setTitle(deal.title || '');
    setDescription(deal.description || '');
    setDealType((deal.deal_type as any) || 'percentage');
    setDiscountValue(String(deal.discount_value || deal.discount_percentage || '25'));
    setMaxDiscount(deal.max_discount ? String(deal.max_discount) : '');
    setMinSubtotal(deal.min_subtotal ? String(deal.min_subtotal) : '');
    setSelectedBrandId(deal.restaurant || null);
    setSelectedBranchId(deal.branch || null);
    setOrderMode(deal.order_mode || (deal.is_dine_in_only ? 'DINE_IN' : 'ALL'));
    setItemScopeType(deal.item_scope_type || 'ENTIRE_MENU');
    setSelectedCategoryIds(deal.categories || []);
    setSelectedMenuItemIds(deal.menu_items || []);
    setSearchItemQuery('');
    setTimingType(deal.timing_type || 'ONE_TIME');
    setStartTime(deal.start_time || new Date().toISOString());
    setEndTime(deal.end_time || new Date(Date.now() + 86400000 * 7).toISOString());
    setDailyStartTime(deal.daily_start_time || '00:00');
    setDailyEndTime(deal.daily_end_time || '06:00');
    setActiveDays(deal.active_days || ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
    setValidFrom(deal.valid_from || '');
    setValidUntil(deal.valid_until || '');
    setPriority(String(deal.priority || 0));
    setMaxOrders(String(deal.max_orders || 0));
    setRedemptionResetFrequency(deal.redemption_reset_frequency || 'DAILY');
    setModalVisible(true);
  };

  const toggleCategorySelection = (catId: number) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const toggleMenuItemSelection = (itemId: number) => {
    setSelectedMenuItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleDaySelection = (dayKey: string) => {
    setActiveDays((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
    );
  };

  const handleSaveDeal = async () => {
    if (!title.trim() || !discountValue.trim()) {
      Alert.alert('Validation Error', 'Please enter flash deal title and discount value.');
      return;
    }

    if (timingType === 'ONE_TIME') {
      const sDate = new Date(startTime);
      const eDate = new Date(endTime);
      if (isNaN(sDate.getTime()) || isNaN(eDate.getTime())) {
        Alert.alert('Validation Error', 'Please select valid start and end dates.');
        return;
      }
      if (eDate <= sDate) {
        Alert.alert('Validation Error', 'End Time must strictly be after Start Time.');
        return;
      }
    } else {
      if (activeDays.length === 0) {
        Alert.alert('Validation Error', 'Please select at least one active day for recurring deals.');
        return;
      }
    }

    if (itemScopeType === 'CATEGORY' && selectedCategoryIds.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one menu category.');
      return;
    }

    if (itemScopeType === 'SPECIFIC_ITEMS' && selectedMenuItemIds.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one menu item.');
      return;
    }

    const val = parseFloat(discountValue) || 0;
    const payload: any = {
      title: title.trim(),
      description: description.trim(),
      deal_type: dealType,
      discount_value: val,
      discount_percentage: val,
      max_discount: maxDiscount ? parseFloat(maxDiscount) : null,
      min_subtotal: minSubtotal ? parseFloat(minSubtotal) : 0,
      restaurant: selectedBrandId,
      branch: selectedBranchId,
      order_mode: orderMode,
      item_scope_type: itemScopeType,
      categories: itemScopeType === 'CATEGORY' ? selectedCategoryIds : [],
      menu_items: itemScopeType === 'SPECIFIC_ITEMS' ? selectedMenuItemIds : [],
      timing_type: timingType,
      start_time: timingType === 'ONE_TIME' ? startTime.trim() : null,
      end_time: timingType === 'ONE_TIME' ? endTime.trim() : null,
      daily_start_time: timingType === 'RECURRING_DAILY' ? dailyStartTime : null,
      daily_end_time: timingType === 'RECURRING_DAILY' ? dailyEndTime : null,
      active_days: timingType === 'RECURRING_DAILY' ? activeDays : [],
      valid_from: timingType === 'RECURRING_DAILY' && validFrom ? validFrom : null,
      valid_until: timingType === 'RECURRING_DAILY' && validUntil ? validUntil : null,
      max_orders: parseInt(maxOrders, 10) || 0,
      redemption_reset_frequency: redemptionResetFrequency,
      priority: parseInt(priority, 10) || 0,
      is_active: true,
    };

    setIsSubmitting(true);
    try {
      if (editingDeal) {
        await dispatch(updateFlashDealThunk({ id: editingDeal.id, data: payload })).unwrap();
        Alert.alert('Success', `Flash deal '${title}' updated!`);
      } else {
        await dispatch(createFlashDealThunk(payload)).unwrap();
        Alert.alert('Success', `Flash deal '${title}' created!`);
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', typeof err === 'string' ? err : err?.message || 'Failed to save flash deal');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDeal = (deal: FlashDeal) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete flash deal '${deal.title}'?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteFlashDealThunk(deal.id)),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.superAdmin.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Flash Deals Engine</Text>
          <Text style={styles.subtitle}>Multi-Tenant Specials, Item Scoping & Midnight Deals</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Create Deal</Text>
        </TouchableOpacity>
      </View>

      {/* Flash Deals List */}
      {error && flashDeals.length === 0 ? (
        <ErrorState
          title="Flash Deals Sync Notice"
          message={error}
          onRetry={handleRefresh}
          retryLabel="Retry Deals Feed"
          themeMode="super"
        />
      ) : isLoading && flashDeals.length === 0 ? (
        <LoadingState
          message="Loading Time-Limited Flash Deals..."
          themeMode="super"
        />
      ) : (
        <FlatList
          data={flashDeals}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.superAdmin.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="⚡"
              title="No Active Flash Deals"
              description="Create recurring daily specials, category promos, or brand-wide flash deals to boost orders."
              themeMode="super"
            />
          }
          renderItem={({ item }) => {
            const status = getDealStatus(item);
            const isRecurring = item.timing_type === 'RECURRING_DAILY';
            const redemptionsCount = item.current_redemptions ?? item.orders_used ?? 0;
            const maxCap = item.max_orders ?? 0;
            const percentClaimed = maxCap > 0 ? Math.min(100, Math.round((redemptionsCount / maxCap) * 100)) : 0;

            return (
              <Card style={styles.card} themeMode="super">
                <View style={styles.cardHeader}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeIcon}>{isRecurring ? '🌙' : '⚡'}</Text>
                  </View>

                  <View style={styles.titleBox}>
                    <Text style={styles.dealTitle}>{item.title}</Text>
                    <Text style={styles.dealDesc} numberOfLines={1}>
                      {item.description || 'Exclusive limited-time customer deal'}
                    </Text>
                  </View>

                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>
                      {item.discount_display_text || `${item.discount_value}% OFF`}
                    </Text>
                  </View>

                  <Switch
                    value={item.is_active}
                    onValueChange={() => handleToggleActive(item)}
                    trackColor={{ false: '#334155', true: '#EF4444' }}
                    thumbColor="#FFF"
                  />
                </View>

                {/* Scope & Schedule Badges */}
                <View style={styles.scopePillRow}>
                  <View style={styles.scopePill}>
                    <Text style={styles.scopePillText}>
                      🏪 {item.restaurant_name || 'All Brands'}
                      {item.branch_name ? ` · 📍 ${item.branch_name}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.scopePill, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                    <Text style={[styles.scopePillText, { color: '#60a5fa' }]}>
                      {item.item_scope_type === 'SPECIFIC_ITEMS'
                        ? '🍔 Selected Items'
                        : item.item_scope_type === 'CATEGORY'
                        ? '📂 Category Promo'
                        : '🍽️ Entire Menu'}
                    </Text>
                  </View>
                  {item.order_mode && item.order_mode !== 'ALL' && (
                    <View style={[styles.scopePill, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                      <Text style={[styles.scopePillText, { color: '#c084fc' }]}>
                        {item.order_mode === 'DINE_IN' ? '🍽️ Dine-In Only' : '🛵 Delivery Only'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Timing Row */}
                <View style={styles.timingRow}>
                  <Text style={styles.timingText}>
                    {isRecurring
                      ? `🌙 ${formatTimeLabel(item.daily_start_time || '00:00')} – ${formatTimeLabel(item.daily_end_time || '06:00')} (${(item.active_days || []).join(', ')})`
                      : `📅 ${formatHumanDateTime(item.start_time)} → ${formatHumanDateTime(item.end_time)}`}
                  </Text>
                  <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: status.bg,
                    borderColor: status.border,
                    borderWidth: 1,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 10,
                  }}>
                    <Text style={{ color: status.text, fontSize: 11, fontWeight: '700' }}>
                      {status.icon} {status.label}
                    </Text>
                  </View>
                </View>

                {/* Stock Progress Bar (if max_orders > 0) */}
                {maxCap > 0 && (
                  <View style={styles.stockProgressContainer}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={styles.stockText}>🔥 Claimed: {redemptionsCount} / {maxCap}</Text>
                      <Text style={styles.stockText}>{item.redemption_reset_frequency === 'DAILY' ? 'Nightly Reset' : 'Lifetime Cap'}</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${percentClaimed}%` }]} />
                    </View>
                  </View>
                )}

                {/* Card Actions */}
                <View style={styles.cardActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
                    <Text style={styles.editButtonText}>✏️ Edit Scopes & Times</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteDeal(item)}>
                    <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* 6-Step Progressive Create / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDeal ? 'Edit Flash Deal' : 'Create Flash Deal'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
              {/* STEP 1: Deal Identity */}
              <Text style={styles.stepHeading}>1. Deal Identity</Text>
              <Text style={styles.label}>Campaign Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Midnight Burger Special, BBQ Hour"
                placeholderTextColor="#64748B"
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 60 }]}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. 30% off all smash burgers between 12am - 6am"
                placeholderTextColor="#64748B"
                multiline
              />

              {/* STEP 2: Target Scope */}
              <Text style={styles.stepHeading}>2. Target Scope (Brand & Branch)</Text>
              <Text style={styles.label}>Target Restaurant Brand</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                <TouchableOpacity
                  style={[styles.chip, selectedBrandId === null && styles.chipActive]}
                  onPress={() => {
                    setSelectedBrandId(null);
                    setSelectedBranchId(null);
                  }}
                >
                  <Text style={[styles.chipText, selectedBrandId === null && styles.chipTextActive]}>
                    🌐 All Brands (Global)
                  </Text>
                </TouchableOpacity>
                {restaurantsList.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.chip, selectedBrandId === r.id && styles.chipActive]}
                    onPress={() => {
                      setSelectedBrandId(r.id);
                      setSelectedBranchId(null);
                    }}
                  >
                    <Text style={[styles.chipText, selectedBrandId === r.id && styles.chipTextActive]}>
                      🏪 {r.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Cascading Branch Selector */}
              {selectedBrandId && branchesForSelectedBrand.length > 0 && (
                <>
                  <Text style={styles.label}>Target Branch</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                    <TouchableOpacity
                      style={[styles.chip, selectedBranchId === null && styles.chipActive]}
                      onPress={() => setSelectedBranchId(null)}
                    >
                      <Text style={[styles.chipText, selectedBranchId === null && styles.chipTextActive]}>
                        📍 All Branches
                      </Text>
                    </TouchableOpacity>
                    {branchesForSelectedBrand.map((b: any) => (
                      <TouchableOpacity
                        key={b.id}
                        style={[styles.chip, selectedBranchId === b.id && styles.chipActive]}
                        onPress={() => setSelectedBranchId(b.id)}
                      >
                        <Text style={[styles.chipText, selectedBranchId === b.id && styles.chipTextActive]}>
                          📍 {b.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={styles.label}>Order Fulfillment Mode</Text>
              <View style={styles.segmentedRow}>
                {[
                  { key: 'ALL', label: 'All Orders' },
                  { key: 'DELIVERY', label: '🛵 Delivery Only' },
                  { key: 'DINE_IN', label: '🍽️ Dine-In Only' },
                ].map((mode) => (
                  <TouchableOpacity
                    key={mode.key}
                    style={[styles.segmentBtn, orderMode === mode.key && styles.segmentBtnActive]}
                    onPress={() => setOrderMode(mode.key as any)}
                  >
                    <Text style={[styles.segmentText, orderMode === mode.key && styles.segmentTextActive]}>
                      {mode.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* STEP 3: Item Scope */}
              <Text style={styles.stepHeading}>3. Item / Menu Scope</Text>
              <View style={styles.segmentedRow}>
                {[
                  { key: 'ENTIRE_MENU', label: 'Entire Menu' },
                  { key: 'CATEGORY', label: 'By Category' },
                  { key: 'SPECIFIC_ITEMS', label: 'Specific Items' },
                ].map((scope) => (
                  <TouchableOpacity
                    key={scope.key}
                    style={[styles.segmentBtn, itemScopeType === scope.key && styles.segmentBtnActive]}
                    onPress={() => setItemScopeType(scope.key as any)}
                  >
                    <Text style={[styles.segmentText, itemScopeType === scope.key && styles.segmentTextActive]}>
                      {scope.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Category Picker */}
              {itemScopeType === 'CATEGORY' && (
                <View style={styles.scopeBox}>
                  <Text style={styles.subLabel}>Select Applicable Categories:</Text>
                  {isLoadingMenu ? (
                    <ActivityIndicator color={COLORS.superAdmin.accent} size="small" />
                  ) : brandCategories.length === 0 ? (
                    <Text style={styles.hintText}>Please select a specific brand above to load categories.</Text>
                  ) : (
                    <View style={styles.wrapChipRow}>
                      {brandCategories.map((c) => {
                        const isSelected = selectedCategoryIds.includes(c.id);
                        return (
                          <TouchableOpacity
                            key={c.id}
                            style={[styles.multiChip, isSelected && styles.multiChipActive]}
                            onPress={() => toggleCategorySelection(c.id)}
                          >
                            <Text style={[styles.multiChipText, isSelected && styles.multiChipTextActive]}>
                              {isSelected ? '✓ ' : ''}{c.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Specific Items Searchable Checklist */}
              {itemScopeType === 'SPECIFIC_ITEMS' && (
                <View style={styles.scopeBox}>
                  <Text style={styles.subLabel}>Search & Select Specific Dishes:</Text>
                  <TextInput
                    style={styles.searchInput}
                    value={searchItemQuery}
                    onChangeText={setSearchItemQuery}
                    placeholder="🔍 Search dishes by name or category..."
                    placeholderTextColor="#64748B"
                  />
                  {isLoadingMenu ? (
                    <ActivityIndicator color={COLORS.superAdmin.accent} size="small" />
                  ) : brandMenuItems.length === 0 ? (
                    <Text style={styles.hintText}>Please select a specific brand above to load dishes.</Text>
                  ) : (
                    <View style={styles.itemsListContainer}>
                      {filteredMenuItems.slice(0, 30).map((dish) => {
                        const isSelected = selectedMenuItemIds.includes(dish.id);
                        return (
                          <TouchableOpacity
                            key={dish.id}
                            style={[styles.itemCheckRow, isSelected && styles.itemCheckRowActive]}
                            onPress={() => toggleMenuItemSelection(dish.id)}
                          >
                            <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                              {isSelected && <Text style={styles.checkMark}>✓</Text>}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemName}>{dish.name}</Text>
                              <Text style={styles.itemCat}>{dish.category_name} · Rs. {dish.price}</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* STEP 4: Deal Mechanics & Budget Limits */}
              <Text style={styles.stepHeading}>4. Deal Mechanics & Limits</Text>
              <Text style={styles.label}>Deal Type</Text>
              <View style={styles.segmentedRow}>
                {[
                  { key: 'percentage', label: '% Off' },
                  { key: 'flat', label: 'Flat Rs. Off' },
                  { key: 'bogo', label: 'Buy 1 Get 1' },
                ].map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.segmentBtn, dealType === t.key && styles.segmentBtnActive]}
                    onPress={() => setDealType(t.key as any)}
                  >
                    <Text style={[styles.segmentText, dealType === t.key && styles.segmentTextActive]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>
                    {dealType === 'percentage' ? 'Discount % *' : 'Discount Amount (Rs.) *'}
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={discountValue}
                    onChangeText={setDiscountValue}
                    keyboardType="numeric"
                    placeholder="25"
                    placeholderTextColor="#64748B"
                  />
                </View>
                {dealType === 'percentage' && (
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.label}>Max Cap (Rs.)</Text>
                    <TextInput
                      style={styles.input}
                      value={maxDiscount}
                      onChangeText={setMaxDiscount}
                      keyboardType="numeric"
                      placeholder="e.g. 200"
                      placeholderTextColor="#64748B"
                    />
                  </View>
                )}
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Min Subtotal (Rs.)</Text>
                  <TextInput
                    style={styles.input}
                    value={minSubtotal}
                    onChangeText={setMinSubtotal}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor="#64748B"
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.label}>Max Orders Cap</Text>
                  <TextInput
                    style={styles.input}
                    value={maxOrders}
                    onChangeText={setMaxOrders}
                    keyboardType="numeric"
                    placeholder="0 = unlimited"
                    placeholderTextColor="#64748B"
                  />
                </View>
              </View>

              {parseInt(maxOrders, 10) > 0 && (
                <View style={{ marginTop: 6 }}>
                  <Text style={styles.label}>Redemption Cap Reset Frequency</Text>
                  <View style={styles.segmentedRow}>
                    <TouchableOpacity
                      style={[styles.segmentBtn, redemptionResetFrequency === 'DAILY' && styles.segmentBtnActive]}
                      onPress={() => setRedemptionResetFrequency('DAILY')}
                    >
                      <Text style={[styles.segmentText, redemptionResetFrequency === 'DAILY' && styles.segmentTextActive]}>
                        🌙 Daily/Nightly Reset
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.segmentBtn, redemptionResetFrequency === 'LIFETIME' && styles.segmentBtnActive]}
                      onPress={() => setRedemptionResetFrequency('LIFETIME')}
                    >
                      <Text style={[styles.segmentText, redemptionResetFrequency === 'LIFETIME' && styles.segmentTextActive]}>
                        ♾️ Lifetime Total
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* STEP 5: Schedule Type & Recurrence */}
              <Text style={styles.stepHeading}>5. Schedule & Timing</Text>
              <View style={styles.segmentedRow}>
                <TouchableOpacity
                  style={[styles.segmentBtn, timingType === 'ONE_TIME' && styles.segmentBtnActive]}
                  onPress={() => setTimingType('ONE_TIME')}
                >
                  <Text style={[styles.segmentText, timingType === 'ONE_TIME' && styles.segmentTextActive]}>
                    📅 One-Time Window
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.segmentBtn, timingType === 'RECURRING_DAILY' && styles.segmentBtnActive]}
                  onPress={() => setTimingType('RECURRING_DAILY')}
                >
                  <Text style={[styles.segmentText, timingType === 'RECURRING_DAILY' && styles.segmentTextActive]}>
                    🌙 Recurring Daily Schedule
                  </Text>
                </TouchableOpacity>
              </View>

              {timingType === 'ONE_TIME' ? (
                <>
                  <Text style={styles.label}>Start Date & Time</Text>
                  <View style={styles.dateSelectorRow}>
                    <Text style={styles.dateText}>📅 {formatHumanDateTime(startTime)}</Text>
                    <TouchableOpacity style={styles.changeDateBtn} onPress={() => setPickerTarget('start')}>
                      <Text style={styles.changeDateText}>Change</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>End Date & Time (Expiry)</Text>
                  <View style={styles.dateSelectorRow}>
                    <Text style={styles.dateText}>🏁 {formatHumanDateTime(endTime)}</Text>
                    <TouchableOpacity style={styles.changeDateBtn} onPress={() => setPickerTarget('end')}>
                      <Text style={styles.changeDateText}>Change</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.rowInputs}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Daily Start Time</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                        {TIME_OPTIONS.map((t) => (
                          <TouchableOpacity
                            key={t}
                            style={[styles.chip, dailyStartTime === t && styles.chipActive]}
                            onPress={() => setDailyStartTime(t)}
                          >
                            <Text style={[styles.chipText, dailyStartTime === t && styles.chipTextActive]}>
                              {formatTimeLabel(t)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>

                  <View style={styles.rowInputs}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Daily End Time (Supports Midnight Rollover)</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                        {TIME_OPTIONS.map((t) => (
                          <TouchableOpacity
                            key={t}
                            style={[styles.chip, dailyEndTime === t && styles.chipActive]}
                            onPress={() => setDailyEndTime(t)}
                          >
                            <Text style={[styles.chipText, dailyEndTime === t && styles.chipTextActive]}>
                              {formatTimeLabel(t)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>

                  <Text style={styles.label}>Active Days (1-Tap Presets)</Text>
                  <View style={styles.presetRow}>
                    <TouchableOpacity
                      style={styles.presetBtn}
                      onPress={() => setActiveDays(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'])}
                    >
                      <Text style={styles.presetBtnText}>Every Day</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.presetBtn}
                      onPress={() => setActiveDays(['MON', 'TUE', 'WED', 'THU', 'FRI'])}
                    >
                      <Text style={styles.presetBtnText}>Weekdays</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.presetBtn}
                      onPress={() => setActiveDays(['SAT', 'SUN'])}
                    >
                      <Text style={styles.presetBtnText}>Weekends</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.daysRow}>
                    {DAYS_OF_WEEK.map((d) => {
                      const isDayActive = activeDays.includes(d.key);
                      return (
                        <TouchableOpacity
                          key={d.key}
                          style={[styles.dayCircle, isDayActive && styles.dayCircleActive]}
                          onPress={() => toggleDaySelection(d.key)}
                        >
                          <Text style={[styles.dayCircleText, isDayActive && styles.dayCircleTextActive]}>
                            {d.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Priority Input */}
              <Text style={styles.label}>Deal Priority (0–100, higher wins overlapping deals)</Text>
              <TextInput
                style={styles.input}
                value={priority}
                onChangeText={setPriority}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#64748B"
              />

              {/* STEP 6: Live Preview Card */}
              <Text style={styles.stepHeading}>6. Customer Live Preview</Text>
              <View style={styles.previewCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.previewBadge}>
                    ⚡ {dealType === 'percentage' ? `${discountValue || 0}% OFF` : `Flat Rs. ${discountValue || 0} OFF`}
                  </Text>
                  <Text style={styles.previewTimer}>
                    {timingType === 'RECURRING_DAILY' ? `🌙 Ends ${formatTimeLabel(dailyEndTime)}` : '⚡ Live Special'}
                  </Text>
                </View>
                <Text style={styles.previewTitle}>{title || 'Your Deal Campaign Title'}</Text>
                <Text style={styles.previewPrice}>
                  Sample Item Price: <Text style={{ textDecorationLine: 'line-through', color: '#94a3b8' }}>Rs. 850</Text>{' '}
                  <Text style={{ fontWeight: '800', color: '#22c55e' }}>
                    Rs. {Math.round(850 - (850 * (parseFloat(discountValue) || 0)) / 100)}
                  </Text>
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveDeal}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveButtonText}>{editingDeal ? 'Update Deal' : 'Publish Deal'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Time Picker Modal */}
      <DateTimePickerModal
        visible={pickerTarget !== null}
        initialDate={pickerTarget === 'start' ? startTime : endTime}
        title={pickerTarget === 'start' ? 'Select Start Time' : 'Select Expiry End Time'}
        onSelect={(isoDate: string) => {
          if (pickerTarget === 'start') setStartTime(isoDate);
          else if (pickerTarget === 'end') setEndTime(isoDate);
          setPickerTarget(null);
        }}
        onClose={() => setPickerTarget(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.superAdmin.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.superAdmin.border,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.superAdmin.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.superAdmin.textSecondary,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    ...SHADOWS.small,
  },
  addButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.superAdmin.card,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: {
    fontSize: 18,
  },
  titleBox: {
    flex: 1,
  },
  dealTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.superAdmin.text,
  },
  dealDesc: {
    fontSize: 12,
    color: COLORS.superAdmin.textSecondary,
    marginTop: 2,
  },
  discountBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: {
    color: '#EF4444',
    fontWeight: '800',
    fontSize: 12,
  },
  scopePillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  scopePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scopePillText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timingText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  stockProgressContainer: {
    marginTop: 6,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 8,
    borderRadius: 8,
  },
  stockText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#EF4444',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.superAdmin.border,
    paddingTop: 8,
  },
  editButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  editButtonText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderRadius: RADIUS.xl,
    maxHeight: '92%',
    padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  closeIcon: {
    fontSize: 20,
    color: '#94A3B8',
  },
  formScroll: {
    maxHeight: 520,
  },
  stepHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#60a5fa',
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 10,
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 11,
    color: '#cbd5e1',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: RADIUS.md,
    color: '#FFF',
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.sm : 8,
    fontSize: 14,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  chipRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  chip: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFF',
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#334155',
  },
  segmentText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  scopeBox: {
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
  },
  wrapChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  multiChip: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  multiChipActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#EF4444',
  },
  multiChipText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  multiChipTextActive: {
    color: '#EF4444',
    fontWeight: '700',
  },
  searchInput: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 6,
    color: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    marginBottom: 8,
  },
  itemsListContainer: {
    maxHeight: 180,
  },
  itemCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 8,
  },
  itemCheckRowActive: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  checkMark: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  itemName: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  itemCat: {
    color: '#64748B',
    fontSize: 11,
  },
  hintText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  dateSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dateText: {
    color: '#FFF',
    fontSize: 13,
  },
  changeDateBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  changeDateText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '700',
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  presetBtn: {
    backgroundColor: '#334155',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  presetBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  dayCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  dayCircleText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  dayCircleTextActive: {
    color: '#FFF',
  },
  previewCard: {
    backgroundColor: '#0F172A',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    gap: 4,
  },
  previewBadge: {
    backgroundColor: '#EF4444',
    color: '#FFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '800',
    alignSelf: 'flex-start',
  },
  previewTimer: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  previewTitle: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  previewPrice: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: SPACING.md,
  },
  cancelButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  cancelButtonText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
});
