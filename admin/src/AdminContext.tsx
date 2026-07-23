import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Restaurant, Order, MenuCategory, OrderStatus } from './types';
import { MOCK_MENU_ITEMS, MOCK_RESTAURANTS, INITIAL_ORDERS } from './mockData';
import {
  loginAdmin,
  logoutAdmin,
  fetchRestaurants,
  fetchAllOrders,
  updateOrderStatus as apiUpdateOrderStatus,
  setTokens,
  clearTokens,
  getToken,
  getRefreshToken,
  decodeToken,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  fetchRestaurantMenu,
  createMenuCategory,
  deleteMenuCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  updateMenuItemOptions,
  getFullImageUrl,
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
  onboardNewRestaurant: (newRestaurant: Omit<Restaurant, 'id' | 'rating' | 'logo_url' | 'cover_url' | 'banner_url'>) => void;
  removeRestaurant: (id: number) => Promise<void>;
  refreshOrders: () => Promise<void>;
  addMenuCategory: (name: string) => Promise<void>;
  removeMenuCategory: (id: number) => Promise<void>;
  addMenuItem: (categoryId: number, data: any) => Promise<void>;
  removeMenuItem: (categoryId: number, itemId: number) => Promise<void>;
  updateItemOptions: (categoryId: number, itemId: number, options: any[]) => Promise<void>;
  editMenuItem: (categoryId: number, itemId: number, data: any) => Promise<void>;
  updateRestaurantBanner: (id: number, file: File) => Promise<void>;
  removeRestaurantBanner: (id: number) => Promise<void>;
  updateRestaurantDetails: (id: number, data: { phone?: string; address?: string; city?: string; is_active?: boolean }) => Promise<void>;
  updateUser: (fields: Partial<User>) => void;
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
    logo_url: getFullImageUrl(r.logo),
    cover_url: getFullImageUrl(r.cover_image),
    banner_url: getFullImageUrl(r.banner_image),
    opens_at: r.opens_at,
    closes_at: r.closes_at,
    phone: r.phone,
  };
}

/** Convert API order shape → internal Order shape */
function mapApiOrder(o: ApiOrder): Order {
  const restId = typeof o.restaurant === 'object' && o.restaurant ? Number((o.restaurant as any).id) : Number(o.restaurant);
  const restName = o.restaurant_name || (typeof o.restaurant === 'object' && o.restaurant ? (o.restaurant as any).name : `Restaurant #${o.restaurant}`);
  return {
    id: o.id,
    restaurant_id: restId,
    restaurant_name: restName,
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
    branch_name: o.branch_name ?? undefined,
    branch_id: o.branch_id ?? undefined,
    created_at: o.created_at,
    items: o.items || [],
  };
}

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const token = getToken();
    if (token) {
      const payload = decodeToken(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        return {
          id: payload.user_id,
          username: payload.username || 'Admin',
          email: '',
          role: payload.is_superuser ? 'super_admin' : 'branch_manager',
          restaurantId: payload.is_superuser ? undefined : payload.restaurant_id,
          branchId: payload.is_superuser ? undefined : payload.branch_id,
        };
      }
    }
    const mockUserJson = localStorage.getItem('foodsphere_admin_mock_user');
    if (mockUserJson) {
      try {
        return JSON.parse(mockUserJson);
      } catch {
        return null;
      }
    }
    return null;
  });

  const [activeView, setActiveView] = useState<string>(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== 'login') {
      return hash;
    }
    const savedView = localStorage.getItem('foodsphere_admin_view');
    if (savedView) return savedView;

    const token = getToken();
    if (token) {
      const payload = decodeToken(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        return payload.is_superuser ? 'super_dashboard' : 'branch_dashboard';
      }
    }
    const mockUserJson = localStorage.getItem('foodsphere_admin_mock_user');
    if (mockUserJson) {
      try {
        const u = JSON.parse(mockUserJson);
        return u.role === 'super_admin' ? 'super_dashboard' : 'branch_dashboard';
      } catch {}
    }
    return 'login';
  });

  const isLaunchBrandSlug = (slug: string) => {
    const clean = (slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return clean.includes('tandoori') || clean.includes('jush') || clean.includes('fomo');
  };

  const [restaurants, setRestaurantsState] = useState<Restaurant[]>(() => {
    const cached = localStorage.getItem('foodsphere_admin_restaurants_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return MOCK_RESTAURANTS.filter((r) => isLaunchBrandSlug(r.slug));
  });

  const setRestaurants = (action: React.SetStateAction<Restaurant[]>) => {
    setRestaurantsState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem('foodsphere_admin_restaurants_cache', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const [orders, setOrdersState] = useState<Order[]>(() => {
    const cached = localStorage.getItem('foodsphere_admin_orders_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    return [];
  });

  const setOrders = (action: React.SetStateAction<Order[]>) => {
    setOrdersState((prev) => {
      const next = typeof action === 'function' ? action(prev) : action;
      try {
        localStorage.setItem('foodsphere_admin_orders_cache', JSON.stringify(next.slice(0, 100)));
      } catch {}
      return next;
    });
  };

  const [menuItems, setMenuItems] = useState<Record<number, MenuCategory[]>>(MOCK_MENU_ITEMS);
  const [selectedBrandId, setSelectedBrandId] = useState<number>(() => {
    const savedBrandId = localStorage.getItem('foodsphere_admin_brand_id');
    return savedBrandId ? Number(savedBrandId) : 1;
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Restore session from localStorage on mount & listen to browser Back / Forward buttons
  useEffect(() => {
    const token = getToken();
    if (token) {
      const payload = decodeToken(token);
      if (!payload || payload.exp * 1000 <= Date.now()) {
        // Token expired
        logout();
      } else {
        loadAppData();
      }
    } else {
      const mockUserJson = localStorage.getItem('foodsphere_admin_mock_user');
      if (mockUserJson) {
        loadAppData();
      }
    }
  }, []);

  // Listen to browser native Back (←) and Forward (→) button events
  useEffect(() => {
    const handlePopState = (event?: PopStateEvent | HashChangeEvent | Event) => {
      const hashView = window.location.hash.replace('#', '');
      const stateView = (event as PopStateEvent)?.state?.view;
      const targetView = hashView || stateView || localStorage.getItem('foodsphere_admin_view');
      if (targetView && targetView !== activeView) {
        setActiveView(targetView);
        localStorage.setItem('foodsphere_admin_view', targetView);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [activeView]);

  // Keep location hash in sync with activeView
  useEffect(() => {
    if (activeView && activeView !== 'login') {
      if (window.location.hash !== `#${activeView}`) {
        window.history.replaceState({ view: activeView }, '', `#${activeView}`);
      }
    }
  }, [activeView]);

  const resolveUserRestaurantId = (
    userOrName: string | User | null | undefined,
    jwtRestId: number | undefined,
    availableRestaurants: Restaurant[]
  ): number => {
    if (jwtRestId && availableRestaurants.some((r) => r.id === Number(jwtRestId))) {
      return Number(jwtRestId);
    }
    const uname = typeof userOrName === 'string' ? userOrName.toLowerCase() : (userOrName?.username || '').toLowerCase();
    
    if (uname.includes('tandoori')) {
      const match = availableRestaurants.find((r) => r.slug.includes('tandoori') || r.name.toLowerCase().includes('tandoori'));
      if (match) return match.id;
    }
    if (uname.includes('jush')) {
      const match = availableRestaurants.find((r) => r.slug.includes('jush') || r.name.toLowerCase().includes('jush'));
      if (match) return match.id;
    }
    if (uname.includes('fomo')) {
      const match = availableRestaurants.find((r) => r.slug.includes('fomo') || r.name.toLowerCase().includes('fomo'));
      if (match) return match.id;
    }
    if (uname.includes('seenbanao')) {
      const match = availableRestaurants.find((r) => r.slug.includes('seenbanao') || r.name.toLowerCase().includes('seenbanao'));
      if (match) return match.id;
    }
    if (uname.includes('dineatblue')) {
      const match = availableRestaurants.find((r) => r.slug.includes('dineatblue') || r.name.toLowerCase().includes('dineatblue'));
      if (match) return match.id;
    }
    if (uname.includes('sandmelts')) {
      const match = availableRestaurants.find((r) => r.slug.includes('sandmelts') || r.name.toLowerCase().includes('sandmelts'));
      if (match) return match.id;
    }
    if (uname.includes('birdman')) {
      const match = availableRestaurants.find((r) => r.slug.includes('birdman') || r.name.toLowerCase().includes('birdman'));
      if (match) return match.id;
    }

    const saved = localStorage.getItem('foodsphere_admin_brand_id');
    if (saved && availableRestaurants.some((r) => r.id === Number(saved))) {
      return Number(saved);
    }
    return availableRestaurants[0]?.id || 1;
  };

  const loadAppData = async () => {
    if (orders.length === 0) setLoading(true);
    try {
      const [restaurantData, orderData] = await Promise.all([
        fetchRestaurants().catch(() => ({ results: [], count: 0 })),
        fetchAllOrders().catch(() => ({ results: [], count: 0 })),
      ]);
      const mapped = (restaurantData.results || [])
        .map(mapApiRestaurant)
        .filter((r) => isLaunchBrandSlug(r.slug));
      const finalRestaurants = mapped.length > 0 ? mapped : MOCK_RESTAURANTS.filter((r) => isLaunchBrandSlug(r.slug));
      setRestaurants(finalRestaurants);

      const apiOrders = (orderData.results || []).map(mapApiOrder);
      if (apiOrders.length > 0) {
        setOrders(apiOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      } else {
        const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
        setOrders(isMock ? INITIAL_ORDERS : []);
      }
      
      if (finalRestaurants.length > 0) {
        const token = getToken();
        const payload = token ? decodeToken(token) : null;
        const isSuper = payload?.is_superuser === true || user?.role === 'super_admin';
        const managerRestId = isSuper ? undefined : payload?.restaurant_id;

        if (!isSuper) {
          const activeBrandId = resolveUserRestaurantId(user || payload?.username, managerRestId, finalRestaurants);
          setSelectedBrandId(activeBrandId);
          localStorage.setItem('foodsphere_admin_brand_id', String(activeBrandId));
        } else {
          const savedBrandId = localStorage.getItem('foodsphere_admin_brand_id');
          const exists = savedBrandId && finalRestaurants.some((r) => r.id === Number(savedBrandId));
          setSelectedBrandId(exists ? Number(savedBrandId) : finalRestaurants[0].id);
        }
      }
    } catch (err) {
      console.warn('[AdminContext] Failed to load app data:', err);
      const launchMockRestaurants = MOCK_RESTAURANTS.filter((r) => isLaunchBrandSlug(r.slug));
      setRestaurants(launchMockRestaurants);
      setOrders(INITIAL_ORDERS);
    } finally {
      setLoading(false);
    }
  };

  // Load menu dynamically when brand switches
  useEffect(() => {
    const selectedRest = restaurants.find((r) => r.id === selectedBrandId);
    if (selectedRest) {
      const loadMenu = async () => {
        try {
          const res = await fetchRestaurantMenu(selectedRest.slug);
          if (res && res.success) {
            const mappedCategories = (res.data || []).map((category: MenuCategory) => ({
              ...category,
              items: (category.items || []).map((item: any) => ({
                ...item,
                image: getFullImageUrl(item.image_url || item.image),
              })),
            }));
            setMenuItems((prev) => ({
              ...prev,
              [selectedRest.id]: mappedCategories,
            }));
          }
        } catch (err) {
          console.warn('[loadMenu] Failed to load menu:', err);
        }
      };
      loadMenu();
    }
  }, [selectedBrandId, restaurants]);

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

  // Auto-polling for new orders every 5 seconds for real-time responsiveness
  useEffect(() => {
    if (activeView !== 'login') {
      const interval = setInterval(() => {
        refreshOrders();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [activeView]);

  // ─── Real JWT Login ────────────────────────────────────────────────────────
  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    let targetUsername = username.trim();

    // Map demo shortcut usernames to live Heroku manager accounts
    const SHORTCUT_MAP: Record<string, string> = {
      'jushhpk_mgr': 'manager_jushhpk_dha',
      'tandooristoppk_mgr': 'manager_tandooristoppk_johar_town',
      'getafomo_mgr': 'manager_getafomo_dha',
      'seenbanao_mgr': 'manager_seenbanao',
      'dineatblue_mgr': 'manager_dineatblue',
      'sandmelts_mgr': 'manager_sandmelts',
      'birdmanfoodspk_mgr': 'manager_birdmanfoodspk',
    };

    if (SHORTCUT_MAP[targetUsername]) {
      targetUsername = SHORTCUT_MAP[targetUsername];
    }

    try {
      // 1. Authenticate against Heroku REST API and get JWT tokens
      const response = await loginAdmin(targetUsername, password);
      setTokens(response.access, response.refresh);
      localStorage.removeItem('foodsphere_admin_mock_user');

      // 2. Decode JWT to determine role
      const payload = decodeToken(response.access);
      const isSuperAdmin = payload?.is_superuser === true || targetUsername === 'admin';

      // 3. Fetch live data from Heroku API
      const [restaurantData, orderData] = await Promise.all([
        fetchRestaurants().catch(() => ({ results: [], count: 0 })),
        fetchAllOrders().catch(() => ({ results: [], count: 0 })),
      ]);

      const mappedRestaurants = restaurantData.results.map(mapApiRestaurant);
      setRestaurants(mappedRestaurants);
      setOrders(
        orderData.results.map(mapApiOrder)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );

      const managerRestId = isSuperAdmin
        ? undefined
        : resolveUserRestaurantId(targetUsername, payload?.restaurant_id, mappedRestaurants);

      if (mappedRestaurants.length > 0) {
        const activeBrandId = isSuperAdmin
          ? (Number(localStorage.getItem('foodsphere_admin_brand_id')) || mappedRestaurants[0].id)
          : (managerRestId || mappedRestaurants[0].id);
        setSelectedBrandId(activeBrandId);
        localStorage.setItem('foodsphere_admin_brand_id', String(activeBrandId));
      }

      // 4. Set live user state
      const loggedInUser: User = {
        id: payload?.user_id || 0,
        username: targetUsername,
        email: '',
        role: isSuperAdmin ? 'super_admin' : 'branch_manager',
        restaurantId: managerRestId,
        branchId: isSuperAdmin ? undefined : payload?.branch_id,
      };
      setUser(loggedInUser);
      const defaultView = isSuperAdmin ? 'super_dashboard' : 'branch_dashboard';
      localStorage.setItem('foodsphere_admin_view', defaultView);
      setActiveView(defaultView);
      showToast(`Welcome back, ${targetUsername}! 🚀`, 'success');
      return true;

    } catch (err: any) {
      console.error('[Login Error]', err);

      const isAuthError = err.message && (
        err.message.includes('HTTP 401') || 
        err.message.includes('HTTP 403') || 
        err.message.includes('HTTP 400')
      );

      if (isAuthError) {
        showToast('Invalid username or password. Please check your credentials.', 'error');
        return false;
      }

      // Genuine network failure fallback
      showToast('Backend API unreachable — running offline demo mode', 'info');
      const isMockSuperUser = targetUsername === 'admin';

      const getMockRestaurantId = (uname: string): number => {
        const clean = uname.replace('manager_', '').replace('_mgr', '');
        const mapping: Record<string, number> = {
          'seenbanao': 1,
          'dineatblue': 2,
          'jushhpk': 3,
          'tandooristoppk': 4,
          'sandmelts': 5,
          'birdmanfoodspk': 6,
          'getafomo': 7
        };
        return mapping[clean] || 1;
      };

      const mockUser: User = {
        id: 1,
        username: targetUsername,
        email: `${targetUsername}@foodsphere.com`,
        role: isMockSuperUser ? 'super_admin' : 'branch_manager',
        restaurantId: isMockSuperUser ? undefined : getMockRestaurantId(targetUsername),
      };

      setRestaurants(MOCK_RESTAURANTS.filter((r) => isLaunchBrandSlug(r.slug)));
      setOrders(INITIAL_ORDERS);

      setUser(mockUser);
      const mockView = isMockSuperUser ? 'super_dashboard' : 'branch_dashboard';
      localStorage.setItem('foodsphere_admin_mock_user', JSON.stringify(mockUser));
      localStorage.setItem('foodsphere_admin_view', mockView);
      localStorage.setItem('foodsphere_admin_brand_id', String(mockUser.restaurantId || 1));
      setActiveView(mockView);
      return true;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    const refresh = getRefreshToken();
    const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
    if (refresh && !isMock) {
      logoutAdmin(refresh).catch((err) => {
        console.warn('[Logout API failed]', err);
      });
    }
    clearTokens();
    localStorage.removeItem('foodsphere_admin_view');
    localStorage.removeItem('foodsphere_admin_brand_id');
    localStorage.removeItem('foodsphere_admin_mock_user');
    localStorage.removeItem('foodsphere_admin_orders_cache');
    localStorage.removeItem('foodsphere_admin_restaurants_cache');
    setUser(null);
    setOrders([]);
    setRestaurants([]);
    setActiveView('login');
    showToast('Logged out successfully', 'info');
  };

  const setView = (view: string, updateHistory = true) => {
    setLoading(true);
    localStorage.setItem('foodsphere_admin_view', view);
    if (updateHistory && window.location.hash !== `#${view}`) {
      window.history.pushState({ view }, '', `#${view}`);
    }
    setTimeout(() => {
      setActiveView(view);
      setLoading(false);
    }, 150);
  };

  const setSelectedBrand = (id: number) => {
    setSelectedBrandId(id);
    localStorage.setItem('foodsphere_admin_brand_id', String(id));
    showToast(`Switched view to ${restaurants.find((r) => r.id === id)?.name}`, 'info');
  };

  const updateUser = (fields: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...fields };
      // Sync mock user locally if saved
      const mockUserJson = localStorage.getItem('foodsphere_admin_mock_user');
      if (mockUserJson) {
        localStorage.setItem('foodsphere_admin_mock_user', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Refresh orders from API
  const refreshOrders = async () => {
    try {
      const orderData = await fetchAllOrders();
      if (orderData && Array.isArray(orderData.results)) {
        const newOrders = orderData.results.map(mapApiOrder);

        // Look for newly added pending orders compared to our local state
        const currentPendingIds = new Set(orders.filter((o) => o.status === 'pending').map((o) => o.id));
        const newlyArrivedPending = newOrders.filter((o) => o.status === 'pending' && !currentPendingIds.has(o.id));

        if (newlyArrivedPending.length > 0) {
          // Play notification sound
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-84.wav');
            audio.play().catch(() => {});
          } catch {}
          showToast(`🔔 ${newlyArrivedPending.length} New Order(s) Received!`, 'info');
        }

        setOrders(
          newOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        );
      }
    } catch (err) {
      console.warn('[refreshOrders] Failed:', err);
    }
  };

  // Update order status — tries API first, falls back to local state
  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus) => {
    setOrders((prev) => {
      const updated = prev.map((order) => {
        if (order.id === orderId) {
          showToast(`Order #${orderId} → ${newStatus}`, 'success');
          return { ...order, status: newStatus };
        }
        return order;
      });
      return [...updated].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    // Sync to API
    try {
      await apiUpdateOrderStatus(orderId, newStatus);
    } catch (err) {
      console.warn('[updateOrderStatus] API sync failed, local state is updated:', err);
    }
  };

  // Toggle menu item availability
  const toggleMenuAvailability = async (restaurantId: number, categoryId: number, itemId: number) => {
    let nextState = false;
    setMenuItems((prev) => {
      const restaurantCategories = prev[restaurantId] || [];
      const updatedCategories = restaurantCategories.map((category) => {
        if (category.id === categoryId) {
          const updatedItems = category.items.map((item) => {
            if (item.id === itemId) {
              nextState = !item.is_available;
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

    const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
    if (isMock) {
      showToast(
        `Availability updated: ${nextState ? 'In Stock ✅' : 'Out of Stock ⚠️'} (Mock)`,
        nextState ? 'success' : 'info'
      );
      return;
    }

    try {
      await updateMenuItem(itemId, { is_available: nextState });
      showToast(
        `Availability updated: ${nextState ? 'In Stock ✅' : 'Out of Stock ⚠️'}`,
        nextState ? 'success' : 'info'
      );
    } catch (err: any) {
      console.warn('[toggleMenuAvailability] API sync failed:', err);
      showToast(err.message || 'Failed to update availability on server', 'error');
    }
  };

  // Onboard new brand
  const onboardNewRestaurant = async (newRestaurant: Omit<Restaurant, 'id' | 'rating' | 'logo_url' | 'cover_url' | 'banner_url'>) => {
    setLoading(true);
    const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
    if (isMock) {
      const newId = restaurants.length > 0 ? Math.max(...restaurants.map(r => r.id)) + 1 : 1;
      const mapped: Restaurant = {
        ...newRestaurant,
        id: newId,
        rating: 4.5,
        logo_url: undefined,
        cover_url: undefined,
        banner_url: undefined,
      };
      setRestaurants((prev) => [...prev, mapped]);
      setMenuItems((prev) => ({ ...prev, [newId]: [] }));
      showToast(`Restaurant "${newRestaurant.name}" onboarded (Mock)! 🚀`, 'success');
      setView('super_dashboard');
      setLoading(false);
      return;
    }
    try {
      const payload = {
        name: newRestaurant.name,
        slug: newRestaurant.slug,
        cuisine_type: newRestaurant.cuisine_type,
        city: newRestaurant.city,
        phone: newRestaurant.phone || '+92 300 1234567',
        opens_at: newRestaurant.opens_at + ':00',
        closes_at: newRestaurant.closes_at + ':00',
        delivery_fee: newRestaurant.delivery_fee,
        min_order_amount: newRestaurant.min_order_amount,
        address: newRestaurant.city + ', Pakistan',
      };
      const created = await createRestaurant(payload);
      const mapped = mapApiRestaurant(created);
      setRestaurants((prev) => [...prev, mapped]);
      showToast(`Restaurant "${newRestaurant.name}" onboarded! 🚀`, 'success');
      setView('super_dashboard');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to onboard restaurant', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Remove brand/restaurant
  const removeRestaurant = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this restaurant brand? All categories and menu items will be deleted permanently.')) {
      return;
    }
    setLoading(true);
    const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
    if (isMock) {
      setRestaurants((prev) => prev.filter((r) => r.id !== id));
      showToast('Restaurant brand removed successfully (Mock)', 'info');
      setLoading(false);
      return;
    }
    try {
      await deleteRestaurant(id);
      setRestaurants((prev) => prev.filter((r) => r.id !== id));
      showToast('Restaurant brand removed successfully', 'info');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to remove restaurant', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add menu category
  const addMenuCategory = async (name: string) => {
    setLoading(true);
    const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
    if (isMock) {
      const existing = menuItems[selectedBrandId] || [];
      const newId = existing.length > 0 ? Math.max(...existing.map(c => c.id)) + 1 : 1;
      const mockCat: MenuCategory = { id: newId, name, items: [] };
      setMenuItems((prev) => ({
        ...prev,
        [selectedBrandId]: [...existing, mockCat]
      }));
      showToast(`Category "${name}" created successfully (Mock)!`, 'success');
      setLoading(false);
      return;
    }
    try {
      const created = await createMenuCategory({
        restaurant: selectedBrandId,
        name,
        is_active: true,
        order: 0,
      });
      setMenuItems((prev) => {
        const existing = prev[selectedBrandId] || [];
        return {
          ...prev,
          [selectedBrandId]: [...existing, { ...created, items: [] }],
        };
      });
      showToast(`Category "${name}" created successfully!`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to create category', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Remove menu category
  const removeMenuCategory = async (id: number) => {
    setLoading(true);
    const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
    if (isMock) {
      const existing = menuItems[selectedBrandId] || [];
      setMenuItems((prev) => ({
        ...prev,
        [selectedBrandId]: existing.filter((c) => c.id !== id)
      }));
      showToast('Category deleted successfully (Mock)', 'info');
      setLoading(false);
      return;
    }
    try {
      await deleteMenuCategory(id);
      setMenuItems((prev) => {
        const existing = prev[selectedBrandId] || [];
        return {
          ...prev,
          [selectedBrandId]: existing.filter((c) => c.id !== id),
        };
      });
      showToast('Category deleted successfully', 'info');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to delete category', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add menu item with full configuration (specs, variants, prep time, etc.)
  const addMenuItem = async (categoryId: number, data: any) => {
    setLoading(true);
    const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
    if (isMock) {
      const mockItem = {
        id: Date.now(),
        name: data.name || (data instanceof FormData ? data.get('name') : 'New Item'),
        description: data.description || (data instanceof FormData ? data.get('description') : ''),
        price: Number(data.price || (data instanceof FormData ? data.get('price') : 0)),
        is_available: true,
        image: '',
        options: []
      };
      setMenuItems((prev) => {
        const existingCategories = prev[selectedBrandId] || [];
        const updated = existingCategories.map((category) => {
          if (category.id === categoryId) {
            return {
              ...category,
              items: [...category.items, mockItem],
            };
          }
          return category;
        });
        return {
          ...prev,
          [selectedBrandId]: updated,
        };
      });
      showToast(`Item added to menu (Mock)! ✅`, 'success');
      setLoading(false);
      return;
    }
    try {
      let payload = data;
      if (data instanceof FormData) {
        data.append('category', String(categoryId));
      } else {
        payload = {
          category: categoryId,
          ...data,
        };
      }
      const created = await createMenuItem(payload);
      const mappedCreated = {
        ...created,
        image: getFullImageUrl(created.image_url || created.image),
      };
      setMenuItems((prev) => {
        const existingCategories = prev[selectedBrandId] || [];
        const updated = existingCategories.map((category) => {
          if (category.id === categoryId) {
            return {
              ...category,
              items: [...category.items, mappedCreated],
            };
          }
          return category;
        });
        return {
          ...prev,
          [selectedBrandId]: updated,
        };
      });
      showToast(`Item "${data.name}" added to menu! ✅`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to add item', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Remove menu item
  const removeMenuItem = async (categoryId: number, itemId: number) => {
    setLoading(true);
    const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
    if (isMock) {
      setMenuItems((prev) => {
        const existingCategories = prev[selectedBrandId] || [];
        const updated = existingCategories.map((category) => {
          if (category.id === categoryId) {
            return {
              ...category,
              items: category.items.filter((item) => item.id !== itemId),
            };
          }
          return category;
        });
        return {
          ...prev,
          [selectedBrandId]: updated,
        };
      });
      showToast('Item deleted from menu (Mock)', 'info');
      setLoading(false);
      return;
    }
    try {
      await deleteMenuItem(itemId);
      setMenuItems((prev) => {
        const existingCategories = prev[selectedBrandId] || [];
        const updated = existingCategories.map((category) => {
          if (category.id === categoryId) {
            return {
              ...category,
              items: category.items.filter((item) => item.id !== itemId),
            };
          }
          return category;
        });
        return {
          ...prev,
          [selectedBrandId]: updated,
        };
      });
      showToast('Item deleted from menu', 'info');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to delete item', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Update item options/variants (sizes, spice levels, toppings…)
  const updateItemOptions = async (categoryId: number, itemId: number, options: any[]) => {
    const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
    if (isMock) {
      setMenuItems((prev) => {
        const existingCategories = prev[selectedBrandId] || [];
        const updated = existingCategories.map((category) => {
          if (category.id === categoryId) {
            return {
              ...category,
              items: category.items.map((item) =>
                item.id === itemId ? { ...item, options } : item
              ),
            };
          }
          return category;
        });
        return { ...prev, [selectedBrandId]: updated };
      });
      showToast('Item options saved (Mock)! ✅', 'success');
      return;
    }
    try {
      await updateMenuItemOptions(itemId, options);
      setMenuItems((prev) => {
        const existingCategories = prev[selectedBrandId] || [];
        const updated = existingCategories.map((category) => {
          if (category.id === categoryId) {
            return {
              ...category,
              items: category.items.map((item) =>
                item.id === itemId ? { ...item, options } : item
              ),
            };
          }
          return category;
        });
        return { ...prev, [selectedBrandId]: updated };
      });
      showToast('Item options saved! ✅', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to save options', 'error');
    }
  };

  // Edit/update menu item properties
  const editMenuItem = async (categoryId: number, itemId: number, data: any) => {
    setLoading(true);
    const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
    if (isMock) {
      setMenuItems((prev) => {
        const existingCategories = prev[selectedBrandId] || [];
        const updated = existingCategories.map((category) => {
          if (category.id === categoryId) {
            return {
              ...category,
              items: category.items.map((item) =>
                item.id === itemId ? {
                  ...item,
                  name: data.name !== undefined ? data.name : item.name,
                  description: data.description !== undefined ? data.description : item.description,
                  price: data.price !== undefined ? Number(data.price) : item.price,
                } : item
              ),
            };
          }
          return category;
        });
        return {
          ...prev,
          [selectedBrandId]: updated,
        };
      });
      showToast('Item updated successfully (Mock)! ✅', 'success');
      setLoading(false);
      return;
    }
    try {
      const updatedItem = await updateMenuItem(itemId, data);
      const mappedUpdated = {
        ...updatedItem,
        image: getFullImageUrl(updatedItem.image_url || updatedItem.image),
      };
      setMenuItems((prev) => {
        const existingCategories = prev[selectedBrandId] || [];
        const updated = existingCategories.map((category) => {
          if (category.id === categoryId) {
            return {
              ...category,
              items: category.items.map((item) =>
                item.id === itemId ? mappedUpdated : item
              ),
            };
          }
          return category;
        });
        return {
          ...prev,
          [selectedBrandId]: updated,
        };
      });
      showToast('Item updated successfully! ✅', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update item', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateRestaurantBanner = async (id: number, file: File) => {
    setLoading(true);
    const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
    if (isMock) {
      const mockUrl = URL.createObjectURL(file);
      setRestaurants((prev) =>
        prev.map((r) => (r.id === id ? { ...r, banner_url: mockUrl } : r))
      );
      showToast('Banner updated (Mock)! 🖼️', 'success');
      setLoading(false);
      return;
    }
    try {
      const formData = new FormData();
      formData.append('banner_image', file);
      
      const updated = await updateRestaurant(id, formData);
      const mapped = mapApiRestaurant(updated);
      
      // Update local state so it immediately reflects
      setRestaurants((prev) =>
        prev.map((r) => (r.id === id ? mapped : r))
      );
      showToast('Banner image updated successfully! 🖼️', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update banner image', 'error');
    } finally {
      setLoading(false);
    }
  };

  const removeRestaurantBanner = async (id: number) => {
    setLoading(true);
    const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
    if (isMock) {
      setRestaurants((prev) =>
        prev.map((r) => (r.id === id ? { ...r, banner_url: undefined } : r))
      );
      showToast('Banner removed (Mock)! 🗑️', 'success');
      setLoading(false);
      return;
    }
    try {
      const updated = await updateRestaurant(id, { banner_image: null });
      const mapped = mapApiRestaurant(updated);
      
      setRestaurants((prev) =>
        prev.map((r) => (r.id === id ? mapped : r))
      );
      showToast('Banner image removed! 🗑️', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to remove banner image', 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateRestaurantDetails = async (id: number, data: { phone?: string; address?: string; city?: string; is_active?: boolean }) => {
    setLoading(true);
    const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
    if (isMock) {
      setRestaurants((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...data } : r))
      );
      showToast('Restaurant details updated (Mock)! ⚙️', 'success');
      setLoading(false);
      return;
    }
    try {
      const updated = await updateRestaurant(id, data);
      const mapped = mapApiRestaurant(updated);
      setRestaurants((prev) =>
        prev.map((r) => (r.id === id ? mapped : r))
      );
      showToast('Branch settings updated successfully! ⚙️', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to update branch settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Polling for live orders (every 30 seconds)
  useEffect(() => {
    const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
    if (isMock || !user) return;

    const interval = setInterval(() => {
      refreshOrders();
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

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
        removeRestaurant,
        refreshOrders,
        addMenuCategory,
        removeMenuCategory,
        addMenuItem,
        removeMenuItem,
        updateItemOptions,
        editMenuItem,
        updateRestaurantBanner,
        removeRestaurantBanner,
        updateRestaurantDetails,
        updateUser,
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
