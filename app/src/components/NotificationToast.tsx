import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { InAppNotification, subscribeToast } from '../services/inAppNotificationService';

const { width } = Dimensions.get('window');

interface NotificationToastProps {
  navigationRef: any;
}

export default function NotificationToast({ navigationRef }: NotificationToastProps) {
  const [activeNotif, setActiveNotif] = React.useState<InAppNotification | null>(null);
  const translateY = React.useRef(new Animated.Value(-120)).current;

  React.useEffect(() => {
    const unsubscribe = subscribeToast((notif) => {
      setActiveNotif(notif);
      Animated.spring(translateY, {
        toValue: Platform.OS === 'android' ? 45 : 55,
        useNativeDriver: true,
        bounciness: 8,
      }).start();

      const timer = setTimeout(() => {
        dismissToast();
      }, 5000);

      return () => clearTimeout(timer);
    });

    return unsubscribe;
  }, []);

  const dismissToast = () => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setActiveNotif(null));
  };

  const handlePress = () => {
    dismissToast();
    if (activeNotif?.order_id && navigationRef?.current?.isReady()) {
      navigationRef.current.navigate('Tracking', {
        orderId: activeNotif.order_id,
        openReviewModal: activeNotif.title.includes('Delivered'),
      });
    }
  };

  if (!activeNotif) return null;

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ translateY }] }]}>
      <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={handlePress}>
        <View style={styles.iconCircle}>
          <Ionicons name="notifications" size={20} color="#ffffff" />
        </View>

        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={1}>
            {activeNotif.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {activeNotif.body}
          </Text>
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={dismissToast} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 16,
    right: 16,
    zIndex: 99999,
    elevation: 99999,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 2,
  },
  body: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 16,
  },
  closeBtn: {
    padding: 4,
  },
});
