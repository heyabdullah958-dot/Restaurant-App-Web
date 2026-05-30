/**
 * FoodSphere Admin — API Service Layer
 * Centralised fetch wrapper with JWT auth.
 * All API calls go through here — never call fetch() directly in components.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'https://restaurant-app-web.onrender.com';

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

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    },
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => `HTTP ${response.status}`);
    throw new Error(`API ${response.status}: ${errText}`);
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

export const fetchCustomers = (search?: string) =>
  apiFetch<{ count: number; results: ApiCustomer[] }>(
    `/api/admin/customers/${search ? `?search=${encodeURIComponent(search)}` : ''}`
  );

export const fetchCustomerDetail = (userId: number) =>
  apiFetch<any>(`/api/admin/customers/${userId}/`);

export const updateCustomerLoyalty = (userId: number, points: number, reason: string) =>
  apiFetch<any>(`/api/admin/customers/${userId}/loyalty/`, {
    method: 'PATCH',
    body: JSON.stringify({ loyalty_points: points, reason }),
  });

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
    body: JSON.stringify(data),
  });

export const updateMenuItem = (id: number, data: any) =>
  apiFetch<any>(`/api/admin/menu-items/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteMenuItem = (id: number) =>
  apiFetch<any>(`/api/admin/menu-items/${id}/`, {
    method: 'DELETE',
  });

// ─── TOKEN DECODE HELPER ──────────────────────────────────────────────────────

export interface JWTPayload {
  user_id: number;
  username?: string;
  is_staff?: boolean;
  is_superuser?: boolean;
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
