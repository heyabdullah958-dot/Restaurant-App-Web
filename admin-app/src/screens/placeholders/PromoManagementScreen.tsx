import React, { useEffect, useState } from 'react';
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
  fetchCouponsThunk,
  createCouponThunk,
  updateCouponThunk,
  deleteCouponThunk,
} from '../../store/promoSlice';
import { PromoCoupon, fetchRestaurants } from '../../services/api';
import { Card, formatHumanDate, LoadingState, ErrorState, EmptyState } from '../../components/ui';

export const PromoManagementScreen = () => {
  const dispatch = useAppDispatch();
  const { coupons, isLoading, isRefreshing, error } = useAppSelector((state) => state.promo);

  const [restaurants, setRestaurants] = useState<any[]>([]);

  // Create Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<PromoCoupon | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'FLAT' | 'PERCENTAGE'>('FLAT');
  const [discountValue, setDiscountValue] = useState('100');
  const [minOrderAmount, setMinOrderAmount] = useState('500');
  const [maxDiscountAmount, setMaxDiscountAmount] = useState('200');
  const [validUntil, setValidUntil] = useState('2026-12-31');
  const [selectedRestId, setSelectedRestId] = useState<number | null>(null);

  useEffect(() => {
    dispatch(fetchCouponsThunk());
    fetchRestaurants().then((res) => {
      const list = Array.isArray(res) ? res : res?.results || [];
      setRestaurants(list);
    });
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchCouponsThunk({ isRefresh: true }));
  };

  const handleToggleActive = (coupon: PromoCoupon) => {
    dispatch(
      updateCouponThunk({
        id: coupon.id,
        data: { is_active: !coupon.is_active },
      })
    );
  };

  const openAddModal = () => {
    setEditingCoupon(null);
    setCode('');
    setDiscountType('FLAT');
    setDiscountValue('100');
    setMinOrderAmount('500');
    setMaxDiscountAmount('200');
    setValidUntil('2026-12-31');
    setSelectedRestId(null);
    setModalVisible(true);
  };

  const handleSaveCoupon = async () => {
    if (!code.trim() || !discountValue.trim()) {
      Alert.alert('Validation Error', 'Please enter coupon code and discount value.');
      return;
    }

    const payload: Partial<PromoCoupon> = {
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue) || 0,
      min_order_amount: parseFloat(minOrderAmount) || 0,
      max_discount_amount: maxDiscountAmount.trim() ? parseFloat(maxDiscountAmount) : null,
      valid_until: validUntil.trim(),
      is_active: true,
      restaurant: selectedRestId,
    };

    setIsSubmitting(true);
    try {
      if (editingCoupon) {
        await dispatch(updateCouponThunk({ id: editingCoupon.id, data: payload })).unwrap();
        Alert.alert('Success', `Coupon '${code}' updated!`);
      } else {
        await dispatch(createCouponThunk(payload)).unwrap();
        Alert.alert('Success', `Coupon '${code}' created!`);
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', typeof err === 'string' ? err : err?.message || 'Failed to save coupon');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCoupon = (coupon: PromoCoupon) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete promo coupon '${coupon.code}'?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => dispatch(deleteCouponThunk(coupon.id)),
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
          <Text style={styles.title}>Promo Code Engine</Text>
          <Text style={styles.subtitle}>Discount Vouchers & Campaign Codes</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Create Code</Text>
        </TouchableOpacity>
      </View>

      {/* Coupons List */}
      {error && coupons.length === 0 ? (
        <ErrorState
          title="Promo Engine Sync Notice"
          message={error}
          onRetry={handleRefresh}
          retryLabel="Retry Coupon Feed"
          themeMode="super"
        />
      ) : isLoading && coupons.length === 0 ? (
        <LoadingState
          message="Loading Promotional Discount Engine..."
          themeMode="super"
        />
      ) : (
        <FlatList
          data={coupons}
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
              icon="🎟️"
              title="No Promo Codes Created"
              description="Create campaign discounts, flat vouchers, or percentage deals for any or all restaurant brands."
              themeMode="super"
            />
          }
          renderItem={({ item }) => {
            const hasMinOrder = item.min_order_amount && Number(item.min_order_amount) > 0;
            const minOrderText = hasMinOrder
              ? `Min Order: Rs. ${parseFloat(String(item.min_order_amount)).toLocaleString()}`
              : 'No minimum order';

            const hasExpiry = Boolean(item.valid_until);
            const expiryText = hasExpiry
              ? `Expires: ${formatHumanDate(item.valid_until)}`
              : 'No expiry date';

            const hasMaxDisc = item.max_discount_amount && Number(item.max_discount_amount) > 0;
            const maxDiscText = hasMaxDisc
              ? `Max Cap: Rs. ${parseFloat(String(item.max_discount_amount)).toLocaleString()}`
              : null;

            return (
              <Card style={styles.card} themeMode="super">
                <View style={styles.cardHeader}>
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeIcon}>🎟️</Text>
                    <Text style={styles.codeText}>{item.code}</Text>
                  </View>

                  <View style={styles.valueBadge}>
                    <Text style={styles.valueText}>
                      {item.discount_type === 'FLAT'
                        ? `Rs. ${item.discount_value} OFF`
                        : `${item.discount_value}% OFF`}
                    </Text>
                  </View>

                  <Switch
                    value={item.is_active}
                    onValueChange={() => handleToggleActive(item)}
                    trackColor={{ false: '#334155', true: '#EC4899' }}
                    thumbColor="#FFF"
                  />
                </View>

                <View style={styles.detailsRow}>
                  <Text style={styles.detailText}>🛒 {minOrderText}</Text>
                  {maxDiscText ? <Text style={styles.detailText}>🏷️ {maxDiscText}</Text> : null}
                  <Text style={styles.detailText}>📅 {expiryText}</Text>
                  <Text style={styles.detailText}>
                    🏢 Scope: {item.restaurant_name || 'All Platform Brands'}
                  </Text>
                  <Text style={styles.detailText}>
                    📊 Usage: {item.used_count || item.times_used || 0} times used (Active)
                  </Text>
                </View>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteCoupon(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.deleteButtonText}>🗑️ Delete Coupon</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            );
          }}
        />
      )}

      {/* Create Coupon Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Promo Coupon</Text>

            <Text style={styles.inputLabel}>Coupon Code (Uppercase)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. WELCOME500, SUMMER20"
              placeholderTextColor={COLORS.superAdmin.muted}
              value={code}
              onChangeText={(v) => setCode(v.toUpperCase())}
              autoCapitalize="characters"
            />

            <Text style={styles.inputLabel}>Discount Type</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[
                  styles.typeOption,
                  discountType === 'FLAT' && styles.typeOptionActive,
                ]}
                onPress={() => setDiscountType('FLAT')}
              >
                <Text
                  style={[
                    styles.typeText,
                    discountType === 'FLAT' && styles.typeTextActive,
                  ]}
                >
                  Flat Amount (Rs)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeOption,
                  discountType === 'PERCENTAGE' && styles.typeOptionActive,
                ]}
                onPress={() => setDiscountType('PERCENTAGE')}
              >
                <Text
                  style={[
                    styles.typeText,
                    discountType === 'PERCENTAGE' && styles.typeTextActive,
                  ]}
                >
                  Percentage (%)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formRow}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>
                  {discountType === 'FLAT' ? 'Discount (Rs)' : 'Discount (%)'}
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={discountValue}
                  onChangeText={setDiscountValue}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Min Order (Rs)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={minOrderAmount}
                  onChangeText={setMinOrderAmount}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.inputLabel}>Expiration Date (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="2026-12-31"
              placeholderTextColor={COLORS.superAdmin.muted}
              value={validUntil}
              onChangeText={setValidUntil}
            />

            <Text style={styles.inputLabel}>Scope (Brand Restriction)</Text>
            <View style={styles.pickerContainer}>
              <TouchableOpacity
                style={[
                  styles.pickerOption,
                  selectedRestId === null && styles.pickerOptionActive,
                ]}
                onPress={() => setSelectedRestId(null)}
              >
                <Text
                  style={[
                    styles.pickerOptionText,
                    selectedRestId === null && styles.pickerOptionTextActive,
                  ]}
                >
                  Global (All Brands)
                </Text>
              </TouchableOpacity>
              {restaurants.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.pickerOption,
                    selectedRestId === r.id && styles.pickerOptionActive,
                  ]}
                  onPress={() => setSelectedRestId(r.id)}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      selectedRestId === r.id && styles.pickerOptionTextActive,
                    ]}
                  >
                    {r.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitModalButton}
                onPress={handleSaveCoupon}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitModalText}>Create Coupon</Text>
                )}
              </TouchableOpacity>
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
    backgroundColor: COLORS.superAdmin.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  title: {
    color: COLORS.superAdmin.text,
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    backgroundColor: COLORS.superAdmin.accent,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: SPACING.md,
  },
  card: {
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
    borderColor: '#EC4899',
    borderWidth: 1,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    marginRight: SPACING.sm,
  },
  codeIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  codeText: {
    color: '#F472B6',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  valueBadge: {
    flex: 1,
  },
  valueText: {
    color: '#34D399',
    fontSize: 15,
    fontWeight: '700',
  },
  detailsRow: {
    backgroundColor: COLORS.superAdmin.bg,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  detailText: {
    color: COLORS.superAdmin.muted,
    fontSize: 11,
    marginVertical: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: COLORS.danger,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
  },
  deleteButtonText: {
    color: '#F87171',
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  modalContent: {
    backgroundColor: COLORS.superAdmin.card,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
  },
  modalTitle: {
    color: COLORS.superAdmin.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  inputLabel: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: COLORS.superAdmin.bg,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    color: COLORS.superAdmin.text,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    marginBottom: SPACING.sm,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  typeOption: {
    flex: 1,
    backgroundColor: COLORS.superAdmin.bg,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  typeOptionActive: {
    backgroundColor: COLORS.superAdmin.accent,
    borderColor: COLORS.superAdmin.accent,
  },
  typeText: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#FFF',
  },
  formRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  halfInput: {
    flex: 1,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.md,
  },
  pickerOption: {
    backgroundColor: COLORS.superAdmin.bg,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  pickerOptionActive: {
    backgroundColor: COLORS.superAdmin.accent,
    borderColor: COLORS.superAdmin.accent,
  },
  pickerOptionText: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    fontWeight: '600',
  },
  pickerOptionTextActive: {
    color: '#FFF',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  cancelModalButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.superAdmin.bg,
  },
  cancelModalText: {
    color: COLORS.superAdmin.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  submitModalButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.superAdmin.accent,
  },
  submitModalText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
