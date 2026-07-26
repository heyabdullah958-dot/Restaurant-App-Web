import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';
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
  OrderConfirmation: { orderId: number; loyaltyPointsEarned?: number; branchName?: string };
};

type OrderConfirmationRouteProp = RouteProp<RootStackParamList, 'OrderConfirmation'>;
type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'OrderConfirmation'>;

export default function OrderConfirmationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<OrderConfirmationRouteProp>();
  const { orderId, loyaltyPointsEarned = 0, branchName } = route.params || {};

  // Animation values
  const scaleValue = useRef(new Animated.Value(0.3)).current;
  const opacityValue = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;

  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>('Restaurant');

  // Review prompt state
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [hasSubmittedReview, setHasSubmittedReview] = useState<boolean>(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  useEffect(() => {
    if (orderId) {
      AsyncStorage.getItem(`reviewed_order_${orderId}`).then((val) => {
        if (val === 'true') setHasSubmittedReview(true);
      });

      api.get(`/orders/${orderId}/`)
        .then((res: any) => {
          const data = res?.data?.data || res?.data;
          if (data) {
            setOrderStatus(data.status);
            const rId = data.restaurant?.id || data.restaurant;
            const rName = data.restaurant?.name || data.restaurant_name || 'Restaurant';
            if (rId) setRestaurantId(rId);
            if (rName) setRestaurantName(rName);
          }
        })
        .catch(() => {});
    }
  }, [orderId]);

  const handleSubmitReview = async () => {
    if (!orderId || !restaurantId) return;
    setIsSubmittingReview(true);
    try {
      await api.post(`/restaurants/${restaurantId}/reviews/`, {
        order: orderId,
        rating: reviewRating,
        comment: reviewComment.trim(),
        restaurant: restaurantId,
      });
      await AsyncStorage.setItem(`reviewed_order_${orderId}`, 'true');
      setHasSubmittedReview(true);
      Alert.alert('Review Submitted', 'Thank you for your feedback!');
    } catch (e: any) {
      const errMsg = e.response?.data?.restaurant?.[0] || e.response?.data?.order?.[0] || e.response?.data?.detail || e.message || 'Failed to submit review';
      Alert.alert('Review Error', String(errMsg));
    } finally {
      setIsSubmittingReview(false);
    }
  };

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
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
            {branchName ? (
              <>
                <View style={styles.divider} />
                <View style={styles.etaRow}>
                  <Ionicons name="location" size={16} color={COLORS.primary} />
                  <Text style={styles.etaText}>
                    Assigned Branch: <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>{branchName}</Text>
                  </Text>
                </View>
              </>
            ) : null}
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

          {/* Order Review Prompt Card (Visible when delivered) */}
          {orderStatus?.toLowerCase() === 'delivered' && (
            <View style={[styles.infoCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', borderWidth: 1, marginBottom: SPACING.md }]}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#166534', marginBottom: 8 }}>
                ⭐ Rate Your Meal Experience
              </Text>
              {hasSubmittedReview ? (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <Ionicons name="checkmark-circle" size={36} color="#166534" />
                  <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#166534', marginTop: 4 }}>
                    Thank you for your review!
                  </Text>
                  <Text style={{ fontSize: 12, color: '#15803d', textAlign: 'center', marginTop: 2 }}>
                    Your feedback helps us continuously improve our food quality and delivery speed.
                  </Text>
                </View>
              ) : (
                <View style={{ width: '100%' }}>
                  <Text style={{ fontSize: 13, color: '#166534', marginBottom: 10, textAlign: 'center' }}>
                    How was your food and delivery from {restaurantName}?
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 14 }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity key={star} onPress={() => setReviewRating(star)}>
                        <Ionicons
                          name={star <= reviewRating ? "star" : "star-outline"}
                          size={32}
                          color={star <= reviewRating ? "#f59e0b" : "#94a3b8"}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    style={{ backgroundColor: '#ffffff', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#cbd5e1', fontSize: 13, minHeight: 60, color: COLORS.dark, width: '100%' }}
                    placeholder="Write a comment about your food quality or delivery experience..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    numberOfLines={2}
                    value={reviewComment}
                    onChangeText={setReviewComment}
                  />
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isSubmittingReview}
                    onPress={handleSubmitReview}
                    style={{
                      backgroundColor: '#166534',
                      paddingVertical: 12,
                      borderRadius: 10,
                      alignItems: 'center',
                      marginTop: 10,
                      width: '100%',
                    }}
                  >
                    {isSubmittingReview ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>Submit Review</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  iconContainer: {
    marginBottom: SPACING.lg,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
