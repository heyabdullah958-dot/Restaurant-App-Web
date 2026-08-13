import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
// Safe dynamic native module loaders to prevent app crashes when ExponentAV is unlinked in runtime
const getExpoAudio = () => {
  try {
    const av = require('expo-av');
    return av?.Audio || null;
  } catch (e) {
    return null;
  }
};

const getExpoKeepAwake = () => {
  try {
    const ka = require('expo-keep-awake');
    return ka || null;
  } catch (e) {
    return null;
  }
};

import { COLORS, SPACING, RADIUS, SHADOWS } from '../theme';
import { useAppDispatch, useAppSelector } from '../store';
import { updateOrderStatusThunk } from '../store/orderSlice';
import { alertService } from '../services/NewOrderAlertService';
import { AdminOrder } from '../services/api';

const ALERT_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const NewOrderAlertOverlay = () => {
  const dispatch = useAppDispatch();
  const { role, isAuthenticated } = useAppSelector((state) => state.auth);

  const [visible, setVisible] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<AdminOrder[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [acceptLoading, setAcceptLoading] = useState(false);

  const soundRef = useRef<any>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing animation for alert bell icon
  useEffect(() => {
    if (visible) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [visible, pulseAnim]);

  // Audio & Keep Awake Lifecycle
  const startRingingAndKeepAwake = async () => {
    // 1. Keep Awake (defensive)
    try {
      const ka = getExpoKeepAwake();
      if (ka && ka.activateKeepAwakeAsync) {
        await ka.activateKeepAwakeAsync('new-order-alert');
      }
    } catch (e) {
      console.warn('[NewOrderAlertOverlay] Keep-awake activation skipped:', e);
    }

    // 2. Audio Playback (defensive: Web HTML5 Audio vs Expo Audio)
    try {
      if (typeof window !== 'undefined' && typeof window.Audio !== 'undefined') {
        if (!htmlAudioRef.current) {
          const audio = new window.Audio(ALERT_SOUND_URL);
          audio.loop = true;
          audio.volume = 1.0;
          htmlAudioRef.current = audio;
        }
        await htmlAudioRef.current.play().catch(() => {});
        return;
      }

      const ExpoAudio = getExpoAudio();
      if (ExpoAudio) {
        await ExpoAudio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: false,
        });

        if (!soundRef.current) {
          const { sound } = await ExpoAudio.Sound.createAsync(
            { uri: ALERT_SOUND_URL },
            { shouldPlay: true, isLooping: true, volume: 1.0 }
          );
          soundRef.current = sound;
        } else {
          await soundRef.current.setIsLoopingAsync(true);
          await soundRef.current.setVolumeAsync(1.0);
          await soundRef.current.playAsync();
        }
      } else {
        console.warn('[NewOrderAlertOverlay] Native module ExponentAV not present in runtime. Visual alert active.');
      }
    } catch (err) {
      console.warn('[NewOrderAlertOverlay] Audio playback notice (visual alert active):', err);
    }
  };

  const stopRingingAndKeepAwake = async () => {
    // 1. Keep Awake release
    try {
      const ka = getExpoKeepAwake();
      if (ka && ka.deactivateKeepAwake) {
        ka.deactivateKeepAwake('new-order-alert');
      }
    } catch (e) {
      console.warn('[NewOrderAlertOverlay] Keep-awake deactivation notice:', e);
    }

    // 2. HTML5 Audio release
    if (htmlAudioRef.current) {
      try {
        htmlAudioRef.current.pause();
        htmlAudioRef.current.currentTime = 0;
      } catch (e) {}
      htmlAudioRef.current = null;
    }

    // 3. Expo Audio release
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (err) {}
      soundRef.current = null;
    }
  };

  // Subscribe to Alert Service events
  useEffect(() => {
    const unsubAlert = alertService.onAlert((orders) => {
      // Alert triggers strictly for Branch Managers when authenticated
      if (!isAuthenticated || role !== 'branch_manager') return;

      if (orders.length > 0) {
        setPendingOrders(orders);
        setCurrentIndex(0);
        setVisible(true);
        startRingingAndKeepAwake();
      }
    });

    const unsubDismiss = alertService.onDismiss(() => {
      setVisible(false);
      setPendingOrders([]);
      setCurrentIndex(0);
      stopRingingAndKeepAwake();
    });

    return () => {
      unsubAlert();
      unsubDismiss();
      stopRingingAndKeepAwake();
    };
  }, [isAuthenticated, role]);

  if (!visible || pendingOrders.length === 0) {
    return null;
  }

  const currentOrder = pendingOrders[currentIndex] || pendingOrders[0];
  const displayId = currentOrder.display_order_id || `#${currentOrder.id}`;

  const handleAccept = async () => {
    if (!currentOrder) return;
    setAcceptLoading(true);
    try {
      await dispatch(
        updateOrderStatusThunk({
          orderId: currentOrder.id,
          status: 'preparing',
        })
      ).unwrap();

      alertService.removeOrder(currentOrder.id);
      if (currentIndex >= pendingOrders.length - 1) {
        setCurrentIndex(Math.max(0, pendingOrders.length - 2));
      }
    } catch (err) {
      console.warn('Failed to accept order from alert overlay:', err);
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleSilenceAlarm = () => {
    stopRingingAndKeepAwake();
    alertService.clearAlert();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlayBackground}>
        <View style={styles.alertCard}>
          {/* Header Banner */}
          <View style={styles.headerBanner}>
            <Animated.Text style={[styles.bellIcon, { transform: [{ scale: pulseAnim }] }]}>
              🔔
            </Animated.Text>
            <View style={styles.headerTextCol}>
              <Text style={styles.alertHeaderTitle}>NEW INCOMING ORDER!</Text>
              <Text style={styles.alertHeaderSub}>
                {pendingOrders.length > 1
                  ? `Order ${currentIndex + 1} of ${pendingOrders.length}`
                  : 'Requires Branch Manager Action'}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.scrollDetails} showsVerticalScrollIndicator={false}>
            {/* Order Primary Details */}
            <View style={styles.orderTitleRow}>
              <Text style={styles.displayIdText}>{displayId}</Text>
              <Text style={styles.orderTotalText}>
                Rs. {parseFloat(currentOrder.total).toLocaleString()}
              </Text>
            </View>

            <View style={styles.badgeRow}>
              <View style={styles.typeChip}>
                <Text style={styles.chipText}>
                  {currentOrder.order_type === 'DINE_IN'
                    ? `🍽️ DINE-IN ${currentOrder.table_number ? `(T-${currentOrder.table_number})` : ''}`
                    : currentOrder.order_type === 'TAKEAWAY'
                    ? '🛍️ PICKUP'
                    : '🛵 DELIVERY'}
                </Text>
              </View>
              <View style={styles.payChip}>
                <Text style={styles.payChipText}>
                  {(currentOrder.payment_method || 'COD').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Customer Info */}
            <View style={styles.customerBox}>
              <Text style={styles.customerName}>
                👤 {currentOrder.guest_name || 'Guest Customer'}
              </Text>
              <Text style={styles.customerPhone}>
                📞 {currentOrder.guest_phone || 'N/A'}
              </Text>
              {currentOrder.delivery_address ? (
                <Text style={styles.customerAddress}>
                  📍 {currentOrder.delivery_address}
                </Text>
              ) : null}
            </View>

            {/* Item List */}
            <Text style={styles.itemsTitle}>Items ({currentOrder.items?.length || 0}):</Text>
            {currentOrder.items?.map((it, idx) => (
              <View key={it.id || idx} style={styles.itemRow}>
                <Text style={styles.itemQty}>{it.quantity}x</Text>
                <Text style={styles.itemName}>{it.menu_item_name}</Text>
                <Text style={styles.itemPrice}>
                  Rs. {parseFloat(it.total_price).toLocaleString()}
                </Text>
              </View>
            ))}

            {currentOrder.special_instructions ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesTitle}>Special Instructions:</Text>
                <Text style={styles.notesText}>{currentOrder.special_instructions}</Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Carousel Next Navigation if Multiple */}
          {pendingOrders.length > 1 ? (
            <View style={styles.carouselNav}>
              <TouchableOpacity
                disabled={currentIndex === 0}
                onPress={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              >
                <Text style={[styles.navText, currentIndex === 0 && styles.navDisabled]}>
                  ← Previous
                </Text>
              </TouchableOpacity>
              <Text style={styles.pageCountText}>
                {currentIndex + 1} / {pendingOrders.length}
              </Text>
              <TouchableOpacity
                disabled={currentIndex >= pendingOrders.length - 1}
                onPress={() =>
                  setCurrentIndex((prev) => Math.min(pendingOrders.length - 1, prev + 1))
                }
              >
                <Text
                  style={[
                    styles.navText,
                    currentIndex >= pendingOrders.length - 1 && styles.navDisabled,
                  ]}
                >
                  Next →
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Primary Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
              disabled={acceptLoading}
              activeOpacity={0.8}
            >
              {acceptLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.acceptButtonText}>🍳 Accept & Start Preparing</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.dismissButton} onPress={handleSilenceAlarm}>
              <Text style={styles.dismissButtonText}>🔕 Silence Alarm (Keep Received)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlayBackground: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  alertCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: COLORS.branchManager.card,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  headerBanner: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  bellIcon: {
    fontSize: 32,
    marginRight: SPACING.sm,
  },
  headerTextCol: {
    flex: 1,
  },
  alertHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  alertHeaderSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 2,
  },
  scrollDetails: {
    padding: SPACING.md,
  },
  orderTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  displayIdText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.branchManager.text,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  orderTotalText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.branchManager.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  typeChip: {
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
    marginRight: SPACING.xs,
  },
  chipText: {
    color: COLORS.branchManager.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  payChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.xs,
  },
  payChipText: {
    color: COLORS.branchManager.muted,
    fontSize: 12,
    fontWeight: 'bold',
  },
  customerBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: RADIUS.xs,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    borderColor: COLORS.branchManager.border,
    borderWidth: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.branchManager.text,
  },
  customerPhone: {
    fontSize: 13,
    color: COLORS.branchManager.muted,
    marginTop: 2,
  },
  customerAddress: {
    fontSize: 12,
    color: COLORS.branchManager.text,
    marginTop: 4,
  },
  itemsTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.branchManager.muted,
    marginBottom: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemQty: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.branchManager.primary,
    width: 28,
  },
  itemName: {
    fontSize: 14,
    color: COLORS.branchManager.text,
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    color: COLORS.branchManager.muted,
  },
  notesBox: {
    marginTop: SPACING.md,
    backgroundColor: '#FFFBEB',
    padding: SPACING.sm,
    borderRadius: RADIUS.xs,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#D97706',
  },
  notesText: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  carouselNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: COLORS.branchManager.border,
  },
  navText: {
    color: COLORS.branchManager.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  navDisabled: {
    color: COLORS.branchManager.muted,
    opacity: 0.4,
  },
  pageCountText: {
    fontSize: 12,
    color: COLORS.branchManager.muted,
    fontWeight: '600',
  },
  actionContainer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.branchManager.border,
    backgroundColor: COLORS.branchManager.card,
  },
  acceptButton: {
    backgroundColor: '#10B981',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  dismissButton: {
    paddingVertical: SPACING.xs,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: COLORS.branchManager.muted,
    fontSize: 14,
    fontWeight: '600',
  },
});
