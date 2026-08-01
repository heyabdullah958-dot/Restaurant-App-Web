import AsyncStorage from '@react-native-async-storage/async-storage';
import api from './api';

export interface InAppNotification {
  id: string;
  title: string;
  body: string;
  type: 'ORDER_STATUS' | 'PROMO' | 'SYSTEM';
  order_id?: number;
  restaurant_name?: string;
  createdAt: string;
  read: boolean;
}

const NOTIF_STORAGE_KEY = 'foodsphere_in_app_notifications';
const STATUS_TRACKER_KEY = 'foodsphere_order_status_tracker';

type NotificationListener = (notifications: InAppNotification[]) => void;
type ToastListener = (notif: InAppNotification) => void;

let listeners: NotificationListener[] = [];
let toastListeners: ToastListener[] = [];
let cachedNotifications: InAppNotification[] = [];

export const subscribeNotifications = (listener: NotificationListener) => {
  listeners.push(listener);
  listener(cachedNotifications);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
};

export const subscribeToast = (listener: ToastListener) => {
  toastListeners.push(listener);
  return () => {
    toastListeners = toastListeners.filter((l) => l !== listener);
  };
};

const notifyListeners = () => {
  listeners.forEach((l) => l(cachedNotifications));
};

const triggerToast = (notif: InAppNotification) => {
  toastListeners.forEach((l) => l(notif));
};

export const loadInAppNotifications = async (): Promise<InAppNotification[]> => {
  try {
    const data = await AsyncStorage.getItem(NOTIF_STORAGE_KEY);
    if (data) {
      cachedNotifications = JSON.parse(data);
    } else {
      cachedNotifications = [
        {
          id: 'welcome_notif_1',
          title: '🎉 Welcome to FoodSphere!',
          body: 'Explore 7 authentic restaurant brands in a single application.',
          type: 'SYSTEM',
          createdAt: new Date().toISOString(),
          read: false,
        },
      ];
      await AsyncStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(cachedNotifications));
    }
    notifyListeners();
    return cachedNotifications;
  } catch (err) {
    if (__DEV__) console.log('[InAppNotificationService] Error loading notifications:', err);
    return cachedNotifications;
  }
};

export const addInAppNotification = async (notifData: {
  title: string;
  body: string;
  type?: 'ORDER_STATUS' | 'PROMO' | 'SYSTEM';
  order_id?: number;
  restaurant_name?: string;
}) => {
  try {
    const newNotif: InAppNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: notifData.title,
      body: notifData.body,
      type: notifData.type || 'ORDER_STATUS',
      order_id: notifData.order_id,
      restaurant_name: notifData.restaurant_name,
      createdAt: new Date().toISOString(),
      read: false,
    };

    // Filter duplicates for exact same order status
    const exists = cachedNotifications.some(
      (n) => n.order_id === newNotif.order_id && n.title === newNotif.title
    );
    if (exists) return;

    cachedNotifications = [newNotif, ...cachedNotifications].slice(0, 50); // Keep max 50
    await AsyncStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(cachedNotifications));
    notifyListeners();
    triggerToast(newNotif);
  } catch (err) {
    if (__DEV__) console.log('[InAppNotificationService] Error adding notification:', err);
  }
};

export const markAllNotificationsRead = async () => {
  try {
    cachedNotifications = cachedNotifications.map((n) => ({ ...n, read: true }));
    await AsyncStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(cachedNotifications));
    notifyListeners();
  } catch (err) {
    if (__DEV__) console.log('[InAppNotificationService] Error marking read:', err);
  }
};

export const markNotificationRead = async (id: string) => {
  try {
    cachedNotifications = cachedNotifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    await AsyncStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(cachedNotifications));
    notifyListeners();
  } catch (err) {
    if (__DEV__) console.log('[InAppNotificationService] Error marking notification read:', err);
  }
};

export const clearAllNotifications = async () => {
  try {
    cachedNotifications = [];
    await AsyncStorage.removeItem(NOTIF_STORAGE_KEY);
    notifyListeners();
  } catch (err) {
    if (__DEV__) console.log('[InAppNotificationService] Error clearing notifications:', err);
  }
};

/**
 * Universal Order Status Tracker Poller
 * Detects status changes and automatically dispatches in-app notifications
 */
export const checkOrderStatusUpdates = async () => {
  try {
    let trackedStatusMap: Record<number, string> = {};
    const rawMap = await AsyncStorage.getItem(STATUS_TRACKER_KEY);
    if (rawMap) {
      try {
        trackedStatusMap = JSON.parse(rawMap);
      } catch (e) {}
    }

    const res = await api.get('/orders/') as any;
    const ordersList = Array.isArray(res.data) ? res.data : res.data?.results || [];

    let updated = false;

    for (const order of ordersList) {
      const orderId = Number(order.id);
      const orderLabel = order.display_order_id || `#${orderId}`;
      const currentStatus = (order.status || '').toLowerCase();
      const prevStatus = trackedStatusMap[orderId];
      const brandName = order.restaurant_name || order.restaurant?.name || 'FoodSphere';

      if (prevStatus && prevStatus !== currentStatus) {
        if (currentStatus === 'preparing') {
          await addInAppNotification({
            title: '👨‍🍳 Kitchen is Cooking!',
            body: `Your order ${orderLabel} from ${brandName} is now being prepared in the kitchen.`,
            type: 'ORDER_STATUS',
            order_id: orderId,
            restaurant_name: brandName,
          });
        } else if (currentStatus === 'out_for_delivery') {
          await addInAppNotification({
            title: '🛵 Your Order is On Its Way!',
            body: `Great news! Order ${orderLabel} from ${brandName} has been handed over to our rider. Tap to track!`,
            type: 'ORDER_STATUS',
            order_id: orderId,
            restaurant_name: brandName,
          });
        } else if (currentStatus === 'delivered') {
          await addInAppNotification({
            title: '🍕 Order Delivered — Bon Appétit!',
            body: `Order ${orderLabel} from ${brandName} was delivered. Tap to rate your meal! ⭐`,
            type: 'ORDER_STATUS',
            order_id: orderId,
            restaurant_name: brandName,
          });
        } else if (currentStatus === 'cancelled') {
          await addInAppNotification({
            title: '❌ Order Cancelled',
            body: `Order ${orderLabel} from ${brandName} was cancelled.`,
            type: 'ORDER_STATUS',
            order_id: orderId,
            restaurant_name: brandName,
          });
        }
      }

      trackedStatusMap[orderId] = currentStatus;
      updated = true;
    }

    if (updated) {
      await AsyncStorage.setItem(STATUS_TRACKER_KEY, JSON.stringify(trackedStatusMap));
    }
  } catch (err) {
    // Guest fallback tracker check
    try {
      const guestOrderId = await AsyncStorage.getItem('foodsphere_guest_active_order_id');
      if (guestOrderId) {
        const orderId = Number(guestOrderId);
        const guestRes = await api.get(`/orders/${orderId}/`) as any;
        const gOrder = guestRes.data || guestRes;
        const currentStatus = (gOrder.status || '').toLowerCase();
        const brandName = gOrder.restaurant_name || gOrder.restaurant?.name || 'FoodSphere';

        let trackedStatusMap: Record<number, string> = {};
        const rawMap = await AsyncStorage.getItem(STATUS_TRACKER_KEY);
        if (rawMap) {
          try {
            trackedStatusMap = JSON.parse(rawMap);
          } catch (e) {}
        }
        const prevStatus = trackedStatusMap[orderId];

        if (prevStatus && prevStatus !== currentStatus) {
          if (currentStatus === 'out_for_delivery') {
            await addInAppNotification({
              title: '🛵 Your Order is On Its Way!',
              body: `Great news! Order #${orderId} from ${brandName} is on its way.`,
              type: 'ORDER_STATUS',
              order_id: orderId,
              restaurant_name: brandName,
            });
          } else if (currentStatus === 'delivered') {
            await addInAppNotification({
              title: '🍕 Order Delivered — Bon Appétit!',
              body: `Order #${orderId} from ${brandName} was delivered!`,
              type: 'ORDER_STATUS',
              order_id: orderId,
              restaurant_name: brandName,
            });
          }
        }
        trackedStatusMap[orderId] = currentStatus;
        await AsyncStorage.setItem(STATUS_TRACKER_KEY, JSON.stringify(trackedStatusMap));
      }
    } catch (e) {}
  }
};
