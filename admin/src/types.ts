export interface User {
  id: number;
  username: string;
  email: string;
  role: 'super_admin' | 'branch_manager';
  restaurantId?: number; // Linked restaurant if branch_manager
  branchId?: number;     // Linked branch if branch_manager
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
  options?: any;
}

export interface MenuCategory {
  id: number;
  name: string;
  items: MenuItem[];
}

export interface Restaurant {
  id: number;
  name: string;
  slug: string;
  city: string;
  cuisine_type: string;
  description?: string;
  is_active: boolean;
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
}

export type OrderStatus = 'pending' | 'received' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';
export type PaymentMethod = 'cod' | 'stripe' | 'payfast';

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
  restaurant_id: number;
  restaurant_name: string;
  branch_name?: string;
  branch_id?: number;
  user_or_guest: string;
  guest_name?: string;
  guest_phone?: string;
  status: OrderStatus;
  payment_method: PaymentMethod;
  delivery_address: string;
  subtotal: number;
  delivery_fee: number;
  discount: number;
  total: number;
  special_instructions?: string;
  created_at: string;
  items: OrderItemDetail[];
}

export interface GlobalStats {
  totalRevenue: number;
  activeTenants: number;
  totalOrders: number;
  averageOrderValue: number;
}
