import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Alert,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootState, AppDispatch } from '../store';
import { fetchMyOrders, fetchOrderDetails } from '../store/orderSlice';
import { addItemToCart } from '../store/cartSlice';
import { COLORS, SPACING, SHADOWS, FONTS } from '../theme';
import CustomAlertModal from '../components/CustomAlertModal';
import api, { API_BASE_URL } from '../services/api';

export default function OrdersScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();

  // Fetch state from store
  const { myOrders, loading } = useSelector((state: RootState) => state.order);
  const { isAuthenticated, user, loading: userLoading } = useSelector((state: RootState) => state.user);

  // Re-ordering state to track specific order spinner
  const [reorderingId, setReorderingId] = useState<number | null>(null);

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

  // Guest active order state
  const [guestOrders, setGuestOrders] = useState<any[]>([]);
  const [isGuestLoading, setIsGuestLoading] = useState<boolean>(false);
  const [lookupInput, setLookupInput] = useState<string>('');
  const [isLookingUp, setIsLookingUp] = useState<boolean>(false);

  const fetchGuestOrdersFromStorage = React.useCallback(async () => {
    setIsGuestLoading(true);
    try {
      const keys = [
        'guest_tracking_token',
        '@getfood_active_guest_order',
        'foodsphere_guest_active_order_id',
      ];
      const results = await AsyncStorage.multiGet(keys);
      const storageMap: Record<string, string | null> = {};
      results.forEach(([k, v]: [string, string | null]) => { storageMap[k] = v; });

      let token = storageMap['guest_tracking_token'];
      let targetId: any = null;

      const rawActiveOrder = storageMap['@getfood_active_guest_order'];
      if (rawActiveOrder) {
        try {
          const parsed = JSON.parse(rawActiveOrder);
          if (parsed?.trackingToken) token = parsed.trackingToken;
          if (parsed?.orderId || parsed?.id) targetId = parsed.orderId || parsed.id;
        } catch (e) {}
      }

      if (!targetId && storageMap['foodsphere_guest_active_order_id']) {
        targetId = storageMap['foodsphere_guest_active_order_id'];
      }

      if (token || targetId) {
        const res: any = await api.get('/orders/track/', {
          params: {
            token: token || undefined,
            order_id: targetId || undefined,
          }
        });
        const data = res?.data?.data || res?.data;
        if (data && data.id) {
          setGuestOrders([data]);
        } else {
          setGuestOrders([]);
        }
      } else {
        setGuestOrders([]);
      }
    } catch (e) {
      setGuestOrders([]);
    } finally {
      setIsGuestLoading(false);
    }
  }, []);

  // APP-14: Selected filter and computed list
  const [orderFilter, setOrderFilter] = React.useState<'all' | 'active' | 'delivered'>('all');
  const filteredOrders = React.useMemo(() => {
    const isUserGuest = !isAuthenticated || !user || user.is_guest;
    const ordersSource = isUserGuest ? guestOrders : (Array.isArray(myOrders) ? myOrders : (myOrders && Array.isArray((myOrders as any).results) ? (myOrders as any).results : []));
    const ordersArray = Array.isArray(ordersSource) ? ordersSource : [];
    if (orderFilter === 'active') {
      return ordersArray.filter((o: any) => o && o.status !== 'delivered' && o.status !== 'cancelled');
    }
    if (orderFilter === 'delivered') {
      return ordersArray.filter((o: any) => o && o.status === 'delivered');
    }
    return ordersArray.filter((o: any) => o !== null && o !== undefined);
  }, [myOrders, guestOrders, isAuthenticated, user, orderFilter]);

  // Fetch orders on tab focus and poll every 4 seconds while screen is active
  useFocusEffect(
    React.useCallback(() => {
      if (isAuthenticated && user && !user.is_guest) {
        dispatch(fetchMyOrders());

        const interval = setInterval(() => {
          dispatch(fetchMyOrders());
        }, 4000);

        return () => clearInterval(interval);
      } else {
        fetchGuestOrdersFromStorage();
        const interval = setInterval(() => {
          fetchGuestOrdersFromStorage();
        }, 4000);
        return () => clearInterval(interval);
      }
    }, [dispatch, isAuthenticated, user, fetchGuestOrdersFromStorage])
  );

  const handleRefresh = () => {
    if (isAuthenticated && user && !user.is_guest) {
      dispatch(fetchMyOrders());
    } else {
      fetchGuestOrdersFromStorage();
    }
  };

  const handleManualLookup = async () => {
    const query = lookupInput.trim();
    if (!query) {
      showAlert('Lookup Code Required', 'Please enter your Order ID or tracking code (e.g. FS-1014 or 42).');
      return;
    }

    setIsLookingUp(true);
    try {
      const res: any = await api.get('/orders/track/', {
        params: { order_id: query }
      });
      const data = res?.data?.data || res?.data;
      if (data && data.id) {
        navigation.navigate('Tracking', { orderId: data.display_order_id || data.id, trackingToken: data.tracking_token });
      } else {
        showAlert('Order Not Found', `No active order matching '${query}' was found.`);
      }
    } catch (e: any) {
      showAlert('Lookup Error', 'Unable to find order matching that ID. Please double check your order receipt.');
    } finally {
      setIsLookingUp(false);
    }
  };

  // Status mapping to colors and human-readable names
  const getStatusDetails = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return { label: 'Pending', color: COLORS.warning };
      case 'received':
      case 'accepted':
        return { label: 'Accepted', color: COLORS.warning };
      case 'preparing':
        return { label: 'Preparing', color: COLORS.secondary };
      case 'out_for_delivery':
      case 'out for delivery':
        return { label: 'Out for Delivery', color: COLORS.accent };
      case 'delivered':
        return { label: 'Delivered', color: COLORS.success };
      case 'cancelled':
        return { label: 'Cancelled', color: COLORS.danger };
      default:
        return { label: status || 'Pending', color: COLORS.gray };
    }
  };

  // Utility to handle Django media image urls
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    const domain = API_BASE_URL.replace('/api', '');
    return `${domain}${imagePath}`;
  };

  // Format order date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Asynchronous re-order handler
  const handleReorder = async (orderId: number) => {
    setReorderingId(orderId);
    try {
      const resultAction = await dispatch(fetchOrderDetails(orderId));
      if (fetchOrderDetails.fulfilled.match(resultAction)) {
        const fullOrder = resultAction.payload;
        const restId = fullOrder.restaurant?.id || fullOrder.restaurant;

        showAlert(
          'Re-order',
          `Add all items from ${fullOrder.restaurant?.name || 'this order'} to your cart?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setReorderingId(null);
                hideAlert();
              },
            },
            {
              text: 'Add to Cart',
              onPress: () => {
                fullOrder.items.forEach((item: any) => {
                  dispatch(
                    addItemToCart({
                      item: {
                        id: item.menu_item,
                        name: item.menu_item_name || 'Menu Item',
                        price: parseFloat(item.unit_price),
                        quantity: item.quantity,
                        selectedOptions: item.special_notes || null,
                        image: item.menu_item_image || null,
                      },
                      restaurantId: restId,
                    })
                  );
                });

                setReorderingId(null);

                showAlert(
                  'Added to Cart',
                  'Items have been successfully added. Go to cart?',
                  [
                    { text: 'Keep Browsing', style: 'cancel', onPress: hideAlert },
                    { text: 'Go to Cart', onPress: () => { hideAlert(); navigation.navigate('Cart'); } },
                  ]
                );
              },
            },
          ]
        );
      } else {
        setReorderingId(null);
        showAlert('Error', 'Failed to retrieve order items.');
      }
    } catch (err) {
      setReorderingId(null);
      showAlert('Error', 'Something went wrong while re-ordering.');
    }
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    if (!item) return null;
    const statusInfo = getStatusDetails(item?.status);
    const logoUrl = getImageUrl(item?.restaurant_logo);

    return (
      <View style={styles.orderCard}>
        {/* Card Header info */}
        <View style={styles.cardHeader}>
          <View style={styles.restaurantRow}>
            {logoUrl ? (
              <Image source={{ uri: logoUrl }} style={styles.restaurantLogo} />
            ) : (
              <View style={[styles.restaurantLogo, styles.restaurantLogoPlaceholder]}>
                <Ionicons name="restaurant" size={16} color={COLORS.primary} />
              </View>
            )}
            <View style={styles.restaurantMeta}>
              <Text style={styles.restaurantName} numberOfLines={1}>
                {item?.restaurant_name || 'Restaurant'}
              </Text>
              <Text style={styles.orderDate}>{formatDate(item?.created_at)}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: (statusInfo?.color || COLORS.gray) + '15' }]}>
            <Text style={[styles.statusText, { color: statusInfo?.color || COLORS.gray }]}>
              {statusInfo?.label || 'Pending'}
            </Text>
          </View>
        </View>

        {/* Card Price/Total info */}
        <View style={styles.cardBody}>
          <Text style={styles.orderNum}>Order {item?.display_order_id || `#${item?.id}`}</Text>
          <Text style={styles.orderAmount}>Rs. {parseFloat(item?.total || 0).toFixed(2)}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity activeOpacity={0.75}
            style={styles.detailBtn}
            onPress={() => navigation.navigate('Tracking', { orderId: item.display_order_id || item.id, trackingToken: item.tracking_token })}
          >
            <Ionicons name="information-circle-outline" size={18} color={COLORS.dark} />
            <Text style={styles.detailBtnText}>Details</Text>
          </TouchableOpacity>

          {item.status !== 'delivered' && (
            <TouchableOpacity activeOpacity={0.75}
              style={[styles.trackBtn]}
              onPress={() => navigation.navigate('Tracking', { orderId: item.display_order_id || item.id, trackingToken: item.tracking_token })}
            >
              <Ionicons name="bicycle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.trackBtnText}>Track</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity activeOpacity={0.75}
            style={[styles.reorderBtn, reorderingId === item.id && styles.reorderBtnDisabled]}
            onPress={() => handleReorder(item.id)}
            disabled={reorderingId === item.id}
          >
            {reorderingId === item.id ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="repeat-outline" size={18} color={COLORS.white} />
                <Text style={styles.reorderBtnText}>Re-order</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // If user session is currently restoring saved token from storage, render a clean loading spinner to avoid UI flickering
  if (userLoading || isGuestLoading) {
    return (
      <SafeAreaView style={[styles.emptyContainer, { backgroundColor: COLORS.light }]}>
        <View style={styles.emptyContent}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.emptySubtitle, { marginTop: SPACING.md }]}>Restoring order history...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If user is not authenticated or is a guest user, and has NO active guest order stored
  const isGuestSession = !isAuthenticated || !user || user.is_guest;
  if (isGuestSession && guestOrders.length === 0) {
    return (
      <SafeAreaView style={[styles.emptyContainer, { backgroundColor: COLORS.light }]}>
        <View style={[styles.emptyContent, { width: '100%', paddingHorizontal: SPACING.lg }]}>
          <View style={{
            width: 90, height: 90, borderRadius: 45,
            backgroundColor: 'rgba(255,87,34,0.08)',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: SPACING.md,
          }}>
            <Ionicons name="receipt-outline" size={48} color={COLORS.primary} />
          </View>
          <Text style={[styles.emptyTitle, { fontSize: 22, textAlign: 'center' }]}>Track Your Orders</Text>
          <Text style={[styles.emptySubtitle, { textAlign: 'center', marginBottom: SPACING.lg }]}>
            Sign in to access your full order history, or enter your Order ID to track an existing delivery!
          </Text>

          {/* Quick Guest Order Lookup Box */}
          <View style={{
            width: '100%',
            backgroundColor: COLORS.white,
            borderRadius: 14,
            padding: SPACING.md,
            marginBottom: SPACING.lg,
            borderWidth: 1,
            borderColor: COLORS.lightGray,
            ...SHADOWS.small,
          }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: COLORS.dark, marginBottom: 8 }}>
              🔍 Track Order by ID / Code
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: COLORS.light,
                  borderRadius: 10,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: COLORS.dark,
                  borderWidth: 1,
                  borderColor: COLORS.lightGray,
                }}
                placeholder="e.g. JK-JT-1014 or 42"
                placeholderTextColor={COLORS.gray}
                value={lookupInput}
                onChangeText={setLookupInput}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isLookingUp}
                onPress={handleManualLookup}
                style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: 10,
                  paddingHorizontal: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                {isLookingUp ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={{ color: COLORS.white, fontWeight: 'bold', fontSize: 14 }}>Track</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity activeOpacity={0.75}
            style={[styles.loginButton, { width: '100%', flexDirection: 'row', gap: 8, justifyContent: 'center' }]}
            onPress={() => navigation.navigate('Auth')}
          >
            <Ionicons name="log-in-outline" size={18} color={COLORS.white} />
            <Text style={styles.loginButtonText}>Sign In / Register</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.75}
            style={{ marginTop: SPACING.md }}
            onPress={() => navigation.navigate('Main', { screen: 'Home' })}
          >
            <Text style={{ color: COLORS.gray, fontSize: 13 }}>Continue Browsing as Guest</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={FONTS.title}>My Orders</Text>
      </View>

      {/* Filter Tabs (APP-14) */}
      <View style={styles.filterTabs}>
        {(['all', 'active', 'delivered'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, orderFilter === tab && styles.filterTabActive]}
            onPress={() => setOrderFilter(tab)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterTabText, orderFilter === tab && styles.filterTabTextActive]}>
              {tab === 'all' ? 'All Orders' : tab === 'active' ? 'Active' : 'Delivered'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Main orders list */}
      {loading && filteredOrders.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContentContainer}>
              <Ionicons name="receipt-outline" size={96} color={COLORS.gray} style={{ opacity: 0.8 }} />
              <Text style={styles.emptyTitle}>
                {orderFilter === 'all'
                  ? 'No Orders Yet'
                  : orderFilter === 'active'
                  ? 'No Active Orders'
                  : 'No Delivered Orders'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {orderFilter === 'all'
                  ? "You haven't ordered anything yet. Explore our top restaurants and place your first order!"
                  : `You don't have any ${orderFilter} orders at the moment.`}
              </Text>
              <TouchableOpacity activeOpacity={0.75}
                style={styles.browseButton}
                onPress={() => navigation.navigate('Main', { screen: 'Home' })}
              >
                <Text style={styles.browseButtonText}>Browse Restaurants</Text>
              </TouchableOpacity>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} colors={[COLORS.primary]} />
          }
        />
      )}
      <CustomAlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        actions={alertConfig.actions}
        onClose={hideAlert}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    ...FONTS.body,
    color: COLORS.gray,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: COLORS.light,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    paddingTop: 100,
  },
  emptyContent: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...FONTS.title,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    color: COLORS.dark,
  },
  emptySubtitle: {
    ...FONTS.body,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 8,
    ...SHADOWS.small,
  },
  loginButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 30,
    ...SHADOWS.small,
  },
  browseButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  listContainer: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  orderCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    paddingBottom: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  restaurantLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.lightGray,
  },
  restaurantLogoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  restaurantMeta: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  restaurantName: {
    ...FONTS.subtitle,
    fontSize: 15,
  },
  orderDate: {
    ...FONTS.caption,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  orderNum: {
    ...FONTS.body,
    color: COLORS.gray,
  },
  orderAmount: {
    ...FONTS.subtitle,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    paddingVertical: SPACING.sm - 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
  },
  detailBtnText: {
    ...FONTS.caption,
    fontWeight: '600',
    color: COLORS.dark,
    marginLeft: 4,
  },
  trackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.sm - 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 87, 34, 0.04)',
  },
  trackBtnText: {
    ...FONTS.caption,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 4,
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm - 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
    minWidth: 85,
    justifyContent: 'center',
  },
  reorderBtnDisabled: {
    backgroundColor: COLORS.gray,
  },
  reorderBtnText: {
    ...FONTS.caption,
    fontWeight: 'bold',
    color: COLORS.white,
    marginLeft: 4,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    gap: SPACING.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.light,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
  },
  filterTabTextActive: {
    color: COLORS.white,
  },
});
