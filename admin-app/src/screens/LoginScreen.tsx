import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { useAppDispatch, useAppSelector } from '../store';
import { loginStaffThunk, clearAuthError } from '../store/authSlice';
import { changeOwnPassword } from '../services/api';

export const LoginScreen = () => {
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Password change state for first-time login
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(null);
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      return;
    }
    dispatch(clearAuthError());
    const resultAction = await dispatch(loginStaffThunk({ username: username.trim(), password }));

    if (loginStaffThunk.fulfilled.match(resultAction)) {
      if (resultAction.payload.user.mustChangePassword) {
        setShowPasswordChange(true);
      }
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setPasswordChangeError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordChangeError('Passwords do not match');
      return;
    }

    setPasswordChangeLoading(true);
    setPasswordChangeError(null);
    try {
      await changeOwnPassword(newPassword);
      setPasswordChangeSuccess(true);
      setShowPasswordChange(false);
    } catch (err: any) {
      setPasswordChangeError(err?.message || 'Failed to update password');
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={COLORS.superAdmin.bg} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandContainer}>
          <LinearGradient
            colors={['#2563EB', '#EA580C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoBadge}
          >
            <Text style={styles.logoText}>GF</Text>
          </LinearGradient>
          <Text style={styles.appTitle}>GetFood Manager</Text>
          <Text style={styles.appSubtitle}>HQ Command & Branch Operations</Text>
        </View>

        {!showPasswordChange ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Staff Sign In</Text>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Username</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username (e.g. admin or manager_*)"
                placeholderTextColor={COLORS.neutral400}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                placeholderTextColor={COLORS.neutral400}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Change Password Required</Text>
            <Text style={styles.cardSubText}>
              First time login detected. Please set a new password to continue.
            </Text>

            {passwordChangeError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{passwordChangeError}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password (min 6 chars)"
                placeholderTextColor={COLORS.neutral400}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter new password"
                placeholderTextColor={COLORS.neutral400}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.button, passwordChangeLoading && styles.buttonDisabled]}
              onPress={handleChangePassword}
              disabled={passwordChangeLoading}
              activeOpacity={0.8}
            >
              {passwordChangeLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Update Password & Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.superAdmin.bg,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.xl,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.coloredSuper,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  appTitle: {
    color: COLORS.superAdmin.text,
    fontSize: 26,
    fontWeight: 'bold',
  },
  appSubtitle: {
    color: COLORS.superAdmin.muted,
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.superAdmin.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
    ...SHADOWS.large,
  },
  cardTitle: {
    color: COLORS.superAdmin.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
  },
  cardSubText: {
    color: COLORS.superAdmin.muted,
    fontSize: 13,
    marginBottom: SPACING.md,
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 71, 87, 0.15)',
    borderColor: COLORS.danger,
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    color: COLORS.superAdmin.muted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: COLORS.superAdmin.bg,
    color: COLORS.superAdmin.text,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
    fontSize: 15,
    borderColor: COLORS.superAdmin.border,
    borderWidth: 1,
  },
  button: {
    backgroundColor: COLORS.superAdmin.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
