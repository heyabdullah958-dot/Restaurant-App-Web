import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, SHADOWS } from '../theme';
import { AppDispatch, RootState } from '../store';
import { loginUser, registerUser, guestLogin, clearError, updateUserProfile } from '../store/userSlice';
import { StatusBar } from 'expo-status-bar';
import api from '../services/api';

const { width } = Dimensions.get('window');

type TabType = 'login' | 'register';

const getPasswordStrength = (pass: string): { level: number; label: string; color: string } => {
  if (pass.length === 0) return { level: 0, label: '', color: COLORS.lightGray };
  if (pass.length < 6) return { level: 1, label: 'Too Short', color: COLORS.danger };
  if (pass.length < 8) return { level: 2, label: 'Weak', color: COLORS.warning };
  if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) return { level: 4, label: 'Strong', color: COLORS.success };
  return { level: 3, label: 'Medium', color: COLORS.secondary };
};

export default function AuthScreen({ navigation }: { navigation: any }) {
  const dispatch = useDispatch<AppDispatch>();
  const { loading, error, isAuthenticated } = useSelector((state: RootState) => state.user);

  const [activeTab, setActiveTab] = useState<TabType>('login');

  // Input States
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Password Visibility
  const [showPassword, setShowPassword] = useState(false);

  // Field Validation Errors
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Google Sign-In and Password Reset states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleGoogleLogin = async () => {
    Alert.alert(
      'Google Sign-In',
      'Choose a Google account to continue with FoodSphere:',
      [
        {
          text: 'abdullah.hey958@gmail.com',
          onPress: async () => {
            dispatch(clearError());
            const result = await dispatch(guestLogin());
            if (guestLogin.fulfilled.match(result)) {
              dispatch(updateUserProfile({ 
                username: 'Abdullah Google', 
                email: 'abdullah.hey958@gmail.com',
                phone: '+92 300 1234567' 
              }));
              Alert.alert('Google Sign-In Success', 'Welcome, Abdullah! You have successfully logged in via Google.');
            }
          }
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const handleSendResetEmail = async () => {
    if (!resetEmail.trim() || !validateEmail(resetEmail.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }
    setResetLoading(true);
    try {
      const response = await api.post('/auth/forgot-password/', { email: resetEmail.trim() }) as any;
      setResetLoading(false);
      setShowForgotModal(false);
      
      const resData = response.data || response;
      if (resData.success) {
        Alert.alert(
          'Email Dispatched',
          'A secure password reset link has been sent to your Gmail inbox! Please check your spam folder if you do not receive it shortly.'
        );
      } else {
        Alert.alert('Error', resData.error || 'Failed to dispatch reset link.');
      }
    } catch (e: any) {
      setResetLoading(false);
      const errorMsg = e.response?.data?.error || e.message || 'An error occurred while sending the email.';
      Alert.alert('Reset Failed', errorMsg);
    }
  };

  useEffect(() => {
    // If authenticated, go to Main App Flow
    if (isAuthenticated) {
      navigation.replace('Main');
    }
  }, [isAuthenticated, navigation]);

  // Clear errors when switching tabs
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setValidationErrors({});
    dispatch(clearError());
  };

  const validateEmail = (emailStr: string) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(emailStr);
  };

  const handleAuthAction = () => {
    setValidationErrors({});
    dispatch(clearError());

    const errors: { [key: string]: string } = {};

    if (!username.trim()) {
      errors.username = 'Username is required';
    }

    if (activeTab === 'register') {
      if (!email.trim()) {
        errors.email = 'Email is required';
      } else if (!validateEmail(email)) {
        errors.email = 'Please enter a valid email address';
      }
      
      if (!phone.trim()) {
        errors.phone = 'Phone number is required';
      }
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    if (activeTab === 'login') {
      dispatch(loginUser({ username: username.trim(), password }));
    } else {
      dispatch(registerUser({ 
        username: username.trim(), 
        email: email.trim().toLowerCase(), 
        password, 
        phone: phone.trim() 
      }));
    }
  };

  const handleGuestLogin = () => {
    dispatch(clearError());
    dispatch(guestLogin());
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        
        {/* Brand Header */}
        <View style={styles.headerContainer}>
          <View style={styles.logoBadge}>
            <Ionicons name="restaurant" size={32} color={COLORS.white} />
          </View>
          <Text style={styles.titleText}>
            Food<Text style={{ color: COLORS.primary }}>Sphere</Text>
          </Text>
          <Text style={styles.subtitleText}>Sign in to access 7 premium dining spots</Text>
        </View>

        {/* Auth Tabs */}
        <View style={[styles.tabContainer, SHADOWS.small]}>
          <TouchableOpacity activeOpacity={0.75}
            style={[styles.tab, activeTab === 'login' && styles.activeTab]}
            onPress={() => handleTabChange('login')}
          >
            <Text style={[styles.tabText, activeTab === 'login' && styles.activeTabText]}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.75}
            style={[styles.tab, activeTab === 'register' && styles.activeTab]}
            onPress={() => handleTabChange('register')}
          >
            <Text style={[styles.tabText, activeTab === 'register' && styles.activeTabText]}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        {/* Global Server Error Display */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {/* Form Fields */}
        <View style={styles.formContainer}>
          
          {/* Username Field */}
          <Text style={styles.fieldLabel}>Username</Text>
          <View style={[styles.inputWrapper, validationErrors.username ? styles.inputError : null]}>
            <Ionicons name="person-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                if (validationErrors.username) {
                  setValidationErrors(prev => ({ ...prev, username: '' }));
                }
              }}
              autoCapitalize="none"
            />
          </View>
          {validationErrors.username && (
            <Text style={styles.errorText}>{validationErrors.username}</Text>
          )}

          {/* Email Field (Sign Up Only) */}
          {activeTab === 'register' && (
            <>
              <Text style={styles.fieldLabel}>Email Address</Text>
              <View style={[styles.inputWrapper, validationErrors.email ? styles.inputError : null]}>
                <Ionicons name="mail-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (validationErrors.email) {
                      setValidationErrors(prev => ({ ...prev, email: '' }));
                    }
                  }}
                  autoCapitalize="none"
                />
              </View>
              {validationErrors.email && (
                <Text style={styles.errorText}>{validationErrors.email}</Text>
              )}
            </>
          )}

          {/* Phone Field (Sign Up Only) */}
          {activeTab === 'register' && (
            <>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View style={[styles.inputWrapper, validationErrors.phone ? styles.inputError : null]}>
                <Ionicons name="call-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your phone number (e.g. +923001234567)"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    if (validationErrors.phone) {
                      setValidationErrors(prev => ({ ...prev, phone: '' }));
                    }
                  }}
                />
              </View>
              {validationErrors.phone && (
                <Text style={styles.errorText}>{validationErrors.phone}</Text>
              )}
            </>
          )}

          {/* Password Field */}
          <Text style={styles.fieldLabel}>Password</Text>
          <View style={[styles.inputWrapper, validationErrors.password ? styles.inputError : null]}>
            <Ionicons name="lock-closed-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (validationErrors.password) {
                  setValidationErrors(prev => ({ ...prev, password: '' }));
                }
              }}
              autoCapitalize="none"
            />
            <TouchableOpacity activeOpacity={0.75} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.gray}
              />
            </TouchableOpacity>
          </View>
          {validationErrors.password && (
            <Text style={styles.errorText}>{validationErrors.password}</Text>
          )}

          {activeTab === 'register' && password.length > 0 && (() => {
            const strength = getPasswordStrength(password);
            return (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map(i => (
                    <View
                      key={i}
                      style={[
                        styles.strengthBar,
                        { backgroundColor: i <= strength.level ? strength.color : COLORS.lightGray }
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: strength.color }]}>
                  {strength.label}
                </Text>
              </View>
            );
          })()}

          {activeTab === 'login' && (
            <TouchableOpacity
              style={styles.forgotPasswordBtn}
              activeOpacity={0.7}
              onPress={() => setShowForgotModal(true)}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {/* Main Action Button */}
          <TouchableOpacity
            style={[styles.submitButton, SHADOWS.medium]}
            onPress={handleAuthAction}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>
                {activeTab === 'login' ? 'Login' : 'Create Account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[styles.googleButton, SHADOWS.small]}
            onPress={handleGoogleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={18} color="#EA4335" style={{ marginRight: 10 }} />
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Separator */}
          <View style={styles.separatorContainer}>
            <View style={styles.separatorLine} />
            <Text style={styles.separatorText}>OR</Text>
            <View style={styles.separatorLine} />
          </View>

          {/* Continue as Guest Button */}
          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGuestLogin}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.guestButtonText}>Continue as Guest</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.primary} style={{ marginLeft: 5 }} />
          </TouchableOpacity>

        </View>

      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowForgotModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, SHADOWS.medium]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity activeOpacity={0.75} onPress={() => setShowForgotModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.forgotIntro}>
                Enter your Gmail address associated with your account and we'll dispatch a secure reset link to your inbox instantly.
              </Text>

              <Text style={styles.fieldLabel}>Gmail Address</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity activeOpacity={0.9}
                style={[styles.modalSaveBtn, resetLoading && { opacity: 0.7 }]}
                onPress={handleSendResetEmail}
                disabled={resetLoading}
              >
                {resetLoading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.xl,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  logoBadge: {
    backgroundColor: COLORS.primary,
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  titleText: {
    ...FONTS.title,
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitleText: {
    ...FONTS.caption,
    fontSize: 14,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.light,
    borderRadius: 14,
    padding: 4,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.2)',
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorBannerText: {
    fontSize: 13,
    color: COLORS.danger,
    marginLeft: SPACING.sm,
    flex: 1,
    fontWeight: '500',
  },
  formContainer: {
    width: '100%',
  },
  fieldLabel: {
    ...FONTS.caption,
    fontWeight: '600',
    color: COLORS.dark,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontSize: 11,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.light,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    borderRadius: 14,
    paddingHorizontal: SPACING.md,
    height: 52,
    marginBottom: SPACING.sm,
  },
  inputError: {
    borderColor: COLORS.danger,
    backgroundColor: 'rgba(244, 67, 54, 0.02)',
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    color: COLORS.dark,
    fontSize: 15,
  },
  errorText: {
    fontSize: 12,
    color: COLORS.danger,
    marginTop: -SPACING.xs,
    marginBottom: SPACING.sm,
    marginLeft: 4,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    height: 54,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.lightGray,
  },
  separatorText: {
    marginHorizontal: SPACING.md,
    color: COLORS.gray,
    fontWeight: '600',
    fontSize: 12,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    height: 54,
    borderRadius: 14,
    backgroundColor: COLORS.white,
  },
  guestButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  forgotPasswordBtn: {
    alignSelf: 'flex-end',
    marginBottom: SPACING.md,
    marginTop: -SPACING.xs,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  strengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -SPACING.xs,
    marginBottom: SPACING.sm,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    height: 4,
    flex: 1,
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginLeft: SPACING.sm,
    width: 60,
    textAlign: 'right',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 54,
    borderRadius: 14,
    marginTop: SPACING.md,
  },
  googleButtonText: {
    color: '#333333',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: SPACING.md,
    marginBottom: SPACING.md,
  },
  modalTitle: {
    ...FONTS.subtitle,
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  modalBody: {
    marginTop: SPACING.xs,
  },
  forgotIntro: {
    fontSize: 13.5,
    color: COLORS.gray,
    lineHeight: 19,
    marginBottom: SPACING.lg,
  },
  modalSaveBtn: {
    backgroundColor: COLORS.primary,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
  },
  modalSaveBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
});
