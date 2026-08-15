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
  fetchFlashDealsThunk,
  createFlashDealThunk,
  updateFlashDealThunk,
  deleteFlashDealThunk,
} from '../../store/promoSlice';
import { FlashDeal } from '../../services/api';
import { Card, formatHumanDateTime, LoadingState, ErrorState, EmptyState, DateTimePickerModal } from '../../components/ui';

export const FlashDealManagementScreen = () => {
  const dispatch = useAppDispatch();
  const { flashDeals, isLoading, isRefreshing, error } = useAppSelector((state) => state.promo);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingDeal, setEditingDeal] = useState<FlashDeal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('25');
  const [startTime, setStartTime] = useState(new Date().toISOString());
  const [endTime, setEndTime] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 59, 0);
    return d.toISOString();
  });
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);

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
    const now = new Date();
    setStartTime(now.toISOString());
    const end = new Date();
    end.setDate(end.getDate() + 7);
    end.setHours(23, 59, 59, 0);
    setEndTime(end.toISOString());
    setModalVisible(true);
  };

  const handleSaveDeal = async () => {
    if (!title.trim() || !discountPercentage.trim()) {
      Alert.alert('Validation Error', 'Please enter flash deal title and discount percentage.');
      return;
    }

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

    const val = parseFloat(discountPercentage) || 0;
    const payload: Partial<FlashDeal> = {
      title: title.trim(),
      deal_type: 'percentage',
      discount_value: val,
      discount_percentage: val,
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
              description="Create limited-time flash deals and happy hour discounts to boost peak order volume."
              themeMode="super"
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.card} themeMode="super">
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
                  trackColor={{ false: '#334155', true: '#EF4444' }}
                  thumbColor="#FFF"
                />
              </View>

              <View style={styles.timeBox}>
                <Text style={styles.timeText}>
                  🕒 Start: {item.start_time ? formatHumanDateTime(item.start_time) : 'Active Now'}
                </Text>
                <Text style={styles.timeText}>
                  🏁 End: {item.end_time ? formatHumanDateTime(item.end_time) : 'No end time'}
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteDeal(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deleteButtonText}>🗑️ Delete Deal</Text>
                </TouchableOpacity>
              </View>
            </Card>
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

            <Text style={styles.inputLabel}>Start Time</Text>
            <TouchableOpacity
              style={styles.datePickerTrigger}
              onPress={() => setPickerTarget('start')}
              activeOpacity={0.8}
            >
              <Text style={styles.datePickerIcon}>📅</Text>
              <View style={styles.datePickerCol}>
                <Text style={styles.datePickerHuman}>{formatHumanDateTime(startTime)}</Text>
                <Text style={styles.datePickerIso}>{startTime}</Text>
              </View>
              <Text style={styles.datePickerEdit}>Change</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>End Time (Expiry)</Text>
            <TouchableOpacity
              style={styles.datePickerTrigger}
              onPress={() => setPickerTarget('end')}
              activeOpacity={0.8}
            >
              <Text style={styles.datePickerIcon}>🏁</Text>
              <View style={styles.datePickerCol}>
                <Text style={styles.datePickerHuman}>{formatHumanDateTime(endTime)}</Text>
                <Text style={styles.datePickerIso}>{endTime}</Text>
              </View>
              <Text style={styles.datePickerEdit}>Change</Text>
            </TouchableOpacity>

            <DateTimePickerModal
              visible={pickerTarget !== null}
              onClose={() => setPickerTarget(null)}
              onSelect={(iso) => {
                if (pickerTarget === 'start') setStartTime(iso);
                if (pickerTarget === 'end') setEndTime(iso);
              }}
              initialDate={pickerTarget === 'start' ? startTime : endTime}
              mode="datetime"
              title={pickerTarget === 'start' ? 'Set Deal Start DateTime' : 'Set Deal End DateTime'}
              themeMode="super"
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
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  badgeIcon: {
    fontSize: 18,
  },
  titleBox: {
    flex: 1,
  },
  dealTitle: {
    color: COLORS.superAdmin.text,
    fontSize: 15,
    fontWeight: '700',
  },
  itemSub: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    marginTop: 2,
  },
  discountBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
    marginRight: SPACING.sm,
  },
  discountText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '700',
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
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.superAdmin.bg,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  datePickerIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  datePickerCol: {
    flex: 1,
  },
  datePickerHuman: {
    color: COLORS.superAdmin.text,
    fontSize: 13,
    fontWeight: '700',
  },
  datePickerIso: {
    color: COLORS.superAdmin.muted,
    fontSize: 10,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  datePickerEdit: {
    color: COLORS.superAdmin.accent,
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
});
