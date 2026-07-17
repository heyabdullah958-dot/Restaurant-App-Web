import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, SHADOWS, FONTS } from '../theme';

const OrderSteps = () => {
  const steps = [
    { icon: 'checkmark-circle', label: 'Order Placed', done: true },
    { icon: 'restaurant', label: 'Preparing', done: false },
    { icon: 'bicycle', label: 'Out for Delivery', done: false },
    { icon: 'home', label: 'Delivered', done: false },
  ];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 16, paddingHorizontal: 12 }}>
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: step.done ? COLORS.primary : COLORS.lightGray,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <Ionicons name={step.icon as any} size={18}
                color={step.done ? COLORS.white : COLORS.gray} />
            </View>
            <Text style={{ fontSize: 9, color: step.done ? COLORS.primary : COLORS.gray,
              marginTop: 4, textAlign: 'center', fontWeight: '600' }}>
              {step.label}
            </Text>
          </View>
          {i < steps.length - 1 && (
            <View style={{ height: 2, flex: 0.5, backgroundColor: COLORS.lightGray, marginBottom: 16 }} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
};

type RootStackParamList = {
  Home: undefined;
  Main: undefined;
  Tracking: { orderId: number };
  OrderConfirmation: { orderId: number; loyaltyPointsEarned?: number };
};

type OrderConfirmationRouteProp = RouteProp<RootStackParamList, 'OrderConfirmation'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'OrderConfirmation'>;

export default function OrderConfirmationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OrderConfirmationRouteProp>();
  const { orderId, loyaltyPointsEarned = 0 } = route.params || {};

  // Animation values
  const scaleValue = useRef(new Animated.Value(0.3)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 40,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(opacityValue, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleValue, opacityValue, contentOpacity]);

  const handleTrackOrder = () => {
    navigation.replace('Tracking', { orderId });
  };

  const handleBackToHome = () => {
    // Navigate back to the Main bottom tabs (which resets state nicely)
    navigation.navigate('Main');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.light} />
      
      <View style={styles.contentContainer}>
        {/* Animated Checkmark Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              opacity: opacityValue,
              transform: [{ scale: scaleValue }],
            },
          ]}
        >
          <View style={styles.checkmarkCircle}>
            <Ionicons name="checkmark" size={64} color={COLORS.white} />
          </View>
        </Animated.View>

        {/* Animated Content */}
        <Animated.View style={[styles.textContainer, { opacity: contentOpacity, width: '100%' }]}>
          <OrderSteps />
          <Text style={styles.successTitle}>Order Placed!</Text>
          <Text style={styles.successSubtitle}>
            Your order has been sent to the restaurant.
          </Text>

          {/* Order Info Card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>ORDER ID</Text>
            <Text style={styles.infoValue}>#{orderId || 'N/A'}</Text>
            
            <View style={styles.divider} />
            
            <View style={styles.paymentRow}>
              <Ionicons name="card" size={16} color={COLORS.primary} style={styles.paymentIcon} />
              <Text style={styles.paymentMethodText}>Cash on Delivery (COD)</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.etaRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.secondary} />
              <Text style={styles.etaText}>
                Estimated Delivery: <Text style={{ fontWeight: 'bold', color: COLORS.dark }}>30–45 minutes</Text>
              </Text>
            </View>
          </View>

          {/* Rewards Card */}
          {loyaltyPointsEarned > 0 && (
            <View style={styles.rewardsCard}>
              <View style={styles.rewardsIconBg}>
                <Ionicons name="gift" size={24} color={COLORS.secondary} />
              </View>
              <View style={styles.rewardsTextContainer}>
                <Text style={styles.rewardsTitle}>Loyalty Points Earned!</Text>
                <Text style={styles.rewardsDescription}>
                  You earned <Text style={styles.rewardsHighlight}>{loyaltyPointsEarned} points</Text> on this order. Use them for discounts next time!
                </Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity activeOpacity={0.75} style={styles.trackButton} onPress={handleTrackOrder}>
              <Text style={styles.trackButtonText}>Track Your Order</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} style={styles.buttonIcon} />
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.75} style={styles.homeButton} onPress={handleBackToHome}>
              <Text style={styles.homeButtonText}>Go back to Home</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  contentContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
    padding: 20,
  },
  checkmarkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.success,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.large,
  },
  textContainer: {
    width: '100%',
    alignItems: 'center',
  },
  successTitle: {
    ...FONTS.title,
    fontSize: 28,
    color: COLORS.dark,
    marginBottom: SPACING.xs,
  },
  successSubtitle: {
    ...FONTS.body,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  infoCard: {
    width: '100%',
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.gray,
    letterSpacing: 1.5,
    marginBottom: SPACING.xs,
  },
  infoValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: SPACING.md,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginBottom: SPACING.md,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentIcon: {
    marginRight: SPACING.xs,
  },
  paymentMethodText: {
    ...FONTS.caption,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  rewardsCard: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#FFF9C4', // Soft warm yellow
    borderWidth: 1,
    borderColor: '#FFF59D',
    borderRadius: 16,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    ...SHADOWS.small,
  },
  rewardsIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  rewardsTextContainer: {
    flex: 1,
  },
  rewardsTitle: {
    ...FONTS.subtitle,
    fontSize: 15,
    color: COLORS.dark,
    fontWeight: '700',
  },
  rewardsDescription: {
    ...FONTS.caption,
    color: COLORS.dark,
    opacity: 0.8,
    marginTop: 2,
    lineHeight: 16,
  },
  rewardsHighlight: {
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  buttonContainer: {
    width: '100%',
    paddingHorizontal: SPACING.sm,
  },
  trackButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.medium,
  },
  trackButtonText: {
    ...FONTS.body,
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonIcon: {
    marginLeft: SPACING.xs,
  },
  homeButton: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: {
    ...FONTS.body,
    color: COLORS.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  etaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  etaText: {
    fontSize: 13,
    color: COLORS.gray,
  },
});
