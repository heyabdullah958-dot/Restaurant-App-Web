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
import {
  fetchRestaurants,
  createTenantRestaurant,
  updateTenantRestaurant,
  deleteTenantRestaurant,
} from '../../services/api';
import { Card, formatHumanTime } from '../../components/ui';

export const TenantManagementScreen = () => {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Onboard Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingRestaurant, setEditingRestaurant] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [cuisineType, setCuisineType] = useState('');
  const [city, setCity] = useState('Lahore');
  const [phone, setPhone] = useState('+92 300 1234567');
  const [deliveryFee, setDeliveryFee] = useState('150');
  const [minOrderAmount, setMinOrderAmount] = useState('500');
  const [opensAt, setOpensAt] = useState('11:00');
  const [closesAt, setClosesAt] = useState('23:00');

  const loadData = async (showSpinner: boolean = false) => {
    if (showSpinner) setIsLoading(true);
    try {
      const response = await fetchRestaurants();
      const list = Array.isArray(response) ? response : response?.results || [];
      setRestaurants(list);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to fetch restaurant brands');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData(false);
  };

  const handleToggleActive = async (restaurant: any) => {
    const previousState = [...restaurants];
    const nextActive = !restaurant.is_active;

    // Optimistic Update
    setRestaurants((prev) =>
      prev.map((r) => (r.id === restaurant.id ? { ...r, is_active: nextActive } : r))
    );

    try {
      await updateTenantRestaurant(restaurant.id, { is_active: nextActive });
    } catch (err: any) {
      setRestaurants(previousState);
      Alert.alert('Update Failed', err?.message || 'Failed to update brand status');
    }
  };

  const handleToggleForceClosed = async (restaurant: any) => {
    const previousState = [...restaurants];
    const nextClosed = !restaurant.is_force_closed;

    setRestaurants((prev) =>
      prev.map((r) => (r.id === restaurant.id ? { ...r, is_force_closed: nextClosed } : r))
    );

    try {
      await updateTenantRestaurant(restaurant.id, { is_force_closed: nextClosed });
    } catch (err: any) {
      setRestaurants(previousState);
      Alert.alert('Update Failed', err?.message || 'Failed to toggle brand status');
    }
  };

  const openAddModal = () => {
    setEditingRestaurant(null);
    setName('');
    setSlug('');
    setCuisineType('');
    setCity('Lahore');
    setPhone('+92 300 1234567');
    setDeliveryFee('150');
    setMinOrderAmount('500');
    setOpensAt('11:00');
    setClosesAt('23:00');
    setModalVisible(true);
  };

  const openEditModal = (restaurant: any) => {
    setEditingRestaurant(restaurant);
    setName(restaurant.name);
    setSlug(restaurant.slug);
    setCuisineType(restaurant.cuisine_type || '');
    setCity(restaurant.city || 'Lahore');
    setPhone(restaurant.phone || '');
    setDeliveryFee(String(restaurant.delivery_fee || '150'));
    setMinOrderAmount(String(restaurant.min_order_amount || '500'));
    setOpensAt(restaurant.opens_at ? restaurant.opens_at.substring(0, 5) : '11:00');
    setClosesAt(restaurant.closes_at ? restaurant.closes_at.substring(0, 5) : '23:00');
    setModalVisible(true);
  };

  const handleSaveBrand = async () => {
    if (!name.trim() || !cuisineType.trim()) {
      Alert.alert('Validation Error', 'Please enter brand name and cuisine type.');
      return;
    }

    const payload = {
      name: name.trim(),
      slug: slug.trim() || name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
      cuisine_type: cuisineType.trim(),
      city: city.trim(),
      phone: phone.trim(),
      delivery_fee: parseFloat(deliveryFee) || 0,
      min_order_amount: parseFloat(minOrderAmount) || 0,
      opens_at: `${opensAt.trim()}:00`,
      closes_at: `${closesAt.trim()}:00`,
      address: `${city.trim()}, Pakistan`,
    };

    setIsSubmitting(true);
    try {
      if (editingRestaurant) {
        await updateTenantRestaurant(editingRestaurant.id, payload);
        Alert.alert('Success', `Brand '${name}' updated successfully!`);
      } else {
        await createTenantRestaurant(payload);
        Alert.alert('Success', `Brand '${name}' onboarded successfully!`);
      }
      setModalVisible(false);
      loadData(false);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || err?.message || 'Failed to save brand details');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBrand = (restaurant: any) => {
    Alert.alert(
      'Confirm Removal',
      `Are you sure you want to remove brand '${restaurant.name}'? This will delete all categories and menu items permanently.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTenantRestaurant(restaurant.id);
              Alert.alert('Deleted', `Brand '${restaurant.name}' removed.`);
              loadData(false);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete restaurant brand');
            }
          },
        },
      ]
    );
  };

  const filteredRestaurants = restaurants.filter((r) => {
    const term = searchQuery.toLowerCase();
    return (
      r.name?.toLowerCase().includes(term) ||
      r.slug?.toLowerCase().includes(term) ||
      r.cuisine_type?.toLowerCase().includes(term) ||
      r.city?.toLowerCase().includes(term)
    );
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.superAdmin.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Brand Registry</Text>
          <Text style={styles.subtitle}>Multi-Tenant Onboarding & Operational Control</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Text style={styles.addButtonText}>+ Onboard Brand</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search brands by name, slug, cuisine..."
          placeholderTextColor={COLORS.superAdmin.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Brand Roster List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.superAdmin.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredRestaurants}
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
            <Card style={styles.card} themeMode="super">
              <View style={styles.cardHeader}>
                <View style={styles.brandBadge}>
                  <Text style={styles.brandIcon}>🏢</Text>
                </View>
                <View style={styles.brandInfo}>
                  <Text style={styles.brandTitle}>{item.name}</Text>
                  <Text style={styles.brandSlug}>@{item.slug} • {item.cuisine_type}</Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    {
                      backgroundColor: item.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      borderColor: item.is_active ? '#10B981' : '#EF4444',
                    },
                  ]}
                >
                  <Text style={[styles.statusText, { color: item.is_active ? '#10B981' : '#EF4444' }]}>
                    {item.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsRow}>
                <Text style={styles.detailText}>📍 {item.city || 'Lahore'}</Text>
                <Text style={styles.detailText}>📞 {item.phone || 'N/A'}</Text>
                <Text style={styles.detailText}>🚚 Fee: Rs.{item.delivery_fee}</Text>
                {item.opens_at && item.closes_at ? (
                  <Text style={styles.detailText}>
                    🕒 {formatHumanTime(item.opens_at)} - {formatHumanTime(item.closes_at)}
                  </Text>
                ) : null}
              </View>

              {/* Toggles Row */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleItem}>
                  <Text style={styles.toggleLabel}>Active Platform Tenant</Text>
                  <Switch
                    value={item.is_active}
                    onValueChange={() => handleToggleActive(item)}
                    trackColor={{ false: '#334155', true: '#10B981' }}
                    thumbColor="#FFF"
                  />
                </View>

                <View style={styles.toggleItem}>
                  <Text style={styles.toggleLabel}>Force Closed</Text>
                  <Switch
                    value={item.is_force_closed}
                    onValueChange={() => handleToggleForceClosed(item)}
                    trackColor={{ false: '#334155', true: '#EF4444' }}
                    thumbColor="#FFF"
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => openEditModal(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.editButtonText}>✏️ Edit Config</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteBrand(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.deleteButtonText}>🗑️ Remove Brand</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />
      )}

      {/* Onboard / Edit Brand Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingRestaurant ? 'Edit Brand Config' : 'Onboard New Restaurant Brand'}
            </Text>

            <Text style={styles.inputLabel}>Brand Name</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Seen Banao, Jushh PK..."
              placeholderTextColor={COLORS.superAdmin.muted}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.inputLabel}>Slug (Identifier)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. seenbanao, jushhpk"
              placeholderTextColor={COLORS.superAdmin.muted}
              value={slug}
              onChangeText={setSlug}
            />

            <Text style={styles.inputLabel}>Cuisine Type</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Desi BBQ & Handi, Fast Food..."
              placeholderTextColor={COLORS.superAdmin.muted}
              value={cuisineType}
              onChangeText={setCuisineType}
            />

            <Text style={styles.inputLabel}>City</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Lahore"
              placeholderTextColor={COLORS.superAdmin.muted}
              value={city}
              onChangeText={setCity}
            />

            <Text style={styles.inputLabel}>Contact Phone</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="+92 300 1234567"
              placeholderTextColor={COLORS.superAdmin.muted}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.formRow}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Delivery Fee (Rs)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={deliveryFee}
                  onChangeText={setDeliveryFee}
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

            <View style={styles.formRow}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Opens At (HH:MM)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={opensAt}
                  onChangeText={setOpensAt}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Closes At (HH:MM)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={closesAt}
                  onChangeText={setClosesAt}
                />
              </View>
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
                onPress={handleSaveBrand}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitModalText}>
                    {editingRestaurant ? 'Save Changes' : 'Onboard Brand'}
                  </Text>
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
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  brandBadge: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  brandIcon: {
    fontSize: 18,
  },
  brandInfo: {
    flex: 1,
  },
  brandTitle: {
    color: COLORS.superAdmin.text,
    fontSize: 16,
    fontWeight: '700',
  },
  brandSlug: {
    color: '#38BDF8',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '600',
  },
  statusPill: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    backgroundColor: COLORS.superAdmin.bg,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  detailText: {
    color: COLORS.superAdmin.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.superAdmin.bg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    flex: 0.48,
    justifyContent: 'space-between',
  },
  toggleLabel: {
    color: COLORS.superAdmin.text,
    fontSize: 11,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  editButton: {
    flex: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: COLORS.superAdmin.accent,
    borderWidth: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  editButtonText: {
    color: COLORS.superAdmin.accent,
    fontSize: 12,
    fontWeight: 'bold',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: COLORS.danger,
    borderWidth: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#F87171',
    fontSize: 12,
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
  formRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  halfInput: {
    flex: 1,
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
