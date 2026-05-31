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
  onboardNewRestaurant: (newRestaurant: Omit<Restaurant, 'id' | 'rating' | 'logo_url' | 'cover_url'>) => void;
  removeRestaurant: (id: number) => Promise<void>;
  refreshOrders: () => Promise<void>;
  addMenuCategory: (name: string) => Promise<void>;
  removeMenuCategory: (id: number) => Promise<void>;
  addMenuItem: (categoryId: number, data: any) => Promise<void>;
  removeMenuItem: (categoryId: number, itemId: number) => Promise<void>;
  updateItemOptions: (categoryId: number, itemId: number, options: any[]) => Promise<void>;
  editMenuItem: (categoryId: number, itemId: number, data: any) => Promise<void>;
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
  const [user, setUser] = useState<User | null>(() => {
    const token = getToken();
    if (token) {
      const payload = decodeToken(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        return {
          id: payload.user_id,
          username: payload.username || 'Admin',
          email: '',
          role: payload.is_staff ? 'super_admin' : 'branch_manager',
          restaurantId: payload.is_staff ? undefined : payload.restaurant_id,
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
    const savedView = localStorage.getItem('foodsphere_admin_view');
    if (savedView) return savedView;

    const token = getToken();
    if (token) {
      const payload = decodeToken(token);
      if (payload && payload.exp * 1000 > Date.now()) {
        return payload.is_staff ? 'super_dashboard' : 'branch_dashboard';
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

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<Record<number, MenuCategory[]>>(MOCK_MENU_ITEMS);
  const [selectedBrandId, setSelectedBrandId] = useState<number>(() => {
    const savedBrandId = localStorage.getItem('foodsphere_admin_brand_id');
    return savedBrandId ? Number(savedBrandId) : 1;
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Restore session from localStorage on mount
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

  const loadAppData = async () => {
    const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
    if (isMock) {
      setRestaurants(MOCK_RESTAURANTS);
      setOrders(INITIAL_ORDERS);
      if (MOCK_RESTAURANTS.length > 0) {
        const savedBrandId = localStorage.getItem('foodsphere_admin_brand_id');
        const exists = savedBrandId && MOCK_RESTAURANTS.some((r) => r.id === Number(savedBrandId));
        setSelectedBrandId(exists ? Number(savedBrandId) : MOCK_RESTAURANTS[0].id);
      }
      return;
    }

    try {
      const [restaurantData, orderData] = await Promise.all([
        fetchRestaurants().catch(() => ({ results: [], count: 0 })),
        fetchAllOrders().catch(() => ({ results: [], count: 0 })),
      ]);
      const mapped = restaurantData.results.map(mapApiRestaurant);
      setRestaurants(mapped);
      setOrders(orderData.results.map(mapApiOrder));
      
      if (mapped.length > 0) {
        const token = getToken();
        const payload = token ? decodeToken(token) : null;
        const isSuper = payload?.is_staff === true;
        const managerRestId = isSuper ? undefined : payload?.restaurant_id;

        if (managerRestId) {
          setSelectedBrandId(managerRestId);
          localStorage.setItem('foodsphere_admin_brand_id', String(managerRestId));
        } else {
          const savedBrandId = localStorage.getItem('foodsphere_admin_brand_id');
          const exists = savedBrandId && mapped.some((r) => r.id === Number(savedBrandId));
          setSelectedBrandId(exists ? Number(savedBrandId) : mapped[0].id);
        }
      }
    } catch (err) {
      console.warn('[AdminContext] Failed to load app data:', err);
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

      const managerRestId = isSuperAdmin ? undefined : payload?.restaurant_id;
      if (mappedRestaurants.length > 0) {
        const activeBrandId = managerRestId || mappedRestaurants[0].id;
        setSelectedBrandId(activeBrandId);
        localStorage.setItem('foodsphere_admin_brand_id', String(activeBrandId));
      }

      // 4. Set user state
      const loggedInUser: User = {
        id: payload?.user_id || 0,
        username,
        email: '',
        role: isSuperAdmin ? 'super_admin' : 'branch_manager',
        restaurantId: managerRestId,
      };
      setUser(loggedInUser);
      const defaultView = isSuperAdmin ? 'super_dashboard' : 'branch_dashboard';
      localStorage.setItem('foodsphere_admin_view', defaultView);
      setActiveView(defaultView);
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
          restaurantId: isMockSuper ? undefined : 1,
        };
        setUser(mockUser);
        const mockView = isMockSuper ? 'super_dashboard' : 'branch_dashboard';
        localStorage.setItem('foodsphere_admin_mock_user', JSON.stringify(mockUser));
        localStorage.setItem('foodsphere_admin_view', mockView);
        localStorage.setItem('foodsphere_admin_brand_id', '1');
        setActiveView(mockView);
        return true;
      }
      showToast('Invalid credentials. Please try again.', 'error');
      return false;
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
    setUser(null);
    setOrders([]);
    setRestaurants([]);
    setActiveView('login');
    showToast('Logged out successfully', 'info');
  };

  const setView = (view: string) => {
    setLoading(true);
    localStorage.setItem('foodsphere_admin_view', view);
    setTimeout(() => {
      setActiveView(view);
      setLoading(false);
    }, 300);
  };

  const setSelectedBrand = (id: number) => {
    setSelectedBrandId(id);
    localStorage.setItem('foodsphere_admin_brand_id', String(id));
    showToast(`Switched view to ${restaurants.find((r) => r.id === id)?.name}`, 'info');
  };

  // Refresh orders from API
  const refreshOrders = async () => {
    const isMock = !!localStorage.getItem('foodsphere_admin_mock_user');
    if (isMock) return;
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
  const onboardNewRestaurant = async (newRestaurant: Omit<Restaurant, 'id' | 'rating' | 'logo_url' | 'cover_url'>) => {
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
        image: getFullImageUrl(created.image),
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
        image: getFullImageUrl(updatedItem.image),
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
