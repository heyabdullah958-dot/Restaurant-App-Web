import axios, { AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const PRODUCTION_API_URL = 'https://getfoodpk-fd9b20442fcf.herokuapp.com/api';
export const CUSTOM_API_STORAGE_KEY = '@admin_custom_api_url';

export const detectLocalLanUrl = (): string => {
  const hostUri = Constants?.expoConfig?.hostUri || Constants?.manifest?.debuggerHost || (Constants as any)?.experienceUrl;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return `http://${ip}:8000/api`;
    }
  }
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const host = window.location.hostname;
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000/api`;
    }
  }
  return Platform.OS === 'android' ? 'http://10.0.2.2:8000/api' : 'http://127.0.0.1:8000/api';
};

// Internal active URL state
let activeBaseUrl = process.env.EXPO_PUBLIC_API_URL || PRODUCTION_API_URL;

export const getActiveBaseUrl = (): string => {
  return activeBaseUrl;
};

export const normalizeApiUrl = (url: string): string => {
  let cleaned = (url || '').trim();
  if (!cleaned) return PRODUCTION_API_URL;
  // Remove trailing slash
  cleaned = cleaned.replace(/\/+$/, '');
  // Ensure protocol
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = `https://${cleaned}`;
  }
  // Ensure /api suffix if not already present
  if (!cleaned.endsWith('/api')) {
    cleaned = `${cleaned}/api`;
  }
  return cleaned;
};

export const getAvailablePresets = () => [
  {
    id: 'heroku_prod',
    label: '🚀 Heroku Production (24/7)',
    url: PRODUCTION_API_URL,
    description: 'Live cloud backend on Heroku with PostgreSQL & Cloudinary',
  },
  {
    id: 'local_lan',
    label: '💻 Local Dev (LAN IP)',
    url: detectLocalLanUrl(),
    description: 'Local Django server running on your development machine',
  },
  {
    id: 'emulator',
    label: '📱 Android Emulator Loopback',
    url: 'http://10.0.2.2:8000/api',
    description: 'Direct alias for host localhost inside Android Virtual Device',
  },
];

export const BASE_URL = activeBaseUrl;

// ─── Axios Setup ─────────────────────────────────────────────────────────────
export const api = axios.create({
  baseURL: activeBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 25000,
});

const TOKEN_KEY = 'admin_auth_token';
const REFRESH_TOKEN_KEY = 'admin_refresh_token';

// ─── Safe Storage Adapter (Multi-tier: Native AsyncStorage + Web LocalStorage + Memory Fallback) ───
const memoryStorage = new Map<string, string>();

export const safeGetItem = async (key: string): Promise<string | null> => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const val = window.localStorage.getItem(key);
      if (val !== null) return val;
    }
  } catch (e) {}

  try {
    const val = await AsyncStorage.getItem(key);
    if (val !== null) return val;
  } catch (e) {}

  return memoryStorage.get(key) || null;
};

export const safeSetItem = async (key: string, value: string): Promise<void> => {
  memoryStorage.set(key, value);

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {}

  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {}
};

export const safeRemoveItem = async (key: string): Promise<void> => {
  memoryStorage.delete(key);

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
    }
  } catch (e) {}

  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {}
};

// Hydrate saved custom API URL asynchronously on module initialization
(async () => {
  try {
    const savedUrl = await safeGetItem(CUSTOM_API_STORAGE_KEY);
    if (savedUrl) {
      activeBaseUrl = normalizeApiUrl(savedUrl);
      api.defaults.baseURL = activeBaseUrl;
    }
  } catch (e) {}
})();

export const setActiveBaseUrl = async (url: string): Promise<string> => {
  const normalized = normalizeApiUrl(url);
  activeBaseUrl = normalized;
  api.defaults.baseURL = normalized;
  await safeSetItem(CUSTOM_API_STORAGE_KEY, normalized);
  return normalized;
};

export const resetBaseUrlToDefault = async (): Promise<string> => {
  activeBaseUrl = PRODUCTION_API_URL;
  api.defaults.baseURL = PRODUCTION_API_URL;
  await safeRemoveItem(CUSTOM_API_STORAGE_KEY);
  return PRODUCTION_API_URL;
};

// ─── Live API Connectivity Probe ─────────────────────────────────────────────
export interface ConnectivityTestResult {
  success: boolean;
  latencyMs: number;
  statusCode?: number;
  message: string;
  url: string;
  error?: string;
}

export const testApiConnectivity = async (targetUrl?: string): Promise<ConnectivityTestResult> => {
  const urlToTest = normalizeApiUrl(targetUrl || activeBaseUrl);
  const probeUrl = `${urlToTest}/restaurants/`;
  const startTime = Date.now();

  try {
    const response = await axios.get(probeUrl, {
      params: { all: 'true' },
      timeout: 8000,
      headers: { 'Cache-Control': 'no-cache' },
    });
    const latencyMs = Date.now() - startTime;
    return {
      success: true,
      latencyMs,
      statusCode: response.status,
      message: `Connected successfully (${latencyMs}ms)`,
      url: urlToTest,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - startTime;
    const sanitizedMsg = sanitizeErrorMessage(err, urlToTest);
    return {
      success: false,
      latencyMs,
      statusCode: err?.response?.status,
      message: sanitizedMsg,
      url: urlToTest,
      error: err?.message,
    };
  }
};

// ─── Human-Friendly Error Sanitizer ──────────────────────────────────────────
export const sanitizeErrorMessage = (error: any, contextUrl?: string): string => {
  if (!error) return 'An unknown error occurred.';

  if (typeof error === 'string') return error;

  const url = contextUrl || activeBaseUrl;

  // 1. Check for specific Axios and Network errors
  const isNetworkError =
    error.message === 'Network Error' ||
    error.code === 'ERR_NETWORK' ||
    error.code === 'ECONNREFUSED' ||
    error.code === 'ENOTFOUND' ||
    (!error.response && !error.status);

  if (isNetworkError) {
    return `Unable to reach API server at ${url}.\n\nEnsure your device is connected to the internet, or verify that the server is online via Server Settings (⚙️).`;
  }

  if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
    return `Request timed out (took > 20s). The server at ${url} took too long to respond. Please check your connection and try again.`;
  }

  // 2. HTTP Status Code Errors
  const status = error.response?.status || error.status;
  if (status === 502 || status === 503 || status === 504) {
    return `The backend service is temporarily restarting or unreachable (HTTP ${status}). Please retry in a few moments.`;
  }

  if (status === 500) {
    return `Server encountered an internal error (HTTP 500). Please try again shortly.`;
  }

  // 3. Structured DRF Response Errors
  const data = error.response?.data;
  if (data) {
    if (typeof data.detail === 'string') return data.detail;
    if (typeof data.message === 'string') return data.message;
    if (typeof data.error === 'string') return data.error;

    if (Array.isArray(data.non_field_errors) && data.non_field_errors.length > 0) {
      return data.non_field_errors.join(' ');
    }

    if (typeof data === 'object') {
      const messages: string[] = [];
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          const fieldName = key.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
          messages.push(`${fieldName}: ${value.join(', ')}`);
        } else if (typeof value === 'string') {
          messages.push(`${key}: ${value}`);
        }
      }
      if (messages.length > 0) {
        return messages.join('\n');
      }
    }
  }

  return error.message || 'An error occurred during communication with the server.';
};

// ─── Token Management ────────────────────────────────────────────────────────

export const getStoredToken = async (): Promise<string | null> => {
  return await safeGetItem(TOKEN_KEY);
};

export const getStoredRefreshToken = async (): Promise<string | null> => {
  return await safeGetItem(REFRESH_TOKEN_KEY);
};

export const setStoredTokens = async (access: string, refresh?: string): Promise<void> => {
  await safeSetItem(TOKEN_KEY, access);
  if (refresh) {
    await safeSetItem(REFRESH_TOKEN_KEY, refresh);
  }
};

export const clearStoredTokens = async (): Promise<void> => {
  await safeRemoveItem(TOKEN_KEY);
  await safeRemoveItem(REFRESH_TOKEN_KEY);
};

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (error: any) => void }> = [];

let sessionExpiredHandler: (() => void) | null = null;

export const setSessionExpiredHandler = (handler: () => void) => {
  sessionExpiredHandler = handler;
};

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Ensure dynamic baseURL and attach Auth Token
api.interceptors.request.use(
  async (config) => {
    // Dynamically assign activeBaseUrl so runtime changes take effect immediately
    config.baseURL = activeBaseUrl;

    const isAuthPath = config.url?.includes('/auth/');
    if (!isAuthPath) {
      const token = await getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Token Rotation, Network Retry & Sanitized Errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retryCount?: number };
    const isAuthPath = originalRequest?.url?.includes('/auth/');

    // 1. Automatic single-retry for idempotent GET requests on transient network timeout/drop
    const isGet = originalRequest?.method?.toLowerCase() === 'get';
    const isTransientNetwork =
      !error.response &&
      (error.code === 'ECONNABORTED' || error.message === 'Network Error' || error.code === 'ERR_NETWORK');

    if (isGet && isTransientNetwork && (!originalRequest._retryCount || originalRequest._retryCount < 1)) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      originalRequest.baseURL = activeBaseUrl;
      return api(originalRequest);
    }

    // 2. HTTP 401 Interception & Token Rotation
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthPath) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          originalRequest.baseURL = activeBaseUrl;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refresh = await getStoredRefreshToken();
      if (!refresh) {
        isRefreshing = false;
        await clearStoredTokens();
        if (sessionExpiredHandler && !isAuthPath) {
          sessionExpiredHandler();
        }
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }

      try {
        const response = await axios.post(`${activeBaseUrl}/auth/refresh/`, { refresh }, { timeout: 15000 });
        const newAccess = response.data.access;
        const newRefresh = response.data.refresh || refresh; // ROTATE_REFRESH_TOKENS=True

        await setStoredTokens(newAccess, newRefresh);
        api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;

        processQueue(null, newAccess);
        isRefreshing = false;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
        }
        originalRequest.baseURL = activeBaseUrl;
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        await clearStoredTokens();
        if (sessionExpiredHandler && !isAuthPath) {
          sessionExpiredHandler();
        }
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }
    }

    // Attach sanitized message to error object for seamless UI consumption
    error.userFriendlyMessage = sanitizeErrorMessage(error, activeBaseUrl);
    return Promise.reject(error);
  }
);

// ─── JWT Decode Helper ───────────────────────────────────────────────────────

export interface JWTPayload {
  user_id: number;
  username?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  must_change_password?: boolean;
  restaurant_id?: number | null;
  branch_id?: number | null;
  exp: number;
}

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwtDecode<JWTPayload>(token);
  } catch (err) {
    console.error('Failed to decode token:', err);
    return null;
  }
};

// ─── Auth API Calls ──────────────────────────────────────────────────────────

export interface LoginResponse {
  access: string;
  refresh: string;
}

export const loginStaff = async (username: string, password: string): Promise<LoginResponse> => {
  const response = await api.post<LoginResponse>('/auth/login/', { username, password });
  return response.data;
};

export const logoutStaff = async (refresh: string): Promise<void> => {
  try {
    await api.post('/auth/logout/', { refresh });
  } catch (err) {
    console.warn('Logout API call failed, proceeding to clear local tokens', err);
  } finally {
    await clearStoredTokens();
  }
};

export const refreshStaffToken = async (refresh: string): Promise<{ access: string; refresh?: string }> => {
  const response = await api.post<{ access: string; refresh?: string }>('/auth/refresh/', { refresh });
  return response.data;
};

export const changeOwnPassword = async (password: string): Promise<any> => {
  const response = await api.post('/users/change-password/', { password });
  return response.data;
};

export const getUserProfile = async (): Promise<any> => {
  const response = await api.get('/users/profile/');
  return response.data;
};

// ─── ORDERS & RESTAURANTS ────────────────────────────────────────────────────

export interface AdminOrder {
  id: number;
  display_order_id: string | null;
  restaurant: number;
  restaurant_name: string;
  branch_id: number | null;
  branch_name: string | null;
  rider: { id: number; name: string; phone: string; status: string; branch: number } | null;
  rider_id: number | null;
  guest_name: string;
  guest_phone: string;
  order_type: 'DELIVERY' | 'TAKEAWAY' | 'DINE_IN';
  table_number: string | null;
  status: 'received' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  payment_method: 'cod' | 'stripe' | 'payfast';
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  subtotal: string;
  delivery_fee: string;
  discount: string;
  total: string;
  special_instructions: string | null;
  items: {
    id: number;
    menu_item: number;
    menu_item_name: string;
    quantity: number;
    unit_price: string;
    total_price: string;
    special_notes: string | null;
    selected_options: any[];
  }[];
  created_at: string;
  updated_at: string;
}

export const fetchOrders = async (): Promise<{ results: AdminOrder[]; count: number }> => {
  const response = await api.get('/orders/', { params: { page_size: 100 } });
  return response.data;
};

export const updateOrderStatus = async (
  orderId: number,
  status: string,
  cancellationReason?: string
): Promise<AdminOrder> => {
  const response = await api.patch(`/orders/${orderId}/`, {
    status,
    ...(cancellationReason ? { cancellation_reason: cancellationReason } : {}),
  });
  return response.data;
};

export const getFullImageUrl = (path: string | null | undefined): string => {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${cleanPath}`;
};

export const fetchRestaurants = async (): Promise<{ results: any[]; count: number }> => {
  const response = await api.get('/restaurants/', { params: { all: 'true' } });
  return response.data;
};

export const fetchBranches = async (restaurantId?: number): Promise<any> => {
  const params = restaurantId ? { restaurant_id: restaurantId } : { all: 'true' };
  const response = await api.get('/branches/', { params });
  return response.data;
};

// ─── MENU & CATALOG ─────────────────────────────────────────────────────────

export interface MenuItemData {
  id: number;
  category: number;
  name: string;
  description: string;
  price: string;
  image: string | null;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  preparation_time?: number;
  options?: any;
}

export interface MenuCategoryData {
  id: number;
  restaurant: number;
  name: string;
  icon: string | null;
  order: number;
  is_active: boolean;
  items: MenuItemData[];
}

export const fetchRestaurantMenu = async (slugOrId: string | number, branchId?: number) => {
  const params: any = {};
  if (branchId) params.branch_id = branchId;
  const response = await api.get(`/restaurants/${slugOrId}/menu/`, { params });
  return response.data; // { success: true, data: MenuCategoryData[] } or array
};

export const toggleBranchItemAvailability = async (
  branchId: number,
  menuItemId: number,
  isAvailable: boolean
) => {
  const response = await api.post('/restaurants/branch-item-availability/', {
    branch_id: branchId,
    menu_item_id: menuItemId,
    is_available: isAvailable,
  });
  return response.data;
};

export const createMenuCategory = async (data: { restaurant: number; name: string }) => {
  const response = await api.post('/admin/menu-categories/', data);
  return response.data;
};

export const updateMenuCategory = async (id: number, data: Partial<{ name: string; is_active: boolean }>) => {
  const response = await api.patch(`/admin/menu-categories/${id}/`, data);
  return response.data;
};

export const deleteMenuCategory = async (id: number) => {
  const response = await api.delete(`/admin/menu-categories/${id}/`);
  return response.data;
};

export const createMenuItem = async (data: FormData | any) => {
  const isForm = data instanceof FormData;
  const response = await api.post('/admin/menu-items/', data, {
    headers: isForm ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return response.data;
};

export const updateMenuItem = async (id: number, data: FormData | any) => {
  const isForm = data instanceof FormData;
  const response = await api.patch(`/admin/menu-items/${id}/`, data, {
    headers: isForm ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return response.data;
};

export const deleteMenuItem = async (id: number) => {
  const response = await api.delete(`/admin/menu-items/${id}/`);
  return response.data;
};

// ─── RIDERS ───────────────────────────────────────────────────────────────────

export interface BranchRider {
  id: number;
  branch: number;
  branch_name?: string;
  restaurant_id?: number;
  restaurant_name?: string;
  name: string;
  phone: string;
  vehicle_type: 'BIKE' | 'CAR' | 'SCOOTER' | 'BICYCLE';
  status: 'AVAILABLE' | 'ON_DELIVERY' | 'OFFLINE';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const fetchRiders = async (params?: {
  branch_id?: number;
  restaurant_id?: number;
  status?: string;
  is_active?: boolean;
  allow_global?: boolean;
}): Promise<BranchRider[]> => {
  const response = await api.get('/admin/riders/', { params });
  return Array.isArray(response.data) ? response.data : (response.data?.results || []);
};

export const createRider = async (data: Partial<BranchRider>): Promise<BranchRider> => {
  const response = await api.post('/admin/riders/', data);
  return response.data;
};

export const updateRider = async (id: number, data: Partial<BranchRider>): Promise<BranchRider> => {
  const response = await api.patch(`/admin/riders/${id}/`, data);
  return response.data;
};

export const deleteRider = async (id: number): Promise<void> => {
  await api.delete(`/admin/riders/${id}/`);
};

export const assignRiderToOrder = async (orderId: number, riderId: number | null): Promise<any> => {
  const response = await api.post(`/orders/${orderId}/assign-rider/`, { rider_id: riderId });
  return response.data;
};

// ─── ANALYTICS, TENANTS & MANAGERS ─────────────────────────────────────────

export interface PlatformAnalyticsData {
  summary: {
    orders_today: number;
    revenue_today: number;
    orders_7d: number;
    revenue_7d: number;
    orders_30d: number;
    revenue_30d: number;
    orders_all_time: number;
    revenue_all_time: number;
    total_customers: number;
    total_guests: number;
    total_loyalty_points: number;
    total_restaurants: number;
  };
  daily_trend: { date: string; orders: number; revenue: number }[];
  restaurant_breakdown: {
    id: number;
    name: string;
    slug: string;
    orders_30d: number;
    revenue_30d: number;
    orders_all_time: number;
    revenue_all_time: number;
    avg_order: number;
  }[];
  status_breakdown: Record<string, number>;
}

export interface StaffManager {
  id: number;
  username: string;
  email: string;
  must_change_password: boolean;
  restaurant_name: string;
  restaurant_id: number;
  branch_name: string;
  branch_id: number | null;
  notification_email: string;
}

export const fetchPlatformAnalytics = async (): Promise<PlatformAnalyticsData> => {
  const response = await api.get('/analytics/platform/');
  return response.data;
};

export const createTenantRestaurant = async (data: any): Promise<any> => {
  const response = await api.post('/admin/restaurants/', data);
  return response.data;
};

export const updateTenantRestaurant = async (id: number, data: any): Promise<any> => {
  const response = await api.patch(`/admin/restaurants/${id}/`, data);
  return response.data;
};

export const deleteTenantRestaurant = async (id: number): Promise<void> => {
  await api.delete(`/admin/restaurants/${id}/`);
};

export const fetchStaffManagers = async (): Promise<StaffManager[]> => {
  const response = await api.get('/admin/managers/');
  return response.data;
};

export const createStaffManager = async (data: {
  restaurant_id: number;
  branch_id: number;
  notification_email: string;
  password?: string;
}): Promise<any> => {
  const response = await api.post('/admin/managers/create/', data);
  return response.data;
};

export const changeManagerPassword = async (managerId: number, password: string): Promise<any> => {
  const response = await api.post(`/admin/managers/${managerId}/change-password/`, { password });
  return response.data;
};

// ─── CRM, PROMOS, FLASH DEALS & NOTIFICATIONS ─────────────────────────

export interface CustomerProfile {
  id: number;
  username: string;
  name: string;
  email: string;
  phone: string;
  loyalty_points: number;
  is_guest: boolean;
  orders_count?: number;
  total_spent?: number | string;
  created_at?: string;
}

export interface PromoCoupon {
  id: number;
  code: string;
  discount_type: 'flat' | 'percentage' | 'FLAT' | 'PERCENTAGE';
  discount_value: string | number;
  min_subtotal?: string | number;
  min_order_amount?: string | number;
  max_discount?: string | number | null;
  max_discount_amount?: string | number | null;
  valid_from?: string;
  valid_to?: string;
  valid_until?: string;
  is_active: boolean;
  restaurant?: number | null;
  restaurant_name?: string | null;
  branch?: number | null;
  branch_name?: string | null;
  used_count?: number;
  times_used?: number;
}

export interface FlashDeal {
  id: number;
  title: string;
  description?: string;
  deal_type?: 'percentage' | 'flat' | 'bogo' | 'combo';
  discount_value?: number | string;
  discount_percentage?: number;
  start_time: string;
  end_time: string;
  menu_item?: number;
  menu_item_name?: string;
  is_active: boolean;
  image_url?: string | null;
}

export const fetchCustomers = async (search?: string): Promise<CustomerProfile[]> => {
  const params: any = {};
  if (search) params.search = search;
  const response = await api.get('/admin/customers/', { params });
  return Array.isArray(response.data) ? response.data : (response.data?.results || []);
};

export const adjustCustomerLoyalty = async (
  customerId: number,
  points: number,
  reason: string
): Promise<{ old_points: number; new_points: number }> => {
  const response = await api.patch(`/admin/customers/${customerId}/loyalty/`, {
    loyalty_points: points,
    reason,
  });
  return response.data;
};

export const fetchCoupons = async (): Promise<PromoCoupon[]> => {
  const response = await api.get('/coupons/');
  return Array.isArray(response.data) ? response.data : (response.data?.results || []);
};

const formatCouponPayload = (data: Partial<PromoCoupon>) => {
  const payload: any = {};
  if (data.code !== undefined) payload.code = data.code.trim().toUpperCase();
  if (data.discount_type !== undefined) payload.discount_type = data.discount_type.toLowerCase();
  if (data.discount_value !== undefined) payload.discount_value = parseFloat(String(data.discount_value)) || 0;
  if (data.min_subtotal !== undefined || data.min_order_amount !== undefined) {
    payload.min_subtotal = parseFloat(String(data.min_subtotal ?? data.min_order_amount)) || 0;
  }
  if (data.max_discount !== undefined || data.max_discount_amount !== undefined) {
    const rawMax = data.max_discount ?? data.max_discount_amount;
    payload.max_discount = rawMax ? parseFloat(String(rawMax)) : null;
  }
  if (data.valid_from !== undefined) {
    payload.valid_from = data.valid_from;
  } else {
    payload.valid_from = new Date(Date.now() - 60000).toISOString();
  }
  if (data.valid_to !== undefined || data.valid_until !== undefined) {
    const rawTo = data.valid_to || data.valid_until;
    if (rawTo && !rawTo.includes('T')) {
      payload.valid_to = new Date(`${rawTo}T23:59:59Z`).toISOString();
    } else if (rawTo) {
      payload.valid_to = new Date(rawTo).toISOString();
    } else {
      payload.valid_to = new Date(Date.now() + 30 * 86400000).toISOString();
    }
  }
  if (data.is_active !== undefined) payload.is_active = data.is_active;
  if (data.restaurant !== undefined) payload.restaurant = data.restaurant || null;
  if (data.branch !== undefined) payload.branch = data.branch || null;
  return payload;
};

export const createCoupon = async (data: Partial<PromoCoupon>): Promise<PromoCoupon> => {
  const formattedData = formatCouponPayload(data);
  const response = await api.post('/coupons/', formattedData);
  return response.data;
};

export const updateCoupon = async (id: number, data: Partial<PromoCoupon>): Promise<PromoCoupon> => {
  const formattedData = formatCouponPayload(data);
  const response = await api.patch(`/coupons/${id}/`, formattedData);
  return response.data;
};

export const deleteCoupon = async (id: number): Promise<void> => {
  await api.delete(`/coupons/${id}/`);
};

export const fetchFlashDeals = async (): Promise<FlashDeal[]> => {
  const response = await api.get('/flash-deals/');
  return Array.isArray(response.data) ? response.data : (response.data?.results || []);
};

const formatFlashDealPayload = (data: Partial<FlashDeal>) => {
  const payload: any = {};
  if (data.title !== undefined) payload.title = data.title.trim();
  if (data.description !== undefined) payload.description = data.description.trim();
  payload.deal_type = data.deal_type || 'percentage';
  const val = data.discount_value ?? data.discount_percentage ?? 0;
  payload.discount_value = parseFloat(String(val)) || 0;

  if (data.start_time) {
    payload.start_time = data.start_time.includes('T') ? new Date(data.start_time).toISOString() : new Date(`${data.start_time}T00:00:00Z`).toISOString();
  } else {
    payload.start_time = new Date().toISOString();
  }

  if (data.end_time) {
    payload.end_time = data.end_time.includes('T') ? new Date(data.end_time).toISOString() : new Date(`${data.end_time}T23:59:59Z`).toISOString();
  } else {
    payload.end_time = new Date(Date.now() + 7 * 86400000).toISOString();
  }

  if (data.is_active !== undefined) payload.is_active = data.is_active;
  if (data.menu_item !== undefined) payload.menu_items = data.menu_item ? [data.menu_item] : [];
  return payload;
};

export const createFlashDeal = async (data: Partial<FlashDeal>): Promise<FlashDeal> => {
  const formattedData = formatFlashDealPayload(data);
  const response = await api.post('/flash-deals/', formattedData);
  return response.data;
};

export const updateFlashDeal = async (id: number, data: Partial<FlashDeal>): Promise<FlashDeal> => {
  const formattedData = formatFlashDealPayload(data);
  const response = await api.patch(`/flash-deals/${id}/`, formattedData);
  return response.data;
};

export const deleteFlashDeal = async (id: number): Promise<void> => {
  await api.delete(`/flash-deals/${id}/`);
};

export const sendPushBroadcast = async (payload: {
  title: string;
  body: string;
  target: 'all' | number;
}): Promise<any> => {
  const response = await api.post('/admin/notifications/send/', payload);
  return response.data;
};





