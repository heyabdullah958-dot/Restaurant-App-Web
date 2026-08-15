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
  Vibration,
  NativeModules,
} from 'react-native';

const getExpoAudio = () => {
  try {
    if (Platform.OS === 'web') return null;
    // Check if ExponentAV native module exists in NativeModules
    const hasNativeAV = Boolean(
      NativeModules?.ExponentAV ||
      (globalThis as any)?.expo?.modules?.ExponentAV
    );
    if (!hasNativeAV) {
      return null;
    }
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
  const webAudioIntervalRef = useRef<any>(null);
  const webAudioCtxRef = useRef<any>(null);
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

  // Synthesized Web Audio Beeper for guaranteed audio on Web / Browsers
  const startWebAudioSynth = () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!webAudioCtxRef.current) {
        webAudioCtxRef.current = new AudioCtx();
      }
      const ctx = webAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const playBeep = () => {
        try {
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
          osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15); // A6 note
          gain.gain.setValueAtTime(0.3, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        } catch (e) {}
      };

      playBeep();
      if (!webAudioIntervalRef.current) {
        webAudioIntervalRef.current = setInterval(playBeep, 800);
      }
    } catch (e) {}
  };

  const stopWebAudioSynth = () => {
    if (webAudioIntervalRef.current) {
      clearInterval(webAudioIntervalRef.current);
      webAudioIntervalRef.current = null;
    }
  };

  // Audio & Keep Awake Lifecycle
  const startRingingAndKeepAwake = async () => {
    // 1. Keep Awake (defensive)
    try {
      const ka = getExpoKeepAwake();
      if (ka && ka.activateKeepAwakeAsync) {
        await ka.activateKeepAwakeAsync('new-order-alert');
      }
    } catch (e) {
      console.warn('[NewOrderAlertOverlay] Keep-awake activation notice:', e);
    }

    // 2. Continuous Vibration Haptics on Native
    try {
      if (Platform.OS !== 'web') {
        Vibration.vibrate([0, 600, 300, 600], true);
      }
    } catch (e) {}

    // 3. Audio Playback (defensive: Web HTML5 Audio -> Web Audio Synth -> Expo Audio)
    try {
      if (Platform.OS === 'web' || (typeof window !== 'undefined' && typeof window.Audio !== 'undefined')) {
        try {
          if (!htmlAudioRef.current && typeof window !== 'undefined' && window.Audio) {
            const audio = new window.Audio(ALERT_SOUND_URL);
            audio.loop = true;
            audio.volume = 1.0;
            htmlAudioRef.current = audio;
          }
          if (htmlAudioRef.current) {
            const playPromise = htmlAudioRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(() => {
                // If browser autoplay policy blocked MP3 url, fallback to Web Audio synth
                startWebAudioSynth();
              });
            }
          } else {
            startWebAudioSynth();
          }
        } catch {
          startWebAudioSynth();
        }
        return;
      }

      // Native Mobile (Android / iOS)
      const ExpoAudio = getExpoAudio();
      if (ExpoAudio && ExpoAudio.setAudioModeAsync) {
        try {
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
        } catch (nativeAudioErr) {
          console.warn('[NewOrderAlertOverlay] Native audio execution notice:', nativeAudioErr);
        }
      } else {
        console.warn('[NewOrderAlertOverlay] Native ExponentAV not available in runtime. Visual and vibration alert active.');
      }
    } catch (err) {
      console.warn('[NewOrderAlertOverlay] Audio playback notice (visual alert active):', err);
    }
  };

  const stopRingingAndKeepAwake = async () => {
    // 1. Cancel Vibration
    try {
      if (Platform.OS !== 'web') {
        Vibration.cancel();
      }
    } catch (e) {}

    // 2. Keep Awake release
    try {
      const ka = getExpoKeepAwake();
      if (ka && ka.deactivateKeepAwake) {
        ka.deactivateKeepAwake('new-order-alert');
      }
    } catch (e) {
      console.warn('[NewOrderAlertOverlay] Keep-awake deactivation notice:', e);
    }

    // 3. HTML5 Audio release
    if (htmlAudioRef.current) {
      try {
        htmlAudioRef.current.pause();
        htmlAudioRef.current.currentTime = 0;
      } catch (e) {}
      htmlAudioRef.current = null;
    }

    // 4. Web Audio Synth release
    stopWebAudioSynth();

    // 5. Expo Audio release
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

  // Defensive: Immediately terminate ringing & keep-awake if user logs out or session expires
  useEffect(() => {
    if (!isAuthenticated && visible) {
      setVisible(false);
      setPendingOrders([]);
      setCurrentIndex(0);
      stopRingingAndKeepAwake();
    }
  }, [isAuthenticated, visible]);

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
    } catch (err: any) {
      console.warn('Notice when accepting order from alert overlay:', err);
      // Concurrency/Staleness protection: If another manager accepted or order was cancelled, clear it from queue
      alertService.removeOrder(currentOrder.id);
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
              <Text style={styles.alertHeaderTitle}>NEW ORDER ALERT</Text>
              <Text style={styles.alertHeaderSub}>
                {pendingOrders.length > 1
                  ? `Order ${currentIndex + 1} of ${pendingOrders.length} • Action Required`
                  : 'Requires Immediate Branch Action'}
              </Text>
            </View>
          </View>

          <ScrollView style={styles.scrollDetails} showsVerticalScrollIndicator={false}>
            {/* Order Primary Details */}
            <View style={styles.orderHeaderCard}>
              <View style={styles.orderTitleCol}>
                <Text style={styles.displayIdText}>{displayId}</Text>
                <Text style={styles.orderTimeText}>
                  Just now • {new Date(currentOrder.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>TOTAL</Text>
                <Text style={styles.orderTotalText}>
                  Rs. {parseFloat(currentOrder.total).toLocaleString()}
                </Text>
              </View>
            </View>

            <View style={styles.badgeRow}>
              <View style={styles.typeChip}>
                <Text style={styles.chipText}>
                  {currentOrder.order_type === 'DINE_IN'
                    ? `🍽️ DINE-IN ${currentOrder.table_number ? `(Table ${currentOrder.table_number})` : ''}`
                    : currentOrder.order_type === 'TAKEAWAY'
                    ? '🛍️ TAKEAWAY / PICKUP'
                    : '🛵 HOME DELIVERY'}
                </Text>
              </View>
              <View style={styles.payChip}>
                <Text style={styles.payChipText}>
                  💳 {(currentOrder.payment_method || 'COD').toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Customer Info */}
            <View style={styles.customerBox}>
              <View style={styles.customerHeaderRow}>
                <Text style={styles.customerName}>
                  👤 {currentOrder.guest_name || 'Guest Customer'}
                </Text>
                <Text style={styles.customerPhone}>
                  📞 {currentOrder.guest_phone || 'N/A'}
                </Text>
              </View>
              {currentOrder.delivery_address ? (
                <View style={styles.addressRow}>
                  <Text style={styles.addressPin}>📍</Text>
                  <Text style={styles.customerAddress} numberOfLines={2}>
                    {currentOrder.delivery_address}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Item List */}
            <View style={styles.itemsSection}>
              <Text style={styles.itemsTitle}>
                ORDER ITEMS ({currentOrder.items?.length || 0})
              </Text>
              {currentOrder.items?.map((it, idx) => (
                <View key={it.id || idx} style={styles.itemRow}>
                  <View style={styles.itemQtyBadge}>
                    <Text style={styles.itemQtyText}>{it.quantity}x</Text>
                  </View>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {it.menu_item_name}
                  </Text>
                  <Text style={styles.itemPrice}>
                    Rs. {parseFloat(it.total_price).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>

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
                style={styles.navBtn}
              >
                <Text style={[styles.navText, currentIndex === 0 && styles.navDisabled]}>
                  ← Previous
                </Text>
              </TouchableOpacity>
              <Text style={styles.pageCountText}>
                {currentIndex + 1} of {pendingOrders.length}
              </Text>
              <TouchableOpacity
                disabled={currentIndex >= pendingOrders.length - 1}
                onPress={() =>
                  setCurrentIndex((prev) => Math.min(pendingOrders.length - 1, prev + 1))
                }
                style={styles.navBtn}
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
              activeOpacity={0.85}
            >
              {acceptLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.acceptButtonText}>🍳 Accept & Start Preparing</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.dismissButton} onPress={handleSilenceAlarm} activeOpacity={0.7}>
              <Text style={styles.dismissButtonText}>🔕 Silence Alarm (Keep in Queue)</Text>
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
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  alertCard: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '88%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  headerBanner: {
    backgroundColor: COLORS.danger,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  bellIcon: {
    fontSize: 28,
    marginRight: SPACING.sm,
  },
  headerTextCol: {
    flex: 1,
  },
  alertHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  alertHeaderSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 1,
  },
  scrollDetails: {
    padding: SPACING.md,
  },
  orderHeaderCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.neutral50,
    borderColor: COLORS.neutral200,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  orderTitleCol: {
    flex: 1,
  },
  displayIdText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  orderTimeText: {
    fontSize: 12,
    color: COLORS.neutral500,
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.neutral400,
    letterSpacing: 0.5,
  },
  orderTotalText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.branchManager.primary,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  typeChip: {
    backgroundColor: COLORS.primaryTint,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  chipText: {
    color: COLORS.branchManager.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  payChip: {
    backgroundColor: COLORS.neutral100,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  payChipText: {
    color: COLORS.neutral700,
    fontSize: 11,
    fontWeight: '600',
  },
  customerBox: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    marginBottom: SPACING.sm,
    borderColor: COLORS.neutral200,
    borderWidth: 1,
  },
  customerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  customerPhone: {
    fontSize: 13,
    color: COLORS.neutral600,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    paddingTop: 6,
    borderTopColor: COLORS.neutral100,
    borderTopWidth: 1,
  },
  addressPin: {
    fontSize: 12,
    marginRight: 4,
    marginTop: 1,
  },
  customerAddress: {
    flex: 1,
    fontSize: 12,
    color: COLORS.neutral600,
    lineHeight: 16,
  },
  itemsSection: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.neutral50,
    borderColor: COLORS.neutral200,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  itemsTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.neutral500,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral200,
  },
  itemQtyBadge: {
    backgroundColor: COLORS.primaryTint,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    marginRight: 8,
  },
  itemQtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.branchManager.primary,
  },
  itemName: {
    fontSize: 13,
    color: COLORS.dark,
    flex: 1,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.neutral700,
    marginLeft: 6,
  },
  notesBox: {
    marginTop: SPACING.sm,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  notesText: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 2,
  },
  carouselNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.neutral100,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral200,
  },
  navBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  navText: {
    color: COLORS.branchManager.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  navDisabled: {
    color: COLORS.neutral400,
    opacity: 0.5,
  },
  pageCountText: {
    fontSize: 12,
    color: COLORS.neutral600,
    fontWeight: '600',
  },
  actionContainer: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral200,
    backgroundColor: COLORS.card,
  },
  acceptButton: {
    backgroundColor: COLORS.branchManager.primary,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.xs,
    ...SHADOWS.coloredBranch,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  dismissButton: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
  },
  dismissButtonText: {
    color: COLORS.neutral500,
    fontSize: 13,
    fontWeight: '600',
  },
});
