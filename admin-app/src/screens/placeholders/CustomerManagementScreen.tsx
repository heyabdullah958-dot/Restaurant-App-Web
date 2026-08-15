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
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchCustomersThunk,
  adjustLoyaltyThunk,
  setCustomerSearchQuery,
} from '../../store/customerSlice';
import { CustomerProfile } from '../../services/api';
import { Card, LoadingState, ErrorState, EmptyState } from '../../components/ui';

export const CustomerManagementScreen = () => {
  const dispatch = useAppDispatch();
  const { customers, isLoading, isRefreshing, isSubmitting, searchQuery, error } = useAppSelector(
    (state) => state.customer
  );

  // Loyalty Adjustment Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [targetCustomer, setTargetCustomer] = useState<CustomerProfile | null>(null);
  const [pointsInput, setPointsInput] = useState('');
  const [reasonInput, setReasonInput] = useState('');

  useEffect(() => {
    dispatch(fetchCustomersThunk());
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchCustomersThunk({ isRefresh: true }));
  };

  const handleSearchSubmit = () => {
    dispatch(fetchCustomersThunk({ search: searchQuery }));
  };

  const openLoyaltyModal = (customer: CustomerProfile) => {
    setTargetCustomer(customer);
    setPointsInput(String(customer.loyalty_points || 0));
    setReasonInput('');
    setModalVisible(true);
  };

  const handleSavePoints = async () => {
    if (!targetCustomer) return;
    const newPoints = parseInt(pointsInput, 10);
    if (isNaN(newPoints) || newPoints < 0) {
      Alert.alert('Validation Error', 'Loyalty points must be a valid non-negative integer.');
      return;
    }
    if (!reasonInput.trim()) {
      Alert.alert('Validation Error', 'Please enter a mandatory audit reason note.');
      return;
    }

    try {
      await dispatch(
        adjustLoyaltyThunk({
          customerId: targetCustomer.id,
          points: newPoints,
          reason: reasonInput.trim(),
        })
      ).unwrap();

      Alert.alert(
        'Points Adjusted',
        `Updated ${targetCustomer.name || targetCustomer.username}'s balance to ${newPoints} points!`
      );
      setModalVisible(false);
      setTargetCustomer(null);
    } catch (err: any) {
      Alert.alert('Adjustment Failed', typeof err === 'string' ? err : err?.message || 'Failed to adjust points');
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const term = searchQuery.toLowerCase();
    return (
      c.name?.toLowerCase().includes(term) ||
      c.username?.toLowerCase().includes(term) ||
      c.phone?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term)
    );
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.superAdmin.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Customer CRM</Text>
          <Text style={styles.subtitle}>Profiles, Spend Metrics & Loyalty Balance Control</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{customers.length} Profiles</Text>
        </View>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone (+92...), or email..."
          placeholderTextColor={COLORS.superAdmin.muted}
          value={searchQuery}
          onChangeText={(val) => dispatch(setCustomerSearchQuery(val))}
          onSubmitEditing={handleSearchSubmit}
        />
      </View>

      {/* Customer List */}
      {error && customers.length === 0 ? (
        <ErrorState
          title="Customer CRM Sync Notice"
          message={error}
          onRetry={handleRefresh}
          retryLabel="Retry Customer Feed"
          themeMode="super"
        />
      ) : isLoading && customers.length === 0 ? (
        <LoadingState
          message="Loading Customer Directory & Loyalty Records..."
          themeMode="super"
        />
      ) : (
        <FlatList
          data={filteredCustomers}
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
              icon={searchQuery ? '🔍' : '👥'}
              title={searchQuery ? 'No Matching Customers' : 'No Customers Registered'}
              description={
                searchQuery
                  ? `No customer profiles match "${searchQuery}".`
                  : 'Customer accounts and order history will automatically populate here as orders are placed.'
              }
              themeMode="super"
            />
          }
          renderItem={({ item }) => (
            <Card style={styles.card} themeMode="super">
              <View style={styles.cardHeader}>
                <View style={styles.avatarBadge}>
                  <Text style={styles.avatarIcon}>{item.is_guest ? '👤' : '👥'}</Text>
                </View>
                <View style={styles.infoBox}>
                  <Text style={styles.customerName}>
                    {item.name || item.username} {item.is_guest ? '(Guest)' : ''}
                  </Text>
                  <Text style={styles.customerPhone}>📞 {item.phone || 'No phone recorded'}</Text>
                  {item.email ? <Text style={styles.customerEmail}>✉️ {item.email}</Text> : null}
                </View>
                <View style={styles.pointsPill}>
                  <Text style={styles.pointsIcon}>💎</Text>
                  <Text style={styles.pointsText}>{item.loyalty_points} pts</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Orders Placed</Text>
                  <Text style={styles.statValue}>{item.orders_count || 0}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Total Spent</Text>
                  <Text style={styles.statValue}>
                    Rs. {typeof item.total_spent === 'number' ? item.total_spent.toLocaleString() : item.total_spent || '0'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.adjustButton}
                onPress={() => openLoyaltyModal(item)}
                activeOpacity={0.8}
              >
                <Text style={styles.adjustButtonText}>💎 Adjust Loyalty Points</Text>
              </TouchableOpacity>
            </Card>
          )}
        />
      )}

      {/* Adjust Loyalty Modal */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adjust Loyalty Balance</Text>
            <Text style={styles.modalSubtitle}>
              Customer: {targetCustomer?.name || targetCustomer?.username} (Current: {targetCustomer?.loyalty_points} pts)
            </Text>

            <Text style={styles.inputLabel}>New Loyalty Points Balance</Text>
            <TextInput
              style={styles.modalInput}
              value={pointsInput}
              onChangeText={setPointsInput}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Audit Reason Note (Mandatory)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Compensation for late delivery"
              placeholderTextColor={COLORS.superAdmin.muted}
              value={reasonInput}
              onChangeText={setReasonInput}
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
                onPress={handleSavePoints}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitModalText}>Update Points</Text>
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
  countBadge: {
    backgroundColor: COLORS.superAdmin.card,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  countBadgeText: {
    color: COLORS.superAdmin.accent,
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  searchInput: {
    backgroundColor: COLORS.superAdmin.card,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    color: COLORS.superAdmin.text,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
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
  avatarBadge: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarIcon: {
    fontSize: 18,
  },
  infoBox: {
    flex: 1,
  },
  customerName: {
    color: COLORS.superAdmin.text,
    fontSize: 15,
    fontWeight: '700',
  },
  customerPhone: {
    color: '#A78BFA',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  customerEmail: {
    color: COLORS.superAdmin.muted,
    fontSize: 11,
    marginTop: 1,
  },
  pointsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: '#8B5CF6',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  pointsIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  pointsText: {
    color: '#C4B5FD',
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.superAdmin.bg,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    color: COLORS.superAdmin.muted,
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: {
    color: COLORS.superAdmin.text,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  adjustButton: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderWidth: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  adjustButtonText: {
    color: '#A78BFA',
    fontSize: 12,
    fontWeight: '700',
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
  },
  modalSubtitle: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    marginBottom: SPACING.md,
    marginTop: 2,
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
