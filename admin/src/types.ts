export interface User {
  id: number;
  username: string;
  email: string;
  role: 'super_admin' | 'branch_manager';
  restaurantId?: number; // Linked restaurant if branch_manager
  branchId?: number;     // Linked branch if branch_manager
}

export interface MenuItemVariant {
  id: string;
  name: string;
  price: number;
  specifications?: Record<string, string>;
}

export interface MenuItemOptions {
  has_variants?: boolean;
  specifications?: Record<string, string>;
  variants?: MenuItemVariant[];
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image?: string;
  image_url?: string;
  is_available: boolean;
  category_name?: string;
  preparation_time?: number;
  options?: MenuItemOptions;
}

export interface MenuCategory {
  id: number;
  name: string;
  items: MenuItem[];
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
  is_dine_in_enabled?: boolean;
  restaurant?: number;
}

export interface Restaurant {
  id: number;
  name: string;
  slug: string;
  city: string;
  cuisine_type: string;
  description?: string;
  is_active: boolean;
  is_force_closed?: boolean;
  is_dine_in_enabled?: boolean;
  is_open?: boolean;
  is_featured: boolean;
  rating: number;
  delivery_fee: number;
  opens_at: string;
  closes_at: string;
  delivery_time_min: number;
  delivery_time_max: number;
  min_order_amount: number;
  logo_url?: string;
  cover_url?: string;
  banner_url?: string;
  phone?: string;
  address?: string;
  branches?: Branch[];
}

export type OrderStatus = 'pending' | 'received' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cod' | 'stripe' | 'payfast';

export interface Rider {
  id: number;
  branch: number;
  branch_name?: string;
  restaurant_id?: number;
  restaurant_name?: string;
  name: string;
  phone: string;
  vehicle_type: string;
  status: 'AVAILABLE' | 'ON_DELIVERY' | 'OFFLINE';
  is_active: boolean;
  created_at?: string;
}

export interface OrderItemDetail {
  id: number;
  menu_item: number;
  menu_item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_notes?: string;
}

export interface Order {
  id: number;
  display_order_id?: string;
  restaurant_id: number;
  restaurant_name: string;
  branch_name?: string;
  branch_id?: number;
  rider?: Rider | null;
  rider_id?: number | null;
  user_or_guest: string;
  guest_name?: string;
  guest_phone?: string;
  order_type?: 'DELIVERY' | 'TAKEAWAY' | 'DINE_IN';
  table_number?: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  delivery_address: string;
  delivery_lat?: number | null;
  delivery_lng?: number | null;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  special_instructions?: string;
  cancellation_reason?: string;
  created_at: string;
  items: OrderItemDetail[];
}

export interface GlobalStats {
  totalRevenue: number;
  activeTenants: number;
  totalOrders: number;
  averageOrderValue: number;
}
