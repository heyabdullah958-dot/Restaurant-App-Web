/**
 * FoodSphere Admin — API Service Layer
 * Centralised fetch wrapper with JWT auth.
 * All API calls go through here — never call fetch() directly in components.
 */

const BASE_URL = import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== ''
  ? import.meta.env.VITE_API_URL 
  : (import.meta.env.DEV ? '' : 'https://restaurant-app-web.onrender.com');

// ─── Token Management ────────────────────────────────────────────────────────

export const getToken = (): string | null =>
  localStorage.getItem('foodsphere_admin_token');

export const getRefreshToken = (): string | null =>
  localStorage.getItem('foodsphere_admin_refresh');

export const setTokens = (access: string, refresh: string): void => {
  localStorage.setItem('foodsphere_admin_token', access);
  localStorage.setItem('foodsphere_admin_refresh', refresh);
};

export const clearTokens = (): void => {
  localStorage.removeItem('foodsphere_admin_token');
  localStorage.removeItem('foodsphere_admin_refresh');
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
    window.location.reload();
    throw new Error('Refresh token expired or invalid');
  }
  const data = await res.json();
  const newAccess = data.access;
  // ROTATE_REFRESH_TOKENS=True means Django sends a new refresh token too
  // Always save the latest refresh token to avoid "token already blacklisted" errors
  setTokens(newAccess, data.refresh ?? refresh);
  return newAccess;
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
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
      console.warn('[apiFetch] Auto-refresh failed:', err);
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
  is_featured: boolean;
  rating: string | number;
  delivery_fee: string | number;
  delivery_time_min: number;
  delivery_time_max: number;
  min_order_amount: string | number;
  logo: string | null;
  cover_image: string | null;
  opens_at: string;
  closes_at: string;
}

export const fetchRestaurants = () =>
  apiFetch<{ results: ApiRestaurant[]; count: number }>('/api/restaurants/');

export const fetchRestaurantMenu = (slug: string) =>
  apiFetch<any>(`/api/restaurants/${slug}/menu/`);

// ─── ORDERS ───────────────────────────────────────────────────────────────────

export interface ApiOrder {
  id: number;
  restaurant: number;
  restaurant_name?: string;
  status: string;
  payment_method: string;
  total: string | number;
  subtotal: string | number;
  delivery_fee: string | number;
  guest_name: string;
  guest_phone: string;
  delivery_address: string;
  created_at: string;
  updated_at: string;
  items?: any[];
}

export const fetchAllOrders = () =>
  apiFetch<{ results: ApiOrder[]; count: number }>('/api/orders/');

export const updateOrderStatus = (orderId: number, status: string) =>
  apiFetch<ApiOrder>(`/api/orders/${orderId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
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

// Mock customer fallback data for demo/mock mode
let MOCK_CUSTOMERS: ApiCustomer[] = [
  { id: 10, username: 'testuser_7216', email: 'testuser_7216@gmail.com', phone: '03001234567', loyalty_points: 0, is_guest: false, date_joined: '2026-05-15T12:00:00Z', total_orders: 4 },
  { id: 11, username: 'testuser_4780', email: 'testuser_4780@gmail.com', phone: '03129876543', loyalty_points: 10, is_guest: false, date_joined: '2026-05-20T14:30:00Z', total_orders: 8 },
  { id: 12, username: 'testuser_5355', email: 'testuser_5355@gmail.com', phone: '03211112222', loyalty_points: 120, is_guest: false, date_joined: '2026-05-22T09:15:00Z', total_orders: 15 },
  { id: 1, username: 'guest_35056afa667f', email: '', phone: '03335556666', loyalty_points: 0, is_guest: true, date_joined: '2026-05-29T18:45:00Z', total_orders: 1 }
];

export const fetchCustomers = async (search?: string) => {
  const isMock = localStorage.getItem('foodsphere_admin_mock_user');
  if (isMock || !getToken()) {
    let filtered = [...MOCK_CUSTOMERS];
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.username.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q)
      );
    }
    return { count: filtered.length, results: filtered };
  }
  
  return apiFetch<{ count: number; results: ApiCustomer[] }>(
    `/api/admin/customers/${search ? `?search=${encodeURIComponent(search)}` : ''}`
  );
};

export const fetchCustomerDetail = async (userId: number) => {
  const isMock = localStorage.getItem('foodsphere_admin_mock_user');
  if (isMock || !getToken()) {
    const customer = MOCK_CUSTOMERS.find((c) => c.id === userId);
    if (!customer) throw new Error('Customer not found (Mock)');
    return {
      ...customer,
      loyalty_history: [
        { id: 1, points: 10, transaction_type: 'earned', description: 'Order #3 completed', created_at: '2026-05-20T14:35:00Z' }
      ]
    };
  }
  return apiFetch<any>(`/api/admin/customers/${userId}/`);
};

export const updateCustomerLoyalty = async (userId: number, points: number, reason: string) => {
  const isMock = localStorage.getItem('foodsphere_admin_mock_user');
  if (isMock || !getToken()) {
    const idx = MOCK_CUSTOMERS.findIndex((c) => c.id === userId);
    if (idx === -1) throw new Error('Customer not found (Mock)');
    const old = MOCK_CUSTOMERS[idx].loyalty_points;
    MOCK_CUSTOMERS[idx].loyalty_points = points;
    return {
      success: true,
      user_id: userId,
      username: MOCK_CUSTOMERS[idx].username,
      old_points: old,
      new_points: points,
      diff: points - old
    };
  }

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

export const updateRestaurant = (id: number, data: any) =>
  apiFetch<any>(`/api/admin/restaurants/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

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

export const updateMenuItemOptions = (id: number, options: any[]) =>
  apiFetch<any>(`/api/admin/menu-items/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({ options }),
  });

// ─── TOKEN DECODE HELPER ──────────────────────────────────────────────────────

export interface JWTPayload {
  user_id: number;
  username?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
  restaurant_id?: number;
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
