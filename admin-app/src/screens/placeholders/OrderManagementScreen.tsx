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
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchOrdersThunk, updateOrderStatusThunk } from '../../store/orderSlice';
import { AdminOrder, fetchRiders, assignRiderToOrder, BranchRider } from '../../services/api';
import { Card, StatusBadge, SlaBadge, Button, LoadingState, ErrorState, EmptyState } from '../../components/ui';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental &&
  !(globalThis as any).nativeFabricUIManager
) {
  try {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  } catch (e) {}
}

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
    const isDelivery = !order.order_type || order.order_type === 'DELIVERY';

    if (order.status === 'preparing' && isDelivery) {
      // Intercept preparing -> out_for_delivery for delivery orders with Rider Dispatch Modal
      openDispatchModal(order);
      return;
    }

    let nextStatus = '';
    if (order.status === 'received') {
      nextStatus = 'preparing';
    } else if (order.status === 'preparing' && !isDelivery) {
      // For TAKEAWAY / DINE_IN, preparing moves straight to delivered (completed/served)
      nextStatus = 'delivered';
    } else if (order.status === 'out_for_delivery') {
      nextStatus = 'delivered';
    }

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
    setSelectedRiderId(order.rider?.id || null);
    setDispatchModalVisible(true);
    setLoadingRiders(true);

    try {
      const riders = await fetchRiders({
        branch_id: order.branch_id || undefined,
        is_active: true,
      });
      setAvailableRiders(riders);
      if (!order.rider?.id) {
        const firstAvailable = riders.find((r) => r.status === 'AVAILABLE');
        if (firstAvailable) {
          setSelectedRiderId(firstAvailable.id);
        }
      }
    } catch (err) {
      console.warn('Failed to load riders for dispatch modal:', err);
    } finally {
      setLoadingRiders(false);
    }
  };

  const handleConfirmDispatch = async () => {
    if (!dispatchTargetOrder) return;
    if (!selectedRiderId) {
      Alert.alert('Rider Required', 'Please select a delivery rider before dispatching this order.');
      return;
    }

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

  // Filter orders by active tab
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
    const displayId = item.display_order_id || `#${item.id}`;
    const isDelivery = !item.order_type || item.order_type === 'DELIVERY';

    return (
      <Card
        style={styles.cardContainer}
        padding={0}
        onPress={() => toggleExpand(item.id)}
      >
        <View style={styles.cardInner}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.idBadgeRow}>
              <Text style={styles.displayId}>{displayId}</Text>
              <StatusBadge status={item.status} size="sm" />
            </View>

            <SlaBadge createdAt={item.created_at} status={item.status} size="sm" />
          </View>

          {/* Customer & Type Info */}
          <View style={styles.infoRow}>
            <Text style={styles.customerName}>
              👤 {item.guest_name || 'Guest Customer'}
            </Text>
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

          {/* Assigned Rider Indicator or Warning if missing */}
          {item.status === 'out_for_delivery' ? (
            item.rider ? (
              <View style={styles.riderRow}>
                <Text style={styles.riderText}>🛵 Assigned: {item.rider.name} ({item.rider.phone})</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.missingRiderRow}
                onPress={() => openDispatchModal(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.missingRiderText}>⚠️ No Rider Assigned • Tap to Assign Rider</Text>
              </TouchableOpacity>
            )
          ) : null}

          {/* Expanded Items & Details */}
          {isExpanded ? (
            <View style={styles.expandedContent}>
              <View style={styles.divider} />
              <Text style={styles.sectionHeader}>Order Items ({item.items?.length || 0})</Text>
              {item.items?.map((it, idx) => (
                <View key={it.id || idx} style={styles.itemRow}>
                  <Text style={styles.itemQty}>{it.quantity}x</Text>
                  <Text style={styles.itemName} numberOfLines={1}>{it.menu_item_name}</Text>
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
                  <Text style={styles.notesLabel}>Special Instructions:</Text>
                  <Text style={styles.notesText}>{item.special_instructions}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {/* Action Buttons */}
          {item.status !== 'delivered' && item.status !== 'cancelled' ? (
            <View style={styles.actionRow}>
              {isUpdating ? (
                <ActivityIndicator color={COLORS.branchManager.primary} style={{ flex: 1, paddingVertical: 8 }} />
              ) : (
                <>
                  {item.status === 'received' && (
                    <Button
                      title="🍳 Start Preparing"
                      variant="primary"
                      size="sm"
                      onPress={() => handleAdvanceStatus(item)}
                      style={styles.actionPrimaryBtn}
                    />
                  )}

                  {item.status === 'preparing' && (
                    isDelivery ? (
                      <Button
                        title="🛵 Dispatch Order"
                        variant="secondary"
                        size="sm"
                        onPress={() => handleAdvanceStatus(item)}
                        style={styles.actionPrimaryBtn}
                      />
                    ) : (
                      <Button
                        title={item.order_type === 'TAKEAWAY' ? '🛍️ Mark Ready / Pickup' : '🍽️ Mark Served / Done'}
                        variant="success"
                        size="sm"
                        onPress={() => handleAdvanceStatus(item)}
                        style={styles.actionPrimaryBtn}
                      />
                    )
                  )}

                  {item.status === 'out_for_delivery' && (
                    <Button
                      title="✅ Mark Delivered"
                      variant="success"
                      size="sm"
                      onPress={() => handleAdvanceStatus(item)}
                      style={styles.actionPrimaryBtn}
                    />
                  )}

                  <Button
                    title="Cancel"
                    variant="outline"
                    size="sm"
                    onPress={() => openCancelModal(item)}
                    textStyle={{ color: COLORS.danger }}
                    style={styles.actionCancelBtn}
                  />
                </>
              )}
            </View>
          ) : null}
        </View>
      </Card>
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
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
            Active ({orders.filter((o) => o.status === 'received' || o.status === 'preparing' || o.status === 'out_for_delivery').length})
          </Text>
          {newOrderCount > 0 ? (
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>🔥 {newOrderCount} NEW</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'delivered' && styles.tabActive]}
          onPress={() => setActiveTab('delivered')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'delivered' && styles.tabTextActive]}>
            Delivered ({orders.filter((o) => o.status === 'delivered').length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'cancelled' && styles.tabActive]}
          onPress={() => setActiveTab('cancelled')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'cancelled' && styles.tabTextActive]}>
            Cancelled ({orders.filter((o) => o.status === 'cancelled').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Order List */}
      {error && orders.length === 0 ? (
        <ErrorState
          title="Orders Sync Failed"
          message={error}
          onRetry={() => dispatch(fetchOrdersThunk({ isRefresh: true }))}
          retryLabel="Retry Live Feed"
          themeMode="branch"
        />
      ) : isLoading && orders.length === 0 ? (
        <LoadingState
          message="Fetching live kitchen orders..."
          themeMode="branch"
        />
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
            <EmptyState
              icon={activeTab === 'active' ? '📦' : activeTab === 'delivered' ? '✅' : '🚫'}
              title={activeTab === 'active' ? 'No Active Orders' : `No ${activeTab.toUpperCase()} Orders`}
              description={
                activeTab === 'active'
                  ? 'No active orders requiring attention right now. New customer orders will ring here automatically.'
                  : `No orders found in the ${activeTab} stage.`
              }
              themeMode="branch"
            />
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
              <ScrollView style={{ maxHeight: 220, marginVertical: SPACING.xs }}>
                {availableRiders.map((r) => {
                  const isSelected = selectedRiderId === r.id;
                  const isAvail = r.status === 'AVAILABLE';

                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.riderOption, isSelected && styles.riderOptionSelected]}
                      onPress={() => setSelectedRiderId(r.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.radioDot}>{isSelected ? '🔘' : '⚪'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.riderOptionName}>{r.name}</Text>
                        <Text style={styles.riderOptionSub}>📞 {r.phone} | {r.vehicle_type}</Text>
                      </View>
                      <Text style={[styles.riderOptionStatus, { color: isAvail ? COLORS.success : COLORS.warningDark }]}>
                        {isAvail ? '🟢 Available' : '🛵 On Delivery'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="md"
                onPress={() => setDispatchModalVisible(false)}
                style={styles.modalBtn}
              />
              <Button
                title="Confirm Dispatch"
                variant="primary"
                size="md"
                onPress={handleConfirmDispatch}
                isLoading={dispatchSubmitting}
                disabled={!selectedRiderId || availableRiders.length === 0}
                style={styles.modalBtn}
              />
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
              placeholder="e.g. Out of stock item, Customer requested cancellation"
              placeholderTextColor={COLORS.neutral400}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <Button
                title="Go Back"
                variant="outline"
                size="md"
                onPress={() => setCancelModalVisible(false)}
                style={styles.modalBtn}
              />
              <Button
                title="Confirm Cancel"
                variant="destructive"
                size="md"
                onPress={handleConfirmCancel}
                isLoading={actionLoadingId !== null}
                style={styles.modalBtn}
              />
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
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral200,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    flexDirection: 'row',
  },
  tabActive: {
    backgroundColor: COLORS.primaryTint,
  },
  tabText: {
    color: COLORS.neutral500,
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.branchManager.primary,
    fontWeight: '700',
  },
  newPill: {
    backgroundColor: COLORS.danger,
    borderRadius: RADIUS.round,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  newPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
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
    color: COLORS.neutral500,
    marginTop: SPACING.sm,
    fontSize: 14,
  },
  cardContainer: {
    marginBottom: SPACING.md,
  },
  cardInner: {
    padding: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  idBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  displayId: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  phoneText: {
    fontSize: 13,
    color: COLORS.neutral600,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  typeBadge: {
    backgroundColor: COLORS.neutral100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    marginRight: SPACING.xs,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.neutral700,
  },
  paymentBadge: {
    backgroundColor: COLORS.neutral100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    marginRight: SPACING.sm,
  },
  paymentText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.neutral600,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.branchManager.primary,
    marginLeft: 'auto',
  },
  timeText: {
    fontSize: 11,
    color: COLORS.neutral400,
    marginBottom: SPACING.xs,
  },
  riderRow: {
    backgroundColor: COLORS.infoLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    marginTop: 2,
    marginBottom: SPACING.xs,
  },
  riderText: {
    fontSize: 12,
    color: COLORS.info,
    fontWeight: '600',
  },
  missingRiderRow: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.xs,
    marginTop: 2,
    marginBottom: SPACING.xs,
  },
  missingRiderText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '700',
  },
  expandedContent: {
    marginTop: SPACING.xs,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.neutral200,
    marginVertical: SPACING.xs,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.neutral500,
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.branchManager.primary,
    width: 24,
  },
  itemName: {
    fontSize: 13,
    color: COLORS.dark,
    flex: 1,
  },
  itemPrice: {
    fontSize: 13,
    color: COLORS.neutral600,
    fontWeight: '600',
  },
  addressContainer: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.neutral50,
    padding: SPACING.xs + 2,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.neutral200,
  },
  addressLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.neutral500,
  },
  addressText: {
    fontSize: 12,
    color: COLORS.dark,
    marginTop: 1,
  },
  notesContainer: {
    marginTop: SPACING.xs,
    backgroundColor: '#FFFBEB',
    padding: SPACING.xs + 2,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  notesText: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 1,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral100,
    gap: SPACING.sm,
  },
  actionPrimaryBtn: {
    flex: 1,
  },
  actionCancelBtn: {
    paddingHorizontal: 12,
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
    ...TYPOGRAPHY.h2,
    color: COLORS.dark,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.neutral500,
    textAlign: 'center',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.large,
  },
  modalTitle: {
    ...TYPOGRAPHY.h2,
    color: COLORS.dark,
  },
  modalSubtitle: {
    fontSize: 13,
    color: COLORS.neutral500,
    marginBottom: SPACING.md,
  },
  emptyRiderBox: {
    padding: SPACING.md,
    backgroundColor: '#FFFBEB',
    borderRadius: RADIUS.sm,
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
    backgroundColor: COLORS.branchManager.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
  },
  rosterShortcutText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  riderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
    borderColor: COLORS.neutral200,
    marginBottom: 6,
    backgroundColor: COLORS.card,
  },
  riderOptionSelected: {
    borderColor: COLORS.branchManager.primary,
    backgroundColor: COLORS.primaryTint,
  },
  radioDot: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  riderOptionName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  riderOptionSub: {
    fontSize: 11,
    color: COLORS.neutral500,
  },
  riderOptionStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  modalErrorContainer: {
    backgroundColor: COLORS.dangerLight,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  modalErrorText: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  modalInput: {
    backgroundColor: COLORS.neutral50,
    borderWidth: 1,
    borderColor: COLORS.neutral300,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    fontSize: 14,
    color: COLORS.dark,
    textAlignVertical: 'top',
    marginBottom: SPACING.md,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  modalBtn: {
    flex: 1,
  },
});
