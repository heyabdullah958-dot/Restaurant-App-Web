import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootState, AppDispatch } from '../store';
import { fetchMyOrders, fetchOrderDetails } from '../store/orderSlice';
import { addItemToCart } from '../store/cartSlice';
import { COLORS, SPACING, SHADOWS, FONTS } from '../theme';
import CustomAlertModal from '../components/CustomAlertModal';

export default function OrdersScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<any>();

  // Fetch state from store
  const { myOrders, loading } = useSelector((state: RootState) => state.order);
  const { isAuthenticated } = useSelector((state: RootState) => state.user);

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

  // APP-14: Selected filter and computed list
  const [orderFilter, setOrderFilter] = React.useState<'all' | 'active' | 'delivered'>('all');
  const filteredOrders = React.useMemo(() => {
    const ordersArray = Array.isArray(myOrders) ? myOrders : (myOrders && Array.isArray((myOrders as any).results) ? (myOrders as any).results : []);
    if (orderFilter === 'active') {
      return ordersArray.filter((o: any) => o && o.status !== 'delivered');
    }
    if (orderFilter === 'delivered') {
      return ordersArray.filter((o: any) => o && o.status === 'delivered');
    }
    return ordersArray.filter((o: any) => o !== null && o !== undefined);
  }, [myOrders, orderFilter]);

  // Fetch orders on mount (if authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMyOrders());
    }
  }, [dispatch, isAuthenticated]);

  const handleRefresh = () => {
    if (isAuthenticated) {
      dispatch(fetchMyOrders());
    }
  };

  // Status mapping to colors and human-readable names
  const getStatusDetails = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'received':
        return { label: 'Received', color: COLORS.warning };
      case 'preparing':
        return { label: 'Preparing', color: COLORS.secondary };
      case 'out_for_delivery':
      case 'out for delivery':
        return { label: 'Out for Delivery', color: COLORS.accent };
      case 'delivered':
        return { label: 'Delivered', color: COLORS.success };
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
    const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';
    const domain = apiBaseUrl.replace('/api', '');
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
          <Text style={styles.orderNum}>Order #{item?.id}</Text>
          <Text style={styles.orderAmount}>Rs. {parseFloat(item?.total || 0).toFixed(2)}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity activeOpacity={0.75}
            style={styles.detailBtn}
            onPress={() => navigation.navigate('Tracking', { orderId: item.id })}
          >
            <Ionicons name="information-circle-outline" size={18} color={COLORS.dark} />
            <Text style={styles.detailBtnText}>Details</Text>
          </TouchableOpacity>

          {item.status !== 'delivered' && (
            <TouchableOpacity activeOpacity={0.75}
              style={[styles.trackBtn]}
              onPress={() => navigation.navigate('Tracking', { orderId: item.id })}
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

  // If user is not authenticated, prompt to login (APP-15)
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.emptyContainer, { backgroundColor: COLORS.light }]}>
        <View style={styles.emptyContent}>
          <View style={{
            width: 100, height: 100, borderRadius: 50,
            backgroundColor: 'rgba(255,87,34,0.08)',
            alignItems: 'center', justifyContent: 'center',
            marginBottom: SPACING.lg,
          }}>
            <Ionicons name="receipt-outline" size={52} color={COLORS.primary} />
          </View>
          <Text style={[styles.emptyTitle, { fontSize: 20 }]}>Track Your Orders</Text>
          <Text style={styles.emptySubtitle}>
            Sign in to see your order history, track active deliveries, and earn loyalty points on every order!
          </Text>
          <TouchableOpacity activeOpacity={0.75}
            style={[styles.loginButton, { flexDirection: 'row', gap: 8 }]}
            onPress={() => navigation.navigate('Auth')}
          >
            <Ionicons name="log-in-outline" size={18} color={COLORS.white} />
            <Text style={styles.loginButtonText}>Sign In / Register</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.75}
            style={{ marginTop: SPACING.md }}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={{ color: COLORS.gray, fontSize: 13 }}>Continue as Guest</Text>
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
                onPress={() => navigation.navigate('Home')}
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
    paddingBottom: SPACING.xl,
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
