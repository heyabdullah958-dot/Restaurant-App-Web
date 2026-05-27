import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Restaurant, Order, MenuCategory, OrderStatus } from './types';
import { MOCK_USERS, MOCK_RESTAURANTS, MOCK_MENU_ITEMS, INITIAL_ORDERS } from './mockData';

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
  selectedBrandId: number; // Brand being edited/viewed in Manager mode
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
}

const AdminContext = createContext<AdminContextProps | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeView, setActiveView] = useState<string>('login');
  const [restaurants, setRestaurants] = useState<Restaurant[]>(MOCK_RESTAURANTS);
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [menuItems, setMenuItems] = useState<Record<number, MenuCategory[]>>(MOCK_MENU_ITEMS);
  const [selectedBrandId, setSelectedBrandId] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Show dynamic toast notifications
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auto-remove toasts after 3 seconds
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        removeToast(toasts[0].id);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  // Login simulation
  const login = async (username: string, _: string): Promise<boolean> => {
    setLoading(true);
    // Simulate API network call delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLoading(false);

    const foundUser = MOCK_USERS.find(
      (u) => u.username.toLowerCase() === username.toLowerCase()
    );

    if (foundUser) {
      setUser(foundUser);
      showToast(`Welcome back, ${foundUser.username}!`, 'success');
      
      if (foundUser.role === 'super_admin') {
        setActiveView('super_dashboard');
        setSelectedBrandId(MOCK_RESTAURANTS.find(r => r.is_active)?.id || 1);
      } else {
        setActiveView('branch_dashboard');
        setSelectedBrandId(foundUser.restaurantId || 1);
      }
      return true;
    } else {
      showToast('Invalid credentials. Use "admin" or "seenbanao_mgr"', 'error');
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setActiveView('login');
    showToast('Logged out successfully', 'info');
  };

  const setView = (view: string) => {
    setLoading(true);
    setTimeout(() => {
      setActiveView(view);
      setLoading(false);
    }, 400);
  };

  const setSelectedBrand = (id: number) => {
    setSelectedBrandId(id);
    showToast(`Switched view to ${restaurants.find((r) => r.id === id)?.name}`, 'info');
  };

  // Update order status with instant state changes and notifications
  const updateOrderStatus = (orderId: number, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id === orderId) {
          const oldStatus = order.status;
          showToast(`Order #${orderId} status changed from ${oldStatus} to ${newStatus}`, 'success');
          return { ...order, status: newStatus };
        }
        return order;
      })
    );
  };

  // Toggle availability of menu items
  const toggleMenuAvailability = (restaurantId: number, categoryId: number, itemId: number) => {
    setMenuItems((prev) => {
      const restaurantCategories = prev[restaurantId] || [];
      const updatedCategories = restaurantCategories.map((category) => {
        if (category.id === categoryId) {
          const updatedItems = category.items.map((item) => {
            if (item.id === itemId) {
              const nextState = !item.is_available;
              showToast(
                `${item.name} is now ${nextState ? 'In Stock' : 'Out of Stock'}`,
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

  // Onboard new brand (Zero database migrations, dynamic mapping)
  const onboardNewRestaurant = (newRestaurant: Omit<Restaurant, 'id' | 'rating' | 'logo_url' | 'cover_url'>) => {
    setLoading(true);
    setTimeout(() => {
      const newId = restaurants.length + 1;
      const createdRestaurant: Restaurant = {
        ...newRestaurant,
        id: newId,
        rating: 4.5,
        logo_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=80',
        cover_url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&auto=format&fit=crop&q=80',
      };

      setRestaurants((prev) => [...prev, createdRestaurant]);

      // Initialize empty menu categories for the new restaurant
      setMenuItems((prev) => ({
        ...prev,
        [newId]: [
          {
            id: newId * 100 + 1,
            name: 'Featured Items',
            items: [
              {
                id: newId * 1000 + 1,
                name: `${newRestaurant.name} House Special`,
                description: `Fresh, hand-crafted house specialty cooked to order`,
                price: 750.00,
                is_available: true,
                category_name: 'Featured Items'
              }
            ]
          }
        ]
      }));

      // Add a demo user for the brand
      MOCK_USERS.push({
        id: MOCK_USERS.length + 1,
        username: `${newRestaurant.slug}_mgr`,
        email: `manager@${newRestaurant.slug}.com`,
        role: 'branch_manager',
        restaurantId: newId,
      });

      setLoading(false);
      showToast(`Restaurant "${newRestaurant.name}" successfully onboarded!`, 'success');
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
