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
  Image,
} from 'react-native';
import CustomAlertModal from '../components/CustomAlertModal';
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

  // Phone OTP login and Google Selection states
  const [loginMethod, setLoginMethod] = useState<'username' | 'phone'>('username');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [googleModalVisible, setGoogleModalVisible] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');

  // Custom Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    actions?: any[];
  }>({ visible: false, title: '', message: '' });

  const showAlert = (title: string, message: string, actions?: any[]) => {
    setAlertConfig({ visible: true, title, message, actions });
  };

  const hideAlert = () => setAlertConfig(prev => ({ ...prev, visible: false }));

  const handleGoogleLogin = () => {
    setGoogleModalVisible(true);
  };

  const handleSendOtp = () => {
    if (!phone.trim()) {
      setValidationErrors({ phone: 'Phone number is required' });
      return;
    }
    setIsSendingOtp(true);
    setTimeout(() => {
      setIsSendingOtp(false);
      setOtpSent(true);
      showAlert(
        '🔑 OTP Code Dispatched',
        `A secure 4-digit verification code has been sent to ${phone}.\n\n(Use standard test code: 1234)`,
        [{ text: 'OK' }]
      );
    }, 1500);
  };

  const handleVerifyOtp = async () => {
    if (otpCode !== '1234') {
      showAlert('Verification Failed', 'Invalid verification code. Please enter the code sent to your phone (1234).');
      return;
    }
    
    dispatch(clearError());
    const result = await dispatch(guestLogin());
    if (guestLogin.fulfilled.match(result)) {
      dispatch(updateUserProfile({ 
        username: `User_${phone.slice(-4)}`, 
        phone: phone.trim(),
        email: `phone_user_${phone.slice(-4)}@foodsphere.com`
      }));
      showAlert('Success', 'Phone verification successful! Welcome to FoodSphere.');
    }
  };

  const handleSelectGoogleAccount = async (selectedEmail: string, displayName: string) => {
    setGoogleModalVisible(false);
    dispatch(clearError());
    
    const result = await dispatch(guestLogin());
    if (guestLogin.fulfilled.match(result)) {
      dispatch(updateUserProfile({ 
        username: displayName, 
        email: selectedEmail,
        phone: '+92 300 1234567' 
      }));
      showAlert('Google Sign-In Success', `Welcome, ${displayName}! You have logged in with ${selectedEmail}.`);
    }
  };

  const handleSendResetEmail = async () => {
    if (!resetEmail.trim() || !validateEmail(resetEmail.trim())) {
      showAlert('Validation Error', 'Please enter a valid email address.');
      return;
    }
    setResetLoading(true);
    try {
      const response = await api.post('/auth/forgot-password/', { email: resetEmail.trim() }) as any;
      setResetLoading(false);
      setShowForgotModal(false);
      
      const resData = response.data || response;
      if (resData.success) {
        showAlert(
          'Email Dispatched',
          'A secure password reset link has been sent to your Gmail inbox! Please check your spam folder if you do not receive it shortly.'
        );
      } else {
        showAlert('Error', resData.error || 'Failed to dispatch reset link.');
      }
    } catch (e: any) {
      setResetLoading(false);
      const errorMsg = e.response?.data?.error || e.message || 'An error occurred while sending the email.';
      showAlert('Reset Failed', errorMsg);
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

  const handleAuthAction = async () => {
    if (activeTab === 'login' && loginMethod === 'phone') {
      if (otpSent) {
        handleVerifyOtp();
      } else {
        handleSendOtp();
      }
      return;
    }

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
      showAlert('Validation Error', 'Please correct the errors in the form before proceeding.');
      return;
    }

    if (activeTab === 'login') {
      dispatch(loginUser({ username: username.trim(), password }));
    } else {
      const result = await dispatch(registerUser({ 
        username: username.trim(), 
        email: email.trim().toLowerCase(), 
        password: password.trim(),
        phone: phone.trim() 
      }));
      if (registerUser.fulfilled.match(result)) {
        showAlert('Registration Successful', 'Welcome to FoodSphere!');
      }
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
          
          {activeTab === 'login' && (
            <View style={styles.methodContainer}>
              <TouchableOpacity activeOpacity={0.75}
                style={[styles.methodBtn, loginMethod === 'username' && styles.activeMethodBtn]}
                onPress={() => setLoginMethod('username')}
              >
                <Text style={[styles.methodText, loginMethod === 'username' && styles.activeMethodText]}>Username Login</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.75}
                style={[styles.methodBtn, loginMethod === 'phone' && styles.activeMethodBtn]}
                onPress={() => setLoginMethod('phone')}
              >
                <Text style={[styles.methodText, loginMethod === 'phone' && styles.activeMethodText]}>Phone OTP Login</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'login' && loginMethod === 'phone' ? (
            <>
              {/* Phone Login Fields */}
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
                  editable={!otpSent}
                />
              </View>
              {validationErrors.phone && (
                <Text style={styles.errorText}>{validationErrors.phone}</Text>
              )}

              {otpSent && (
                <>
                  <Text style={styles.fieldLabel}>4-Digit Verification Code</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="key-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Enter verification code (1234)"
                      keyboardType="number-pad"
                      maxLength={4}
                      value={otpCode}
                      onChangeText={setOtpCode}
                    />
                  </View>
                </>
              )}
            </>
          ) : (
            <>
              {/* Standard Username/Password Fields */}
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
            </>
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
            disabled={loading || isSendingOtp}
            activeOpacity={0.8}
          >
            {loading || isSendingOtp ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>
                {activeTab === 'register' 
                  ? 'Create Account' 
                  : loginMethod === 'phone' 
                    ? otpSent 
                      ? 'Verify & Login' 
                      : 'Send OTP Code' 
                    : 'Login'}
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
            <Image 
              source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Google_%22G%22_Logo.svg/512px-Google_%22G%22_Logo.svg.png' }} 
              style={{ width: 22, height: 22, marginRight: 12 }}
            />
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

      {/* Google Account Selector Modal */}
      <Modal
        visible={googleModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setGoogleModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, SHADOWS.medium]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sign in with Google</Text>
              <TouchableOpacity activeOpacity={0.75} onPress={() => setGoogleModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.dark} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.forgotIntro}>
                Select an account to log in securely or type your own Gmail below to simulate a real OAuth sign-in.
              </Text>

              {/* Account 1 */}
              <TouchableOpacity activeOpacity={0.75}
                style={styles.googleAccountItem}
                onPress={() => handleSelectGoogleAccount('abdullah.hey958@gmail.com', 'Abdullah Hey')}
              >
                <View style={styles.googleAvatar}>
                  <Text style={styles.googleAvatarText}>A</Text>
                </View>
                <View style={styles.googleAccountText}>
                  <Text style={styles.googleAccountName}>Abdullah Hey</Text>
                  <Text style={styles.googleAccountEmail}>abdullah.hey958@gmail.com</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
              </TouchableOpacity>

              {/* Account 2 */}
              <TouchableOpacity activeOpacity={0.75}
                style={styles.googleAccountItem}
                onPress={() => handleSelectGoogleAccount('heyabdullah958@gmail.com', 'Hey Abdullah')}
              >
                <View style={[styles.googleAvatar, { backgroundColor: '#FF5722' }]}>
                  <Text style={styles.googleAvatarText}>H</Text>
                </View>
                <View style={styles.googleAccountText}>
                  <Text style={styles.googleAccountName}>Hey Abdullah</Text>
                  <Text style={styles.googleAccountEmail}>heyabdullah958@gmail.com</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={COLORS.gray} />
              </TouchableOpacity>

              {/* Custom Selector Input */}
              <View style={styles.googleCustomInputWrapper}>
                <Text style={styles.fieldLabel}>Use Another Account</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your Display Name"
                    value={customGoogleName}
                    onChangeText={setCustomGoogleName}
                  />
                </View>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.gray} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your Gmail address"
                    keyboardType="email-address"
                    value={customGoogleEmail}
                    onChangeText={setCustomGoogleEmail}
                    autoCapitalize="none"
                  />
                </View>
                
                <TouchableOpacity activeOpacity={0.9}
                  style={styles.modalSaveBtn}
                  onPress={() => {
                    if (!customGoogleEmail.trim() || !validateEmail(customGoogleEmail.trim())) {
                      showAlert('Error', 'Please enter a valid Gmail address.');
                      return;
                    }
                    const name = customGoogleName.trim() || customGoogleEmail.split('@')[0];
                    handleSelectGoogleAccount(customGoogleEmail.trim(), name);
                  }}
                >
                  <Text style={styles.modalSaveBtnText}>Continue with Custom Gmail</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert Modal */}
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        actions={alertConfig.actions}
        onDismiss={hideAlert}
      />

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
  methodContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.light,
    borderRadius: 10,
    padding: 3,
    marginBottom: SPACING.lg,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeMethodBtn: {
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  methodText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  activeMethodText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  googleAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  googleAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3F51B5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  googleAvatarText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  googleAccountText: {
    flex: 1,
  },
  googleAccountName: {
    fontSize: 14.5,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  googleAccountEmail: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 2,
  },
  googleCustomInputWrapper: {
    marginTop: SPACING.md,
  },
});
