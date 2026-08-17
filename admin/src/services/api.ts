/**
 * FoodSphere Admin — API Service Layer
 * Centralised fetch wrapper with JWT auth.
 * All API calls go through here — never call fetch() directly in components.
 */

const getLocalOrProductionBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return `http://${window.location.hostname}:8000`;
  }
  return 'https://getfoodpk-fd9b20442fcf.herokuapp.com';
};

const BASE_URL = getLocalOrProductionBaseUrl();

import { safeGetLocalStorage, safeSetLocalStorage, safeRemoveLocalStorage } from '../utils/storage';

// ─── Token Management ────────────────────────────────────────────────────────

export const getToken = (): string | null =>
  safeGetLocalStorage('foodsphere_admin_token') || null;

export const getRefreshToken = (): string | null =>
  safeGetLocalStorage('foodsphere_admin_refresh') || null;

export const setTokens = (access: string, refresh: string): void => {
  safeSetLocalStorage('foodsphere_admin_token', access);
  safeSetLocalStorage('foodsphere_admin_refresh', refresh);
};

export const clearTokens = (): void => {
  safeRemoveLocalStorage('foodsphere_admin_token');
  safeRemoveLocalStorage('foodsphere_admin_refresh');
};

// ─── Authenticated Fetch Wrapper ─────────────────────────────────────────────

let refreshPromise: Promise<string> | null = null;

async function performTokenRefresh(): Promise<string> {
  const refresh = getRefreshToken();
  if (!refresh) {
    throw new Error('No refresh token available');
  }
  // Call refresh endpoint directly to avoid circular dependency
  const res = await fetch(`${BASE_URL}/api/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    clearTokens();
    localStorage.removeItem('foodsphere_admin_mock_user');
    
    const RELOAD_KEY = 'foodsphere_last_reload';
    const lastReload = parseInt(localStorage.getItem(RELOAD_KEY) || '0');
    const now = Date.now();
    if (now - lastReload > 10000) {
      localStorage.setItem(RELOAD_KEY, now.toString());
      window.location.reload();
    } else {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.hash = '#login';
      window.location.reload();
    }
    
    throw new Error('Refresh token expired or invalid');
  }
  const data = await res.json();
  const newAccess = data.access;
  // ROTATE_REFRESH_TOKENS=True means Django sends a new refresh token too
  // Always save the latest refresh token to avoid "token already blacklisted" errors
  setTokens(newAccess, data.refresh ?? refresh);
  return newAccess;
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const isAuthEndpoint = endpoint.includes('/api/auth/') || endpoint.includes('/api/token/');
  const token = isAuthEndpoint ? null : getToken();
  let method = options.method || 'GET';
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };


  if (options.body instanceof FormData) {
    if (method === 'PATCH' || method === 'PUT') {
      headers['X-HTTP-Method-Override'] = method;
      method = 'POST';
    }
  } else {
    headers['Content-Type'] = 'application/json';
  }

  let response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    method,
    headers,
  });

  // Intercept 401 Unauthorized for Auto Refresh
  if (response.status === 401 && getRefreshToken() && !endpoint.includes('/api/auth/')) {
    try {
      if (!refreshPromise) {
        refreshPromise = performTokenRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;
      // Retry request with new token
      headers['Authorization'] = `Bearer ${newAccessToken}`;
      response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        method,
        headers,
      });
    } catch (err) {
      throw new Error('Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.message || errJson.detail || JSON.stringify(errJson);
    } catch {
      try {
        const text = await response.text();
        if (text) errorMsg = text;
      } catch {}
    }
    throw new Error(errorMsg);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  access: string;
  refresh: string;
}

export const loginAdmin = (username: string, password: string) =>
  apiFetch<LoginResponse>('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });

export const logoutAdmin = (refresh: string) =>
  apiFetch<any>('/api/auth/logout/', {
    method: 'POST',
    body: JSON.stringify({ refresh }),
  });

export const refreshAccessToken = (refreshToken: string) =>
  apiFetch<{ access: string }>('/api/auth/refresh/', {
    method: 'POST',
    body: JSON.stringify({ refresh: refreshToken }),
  });

// ─── RESTAURANTS ──────────────────────────────────────────────────────────────

export interface ApiRestaurant {
  id: number;
  name: string;
  slug: string;
  cuisine_type: string;
  description: string;
  city: string;
  is_active: boolean;
  is_force_closed?: boolean;
  is_open?: boolean;
  is_featured: boolean;
  rating: string | number;
  delivery_fee: string | number;
  delivery_time_min: number;
  delivery_time_max: number;
  min_order_amount: string | number;
  logo: string | null;
  cover_image: string | null;
  banner_image: string | null;
  opens_at: string;
  closes_at: string;
  phone?: string;
  address?: string;
  branches?: any[];
}

export const fetchRestaurants = () =>
  apiFetch<{ results: ApiRestaurant[]; count: number }>('/api/restaurants/?all=true');

export const fetchRestaurantMenu = (slug: string) =>
  apiFetch<any>(`/api/restaurants/${slug}/menu/`);

// ─── ORDERS ───────────────────────────────────────────────────────────────────

export interface ApiOrder {
  id: number;
  restaurant: number;
  restaurant_name?: string;
  branch_id?: number | null;
  branch_name?: string | null;
  rider?: any;
  rider_id?: number | null;
  status: string;
  payment_method: string;
  total: string | number;
  subtotal: string | number;
  delivery_fee: string | number;
  guest_name: string;
  guest_phone: string;
  delivery_address: string;
  delivery_lat?: number | string | null;
  delivery_lng?: number | string | null;
  created_at: string;
  updated_at: string;
  items?: any[];
}

export const fetchAllOrders = (params?: { restaurant_id?: number; branch_id?: number }) => {
  let url = '/api/orders/?page_size=100';
  if (params) {
    const q = new URLSearchParams();
    if (params.restaurant_id) q.append('restaurant_id', String(params.restaurant_id));
    if (params.branch_id) q.append('branch_id', String(params.branch_id));
    const str = q.toString();
    if (str) url += `&${str}`;
  }
  return apiFetch<{ results: ApiOrder[]; count: number }>(url);
};

export const updateOrderStatus = (orderId: number, status: string, cancellation_reason?: string) =>
  apiFetch<ApiOrder>(`/api/orders/${orderId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ status, cancellation_reason }),
  });

// ─── CASH REGISTER ────────────────────────────────────────────────────────────

export interface ApiCashRegister {
  id: number;
  branch_id: number;
  branch_name: string;
  restaurant_name: string;
  date: string;
  submitted_by: string;
  total_orders_count: number;
  total_cod_collected: string;
  total_cod_handed_over: string;
  discrepancy_amount: string;
  is_verified_by_admin: boolean;
  verified_by?: string;
  verified_at?: string;
  notes?: string;
}

export const fetchCashRegisters = (date?: string, branchId?: number) => {
  const params = new URLSearchParams();
  if (date) params.append('date', date);
  if (branchId) params.append('branch_id', String(branchId));
  return apiFetch<ApiCashRegister[]>(`/api/orders/cash-register/?${params.toString()}`);
};

export const submitCashRegister = (branch_id: number, date: string, total_cod_handed_over: number, notes?: string) =>
  apiFetch<any>('/api/orders/cash-register/', {
    method: 'POST',
    body: JSON.stringify({ branch_id, date, total_cod_handed_over, notes }),
  });

export const verifyCashRegister = (id: number) =>
  apiFetch<any>(`/api/orders/cash-register/${id}/verify/`, {
    method: 'POST',
  });

export const changeFirstPassword = (old_password: string, new_password: string) =>
  apiFetch<any>('/api/users/change-password/', {
    method: 'POST',
    body: JSON.stringify({ old_password, new_password }),
  });


// ─── ANALYTICS ────────────────────────────────────────────────────────────────

export interface PlatformAnalytics {
  summary: {
    orders_today: number;
    revenue_today: number;
    orders_7d: number;
    revenue_7d: number;
    orders_30d: number;
    revenue_30d: number;
    total_customers: number;
    total_guests: number;
    total_loyalty_points: number;
    total_restaurants: number;
  };
  daily_trend: Array<{ date: string; orders: number; revenue: number }>;
  restaurant_breakdown: Array<{
    id: number;
    name: string;
    slug: string;
    orders_30d: number;
    revenue_30d: number;
    avg_order: number;
  }>;
  status_breakdown: Record<string, number>;
}

export const fetchPlatformAnalytics = () =>
  apiFetch<PlatformAnalytics>('/api/analytics/platform/');

export const fetchRestaurantAnalytics = (restaurantId: number) =>
  apiFetch<any>(`/api/analytics/restaurant/${restaurantId}/`);

// ─── CUSTOMERS ────────────────────────────────────────────────────────────────

export interface ApiCustomer {
  id: number;
  username: string;
  email: string;
  phone: string;
  loyalty_points: number;
  is_guest: boolean;
  date_joined: string | null;
  total_orders: number;
}

export const fetchCustomers = async (search?: string) => {
  return apiFetch<{ count: number; results: ApiCustomer[] }>(
    `/api/admin/customers/${search ? `?search=${encodeURIComponent(search)}` : ''}`
  );
};

export const fetchCustomerDetail = async (userId: number) => {
  return apiFetch<any>(`/api/admin/customers/${userId}/`);
};

export const updateCustomerLoyalty = async (userId: number, points: number, reason: string) => {
  return apiFetch<any>(`/api/admin/customers/${userId}/loyalty/`, {
    method: 'PATCH',
    body: JSON.stringify({ loyalty_points: points, reason }),
  });
};

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export interface SendNotificationPayload {
  title: string;
  body: string;
  target: 'all' | number;
}

export const sendPushNotification = (payload: SendNotificationPayload) =>
  apiFetch<any>('/api/admin/notifications/send/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

// ─── ADMIN CRUDS ─────────────────────────────────────────────────────────────

export const createRestaurant = (data: any) =>
  apiFetch<any>('/api/admin/restaurants/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateRestaurant = (id: number, data: any) => {
  const isFormData = data instanceof FormData;
  return apiFetch<any>(`/api/admin/restaurants/${id}/`, {
    method: 'PATCH',
    body: isFormData ? data : JSON.stringify(data),
  });
};

export const deleteRestaurant = (id: number) =>
  apiFetch<any>(`/api/admin/restaurants/${id}/`, {
    method: 'DELETE',
  });

export const createMenuCategory = (data: any) =>
  apiFetch<any>('/api/admin/menu-categories/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateMenuCategory = (id: number, data: any) =>
  apiFetch<any>(`/api/admin/menu-categories/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteMenuCategory = (id: number) =>
  apiFetch<any>(`/api/admin/menu-categories/${id}/`, {
    method: 'DELETE',
  });

export const createMenuItem = (data: any) =>
  apiFetch<any>('/api/admin/menu-items/', {
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });

export const updateMenuItem = (id: number, data: any) =>
  apiFetch<any>(`/api/admin/menu-items/${id}/`, {
    method: 'PATCH',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });

export const deleteMenuItem = (id: number) =>
  apiFetch<any>(`/api/admin/menu-items/${id}/`, {
    method: 'DELETE',
  });

export const updateMenuItemOptions = (id: number, options: any) =>
  apiFetch<any>(`/api/admin/menu-items/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ options }),
  });

export const fetchAllManagers = () =>
  apiFetch<any[]>('/api/admin/managers/');

export const changeManagerPassword = (managerId: number, password: string) =>
  apiFetch<any>(`/api/admin/managers/${managerId}/change-password/`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });

export const fetchBranches = (restaurantId?: number): Promise<any[]> =>
  apiFetch<any[]>(
    restaurantId 
      ? `/api/admin/branches/?restaurant_id=${restaurantId}` 
      : '/api/admin/branches/'
  );

export const fetchRestaurantsList = async (): Promise<any[]> => {
  const data = await apiFetch<any>('/api/restaurants/');
  return Array.isArray(data) ? data : (data?.results || []);
};

export const updateBranch = (branchId: number, data: { phone?: string; address?: string; is_active?: boolean }): Promise<any> =>
  apiFetch<any>(`/api/admin/branches/${branchId}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });


export const createManagerAccount = (data: {
  restaurant_id: number;
  branch_id: number;
  notification_email: string;
  password?: string;
}): Promise<{
  success: boolean;
  username: string;
  password: string;
  restaurant: string;
  branch: string;
  notification_email: string;
  message: string;
}> =>
  apiFetch('/api/admin/managers/create/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const changeOwnPassword = (password: string) =>
  apiFetch<any>('/api/users/change-password/', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });

export const updateUserProfile = (data: { username: string; email: string }) =>
  apiFetch<any>('/api/users/profile/', {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// ─── TOKEN DECODE HELPER ──────────────────────────────────────────────────────

export interface JWTPayload {
  user_id: number;
  username?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  restaurant_id?: number;
  branch_id?: number;
  exp: number;
}

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload)) as JWTPayload;
  } catch {
    return null;
  }
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

// ─── PROMOTIONS & MANAGEMENT ──────────────────────────────────────────────────

export const fetchCoupons = async (params?: { restaurant_id?: number; branch_id?: number }) => {
  let url = '/api/coupons/';
  if (params) {
    const searchParams = new URLSearchParams();
    if (params.restaurant_id) searchParams.append('restaurant_id', String(params.restaurant_id));
    if (params.branch_id) searchParams.append('branch_id', String(params.branch_id));
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }
  const data = await apiFetch<any>(url);
  return Array.isArray(data) ? data : (data?.results || []);
};
export const createCoupon = (data: any) => apiFetch<any>('/api/coupons/', { method: 'POST', body: JSON.stringify(data) });
export const updateCoupon = (id: number, data: any) => apiFetch<any>(`/api/coupons/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteCoupon = (id: number) => apiFetch<any>(`/api/coupons/${id}/`, { method: 'DELETE' });

export const fetchFlashDeals = async () => {
  const data = await apiFetch<any>('/api/promotions/flash-deals/');
  return Array.isArray(data) ? data : (data?.results || []);
};
export const createFlashDeal = (data: any) => apiFetch<any>('/api/promotions/flash-deals/', { method: 'POST', body: JSON.stringify(data) });
export const updateFlashDeal = (id: number, data: any) => apiFetch<any>(`/api/promotions/flash-deals/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteFlashDeal = (id: number) => apiFetch<any>(`/api/promotions/flash-deals/${id}/`, { method: 'DELETE' });

export const fetchReviews = async (params?: { restaurant_id?: number | string; restaurant_slug?: string }) => {
  let url = '/api/admin/reviews/';
  if (params) {
    const query = new URLSearchParams();
    if (params.restaurant_id) query.append('restaurant_id', String(params.restaurant_id));
    if (params.restaurant_slug) query.append('restaurant_slug', String(params.restaurant_slug));
    const qs = query.toString();
    if (qs) url += `?${qs}`;
  }
  const data = await apiFetch<any>(url);
  return Array.isArray(data) ? data : (data?.results || []);
};

export const fetchRiders = async (params?: { branch_id?: number | string; restaurant_id?: number | string; status?: string; is_active?: boolean; allow_global?: boolean }) => {
  let url = '/api/admin/riders/';
  if (params) {
    const query = new URLSearchParams();
    if (params.branch_id) query.append('branch_id', String(params.branch_id));
    if (params.restaurant_id) query.append('restaurant_id', String(params.restaurant_id));
    if (params.status) query.append('status', params.status);
    if (params.is_active !== undefined) query.append('is_active', String(params.is_active));
    if (params.allow_global !== undefined) query.append('allow_global', String(params.allow_global));
    const queryString = query.toString();
    if (queryString) url += `?${queryString}`;
  }
  const data = await apiFetch<any>(url);
  return Array.isArray(data) ? data : (data?.results || []);
};
export const createRider = (data: any) => apiFetch<any>('/api/admin/riders/', { method: 'POST', body: JSON.stringify(data) });
export const updateRider = (id: number, data: any) => apiFetch<any>(`/api/admin/riders/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteRider = (id: number) => apiFetch<any>(`/api/admin/riders/${id}/`, { method: 'DELETE' });
export const assignRiderToOrder = (orderId: number, riderId: number | null, is_hq_override?: boolean) => 
  apiFetch<any>(`/api/orders/${orderId}/assign-rider/`, { method: 'POST', body: JSON.stringify({ rider_id: riderId, is_hq_override: is_hq_override ?? true }) });

export const updateBranchStock = (branchId: number, itemId: number, is_in_stock: boolean) => 
  apiFetch<any>(`/api/admin/branches/${branchId}/stock/`, { method: 'POST', body: JSON.stringify({ item_id: itemId, is_in_stock }) });

export const fetchPlatformSettings = () => apiFetch<any>('/api/restaurants/platform-settings/');
export const updatePlatformSettings = (data: any) => apiFetch<any>('/api/restaurants/platform-settings/', { method: 'PATCH', body: JSON.stringify(data) });

