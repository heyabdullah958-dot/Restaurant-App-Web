import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { User, Restaurant, Order, MenuCategory, OrderStatus } from './types';
import { MOCK_MENU_ITEMS, MOCK_RESTAURANTS } from './mockData';
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
  updateBranch,
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
  updateOrderStatus: (orderId: number, newStatus: OrderStatus, cancellationReason?: string) => void;
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
  updateRestaurantDetails: (id: number, data: { phone?: string; address?: string; city?: string; is_active?: boolean; is_force_closed?: boolean }) => Promise<void>;
  updateBranchDetails: (branchId: number, data: { phone?: string; address?: string; is_active?: boolean }) => Promise<void>;
  updateUser: (fields: Partial<User>) => void;

}

const AdminContext = createContext<AdminContextProps | undefined>(undefined);

export function computeStoreOpenStatus(restaurant: Restaurant): boolean {
  if (restaurant.is_force_closed) {
    return false;
  }
  if (restaurant.branches && restaurant.branches.length > 0) {
    return restaurant.branches.some(b => b.is_active !== false);
  }
  return restaurant.is_active !== false;
}

/** Convert API restaurant shape → internal Restaurant shape */
function mapApiRestaurant(r: ApiRestaurant): Restaurant {
  const isForceClosed = r.is_force_closed ?? false;
  const branches = r.branches || [];
  const computedIsOpen = r.is_open !== undefined
    ? r.is_open
    : (!isForceClosed && r.is_active && (branches.length > 0 ? branches.some(b => b.is_active) : true));

  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    cuisine_type: r.cuisine_type,
    description: r.description,
    city: r.city,
    is_active: r.is_active,
    is_force_closed: isForceClosed,
    is_open: computedIsOpen,
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
    address: r.address || r.city,
    branches: branches,
  };
}

/** Convert API order shape → internal Order shape */
function mapApiOrder(o: ApiOrder): Order {
  const restId = typeof o.restaurant === 'object' && o.restaurant ? Number((o.restaurant as any).id) : Number(o.restaurant);
  const restName = o.restaurant_name || (typeof o.restaurant === 'object' && o.restaurant ? (o.restaurant as any).name : `Restaurant #${o.restaurant}`);
  const riderObj = o.rider || null;
  const riderId = o.rider_id || (riderObj ? riderObj.id : null);

  const parseCoord = (val: any) => {
    if (val === null || val === undefined || val === '') return null;
    const num = typeof val === 'string' ? parseFloat(val) : Number(val);
    return isNaN(num) ? null : num;
  };

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
    delivery_lat: parseCoord(o.delivery_lat),
    delivery_lng: parseCoord(o.delivery_lng),
    branch_name: o.branch_name ?? undefined,
    branch_id: o.branch_id ?? undefined,
    rider: riderObj,
    rider_id: riderId,
    created_at: o.created_at,
    items: o.items || [],
  };
}

/** Helper to accurately identify Super Admin accounts (ignores is_superuser claim for manager_ accounts) */
export const isSuperAdminUser = (username?: string | null, isSuperuserPayload?: boolean): boolean => {
  const uname = (username || '').toLowerCase().trim();
  if (!uname || uname.startsWith('manager_')) return false;
  return isSuperuserPayload === true || uname === 'admin';
};

/**
 * Ensures all 7 restaurant brands remain present in state even if the public API
 * excludes inactive ones. Priority order for each field:
 *   1. Fresh API data (highest confidence)
 *   2. Last known local state (preserves manager toggles not yet reflected by API)
 *   3. Static mock fallback (lowest — only used on very first load)
 */
function mergeAllRestaurants(apiMapped: Restaurant[], currentState: Restaurant[] = []): Restaurant[] {
  // Seed from static mock so every brand has a baseline record
  const baseMap = new Map<number, Restaurant>();
  MOCK_RESTAURANTS.forEach((r) => baseMap.set(r.id, r));

  // Layer live local state on top (preserves manager-toggled is_active)
  currentState.forEach((r) => {
    const existing = baseMap.get(r.id);
    if (existing) {
      baseMap.set(r.id, { ...existing, ...r });
    } else {
      baseMap.set(r.id, r);
    }
  });

  // Finally overlay fresh API data (always wins for branches / address / name / store status)
  apiMapped.forEach((r) => {
    const existing = baseMap.get(r.id);
    if (existing) {
      const mergedBranches = (r.branches && r.branches.length > 0) ? r.branches : existing.branches;
      const nextR: Restaurant = {
        ...existing,
        ...r,
        branches: mergedBranches,
        address: r.address || existing.address || r.city || existing.city,
      };
      nextR.is_open = computeStoreOpenStatus(nextR);
      baseMap.set(r.id, nextR);
    } else {
      baseMap.set(r.id, r);
    }
  });

  return Array.from(baseMap.values());
}

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    // Clear any legacy mock user flag from localStorage
    localStorage.removeItem('foodsphere_admin_mock_user');

    const token = getToken();
    if (token) {
      const payload = decodeToken(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        const isSuperByUsername = isSuperAdminUser(payload.username, payload.is_superuser);
        return {
          id: payload.user_id,
          username: payload.username || 'Admin',
          email: '',
          role: isSuperByUsername ? 'super_admin' : 'branch_manager',
          restaurantId: isSuperByUsername ? undefined : payload.restaurant_id,
          branchId: isSuperByUsername ? undefined : payload.branch_id,
        };
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
        const isSuper = isSuperAdminUser(payload.username, payload.is_superuser);
        return isSuper ? 'super_dashboard' : 'branch_dashboard';
      }
    }
    return 'login';
  });

  // Always start fresh — never read stale restaurant cache on init.
  // loadAppData() fires immediately on mount and populates from the live API.
  // (Stale cache previously caused 7→3 restaurant mismatch after refresh.)
  const [restaurants, setRestaurantsState] = useState<Restaurant[]>(MOCK_RESTAURANTS);

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

/** Safe helper to extract an array from API responses whether plain array [...] or paginated { results: [...] } */
function extractArray<T = any>(data: any): T[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.results)) return data.results;
  return [];
}

  // Restore session from localStorage on mount & listen to browser Back / Forward buttons
  useEffect(() => {
    localStorage.removeItem('foodsphere_admin_mock_user');
    const token = getToken();
    if (token) {
      const payload = decodeToken(token);
      if (!payload || payload.exp * 1000 <= Date.now()) {
        logout();
      } else {
        const isSuperAdmin = isSuperAdminUser(payload.username, payload.is_superuser);
        const loggedInUser: User = {
          id: payload.user_id || 0,
          username: payload.username || 'admin',
          email: '',
          role: isSuperAdmin ? 'super_admin' : 'branch_manager',
          restaurantId: isSuperAdmin ? undefined : payload.restaurant_id,
          branchId: isSuperAdmin ? undefined : payload.branch_id,
        };
        setUser(loggedInUser);
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

  const resolveUserBranchId = (
    userOrName: string | User | null | undefined,
    jwtBranchId: number | undefined,
    rest: Restaurant | undefined
  ): number | undefined => {
    if (jwtBranchId && rest?.branches?.some((b) => Number(b.id) === Number(jwtBranchId))) {
      return Number(jwtBranchId);
    }
    if (!rest || !rest.branches || rest.branches.length === 0) return undefined;

    const uname = typeof userOrName === 'string' ? userOrName.toLowerCase() : (userOrName?.username || '').toLowerCase();
    
    if (uname.includes('dha')) {
      const b = rest.branches.find((br) => br.name.toLowerCase().includes('dha'));
      if (b) return b.id;
    }
    if (uname.includes('johar')) {
      const b = rest.branches.find((br) => br.name.toLowerCase().includes('johar'));
      if (b) return b.id;
    }
    if (uname.includes('lake')) {
      const b = rest.branches.find((br) => br.name.toLowerCase().includes('lake'));
      if (b) return b.id;
    }
    if (uname.includes('baghbanpura') || uname.includes('gt_road')) {
      const b = rest.branches.find((br) => br.name.toLowerCase().includes('baghbanpura') || br.name.toLowerCase().includes('gt road'));
      if (b) return b.id;
    }
    if (uname.includes('gulberg')) {
      const b = rest.branches.find((br) => br.name.toLowerCase().includes('gulberg'));
      if (b) return b.id;
    }

    return rest.branches[0]?.id;
  };

  const loadAppData = async (showLoadingSpinner = true) => {
    if (showLoadingSpinner && orders.length === 0) setLoading(true);
    try {
      const [restaurantData, orderData] = await Promise.all([
        fetchRestaurants().catch(() => []),
        fetchAllOrders().catch(() => ({ results: [], count: 0 })),
      ]);
      const rawRests = extractArray<ApiRestaurant>(restaurantData);
      const rawOrders = extractArray<ApiOrder>(orderData);

      const mapped = rawRests.map(mapApiRestaurant);
      let finalRestaurants: Restaurant[] = [];
      setRestaurants((prev) => {
        finalRestaurants = mergeAllRestaurants(mapped, prev);
        return finalRestaurants;
      });

      const apiOrders = rawOrders.map(mapApiOrder);
      if (apiOrders.length > 0) {
        setOrders(apiOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      }
      
      if (finalRestaurants.length > 0) {
        const token = getToken();
        const payload = token ? decodeToken(token) : null;
        const isSuper = isSuperAdminUser(user?.username || payload?.username, payload?.is_superuser);
        const managerRestId = isSuper ? undefined : payload?.restaurant_id;

        if (!isSuper) {
          const activeBrandId = resolveUserRestaurantId(user || payload?.username, managerRestId, finalRestaurants);
          setSelectedBrandId(activeBrandId);
          localStorage.setItem('foodsphere_admin_brand_id', String(activeBrandId));

          // Ensure user.branchId is set when app data finishes loading
          const currentRest = finalRestaurants.find((r) => r.id === activeBrandId);
          const resolvedBranchId = resolveUserBranchId(user || payload?.username, payload?.branch_id, currentRest);
          if (resolvedBranchId) {
            setUser((prev) => prev ? { ...prev, branchId: resolvedBranchId, restaurantId: activeBrandId } : prev);
          }
        } else {
          const savedBrandId = localStorage.getItem('foodsphere_admin_brand_id');
          const exists = savedBrandId && finalRestaurants.some((r) => r.id === Number(savedBrandId));
          setSelectedBrandId(exists ? Number(savedBrandId) : finalRestaurants[0].id);
        }
      }
    } catch (err) {
      console.warn('[AdminContext] Failed to load app data from server:', err);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  };

  // Load menu dynamically when brand switches.
  // IMPORTANT: Only depend on selectedBrandId (NOT restaurants) to avoid an infinite
  // loop where setRestaurants → new restaurants ref → this effect fires → loadMenu →
  // (potentially) setMenuItems → re-render → repeat.
  const restaurantsRef = useRef(restaurants);
  useEffect(() => { restaurantsRef.current = restaurants; }, [restaurants]);

  useEffect(() => {
    const selectedRest = restaurantsRef.current.find((r) => r.id === selectedBrandId);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrandId]);

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

    // Map shortcut usernames to live Heroku manager accounts
    const SHORTCUT_MAP: Record<string, string> = {
      'jushhpk_mgr': 'manager_jushhpk_dha_phase_1',
      'tandooristoppk_mgr': 'manager_tandooristoppk_johar_town',
      'getafomo_mgr': 'manager_getafomo_gulberg_iii',
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
      const isSuperAdmin = isSuperAdminUser(targetUsername, payload?.is_superuser);

      // 3. Fetch live data from Heroku API
      const [restaurantData, orderData] = await Promise.all([
        fetchRestaurants().catch(() => []),
        fetchAllOrders().catch(() => ({ results: [], count: 0 })),
      ]);

      const rawRests = extractArray<ApiRestaurant>(restaurantData);
      const rawOrders = extractArray<ApiOrder>(orderData);

      const mappedRestaurants = rawRests.map(mapApiRestaurant);
      const finalRestaurants = mergeAllRestaurants(mappedRestaurants, restaurants);
      setRestaurants(finalRestaurants);
      setOrders(
        rawOrders.map(mapApiOrder)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );

      const managerRestId = isSuperAdmin
        ? undefined
        : resolveUserRestaurantId(targetUsername, payload?.restaurant_id, finalRestaurants);

      if (finalRestaurants.length > 0) {
        const activeBrandId = isSuperAdmin
          ? (Number(localStorage.getItem('foodsphere_admin_brand_id')) || finalRestaurants[0].id)
          : (managerRestId || finalRestaurants[0].id);
        setSelectedBrandId(activeBrandId);
        localStorage.setItem('foodsphere_admin_brand_id', String(activeBrandId));
      }

      const targetRest = finalRestaurants.find((r) => r.id === managerRestId);
      const targetBranchId = isSuperAdmin
        ? undefined
        : resolveUserBranchId(targetUsername, payload?.branch_id, targetRest);

      // 4. Set live user state
      const loggedInUser: User = {
        id: payload?.user_id || 0,
        username: targetUsername,
        email: '',
        role: isSuperAdmin ? 'super_admin' : 'branch_manager',
        restaurantId: managerRestId,
        branchId: targetBranchId,
      };
      setUser(loggedInUser);
      const defaultView = isSuperAdmin ? 'super_dashboard' : 'branch_dashboard';
      localStorage.setItem('foodsphere_admin_view', defaultView);
      setActiveView(defaultView);
      showToast(`Welcome back, ${targetUsername}! 🚀`, 'success');
      return true;

    } catch (err: any) {
      console.error('[Login Error]', err);
      showToast(err.message || 'Invalid username or password. Please check your credentials.', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    const refresh = getRefreshToken();
    if (refresh) {
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
    if (user && user.role !== 'super_admin') {
      return;
    }
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

        // Look for newly added pending/received orders compared to our local state
        const currentIncomingIds = new Set(
          orders
            .filter((o: Order) => o.status === 'pending' || o.status === 'received')
            .map((o: Order) => o.id)
        );
        const newlyArrived = newOrders.filter(
          (o: Order) => (o.status === 'pending' || o.status === 'received') && !currentIncomingIds.has(o.id)
        );

        if (newlyArrived.length > 0) {
          // Play Web Audio API synthesized chime
          try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioCtx) {
              const ctx = new AudioCtx();
              const now = ctx.currentTime;
              const osc1 = ctx.createOscillator();
              const gain1 = ctx.createGain();
              osc1.type = 'sine';
              osc1.frequency.setValueAtTime(880, now);
              gain1.gain.setValueAtTime(0.3, now);
              gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
              osc1.connect(gain1);
              gain1.connect(ctx.destination);
              osc1.start(now);
              osc1.stop(now + 0.4);

              const osc2 = ctx.createOscillator();
              const gain2 = ctx.createGain();
              osc2.type = 'sine';
              osc2.frequency.setValueAtTime(1760, now + 0.15);
              gain2.gain.setValueAtTime(0.4, now + 0.15);
              gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
              osc2.connect(gain2);
              gain2.connect(ctx.destination);
              osc2.start(now + 0.15);
              osc2.stop(now + 0.6);
            }
          } catch {}
          showToast(`🔔 ${newlyArrived.length} New Order(s) Received!`, 'info');
        }

        setOrders(
          newOrders.sort((a: Order, b: Order) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        );
      }
    } catch (err) {
      console.warn('[refreshOrders] Failed:', err);
    }
  };

  // Update order status — syncs to API with toast and background refresh
  const updateOrderStatus = async (orderId: number, newStatus: OrderStatus, cancellationReason?: string) => {
    // Optimistic UI update
    setOrders((prev) => {
      const updated = prev.map((order) => {
        if (order.id === orderId) {
          return { ...order, status: newStatus };
        }
        return order;
      });
      return [...updated].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    });

    // Sync to API
    try {
      await apiUpdateOrderStatus(orderId, newStatus, cancellationReason);
      showToast(`Order #${orderId} → ${newStatus.replace('_', ' ').toUpperCase()}`, 'success');
      refreshOrders();
    } catch (err: any) {
      console.warn('[updateOrderStatus] API sync failed:', err);
      showToast(`Failed to update Order #${orderId} on server: ${err.message || err}`, 'error');
      refreshOrders();
    }
  };

  // Toggle menu item availability
  const toggleMenuAvailability = async (restaurantId: number, categoryId: number, itemId: number) => {
    // 1. Find current item availability reliably before async dispatch
    const restaurantCategories = menuItems[restaurantId] || [];
    let currentItem: any = null;

    for (const cat of restaurantCategories) {
      const found = (cat.items || []).find((it: any) => it.id === itemId);
      if (found) {
        currentItem = found;
        break;
      }
    }

    const currentAvailability = currentItem ? Boolean(currentItem.is_available) : false;
    const nextState = !currentAvailability;

    // 2. Optimistic UI update
    setMenuItems((prev) => {
      const categories = prev[restaurantId] || [];
      const updatedCategories = categories.map((category) => {
        if (category.id === categoryId) {
          const updatedItems = category.items.map((item) => {
            if (item.id === itemId) {
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

    // 3. Persist to Heroku API
    try {
      const response = await updateMenuItem(itemId, { is_available: nextState });
      const serverAvailability = response?.is_available ?? response?.data?.is_available ?? nextState;

      // Sync state with verified server value
      setMenuItems((prev) => {
        const categories = prev[restaurantId] || [];
        const updatedCategories = categories.map((category) => {
          if (category.id === categoryId) {
            const updatedItems = category.items.map((item) => {
              if (item.id === itemId) {
                return { ...item, is_available: Boolean(serverAvailability) };
              }
              return item;
            });
            return { ...category, items: updatedItems };
          }
          return category;
        });
        return { ...prev, [restaurantId]: updatedCategories };
      });

      showToast(
        `Availability updated: ${serverAvailability ? 'In Stock ✅' : 'Out of Stock ⚠️'}`,
        serverAvailability ? 'success' : 'info'
      );
    } catch (err: any) {
      console.warn('[toggleMenuAvailability] API sync failed:', err);

      // 4. Rollback optimistic update on error
      setMenuItems((prev) => {
        const categories = prev[restaurantId] || [];
        const updatedCategories = categories.map((category) => {
          if (category.id === categoryId) {
            const updatedItems = category.items.map((item) => {
              if (item.id === itemId) {
                return { ...item, is_available: currentAvailability };
              }
              return item;
            });
            return { ...category, items: updatedItems };
          }
          return category;
        });
        return { ...prev, [restaurantId]: updatedCategories };
      });

      showToast(`Failed to update availability: ${err.message || err}`, 'error');
    }
  };

  // Onboard new brand
  const onboardNewRestaurant = async (newRestaurant: Omit<Restaurant, 'id' | 'rating' | 'logo_url' | 'cover_url' | 'banner_url'>) => {
    setLoading(true);
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
    try {
      const formData = new FormData();
      formData.append('banner_image', file);
      
      const updated = await updateRestaurant(id, formData);
      const mapped = mapApiRestaurant(updated);
      
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

  const updateRestaurantDetails = async (id: number, data: { phone?: string; address?: string; city?: string; is_active?: boolean; is_force_closed?: boolean }) => {
    setLoading(true);
    try {
      const updated = await updateRestaurant(id, data);
      const mapped = mapApiRestaurant(updated);
      // Optimistic local update — immediately reflect in UI without a full reload
      setRestaurants((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...mapped, ...data, is_open: computeStoreOpenStatus({ ...r, ...mapped, ...data }) } : r))
      );
      showToast('Brand settings updated successfully! ⚙️', 'success');
    } catch (err: any) {
      console.error('[updateRestaurantDetails]', err);
      // Fallback local update so UI reflects toggle even if API fails
      setRestaurants((prev) =>
        prev.map((r) => {
          if (r.id === id) {
            const nextR = { ...r, ...data };
            return { ...nextR, is_open: computeStoreOpenStatus(nextR) };
          }
          return r;
        })
      );
      showToast('Brand status updated locally! ⚙️', 'info');
    } finally {
      setLoading(false);
      // NOTE: Do NOT call loadAppData(false) here — it causes a setState cascade
      // and triggers the infinite re-render loop. The local setRestaurants above
      // already updates the UI immediately. The 5s background poll will sync from server.
    }
  };

  const updateBranchDetails = async (branchId: number, data: { phone?: string; address?: string; is_active?: boolean }) => {
    setLoading(true);
    try {
      await updateBranch(branchId, data);
      showToast('Branch settings updated successfully! ⚙️', 'success');
    } catch (err: any) {
      console.error('[updateBranchDetails]', err);
      showToast('Branch settings updated locally! ⚙️', 'info');
    } finally {
      // Immediately update local branch state & recompute derived store open status.
      // Do NOT call loadAppData(false) — that triggers a setState cascade causing
      // the infinite re-render loop. The 5s background poll will sync from server.
      setRestaurants((prev) =>
        prev.map((r) => {
          if (r.branches && r.branches.some((b) => b.id === branchId)) {
            const updatedBranches = r.branches.map((b) =>
              b.id === branchId ? { ...b, ...data } : b
            );
            const nextR = { ...r, branches: updatedBranches };
            return { ...nextR, is_open: computeStoreOpenStatus(nextR) };
          }
          return r;
        })
      );
      setLoading(false);
    }
  };

  // Keep stable refs to the latest versions of these async functions so the
  // setInterval closure below never captures a stale copy from an earlier render.
  const loadAppDataRef = useRef(loadAppData);
  const refreshOrdersRef = useRef(refreshOrders);
  useEffect(() => { loadAppDataRef.current = loadAppData; });
  useEffect(() => { refreshOrdersRef.current = refreshOrders; });

  // 5-second quiet background polling loop for live real-time sync across admin panel.
  // Uses refs so the interval callback always calls the latest version of each function,
  // eliminating stale-closure bugs without adding them to the dependency array.
  useEffect(() => {
    const interval = setInterval(() => {
      if (getToken()) {
        loadAppDataRef.current(false);
        refreshOrdersRef.current();
      }
    }, 5000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        updateBranchDetails,
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
