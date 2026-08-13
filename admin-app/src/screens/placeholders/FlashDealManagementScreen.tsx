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
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchFlashDealsThunk,
  createFlashDealThunk,
  updateFlashDealThunk,
  deleteFlashDealThunk,
} from '../../store/promoSlice';
import { FlashDeal } from '../../services/api';

export const FlashDealManagementScreen = () => {
  const dispatch = useAppDispatch();
  const { flashDeals, isLoading, isRefreshing } = useAppSelector((state) => state.promo);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingDeal, setEditingDeal] = useState<FlashDeal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('25');
  const [startTime, setStartTime] = useState('2026-08-12T00:00:00Z');
  const [endTime, setEndTime] = useState('2026-12-31T23:59:59Z');

  useEffect(() => {
    dispatch(fetchFlashDealsThunk());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchFlashDealsThunk({ isRefresh: true }));
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
    setDiscountPercentage('25');
    setStartTime('2026-08-12T00:00:00Z');
    setEndTime('2026-12-31T23:59:59Z');
    setModalVisible(true);
  };

  const handleSaveDeal = async () => {
    if (!title.trim() || !discountPercentage.trim()) {
      Alert.alert('Validation Error', 'Please enter flash deal title and discount percentage.');
      return;
    }

    const payload: Partial<FlashDeal> = {
      title: title.trim(),
      discount_percentage: parseFloat(discountPercentage) || 0,
      start_time: startTime.trim(),
      end_time: endTime.trim(),
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
          <Text style={styles.title}>Flash Deals</Text>
          <Text style={styles.subtitle}>Time-Bound Specials & Hourly Promotions</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Add Flash Deal</Text>
        </TouchableOpacity>
      </View>

      {/* Deals List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.superAdmin.accent} />
        </View>
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
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.badge}>
                  <Text style={styles.badgeIcon}>⚡</Text>
                </View>

                <View style={styles.titleBox}>
                  <Text style={styles.dealTitle}>{item.title}</Text>
                  {item.menu_item_name ? (
                    <Text style={styles.itemSub}>Item: {item.menu_item_name}</Text>
                  ) : null}
                </View>

                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{item.discount_percentage}% OFF</Text>
                </View>

                <Switch
                  value={item.is_active}
                  onValueChange={() => handleToggleActive(item)}
                  trackColor={{ false: '#334155', true: '#10B981' }}
                  thumbColor="#FFF"
                />
              </View>

              <View style={styles.timeBox}>
                <Text style={styles.timeText}>
                  🕒 Start: {item.start_time ? item.start_time.substring(0, 16).replace('T', ' ') : 'Now'}
                </Text>
                <Text style={styles.timeText}>
                  🏁 End: {item.end_time ? item.end_time.substring(0, 16).replace('T', ' ') : 'N/A'}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteDeal(item)}
                >
                  <Text style={styles.deleteButtonText}>🗑️ Delete Deal</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Create Flash Deal Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Flash Deal</Text>

            <Text style={styles.inputLabel}>Deal Campaign Title</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Midnight Burger Special, BBQ Hour"
              placeholderTextColor={COLORS.superAdmin.muted}
              value={title}
              onChangeText={setTitle}
            />

            <Text style={styles.inputLabel}>Discount Percentage (%)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="25"
              placeholderTextColor={COLORS.superAdmin.muted}
              value={discountPercentage}
              onChangeText={setDiscountPercentage}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Start Time (ISO String)</Text>
            <TextInput
              style={styles.modalInput}
              value={startTime}
              onChangeText={setStartTime}
            />

            <Text style={styles.inputLabel}>End Time (ISO String)</Text>
            <TextInput
              style={styles.modalInput}
              value={endTime}
              onChangeText={setEndTime}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitModalButton}
                onPress={handleSaveDeal}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitModalText}>Create Deal</Text>
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
    backgroundColor: COLORS.superAdmin.card,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  badgeIcon: {
    fontSize: 16,
  },
  titleBox: {
    flex: 1,
  },
  dealTitle: {
    color: COLORS.superAdmin.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  itemSub: {
    color: COLORS.superAdmin.muted,
    fontSize: 11,
  },
  discountBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
    marginRight: SPACING.sm,
  },
  discountText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  timeBox: {
    backgroundColor: COLORS.superAdmin.bg,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  timeText: {
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
