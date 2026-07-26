import { NavigationContainerRef } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

let navigationRef: NavigationContainerRef<any> | null = null;

export const setNavigationRef = (ref: NavigationContainerRef<any> | null) => {
  navigationRef = ref;
};

/**
 * Universal Mobile Push Notification Listener & Deep Linking Service
 */
export const initPushNotificationListener = () => {
  try {
    let Notifications: any = null;
    try {
      Notifications = require('expo-notifications');
    } catch (e) {
      console.log('[NotificationService] expo-notifications fallback mode');
    }

    if (Notifications) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      const responseSubscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
        try {
          const data = response.notification.request.content.data;
          handleNotificationDeepLink(data);
        } catch (err) {
          console.warn('[NotificationService] Error handling notification tap:', err);
        }
      });

      return () => {
        responseSubscription.remove();
      };
    }
  } catch (err) {
    console.warn('[NotificationService] Setup error:', err);
  }
};

/**
 * Universal Deep-Link Handler for incoming post-delivery push notifications
 */
export const handleNotificationDeepLink = (data: any) => {
  if (!data) return;

  const { type, order_id, rate, screen } = data;

  if ((type === 'ORDER_DELIVERED' || screen === 'OrderTracking') && order_id) {
    const numericOrderId = Number(order_id);

    if (navigationRef && navigationRef.isReady()) {
      navigationRef.navigate('Tracking', {
        orderId: numericOrderId,
        rate: true,
        openReviewModal: true,
      });
    } else {
      AsyncStorage.setItem(
        'pending_deep_link',
        JSON.stringify({
          screen: 'Tracking',
          params: { orderId: numericOrderId, rate: true, openReviewModal: true },
        })
      );
    }
  }
};

/**
 * Subscribes user device to an order notification topic
 */
export const subscribeToOrderTopic = async (orderId: number) => {
  try {
    await AsyncStorage.setItem(`subscribed_topic_order_${orderId}`, 'true');
    console.log(`[NotificationService] Subscribed to order topic: order_${orderId}`);
  } catch (e) {
    console.warn(`[NotificationService] Failed to subscribe to topic order_${orderId}:`, e);
  }
};
