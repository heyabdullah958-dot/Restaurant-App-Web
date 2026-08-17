import React, { useState, useEffect, useCallback } from 'react';
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
  Linking,
  Platform,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchRidersThunk,
  createRiderThunk,
  updateRiderThunk,
  deleteRiderThunk,
  setSearchQuery,
  setStatusFilter,
} from '../../store/riderSlice';
import { BranchRider, fetchRestaurants } from '../../services/api';
import { StatusBadge, LoadingState, ErrorState, EmptyState } from '../../components/ui';

export const RiderManagementScreen = () => {
  const dispatch = useAppDispatch();
  const { role, branchId, restaurantId } = useAppSelector((state) => state.auth);
  const { riders, isLoading, isRefreshing, searchQuery, statusFilter, error } = useAppSelector(
    (state) => state.riders
  );

  const isSuper = role === 'super_admin';

  // Role-based theme tokens
  const themeBg = isSuper ? COLORS.superAdmin.bg : COLORS.branchManager.bg;
  const themeCard = isSuper ? COLORS.superAdmin.card : COLORS.branchManager.card;
  const themeText = isSuper ? COLORS.superAdmin.text : COLORS.branchManager.text;
  const themeMuted = isSuper ? COLORS.superAdmin.muted : COLORS.branchManager.muted;
  const themeAccent = isSuper ? COLORS.superAdmin.accent : COLORS.branchManager.primary;
  const themeBorder = isSuper ? COLORS.superAdmin.border : COLORS.branchManager.border;

  // Super Admin Brand Filter
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [restaurantsList, setRestaurantsList] = useState<any[]>([]);

  useEffect(() => {
    if (isSuper) {
      fetchRestaurants()
        .then((res: any) => {
          const list = Array.isArray(res) ? res : (res?.results || []);
          setRestaurantsList(list);
        })
        .catch(() => {});
    }
  }, [isSuper]);

  // Add / Edit Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRider, setEditingRider] = useState<BranchRider | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<'BIKE' | 'CAR' | 'SCOOTER' | 'BICYCLE'>('BIKE');
  const [status, setStatus] = useState<'AVAILABLE' | 'ON_DELIVERY' | 'OFFLINE'>('AVAILABLE');
  const [modalBrandId, setModalBrandId] = useState<number | null>(null);
  const [modalBranchId, setModalBranchId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeBranchId = branchId || undefined;

  // Real-time synchronization when Riders screen gains focus & continuous live interval
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchRidersThunk({ branch_id: activeBranchId }));

      const interval = setInterval(() => {
        dispatch(fetchRidersThunk({ branch_id: activeBranchId, isRefresh: false }));
      }, 6000);

      return () => clearInterval(interval);
    }, [dispatch, activeBranchId])
  );

  const handleRefresh = () => {
    dispatch(fetchRidersThunk({ branch_id: activeBranchId, isRefresh: true }));
  };

  const handleCallRider = async (phoneNumber: string) => {
    if (!phoneNumber) return;
    const url = `tel:${phoneNumber}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Call Error', `Cannot dial ${phoneNumber} on this device.`);
      }
    } catch {
      Alert.alert('Call Error', `Failed to open phone dialer for ${phoneNumber}.`);
    }
  };

  const handleQuickStatusToggle = (rider: BranchRider) => {
    const nextStatus = rider.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
    dispatch(updateRiderThunk({ id: rider.id, data: { status: nextStatus } }));
  };

  const openAddModal = () => {
    setEditingRider(null);
    setName('');
    setPhone('');
    setVehicleType('BIKE');
    setStatus('AVAILABLE');
    const firstRest = restaurantsList[0];
    const initialBrandId = firstRest ? firstRest.id : null;
    const initialBranchId = firstRest?.branches?.[0]?.id || null;
    setModalBrandId(initialBrandId);
    setModalBranchId(initialBranchId);
    setModalVisible(true);
  };

  const openEditModal = (rider: BranchRider) => {
    setEditingRider(rider);
    setName(rider.name);
    setPhone(rider.phone);
    setVehicleType(rider.vehicle_type || 'BIKE');
    setStatus(rider.status);
    setModalBranchId(rider.branch || null);
    setModalBrandId(rider.restaurant_id || null);
    setModalVisible(true);
  };

  const handleSaveRider = async () => {
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Validation Error', 'Name and Phone number are required.');
      return;
    }

    const targetBranch = isSuper ? (modalBranchId || branchId) : (branchId || 1);
    if (!targetBranch) {
      Alert.alert('Branch Required', 'Please select a branch to assign this rider.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingRider) {
        await dispatch(
          updateRiderThunk({
            id: editingRider.id,
            data: {
              name: name.trim(),
              phone: phone.trim(),
              vehicle_type: vehicleType,
              status,
              ...(isSuper && modalBranchId ? { branch: modalBranchId } : {}),
            },
          })
        ).unwrap();
      } else {
        const payload: Partial<BranchRider> = {
          name: name.trim(),
          phone: phone.trim(),
          vehicle_type: vehicleType,
          status,
          is_active: true,
          branch: targetBranch,
        };
        await dispatch(createRiderThunk(payload)).unwrap();
      }
      setModalVisible(false);
      handleRefresh();
    } catch (err: any) {
      Alert.alert('Error', typeof err === 'string' ? err : 'Failed to save rider');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRider = (rider: BranchRider) => {
    Alert.alert('Delete Rider', `Remove rider "${rider.name}" from roster?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await dispatch(deleteRiderThunk(rider.id)).unwrap();
          } catch (err: any) {
            Alert.alert('Error', typeof err === 'string' ? err : 'Failed to delete rider');
          }
        },
      },
    ]);
  };

  // Filter riders by search, status, and brand filter
  const filteredRiders = riders.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.branch_name && r.branch_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.restaurant_name && r.restaurant_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesBrand =
      brandFilter === 'ALL' ||
      String(r.restaurant_id) === String(brandFilter) ||
      (r.restaurant_name && r.restaurant_name.toLowerCase() === brandFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesBrand;
  });

  const getStatusBadgeInfo = (st: string) => {
    switch (st) {
      case 'AVAILABLE':
        return { label: '🟢 Available', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' };
      case 'ON_DELIVERY':
        return { label: '🛵 On Delivery', color: '#0284C7', bg: 'rgba(2, 132, 199, 0.12)' };
      case 'OFFLINE':
        return { label: '🛑 Offline', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' };
      default:
        return { label: st, color: '#64748B', bg: '#F1F5F9' };
    }
  };

  const renderRiderCard = ({ item }: { item: BranchRider }) => {
    return (
      <View style={[styles.card, { backgroundColor: themeCard, borderColor: themeBorder }]}>
        <View style={styles.cardHeader}>
          <View style={styles.avatarBox}>
            <Text style={styles.avatarIcon}>
              {item.vehicle_type === 'CAR' ? '🚗' : item.vehicle_type === 'SCOOTER' ? '🛴' : '🛵'}
            </Text>
          </View>
          <View style={styles.riderInfoCol}>
            <Text style={[styles.riderName, { color: themeText }]}>{item.name}</Text>
            <TouchableOpacity onPress={() => handleCallRider(item.phone)} activeOpacity={0.7}>
              <Text style={styles.riderPhone}>📞 {item.phone}</Text>
            </TouchableOpacity>

            {/* Prominent Brand & Branch Mapping Tag */}
            {item.restaurant_name || item.branch_name ? (
              <View style={styles.brandTagContainer}>
                {item.restaurant_name ? (
                  <Text style={styles.brandTagText}>🏪 {item.restaurant_name}</Text>
                ) : null}
                {item.branch_name ? (
                  <Text style={styles.branchTagText}>📍 {item.branch_name}</Text>
                ) : null}
              </View>
            ) : null}

            <Text style={[styles.vehicleText, { color: themeMuted }]}>
              {item.vehicle_type || 'BIKE'}
            </Text>
          </View>

          <StatusBadge status={item.status} size="sm" />
        </View>

        <View style={styles.cardActionsRow}>
          {/* Quick Toggle Available / Offline */}
          {item.status !== 'ON_DELIVERY' ? (
            <TouchableOpacity
              style={[
                styles.quickToggleBtn,
                item.status === 'AVAILABLE' ? styles.offBtn : styles.availBtn,
              ]}
              onPress={() => handleQuickStatusToggle(item)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.quickToggleText,
                  { color: item.status === 'AVAILABLE' ? COLORS.danger : COLORS.successDark },
                ]}
              >
                {item.status === 'AVAILABLE' ? 'Set Offline' : 'Set Available'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={[styles.onDeliveryText, { color: themeMuted }]}>🛵 On active delivery</Text>
          )}

          <View style={styles.rightActionRow}>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)} activeOpacity={0.7}>
              <Text style={styles.editBtnText}>✏️ Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteRider(item)} activeOpacity={0.7}>
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeBg }]}>
      <StatusBar barStyle={isSuper ? 'light-content' : 'dark-content'} backgroundColor={themeBg} />

      {/* Search & Add Header */}
      <View style={styles.searchBarContainer}>
        <View style={[styles.searchBox, { backgroundColor: themeCard, borderColor: themeBorder }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: themeText }]}
            placeholder="Search riders by name or phone..."
            placeholderTextColor={themeMuted}
            value={searchQuery}
            onChangeText={(text) => dispatch(setSearchQuery(text))}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => dispatch(setSearchQuery(''))}>
              <Text style={{ color: themeMuted, fontSize: 16 }}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity style={[styles.addRiderBtn, { backgroundColor: themeAccent }]} onPress={openAddModal}>
          <Text style={styles.addRiderBtnText}>+ Rider</Text>
        </TouchableOpacity>
      </View>

      {/* Super Admin Brand Filter Chips */}
      {isSuper && restaurantsList.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.brandChipsScroll}
          contentContainerStyle={styles.brandChipsContainer}
        >
          <TouchableOpacity
            style={[
              styles.brandChip,
              brandFilter === 'ALL' && { backgroundColor: themeAccent },
            ]}
            onPress={() => setBrandFilter('ALL')}
          >
            <Text
              style={[
                styles.brandChipText,
                { color: brandFilter === 'ALL' ? '#FFFFFF' : themeMuted },
              ]}
            >
              All Brands ({riders.length})
            </Text>
          </TouchableOpacity>
          {restaurantsList.map((rest) => (
            <TouchableOpacity
              key={rest.id}
              style={[
                styles.brandChip,
                String(brandFilter) === String(rest.id) && { backgroundColor: themeAccent },
              ]}
              onPress={() => setBrandFilter(String(rest.id))}
            >
              <Text
                style={[
                  styles.brandChipText,
                  { color: String(brandFilter) === String(rest.id) ? '#FFFFFF' : themeMuted },
                ]}
              >
                🏪 {rest.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      {/* Status Filter Segmented Control */}
      <View
        style={[
          styles.filterBarContainer,
          { backgroundColor: isSuper ? '#0F172A' : '#F1F5F9', borderColor: themeBorder },
        ]}
      >
        {['ALL', 'AVAILABLE', 'ON_DELIVERY', 'OFFLINE'].map((st) => {
          const isActive = statusFilter === st;
          return (
            <TouchableOpacity
              key={st}
              style={[
                styles.filterTab,
                isActive && { backgroundColor: themeAccent, ...SHADOWS.small },
              ]}
              onPress={() => dispatch(setStatusFilter(st))}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: isActive ? '#FFFFFF' : themeMuted, fontWeight: isActive ? '800' : '600' },
                ]}
                numberOfLines={1}
              >
                {st === 'ALL'
                  ? 'ALL'
                  : st === 'AVAILABLE'
                  ? 'AVAILABLE'
                  : st === 'ON_DELIVERY'
                  ? 'ON DELIVERY'
                  : 'OFFLINE'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Rider List */}
      {error && riders.length === 0 ? (
        <ErrorState
          title="Rider Roster Sync Notice"
          message={error}
          onRetry={handleRefresh}
          retryLabel="Retry Fleet Feed"
          themeMode={isSuper ? 'super' : 'branch'}
        />
      ) : isLoading && riders.length === 0 ? (
        <LoadingState
          message="Loading Riders Fleet..."
          themeMode={isSuper ? 'super' : 'branch'}
        />
      ) : (
        <FlatList
          data={filteredRiders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderRiderCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[themeAccent]}
              tintColor={themeAccent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon={searchQuery ? '🔍' : '🛵'}
              title={searchQuery ? 'No Matching Riders' : 'No Riders Registered'}
              description={
                searchQuery
                  ? `No riders found matching "${searchQuery}".`
                  : 'No delivery riders registered for this branch yet. Add your first rider to begin dispatching orders.'
              }
              themeMode={isSuper ? 'super' : 'branch'}
            />
          }
        />
      )}

      {/* Add / Edit Rider Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeCard }]}>
            <Text style={[styles.modalTitle, { color: themeText }]}>
              {editingRider ? 'Edit Rider Profile' : 'Add New Branch Rider'}
            </Text>

            <Text style={[styles.inputLabel, { color: themeMuted }]}>Rider Full Name *</Text>
            <TextInput
              style={[styles.modalInput, { color: themeText, borderColor: themeBorder, backgroundColor: themeBg }]}
              placeholder="e.g. Tariq Mehmood"
              placeholderTextColor={themeMuted}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.inputLabel, { color: themeMuted }]}>Phone Number *</Text>
            <TextInput
              style={[styles.modalInput, { color: themeText, borderColor: themeBorder, backgroundColor: themeBg }]}
              placeholder="e.g. 03001234567"
              placeholderTextColor={themeMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            {/* Super Admin Brand & Branch Picker */}
            {isSuper ? (
              <>
                <Text style={[styles.inputLabel, { color: themeMuted }]}>Assigned Restaurant Brand *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalChipsScroll}>
                  {restaurantsList.map((rest) => (
                    <TouchableOpacity
                      key={rest.id}
                      style={[
                        styles.modalChip,
                        modalBrandId === rest.id && { backgroundColor: themeAccent, borderColor: themeAccent },
                      ]}
                      onPress={() => {
                        setModalBrandId(rest.id);
                        const firstBr = rest.branches?.[0];
                        if (firstBr) setModalBranchId(firstBr.id);
                      }}
                    >
                      <Text
                        style={[
                          styles.modalChipText,
                          { color: modalBrandId === rest.id ? '#FFFFFF' : themeText },
                        ]}
                      >
                        🏪 {rest.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={[styles.inputLabel, { color: themeMuted, marginTop: SPACING.xs }]}>Assigned Branch *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalChipsScroll}>
                  {(() => {
                    const currentBrandObj = restaurantsList.find((r) => r.id === modalBrandId) || restaurantsList[0];
                    const branches = currentBrandObj?.branches || [];
                    if (branches.length === 0) {
                      return <Text style={{ color: themeMuted, fontSize: 11, fontStyle: 'italic' }}>No active branches found</Text>;
                    }
                    return branches.map((br: any) => (
                      <TouchableOpacity
                        key={br.id}
                        style={[
                          styles.modalChip,
                          modalBranchId === br.id && { backgroundColor: themeAccent, borderColor: themeAccent },
                        ]}
                        onPress={() => setModalBranchId(br.id)}
                      >
                        <Text
                          style={[
                            styles.modalChipText,
                            { color: modalBranchId === br.id ? '#FFFFFF' : themeText },
                          ]}
                        >
                          📍 {br.name}
                        </Text>
                      </TouchableOpacity>
                    ));
                  })()}
                </ScrollView>
              </>
            ) : null}

            <Text style={[styles.inputLabel, { color: themeMuted }]}>Vehicle Type</Text>
            <View style={styles.vehicleRow}>
              {(['BIKE', 'CAR', 'SCOOTER', 'BICYCLE'] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.vehicleChip,
                    vehicleType === v && { backgroundColor: themeAccent },
                  ]}
                  onPress={() => setVehicleType(v)}
                >
                  <Text style={{ color: vehicleType === v ? '#FFFFFF' : themeMuted, fontSize: 11, fontWeight: 'bold' }}>
                    {v}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: themeMuted, marginTop: SPACING.sm }]}>Rider Status</Text>
            <View style={styles.vehicleRow}>
              {(['AVAILABLE', 'OFFLINE'] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.vehicleChip,
                    status === s && { backgroundColor: s === 'AVAILABLE' ? '#10B981' : '#EF4444' },
                  ]}
                  onPress={() => setStatus(s)}
                >
                  <Text style={{ color: status === s ? '#FFFFFF' : themeMuted, fontSize: 11, fontWeight: 'bold' }}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={{ color: themeMuted }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: themeAccent }]}
                onPress={handleSaveRider}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={{ color: '#FFFFFF', fontWeight: 'bold' }}>Save Rider</Text>
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
  addRiderBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.xs,
  },
  addRiderBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterBarContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.sm,
    marginBottom: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 3,
    gap: 4,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
  },
  filterTabText: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  listContent: {
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
  card: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarIcon: {
    fontSize: 22,
  },
  riderInfoCol: {
    flex: 1,
  },
  riderName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  riderPhone: {
    fontSize: 13,
    color: '#0284C7',
    fontWeight: '600',
    marginTop: 2,
  },
  vehicleText: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  quickToggleBtn: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
  },
  availBtn: {
    backgroundColor: COLORS.successLight,
  },
  offBtn: {
    backgroundColor: COLORS.dangerLight,
  },
  quickToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  onDeliveryText: {
    fontSize: 11,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  rightActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderRadius: RADIUS.xs,
    marginRight: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
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
  vehicleRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  vehicleChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: RADIUS.xs,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: 6,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: SPACING.md,
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
  brandChipsScroll: {
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  brandChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandChip: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  brandChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  brandTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginVertical: 3,
  },
  brandTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38BDF8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  branchTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalChipsScroll: {
    marginBottom: SPACING.sm,
  },
  modalChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 6,
  },
  modalChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
