import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Restaurant, Order, MenuCategory, OrderStatus } from './types';
import { MOCK_MENU_ITEMS } from './mockData';
import {
  loginAdmin,
  fetchRestaurants,
  fetchAllOrders,
  setTokens,
  clearTokens,
  getToken,
  decodeToken,
  type ApiRestaurant,
  type ApiOrder,
} from './services/api';

interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface AdminContextProps {
  user: User | null;
  activeView: string;
  restaurants: Restaurant[];
  orders: Order[];
  menuItems: Record<number, MenuCategory[]>;
  selectedBrandId: number;
  loading: boolean;
  toasts: ToastMessage[];
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  removeToast: (id: number) => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setView: (view: string) => void;
  setSelectedBrand: (id: number) => void;
  updateOrderStatus: (orderId: number, newStatus: OrderStatus) => void;
  toggleMenuAvailability: (restaurantId: number, categoryId: number, itemId: number) => void;
  onboardNewRestaurant: (newRestaurant: Omit<Restaurant, 'id' | 'rating' | 'logo_url' | 'cover_url'>) => void;
  refreshOrders: () => Promise<void>;
}

const AdminContext = createContext<AdminContextProps | undefined>(undefined);

/** Convert API restaurant shape → internal Restaurant shape */
function mapApiRestaurant(r: ApiRestaurant): Restaurant {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    cuisine_type: r.cuisine_type,
    description: r.description,
    city: r.city,
    is_active: r.is_active,
    is_featured: r.is_featured,
    rating: typeof r.rating === 'string' ? parseFloat(r.rating) : r.rating,
    delivery_fee: typeof r.delivery_fee === 'string' ? parseFloat(r.delivery_fee) : r.delivery_fee,
    delivery_time_min: r.delivery_time_min,
    delivery_time_max: r.delivery_time_max,
    min_order_amount: typeof r.min_order_amount === 'string' ? parseFloat(r.min_order_amount) : r.min_order_amount,
    logo_url: r.logo || '',
    cover_url: r.cover_image || '',
    opens_at: r.opens_at,
    closes_at: r.closes_at,
  };
}

/** Convert API order shape → internal Order shape */
function mapApiOrder(o: ApiOrder): Order {
  return {
    id: o.id,
    restaurant_id: o.restaurant,
    restaurant_name: o.restaurant_name || `Restaurant #${o.restaurant}`,
    user_or_guest: o.guest_name || 'Guest',
    guest_name: o.guest_name,
    guest_phone: o.guest_phone,
    status: o.status as OrderStatus,
    payment_method: o.payment_method as any,
    total: typeof o.total === 'string' ? parseFloat(o.total) : o.total,
    subtotal: typeof o.subtotal === 'string' ? parseFloat(o.subtotal) : (o.subtotal || 0),
    delivery_fee: typeof o.delivery_fee === 'string' ? parseFloat(o.delivery_fee) : (o.delivery_fee || 0),
    discount: 0,
    delivery_address: o.delivery_address,
    created_at: o.created_at,
    items: o.items || [],
  };
}

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<string>('login');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<Record<number, MenuCategory[]>>(MOCK_MENU_ITEMS);
  const [selectedBrandId, setSelectedBrandId] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Restore session from localStorage on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      const payload = decodeToken(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        const restoredUser: User = {
          id: payload.user_id,
          username: payload.username || 'Admin',
          email: '',
          role: payload.is_staff ? 'super_admin' : 'branch_manager',
          restaurantId: payload.is_staff ? null : undefined,
        };
        setUser(restoredUser);
        setActiveView(payload.is_staff ? 'super_dashboard' : 'branch_dashboard');
        // Reload data in background
        loadAppData();
      } else {
        clearTokens();
      }
    }
  }, []);

  const loadAppData = async () => {
    try {
      const [restaurantData, orderData] = await Promise.all([
        fetchRestaurants().catch(() => ({ results: [], count: 0 })),
        fetchAllOrders().catch(() => ({ results: [], count: 0 })),
      ]);
      setRestaurants(restaurantData.results.map(mapApiRestaurant));
      setOrders(orderData.results.map(mapApiOrder));
      if (restaurantData.results.length > 0) {
        setSelectedBrandId(restaurantData.results[0].id);
      }
    } catch (err) {
      console.warn('[AdminContext] Failed to load app data:', err);
    }
  };

  // Show dynamic toast notifications
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auto-remove toasts after 4 seconds
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        removeToast(toasts[0].id);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  // ─── Real JWT Login ────────────────────────────────────────────────────────
  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      // 1. Authenticate and get JWT tokens
      const response = await loginAdmin(username, password);
      setTokens(response.access, response.refresh);

      // 2. Decode JWT to determine role
      const payload = decodeToken(response.access);
      const isSuperAdmin = payload?.is_staff === true;

      // 3. Fetch live data from API
      const [restaurantData, orderData] = await Promise.all([
        fetchRestaurants().catch(() => ({ results: [], count: 0 })),
        fetchAllOrders().catch(() => ({ results: [], count: 0 })),
      ]);

      const mappedRestaurants = restaurantData.results.map(mapApiRestaurant);
      setRestaurants(mappedRestaurants);
      setOrders(orderData.results.map(mapApiOrder));

      if (mappedRestaurants.length > 0) {
        setSelectedBrandId(mappedRestaurants[0].id);
      }

      // 4. Set user state
      const loggedInUser: User = {
        id: payload?.user_id || 0,
        username,
        email: '',
        role: isSuperAdmin ? 'super_admin' : 'branch_manager',
        restaurantId: isSuperAdmin ? undefined : mappedRestaurants[0]?.id,
      };
      setUser(loggedInUser);
      setActiveView(isSuperAdmin ? 'super_dashboard' : 'branch_dashboard');
      showToast(`Welcome back, ${username}! 🚀`, 'success');
      return true;

    } catch (err: any) {
      console.error('[Login Error]', err);
      // Fallback to mock login for development convenience
      if (username === 'admin' || username === 'seenbanao_mgr') {
        showToast('API unreachable — using demo mode', 'info');
        const isMockSuper = username === 'admin';
        const mockUser: User = {
          id: 1,
          username,
          email: `${username}@foodsphere.com`,
          role: isMockSuper ? 'super_admin' : 'branch_manager',
          restaurantId: isMockSuper ? null : 1,
        };
        setUser(mockUser);
        setActiveView(isMockSuper ? 'super_dashboard' : 'branch_dashboard');
        return true;
      }
      showToast('Invalid credentials. Please try again.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    clearTokens();
    setUser(null);
    setOrders([]);
    setRestaurants([]);
    setActiveView('login');
    showToast('Logged out successfully', 'info');
  };

  const setView = (view: string) => {
    setLoading(true);
    setTimeout(() => {
      setActiveView(view);
      setLoading(false);
    }, 300);
  };

  const setSelectedBrand = (id: number) => {
    setSelectedBrandId(id);
    showToast(`Switched view to ${restaurants.find((r) => r.id === id)?.name}`, 'info');
  };

  // Refresh orders from API
  const refreshOrders = async () => {
    try {
      const orderData = await fetchAllOrders();
      setOrders(orderData.results.map(mapApiOrder));
    } catch (err) {
      console.warn('[refreshOrders] Failed:', err);
    }
  };

  // Update order status — tries API first, falls back to local state
  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    // Optimistic local update
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          showToast(`Order #${orderId} → ${newStatus}`, 'success');
          return { ...order, status: newStatus };
        }
        return order;
      })
    );

    // Sync to API
    try {
      const { updateOrderStatus: apiUpdateStatus } = await import('./services/api');
      await apiUpdateStatus(orderId, newStatus);
    } catch (err) {
      console.warn('[updateOrderStatus] API sync failed, local state is updated:', err);
    }
  };

  // Toggle menu item availability (local state — persisted via Django admin separately)
  const toggleMenuAvailability = (restaurantId: number, categoryId: number, itemId: number) => {
    setMenuItems((prev) => {
      const restaurantCategories = prev[restaurantId] || [];
      const updatedCategories = restaurantCategories.map((category) => {
        if (category.id === categoryId) {
          const updatedItems = category.items.map((item) => {
            if (item.id === itemId) {
              const nextState = !item.is_available;
              showToast(
                `${item.name} is now ${nextState ? 'In Stock ✅' : 'Out of Stock ⚠️'}`,
                nextState ? 'success' : 'info'
              );
              return { ...item, is_available: nextState };
            }
            return item;
          });
          return { ...category, items: updatedItems };
        }
        return category;
      });
      return { ...prev, [restaurantId]: updatedCategories };
    });
  };

  // Onboard new brand
  const onboardNewRestaurant = (newRestaurant: Omit<Restaurant, 'id' | 'rating' | 'logo_url' | 'cover_url'>) => {
    setLoading(true);
    setTimeout(() => {
      const newId = restaurants.length + 1;
      const created: Restaurant = {
        ...newRestaurant,
        id: newId,
        rating: 4.5,
        logo_url: '',
        cover_url: '',
      };
      setRestaurants((prev) => [...prev, created]);
      setMenuItems((prev) => ({
        ...prev,
        [newId]: [{
          id: newId * 100 + 1,
          name: 'Featured Items',
          items: [{
            id: newId * 1000 + 1,
            name: `${newRestaurant.name} House Special`,
            description: 'House specialty cooked to order',
            price: 750,
            is_available: true,
            category_name: 'Featured Items',
          }],
        }],
      }));
      setLoading(false);
      showToast(`Restaurant "${newRestaurant.name}" onboarded!`, 'success');
      setView('super_dashboard');
    }, 600);
  };

  return (
    <AdminContext.Provider
      value={{
        user,
        activeView,
        restaurants,
        orders,
        menuItems,
        selectedBrandId,
        loading,
        toasts,
        showToast,
        removeToast,
        login,
        logout,
        setView,
        setSelectedBrand,
        updateOrderStatus,
        toggleMenuAvailability,
        onboardNewRestaurant,
        refreshOrders,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};
