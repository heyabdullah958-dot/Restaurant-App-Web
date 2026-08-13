import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  LayoutAnimation,
  Platform,
  UIManager,
  Alert,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchOrdersThunk, updateOrderStatusThunk, clearOrderError } from '../../store/orderSlice';
import { AdminOrder, fetchRiders, assignRiderToOrder, BranchRider } from '../../services/api';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental &&
  !(globalThis as any).nativeFabricUIManager
) {
  try {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  } catch (e) {}
}

// ─── SLA Timer Helper ────────────────────────────────────────────────────────

const getSLABadge = (createdAt: string, status: string) => {
  if (status === 'delivered' || status === 'cancelled') return null;

  const elapsedMs = Date.now() - new Date(createdAt).getTime();
  const elapsedMins = Math.floor(elapsedMs / 60000);

  if (elapsedMins < 15) {
    return { label: `🟢 ${elapsedMins}m`, color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' };
  } else if (elapsedMins <= 30) {
    return { label: `⚠️ ${elapsedMins}m`, color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' };
  } else {
    return { label: `🚨 ${elapsedMins}m OVERDUE`, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
  }
};

// ─── Status Color Helper ─────────────────────────────────────────────────────

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'received':
      return { label: 'Received', color: '#6366F1', bg: 'rgba(99, 102, 241, 0.12)' };
    case 'preparing':
      return { label: 'Preparing', color: '#F97316', bg: 'rgba(249, 115, 22, 0.12)' };
    case 'out_for_delivery':
      return { label: 'Out for Delivery', color: '#0284C7', bg: 'rgba(2, 132, 199, 0.12)' };
    case 'delivered':
      return { label: 'Delivered', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' };
    case 'cancelled':
      return { label: 'Cancelled', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' };
    default:
      return { label: status, color: '#64748B', bg: '#F1F5F9' };
  }
};

export const OrderManagementScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const { orders, isLoading, isRefreshing, error } = useAppSelector((state) => state.orders);

  const newOrderCount = orders.filter((o) => o.status === 'received').length;

  const [activeTab, setActiveTab] = useState<'active' | 'delivered' | 'cancelled'>('active');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  // Cancellation Modal State
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelTargetOrder, setCancelTargetOrder] = useState<AdminOrder | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Rider Dispatch Modal State
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [dispatchTargetOrder, setDispatchTargetOrder] = useState<AdminOrder | null>(null);
  const [availableRiders, setAvailableRiders] = useState<BranchRider[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<number | null>(null);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [dispatchSubmitting, setDispatchSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchOrdersThunk());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchOrdersThunk({ isRefresh: true }));
  };

  const toggleExpand = (orderId: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleAdvanceStatus = async (order: AdminOrder) => {
    if (order.status === 'preparing') {
      // Intercept preparing -> out_for_delivery with Rider Dispatch Modal
      openDispatchModal(order);
      return;
    }

    let nextStatus = '';
    if (order.status === 'received') nextStatus = 'preparing';
    else if (order.status === 'out_for_delivery') nextStatus = 'delivered';

    if (!nextStatus) return;

    setActionLoadingId(order.id);
    try {
      await dispatch(updateOrderStatusThunk({ orderId: order.id, status: nextStatus })).unwrap();
    } catch (err: any) {
      console.warn('Status update failed:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const openDispatchModal = async (order: AdminOrder) => {
    setDispatchTargetOrder(order);
    setSelectedRiderId(null);
    setDispatchModalVisible(true);
    setLoadingRiders(true);

    try {
      const riders = await fetchRiders({
        branch_id: order.branch_id || undefined,
        is_active: true,
      });
      setAvailableRiders(riders);
      const firstAvailable = riders.find((r) => r.status === 'AVAILABLE');
      if (firstAvailable) {
        setSelectedRiderId(firstAvailable.id);
      }
    } catch (err) {
      console.warn('Failed to load riders for dispatch modal:', err);
    } finally {
      setLoadingRiders(false);
    }
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchTargetOrder) return;

    setDispatchSubmitting(true);
    try {
      await assignRiderToOrder(dispatchTargetOrder.id, selectedRiderId);
      setDispatchModalVisible(false);
      setDispatchTargetOrder(null);
      dispatch(fetchOrdersThunk({ isRefresh: true }));
    } catch (err: any) {
      Alert.alert('Dispatch Error', err?.response?.data?.detail || err?.message || 'Failed to dispatch order');
    } finally {
      setDispatchSubmitting(false);
    }
  };

  const openCancelModal = (order: AdminOrder) => {
    setCancelTargetOrder(order);
    setCancellationReason('');
    setCancelError(null);
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTargetOrder) return;
    if (!cancellationReason.trim()) {
      setCancelError('Cancellation reason is required');
      return;
    }

    setActionLoadingId(cancelTargetOrder.id);
    setCancelError(null);
    try {
      await dispatch(
        updateOrderStatusThunk({
          orderId: cancelTargetOrder.id,
          status: 'cancelled',
          cancellationReason: cancellationReason.trim(),
        })
      ).unwrap();
      setCancelModalVisible(false);
      setCancelTargetOrder(null);
    } catch (err: any) {
      setCancelError(typeof err === 'string' ? err : err?.message || 'Failed to cancel order');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filter orders by tab
  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'active') {
      return o.status === 'received' || o.status === 'preparing' || o.status === 'out_for_delivery';
    }
    if (activeTab === 'delivered') return o.status === 'delivered';
    if (activeTab === 'cancelled') return o.status === 'cancelled';
    return true;
  });

  const renderOrderCard = ({ item }: { item: AdminOrder }) => {
    const isExpanded = expandedOrderId === item.id;
    const isUpdating = actionLoadingId === item.id;
    const statusBadge = getStatusBadge(item.status);
    const slaBadge = getSLABadge(item.created_at, item.status);
    const displayId = item.display_order_id || `#${item.id}`;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => toggleExpand(item.id)}
        activeOpacity={0.9}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.idContainer}>
            <Text style={styles.displayId}>{displayId}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
              <Text style={[styles.statusText, { color: statusBadge.color }]}>
                {statusBadge.label}
              </Text>
            </View>
          </View>

          {slaBadge ? (
            <View style={[styles.slaBadge, { backgroundColor: slaBadge.bg }]}>
              <Text style={[styles.slaText, { color: slaBadge.color }]}>{slaBadge.label}</Text>
            </View>
          ) : null}
        </View>

        {/* Customer & Type Info */}
        <View style={styles.infoRow}>
          <Text style={styles.customerName}>{item.guest_name || 'Guest Customer'}</Text>
          <Text style={styles.phoneText}>📞 {item.guest_phone || 'N/A'}</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>
              {item.order_type === 'DINE_IN'
                ? `🍽️ DINE-IN ${item.table_number ? `(T-${item.table_number})` : ''}`
                : item.order_type === 'TAKEAWAY'
                ? '🛍️ PICKUP'
                : '🛵 DELIVERY'}
            </Text>
          </View>

          <View style={styles.paymentBadge}>
            <Text style={styles.paymentText}>
              {(item.payment_method || 'COD').toUpperCase()}
            </Text>
          </View>

          <Text style={styles.totalPrice}>Rs. {parseFloat(item.total).toLocaleString()}</Text>
        </View>

        {/* Time Stamp */}
        <Text style={styles.timeText}>
          Placed: {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>

        {/* Expanded Items & Address */}
        {isExpanded ? (
          <View style={styles.expandedContent}>
            <View style={styles.divider} />
            <Text style={styles.sectionHeader}>Order Items ({item.items?.length || 0})</Text>
            {item.items?.map((it, idx) => (
              <View key={it.id || idx} style={styles.itemRow}>
                <Text style={styles.itemQty}>{it.quantity}x</Text>
                <Text style={styles.itemName}>{it.menu_item_name}</Text>
                <Text style={styles.itemPrice}>Rs. {parseFloat(it.total_price).toLocaleString()}</Text>
              </View>
            ))}

            {item.delivery_address ? (
              <View style={styles.addressContainer}>
                <Text style={styles.addressLabel}>Delivery Address:</Text>
                <Text style={styles.addressText}>{item.delivery_address}</Text>
              </View>
            ) : null}

            {item.special_instructions ? (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Instructions:</Text>
                <Text style={styles.notesText}>{item.special_instructions}</Text>
              </View>
            ) : null}

            {item.rider ? (
              <View style={styles.riderContainer}>
                <Text style={styles.riderLabel}>Assigned Rider:</Text>
                <Text style={styles.riderText}>🛵 {item.rider.name} ({item.rider.phone})</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Forward Status Action Buttons */}
        {item.status !== 'delivered' && item.status !== 'cancelled' ? (
          <View style={styles.actionRow}>
            {isUpdating ? (
              <ActivityIndicator color={COLORS.branchManager.primary} style={{ flex: 1 }} />
            ) : (
              <>
                {item.status === 'received' && (
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: '#6366F1' }]}
                    onPress={() => handleAdvanceStatus(item)}
                  >
                    <Text style={styles.buttonText}>🍳 Start Preparing</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'preparing' && (
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: '#F97316' }]}
                    onPress={() => handleAdvanceStatus(item)}
                  >
                    <Text style={styles.buttonText}>🛵 Dispatch Order</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'out_for_delivery' && (
                  <TouchableOpacity
                    style={[styles.primaryButton, { backgroundColor: '#10B981' }]}
                    onPress={() => handleAdvanceStatus(item)}
                  >
                    <Text style={styles.buttonText}>✅ Mark Delivered</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.cancelTextButton}
                  onPress={() => openCancelModal(item)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.branchManager.bg} />

      {/* Header Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.tabActive]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active ({orders.filter((o) => o.status === 'received' || o.status === 'preparing' || o.status === 'out_for_delivery').length})
          </Text>
          {newOrderCount > 0 ? (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>{newOrderCount}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'delivered' && styles.tabActive]}
          onPress={() => setActiveTab('delivered')}
        >
          <Text style={[styles.tabText, activeTab === 'delivered' && styles.tabTextActive]}>
            Delivered ({orders.filter((o) => o.status === 'delivered').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'cancelled' && styles.tabActive]}
          onPress={() => setActiveTab('cancelled')}
        >
          <Text style={[styles.tabText, activeTab === 'cancelled' && styles.tabTextActive]}>
            Cancelled ({orders.filter((o) => o.status === 'cancelled').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Order List */}
      {isLoading && orders.length === 0 ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={COLORS.branchManager.primary} />
          <Text style={styles.loadingText}>Fetching Live Orders...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.branchManager.primary]}
              tintColor={COLORS.branchManager.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'active'
                  ? 'No active orders requiring attention right now.'
                  : `No ${activeTab} orders recorded.`}
              </Text>
            </View>
          }
        />
      )}

      {/* Rider Dispatch Modal */}
      <Modal
        visible={dispatchModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDispatchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Assign Delivery Rider</Text>
            <Text style={styles.modalSubtitle}>
              Order ID: {dispatchTargetOrder?.display_order_id || `#${dispatchTargetOrder?.id}`}
            </Text>

            {loadingRiders ? (
              <ActivityIndicator color={COLORS.branchManager.primary} style={{ marginVertical: SPACING.md }} />
            ) : availableRiders.length === 0 ? (
              <View style={styles.emptyRiderBox}>
                <Text style={styles.emptyRiderText}>⚠️ No available riders found for this branch.</Text>
                <TouchableOpacity
                  style={styles.rosterShortcutBtn}
                  onPress={() => {
                    setDispatchModalVisible(false);
                    if (navigation) navigation.navigate('Riders');
                  }}
                >
                  <Text style={styles.rosterShortcutText}>Go to Rider Roster →</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 200, marginVertical: SPACING.xs }}>
                {availableRiders.map((r) => {
                  const isSelected = selectedRiderId === r.id;
                  const isAvail = r.status === 'AVAILABLE';

                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.riderOption, isSelected && styles.riderOptionSelected]}
                      onPress={() => setSelectedRiderId(r.id)}
                    >
                      <Text style={styles.radioDot}>{isSelected ? '🔘' : '⚪'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.riderOptionName}>{r.name}</Text>
                        <Text style={styles.riderOptionSub}>📞 {r.phone} | {r.vehicle_type}</Text>
                      </View>
                      <Text style={[styles.riderOptionStatus, { color: isAvail ? '#10B981' : '#F59E0B' }]}>
                        {isAvail ? '🟢 Available' : '🛵 Busy'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDispatchModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#F97316' }]}
                onPress={handleConfirmDispatch}
                disabled={dispatchSubmitting || (availableRiders.length > 0 && !selectedRiderId)}
              >
                {dispatchSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Confirm Dispatch</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Cancellation Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancel Order</Text>
            <Text style={styles.modalSubtitle}>
              Order ID: {cancelTargetOrder?.display_order_id || `#${cancelTargetOrder?.id}`}
            </Text>

            {cancelError ? (
              <View style={styles.modalErrorContainer}>
                <Text style={styles.modalErrorText}>{cancelError}</Text>
              </View>
            ) : null}

            <Text style={styles.modalLabel}>Cancellation Reason (Required):</Text>
            <TextInput
              style={styles.modalInput}
              value={cancellationReason}
              onChangeText={setCancellationReason}
              placeholder="e.g. Out of stock, Customer request"
              placeholderTextColor={COLORS.branchManager.muted}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Go Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleConfirmCancel}
                disabled={actionLoadingId !== null}
              >
                {actionLoadingId !== null ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalConfirmBtnText}>Confirm Cancel</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.branchManager.bg,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.branchManager.card,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.branchManager.border,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    flexDirection: 'row',
  },
  tabActive: {
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
  },
  tabText: {
    color: COLORS.branchManager.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.branchManager.primary,
    fontWeight: 'bold',
  },
  newBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  newBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  listContent: {
    padding: SPACING.md,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.branchManager.muted,
    marginTop: SPACING.sm,
    fontSize: 14,
  },
  card: {
    backgroundColor: COLORS.branchManager.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.branchManager.border,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  displayId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.branchManager.text,
    marginRight: SPACING.sm,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  slaBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  slaText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.branchManager.text,
  },
  phoneText: {
    fontSize: 13,
    color: COLORS.branchManager.muted,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  typeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    marginRight: SPACING.xs,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.branchManager.text,
  },
  paymentBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    marginRight: SPACING.sm,
  },
  paymentText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.branchManager.muted,
  },
  totalPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.branchManager.primary,
    marginLeft: 'auto',
  },
  timeText: {
    fontSize: 11,
    color: COLORS.branchManager.muted,
    marginBottom: SPACING.xs,
  },
  expandedContent: {
    marginTop: SPACING.xs,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.branchManager.border,
    marginVertical: SPACING.xs,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.branchManager.muted,
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.branchManager.primary,
    width: 24,
  },
  itemName: {
    fontSize: 13,
    color: COLORS.branchManager.text,
    flex: 1,
  },
  itemPrice: {
    fontSize: 13,
    color: COLORS.branchManager.muted,
  },
  addressContainer: {
    marginTop: SPACING.xs,
    backgroundColor: '#F8FAFC',
    padding: SPACING.xs,
    borderRadius: RADIUS.xs,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.branchManager.muted,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.branchManager.text,
  },
  notesContainer: {
    marginTop: SPACING.xs,
    backgroundColor: '#FFFBEB',
    padding: SPACING.xs,
    borderRadius: RADIUS.xs,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#D97706',
  },
  notesText: {
    fontSize: 12,
    color: '#B45309',
  },
  riderContainer: {
    marginTop: SPACING.xs,
    backgroundColor: '#F0F9FF',
    padding: SPACING.xs,
    borderRadius: RADIUS.xs,
  },
  riderLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#0284C7',
  },
  riderText: {
    fontSize: 12,
    color: '#0369A1',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.branchManager.border,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xs,
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  cancelTextButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  cancelButtonText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
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
    color: COLORS.branchManager.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.branchManager.muted,
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.branchManager.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.large,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.branchManager.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.branchManager.muted,
    marginBottom: SPACING.md,
  },
  emptyRiderBox: {
    padding: SPACING.md,
    backgroundColor: '#FFFBEB',
    borderRadius: RADIUS.xs,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  emptyRiderText: {
    color: '#B45309',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  rosterShortcutBtn: {
    marginTop: SPACING.sm,
    backgroundColor: '#F97316',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.xs,
  },
  rosterShortcutText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  riderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.branchManager.border,
    marginBottom: 6,
  },
  riderOptionSelected: {
    borderColor: '#F97316',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
  },
  radioDot: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  riderOptionName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.branchManager.text,
  },
  riderOptionSub: {
    fontSize: 11,
    color: COLORS.branchManager.muted,
  },
  riderOptionStatus: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalErrorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: SPACING.xs,
    borderRadius: RADIUS.xs,
    marginBottom: SPACING.sm,
  },
  modalErrorText: {
    color: '#EF4444',
    fontSize: 12,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.branchManager.text,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: COLORS.branchManager.bg,
    borderWidth: 1,
    borderColor: COLORS.branchManager.border,
    borderRadius: RADIUS.xs,
    padding: SPACING.sm,
    fontSize: 14,
    color: COLORS.branchManager.text,
    textAlignVertical: 'top',
    marginBottom: SPACING.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.sm,
  },
  modalCancelBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginRight: SPACING.sm,
  },
  modalCancelBtnText: {
    color: COLORS.branchManager.muted,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.xs,
  },
  modalConfirmBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
