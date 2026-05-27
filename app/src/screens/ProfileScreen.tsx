import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SHADOWS } from '../theme';
import { AppDispatch, RootState } from '../store';
import { logoutUser, updateProfile } from '../store/userSlice';
import { StatusBar } from 'expo-status-bar';

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const dispatch = useDispatch<AppDispatch>();
  const { user, loading } = useSelector((state: RootState) => state.user);

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(
    user?.addresses?.[0] || ''
  );

  // Validation Errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await dispatch(logoutUser());
            navigation.replace('Auth');
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleSaveProfile = async () => {
    setErrors({});
    const validationErrors: { [key: string]: string } = {};

    if (!username.trim()) {
      validationErrors.username = 'Username is required';
    }
    if (!email.trim()) {
      validationErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      validationErrors.email = 'Invalid email address';
    }
    if (!phone.trim()) {
      validationErrors.phone = 'Phone number is required';
    }

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      const resultAction = await dispatch(updateProfile({
        username: username.trim(),
        email: email.trim(),
        phone: phone.trim(),
      }));

      if (updateProfile.fulfilled.match(resultAction)) {
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      } else {
        Alert.alert('Error', (resultAction.payload as string) || 'Failed to update profile');
      }
    } catch (err) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const getInitials = () => {
    if (!user || !user.username) return 'G';
    return user.username.slice(0, 2).toUpperCase();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={[styles.profileCard, SHADOWS.medium]}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
            {/* Camera icon overlay — for future photo upload */}
            {!user?.is_guest && (
              <TouchableOpacity activeOpacity={0.75}
                style={styles.cameraOverlay}
                onPress={() => Alert.alert('Coming Soon', 'Profile photo upload will be available soon!')}
              >
                <Ionicons name="camera" size={14} color={COLORS.white} />
              </TouchableOpacity>
            )}
            {user?.is_guest && (
              <View style={styles.guestBadge}>
                <Text style={styles.guestBadgeText}>GUEST</Text>
              </View>
            )}
          </View>

          <Text style={styles.userName}>
            {user?.is_guest ? 'Guest Customer' : user?.username}
          </Text>
          <Text style={styles.userSub}>
            {user?.is_guest ? 'Sign in to sync orders & rewards' : user?.email}
          </Text>

          {!user?.is_guest && (
            <View style={styles.loyaltySummary}>
              <Ionicons name="ribbon" size={20} color={COLORS.primary} />
              <Text style={styles.loyaltyText}>
                Loyalty Points:{' '}
                <Text style={styles.pointsHighlight}>{user?.loyalty_points || 0}</Text>
              </Text>
            </View>
          )}
        </View>

        {/* Guest Promo / Sign In Link */}
        {user?.is_guest && (
          <View style={[styles.promoCard, SHADOWS.small]}>
            <Ionicons name="gift-outline" size={32} color={COLORS.primary} />
            <View style={styles.promoTextContainer}>
              <Text style={styles.promoTitle}>Unlock All Features</Text>
              <Text style={styles.promoDescription}>
                Sign up to save multiple delivery addresses, track your order history, and earn loyalty rewards.
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.75}
              style={styles.promoCTA}
              onPress={() => navigation.navigate('Auth')}
            >
              <Text style={styles.promoCTAText}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Editing Form / Details Card */}
        {!user?.is_guest && (
          <View style={[styles.sectionCard, SHADOWS.small]}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Account Details</Text>
              <TouchableOpacity activeOpacity={0.75}
                style={styles.editButton}
                onPress={() => setIsEditing(!isEditing)}
              >
                <Text style={styles.editBtnText}>
                  {isEditing ? 'Cancel' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>

            {isEditing ? (
              <View style={styles.form}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={[styles.input, errors.username && styles.inputError]}
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Username"
                />
                {errors.username && <Text style={styles.errorMsg}>{errors.username}</Text>}

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, errors.email && styles.inputError]}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {errors.email && <Text style={styles.errorMsg}>{errors.email}</Text>}

                <Text style={styles.label}>Phone</Text>
                <TextInput
                  style={[styles.input, errors.phone && styles.inputError]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone Number"
                  keyboardType="phone-pad"
                />
                {errors.phone && <Text style={styles.errorMsg}>{errors.phone}</Text>}

                <TouchableOpacity activeOpacity={0.9}
                  style={[styles.saveBtn, SHADOWS.small]}
                  onPress={handleSaveProfile}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={COLORS.white} />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.detailsList}>
                <View style={styles.detailItem}>
                  <Ionicons name="person-outline" size={18} color={COLORS.gray} />
                  <Text style={styles.detailText}>{user?.username}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="mail-outline" size={18} color={COLORS.gray} />
                  <Text style={styles.detailText}>{user?.email || 'No email set'}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="call-outline" size={18} color={COLORS.gray} />
                  <Text style={styles.detailText}>{user?.phone || 'No phone number set'}</Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Address Card */}
        <View style={[styles.sectionCard, SHADOWS.small]}>
          <Text style={styles.sectionTitle}>Active Delivery Address</Text>
          <View style={styles.addressContainer}>
            <View style={styles.addressIconContainer}>
              <Ionicons name="location" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.addressTextContainer}>
              <Text style={styles.addressLabel}>Current Location</Text>
              <TextInput
                style={styles.addressInput}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter your delivery address (e.g. House 5, Block B, DHA Lahore)"
                multiline
              />
            </View>
          </View>
        </View>

        {/* Quick Actions List */}
        <View style={[styles.sectionCard, SHADOWS.small]}>
          <Text style={styles.sectionTitle}>Preferences & Settings</Text>

          {!user?.is_guest && (
            <TouchableOpacity activeOpacity={0.75}
              style={styles.actionItem}
              onPress={() => navigation.navigate('Rewards')}
            >
              <View style={styles.actionLeft}>
                <Ionicons name="ribbon-outline" size={22} color={COLORS.dark} />
                <Text style={styles.actionLabel}>Loyalty & Rewards</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          )}

          <TouchableOpacity activeOpacity={0.75} style={styles.actionItem}>
            <View style={styles.actionLeft}>
              <Ionicons name="notifications-outline" size={22} color={COLORS.dark} />
              <Text style={styles.actionLabel}>Notification Preferences</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.75} style={styles.actionItem}>
            <View style={styles.actionLeft}>
              <Ionicons name="help-circle-outline" size={22} color={COLORS.dark} />
              <Text style={styles.actionLabel}>Customer Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
          </TouchableOpacity>

          {/* Logout Button */}
          <TouchableOpacity activeOpacity={0.75} style={[styles.actionItem, styles.logoutItem]} onPress={handleLogout}>
            <View style={styles.actionLeft}>
              <Ionicons name="log-out-outline" size={22} color={COLORS.danger} />
              <Text style={[styles.actionLabel, { color: COLORS.danger }]}>Log Out</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.danger} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  header: {
    height: Platform.OS === 'ios' ? 100 : 70,
    backgroundColor: COLORS.white,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  headerTitle: {
    ...FONTS.subtitle,
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
  guestBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: COLORS.dark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  guestBadgeText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: 'bold',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.dark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  userName: {
    ...FONTS.title,
    fontSize: 20,
    marginBottom: 4,
  },
  userSub: {
    ...FONTS.caption,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  loyaltySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 87, 34, 0.08)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: 12,
  },
  loyaltyText: {
    fontSize: 13,
    color: COLORS.dark,
    marginLeft: SPACING.xs,
    fontWeight: '600',
  },
  pointsHighlight: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  promoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderColor: 'rgba(255, 87, 34, 0.2)',
    borderWidth: 1.5,
  },
  promoTextContainer: {
    flex: 1,
    marginLeft: SPACING.md,
    marginRight: SPACING.sm,
  },
  promoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 2,
  },
  promoDescription: {
    fontSize: 12,
    color: COLORS.gray,
    lineHeight: 16,
  },
  promoCTA: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    borderRadius: 8,
  },
  promoCTAText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  sectionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    ...FONTS.subtitle,
    fontSize: 15,
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: 'rgba(255, 87, 34, 0.08)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 34, 0.15)',
  },
  editBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  form: {
    marginTop: SPACING.xs,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    height: 44,
    marginBottom: SPACING.sm,
    fontSize: 14,
    color: COLORS.dark,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorMsg: {
    color: COLORS.danger,
    fontSize: 11,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.sm,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailsList: {
    marginTop: SPACING.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.dark,
    marginLeft: SPACING.md,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light,
    borderRadius: 12,
    padding: SPACING.sm,
    marginTop: SPACING.xs,
  },
  addressIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 87, 34, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressTextContainer: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 2,
  },
  addressInput: {
    fontSize: 13,
    color: COLORS.gray,
    padding: 0,
    lineHeight: 18,
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 14,
    color: COLORS.dark,
    marginLeft: SPACING.md,
    fontWeight: '500',
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
});
