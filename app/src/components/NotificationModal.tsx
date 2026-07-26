import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  InAppNotification,
  markAllNotificationsRead,
  markNotificationRead,
  clearAllNotifications,
} from '../services/inAppNotificationService';

const { width, height } = Dimensions.get('window');

interface NotificationModalProps {
  visible: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  navigation: any;
}

const getNotificationIcon = (notif: InAppNotification) => {
  if (notif.title.includes('On Its Way') || notif.title.includes('🛵')) return 'bicycle-sharp';
  if (notif.title.includes('Delivered') || notif.title.includes('🍕')) return 'pizza-sharp';
  if (notif.title.includes('Cooking') || notif.title.includes('👨‍🍳')) return 'restaurant-sharp';
  if (notif.title.includes('Cancelled') || notif.title.includes('❌')) return 'close-circle-sharp';
  return 'notifications-sharp';
};

const getNotificationColor = (notif: InAppNotification) => {
  if (notif.title.includes('On Its Way') || notif.title.includes('🛵')) return '#0284c7';
  if (notif.title.includes('Delivered') || notif.title.includes('🍕')) return '#16a34a';
  if (notif.title.includes('Cooking') || notif.title.includes('👨‍🍳')) return '#d97706';
  if (notif.title.includes('Cancelled') || notif.title.includes('❌')) return '#dc2626';
  return '#ea580c';
};

const formatTimeAgo = (isoDate: string) => {
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return 'Recently';
  }
};

export default function NotificationModal({
  visible,
  onClose,
  notifications,
  navigation,
}: NotificationModalProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handlePressItem = async (item: InAppNotification) => {
    await markNotificationRead(item.id);
    onClose();
    if (item.order_id) {
      navigation.navigate('Tracking', {
        orderId: item.order_id,
        openReviewModal: item.title.includes('Delivered'),
      });
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.backdropTouch} activeOpacity={1} onPress={onClose} />
        
        <View style={styles.container}>
          <View style={styles.dragHandle} />
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="notifications" size={24} color="#ea580c" />
              <Text style={styles.title}>Notifications</Text>
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount} new</Text>
                </View>
              )}
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={26} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Action Bar */}
          {notifications.length > 0 && (
            <View style={styles.actionBar}>
              <TouchableOpacity onPress={() => markAllNotificationsRead()} style={styles.actionBtn}>
                <Ionicons name="checkmark-done" size={16} color="#0284c7" />
                <Text style={styles.actionBtnText}>Mark all as read</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => clearAllNotifications()} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
                <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Clear all</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Notifications List */}
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="notifications-off-outline" size={54} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Notifications Yet</Text>
                <Text style={styles.emptySub}>
                  Order status updates, live delivery tracking, and special promos will appear here.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const iconName = getNotificationIcon(item);
              const themeColor = getNotificationColor(item);

              return (
                <TouchableOpacity
                  style={[styles.itemCard, !item.read && styles.itemCardUnread]}
                  activeOpacity={0.8}
                  onPress={() => handlePressItem(item)}
                >
                  <View style={[styles.iconWrap, { backgroundColor: `${themeColor}15` }]}>
                    <Ionicons name={iconName as any} size={22} color={themeColor} />
                  </View>

                  <View style={styles.itemContent}>
                    <View style={styles.itemHeader}>
                      <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]}>
                        {item.title}
                      </Text>
                      <Text style={styles.itemTime}>{formatTimeAgo(item.createdAt)}</Text>
                    </View>

                    <Text style={styles.itemBody} numberOfLines={2}>
                      {item.body}
                    </Text>

                    {item.order_id && (
                      <View style={styles.itemFooter}>
                        <Text style={styles.trackLinkText}>Tap to open tracking</Text>
                        <Ionicons name="arrow-forward" size={12} color="#0284c7" />
                      </View>
                    )}
                  </View>

                  {!item.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  container: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: height * 0.75,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  badge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#c2410c',
  },
  closeBtn: {
    padding: 2,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0284c7',
  },
  listContent: {
    paddingVertical: 12,
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    position: 'relative',
  },
  itemCardUnread: {
    backgroundColor: '#fff7ed',
    borderColor: '#ffedd5',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    marginRight: 8,
  },
  itemTitleUnread: {
    fontWeight: '800',
    color: '#0f172a',
  },
  itemTime: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  itemBody: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 17,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  trackLinkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284c7',
  },
  unreadDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ea580c',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
});
