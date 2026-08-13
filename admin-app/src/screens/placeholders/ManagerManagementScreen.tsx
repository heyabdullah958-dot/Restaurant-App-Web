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
  ScrollView,
} from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../store';
import {
  fetchManagersThunk,
  createManagerThunk,
  changeManagerPasswordThunk,
} from '../../store/tenantSlice';
import { fetchRestaurants, fetchBranches, StaffManager } from '../../services/api';

export const ManagerManagementScreen = () => {
  const dispatch = useAppDispatch();
  const { managers, isLoading, isRefreshing, isSubmitting, error } = useAppSelector(
    (state) => state.tenant
  );

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);

  // Create Manager Modal State
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [selectedRestId, setSelectedRestId] = useState<number>(0);
  const [selectedBranchId, setSelectedBranchId] = useState<number>(0);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [customPassword, setCustomPassword] = useState('');

  // Password Reset Modal State
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetTargetManager, setResetTargetManager] = useState<StaffManager | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // Credentials Output Modal State
  const [credentialsModalVisible, setCredentialsModalVisible] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string;
    password?: string;
    restaurant: string;
    branch: string;
  } | null>(null);

  useEffect(() => {
    dispatch(fetchManagersThunk());
    fetchRestaurants().then((res) => {
      const list = Array.isArray(res) ? res : res?.results || [];
      setRestaurants(list);
      if (list.length > 0) {
        setSelectedRestId(list[0].id);
      }
    });
  }, [dispatch]);

  // Load branches when selected restaurant changes
  useEffect(() => {
    if (selectedRestId) {
      fetchBranches(selectedRestId).then((list: any) => {
        const bList = Array.isArray(list) ? list : list?.results || [];
        setBranches(bList);
        if (bList.length > 0) {
          setSelectedBranchId(bList[0].id);
        } else {
          setSelectedBranchId(0);
        }
      });
    }
  }, [selectedRestId]);

  const handleRefresh = () => {
    dispatch(fetchManagersThunk({ isRefresh: true }));
  };

  const handleOpenCreateModal = () => {
    setNotificationEmail('');
    setCustomPassword('');
    setCreateModalVisible(true);
  };

  const handleCreateManager = async () => {
    if (!selectedRestId || !selectedBranchId || !notificationEmail.trim()) {
      Alert.alert('Validation Error', 'Please select restaurant, branch, and enter notification email.');
      return;
    }

    try {
      const res = await dispatch(
        createManagerThunk({
          restaurant_id: selectedRestId,
          branch_id: selectedBranchId,
          notification_email: notificationEmail.trim(),
          password: customPassword.trim() || undefined,
        })
      ).unwrap();

      setCreateModalVisible(false);
      setCreatedCredentials({
        username: res.username,
        password: res.password,
        restaurant: res.restaurant,
        branch: res.branch,
      });
      setCredentialsModalVisible(true);
      dispatch(fetchManagersThunk({ isRefresh: true }));
    } catch (err: any) {
      Alert.alert('Creation Failed', typeof err === 'string' ? err : err?.message || 'Failed to create manager');
    }
  };

  const handleOpenResetModal = (manager: StaffManager) => {
    setResetTargetManager(manager);
    setNewPassword('');
    setResetModalVisible(true);
  };

  const handleConfirmPasswordReset = async () => {
    if (!resetTargetManager) return;
    if (!newPassword.trim()) {
      Alert.alert('Validation Error', 'Please enter a new password.');
      return;
    }

    try {
      await dispatch(
        changeManagerPasswordThunk({
          managerId: resetTargetManager.id,
          password: newPassword.trim(),
        })
      ).unwrap();

      Alert.alert('Success', `Password for '${resetTargetManager.username}' updated successfully!`);
      setResetModalVisible(false);
      setResetTargetManager(null);
    } catch (err: any) {
      Alert.alert('Reset Failed', typeof err === 'string' ? err : err?.message || 'Failed to reset password');
    }
  };

  const filteredManagers = managers.filter((m) => {
    const term = searchQuery.toLowerCase();
    return (
      m.username?.toLowerCase().includes(term) ||
      m.restaurant_name?.toLowerCase().includes(term) ||
      m.branch_name?.toLowerCase().includes(term) ||
      m.notification_email?.toLowerCase().includes(term)
    );
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.superAdmin.bg} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Manager Accounts</Text>
          <Text style={styles.subtitle}>Branch Manager Provisioning & Access Control</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={handleOpenCreateModal}>
          <Text style={styles.addButtonText}>+ Provision Account</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by username, brand, branch, email..."
          placeholderTextColor={COLORS.superAdmin.muted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Roster List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.superAdmin.accent} />
        </View>
      ) : (
        <FlatList
          data={filteredManagers}
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
                <View style={styles.avatarBadge}>
                  <Text style={styles.avatarIcon}>🔐</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.username}</Text>
                  <Text style={styles.userSub}>
                    {item.restaurant_name} • {item.branch_name || 'Main Branch'}
                  </Text>
                </View>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>MANAGER</Text>
                </View>
              </View>

              <View style={styles.detailsBox}>
                <Text style={styles.detailText}>📧 Email: {item.notification_email}</Text>
                <Text style={styles.detailText}>
                  🔑 Must Change Password:{' '}
                  <Text style={{ color: item.must_change_password ? '#F59E0B' : '#10B981' }}>
                    {item.must_change_password ? 'YES ⚠️' : 'NO ✅'}
                  </Text>
                </Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => handleOpenResetModal(item)}
                >
                  <Text style={styles.resetButtonText}>🔑 Reset Password</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Create Manager Modal */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.modalTitle}>Provision Branch Manager Account</Text>
            <Text style={styles.modalSubtitle}>
              Generates formatted username manager_&#123;slug&#125;_&#123;branch&#125;
            </Text>

            <Text style={styles.inputLabel}>Select Restaurant Brand</Text>
            <View style={styles.pickerContainer}>
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

            <Text style={styles.inputLabel}>Select Branch</Text>
            <View style={styles.pickerContainer}>
              {branches.map((b) => (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.pickerOption,
                    selectedBranchId === b.id && styles.pickerOptionActive,
                  ]}
                  onPress={() => setSelectedBranchId(b.id)}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      selectedBranchId === b.id && styles.pickerOptionTextActive,
                    ]}
                  >
                    {b.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Notification Email</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="manager@restaurant.com"
              placeholderTextColor={COLORS.superAdmin.muted}
              value={notificationEmail}
              onChangeText={setNotificationEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Custom Password (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Leave blank to auto-generate"
              placeholderTextColor={COLORS.superAdmin.muted}
              value={customPassword}
              onChangeText={setCustomPassword}
              secureTextEntry
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitModalButton}
                onPress={handleCreateManager}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitModalText}>Provision Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <Modal visible={resetModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Manager Password</Text>
            <Text style={styles.modalSubtitle}>
              User: {resetTargetManager?.username} ({resetTargetManager?.restaurant_name})
            </Text>

            <Text style={styles.inputLabel}>New Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter new secure password"
              placeholderTextColor={COLORS.superAdmin.muted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelModalButton}
                onPress={() => setResetModalVisible(false)}
              >
                <Text style={styles.cancelModalText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitModalButton}
                onPress={handleConfirmPasswordReset}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitModalText}>Update Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Credentials Output Modal */}
      <Modal visible={credentialsModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🎉 Account Provisioned!</Text>
            <Text style={styles.modalSubtitle}>
              Save these login credentials — the password will not be shown again.
            </Text>

            <View style={styles.credBox}>
              <Text style={styles.credText}>
                Username: <Text style={styles.credValue}>{createdCredentials?.username}</Text>
              </Text>
              <Text style={styles.credText}>
                Password: <Text style={styles.credValue}>{createdCredentials?.password}</Text>
              </Text>
              <Text style={styles.credText}>
                Brand: <Text style={styles.credValue}>{createdCredentials?.restaurant}</Text>
              </Text>
              <Text style={styles.credText}>
                Branch: <Text style={styles.credValue}>{createdCredentials?.branch}</Text>
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.submitModalButton, { width: '100%', alignItems: 'center' }]}
              onPress={() => setCredentialsModalVisible(false)}
            >
              <Text style={styles.submitModalText}>Done & Dismiss</Text>
            </TouchableOpacity>
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
    width: 36,
    height: 36,
    borderRadius: RADIUS.round,
    backgroundColor: COLORS.superAdmin.bg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarIcon: {
    fontSize: 18,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: COLORS.superAdmin.text,
    fontSize: 15,
    fontWeight: 'bold',
  },
  userSub: {
    color: COLORS.superAdmin.accent,
    fontSize: 12,
  },
  roleBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderColor: COLORS.superAdmin.accent,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
  },
  roleBadgeText: {
    color: COLORS.superAdmin.accent,
    fontSize: 10,
    fontWeight: 'bold',
  },
  detailsBox: {
    backgroundColor: COLORS.superAdmin.bg,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  detailText: {
    color: COLORS.superAdmin.muted,
    fontSize: 12,
    marginVertical: 2,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  resetButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: COLORS.danger,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  resetButtonText: {
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
    marginBottom: 6,
    marginTop: 4,
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.sm,
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
  credBox: {
    backgroundColor: COLORS.superAdmin.bg,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginVertical: SPACING.md,
  },
  credText: {
    color: COLORS.superAdmin.muted,
    fontSize: 13,
    marginVertical: 4,
  },
  credValue: {
    color: COLORS.superAdmin.accent,
    fontWeight: 'bold',
  },
});
