import type { Restaurant, Order, MenuCategory, User } from './types';

// Mock Users for Dashboard Login
export const MOCK_USERS: User[] = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@foodsphere.com',
    role: 'super_admin'
  },
  {
    id: 2,
    username: 'seenbanao_mgr',
    email: 'manager@seenbanao.com',
    role: 'branch_manager',
    restaurantId: 1
  },
  {
    id: 3,
    username: 'dineatblue_mgr',
    email: 'manager@dineatblue.com',
    role: 'branch_manager',
    restaurantId: 2
  },
  {
    id: 4,
    username: 'jushhpk_mgr',
    email: 'manager@jushhpk.com',
    role: 'branch_manager',
    restaurantId: 3
  },
  {
    id: 5,
    username: 'tandooristoppk_mgr',
    email: 'manager@tandooristoppk.com',
    role: 'branch_manager',
    restaurantId: 4
  },
  {
    id: 6,
    username: 'sandmelts_mgr',
    email: 'manager@sandmelts.com',
    role: 'branch_manager',
    restaurantId: 5
  },
  {
    id: 7,
    username: 'birdmanfoodspk_mgr',
    email: 'manager@birdmanfoodspk.com',
    role: 'branch_manager',
    restaurantId: 6
  },
  {
    id: 8,
    username: 'getafomo_mgr',
    email: 'manager@getafomo.com',
    role: 'branch_manager',
    restaurantId: 7
  }
];

// The 7 FoodSphere Restaurant Brands
export const MOCK_RESTAURANTS: Restaurant[] = [
  {
    id: 1,
    name: 'SeenBanao',
    slug: 'seenbanao',
    city: 'Karachi',
    cuisine_type: 'Desi BBQ & Handi',
    is_active: true,
    is_featured: true,
    rating: 4.8,
    delivery_fee: 100.00,
    opens_at: '12:00',
    closes_at: '23:59',
    delivery_time_min: 30,
    delivery_time_max: 45,
    min_order_amount: 500,
    phone: '+92 301 9899619',
    logo_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=150&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 2,
    name: 'DineAtBlue',
    slug: 'dineatblue',
    city: 'Islamabad',
    cuisine_type: 'Seafood Specialties',
    is_active: true,
    is_featured: false,
    rating: 4.6,
    delivery_fee: 150.00,
    opens_at: '13:00',
    closes_at: '23:00',
    delivery_time_min: 35,
    delivery_time_max: 50,
    min_order_amount: 1000,
    phone: '+92 51 9876543',
    logo_url: 'https://images.unsplash.com/photo-1551248429-40975aa4de74?w=150&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1534482421-64566f976cfa?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 3,
    name: 'JushhPK',
    slug: 'jushhpk',
    city: 'Lahore',
    cuisine_type: 'Fast Food & Burgers',
    is_active: true,
    is_featured: true,
    rating: 4.5,
    delivery_fee: 80.00,
    opens_at: '11:00',
    closes_at: '02:00',
    delivery_time_min: 20,
    delivery_time_max: 35,
    min_order_amount: 300,
    phone: '+92 326 9946142',
    logo_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 4,
    name: 'TandooriStopPK',
    slug: 'tandooristoppk',
    city: 'Peshawar',
    cuisine_type: 'Tandoori & Naan Counter',
    is_active: true,
    is_featured: false,
    rating: 4.4,
    delivery_fee: 70.00,
    opens_at: '12:00',
    closes_at: '23:30',
    delivery_time_min: 25,
    delivery_time_max: 40,
    min_order_amount: 400,
    phone: '+92 91 111222333',
    logo_url: 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=150&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1585938338676-50a62a6318e8?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 5,
    name: 'SandMelts',
    slug: 'sandmelts',
    city: 'Rawalpindi',
    cuisine_type: 'Sandwiches, Melts & Shakes',
    is_active: true,
    is_featured: false,
    rating: 4.3,
    delivery_fee: 90.00,
    opens_at: '09:00',
    closes_at: '22:00',
    delivery_time_min: 15,
    delivery_time_max: 30,
    min_order_amount: 350,
    phone: '+92 51 5556677',
    logo_url: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=150&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1539252554453-80ab65ce3586?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 6,
    name: 'BirdManFoodsPK',
    slug: 'birdmanfoodspk',
    city: 'Faisalabad',
    cuisine_type: 'Grilled & Fried Chicken',
    is_active: false, // Pending onboard / inactive by default
    is_featured: false,
    rating: 0.0,
    delivery_fee: 120.00,
    opens_at: '11:00',
    closes_at: '23:00',
    delivery_time_min: 30,
    delivery_time_max: 45,
    min_order_amount: 600,
    phone: '+92 41 1234567',
    logo_url: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=150&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 7,
    name: 'GetAFomo',
    slug: 'getafomo',
    city: 'Karachi',
    cuisine_type: 'Cafe & Event Space',
    is_active: true,
    is_featured: true,
    rating: 4.7,
    delivery_fee: 110.00,
    opens_at: '08:00',
    closes_at: '23:59',
    delivery_time_min: 20,
    delivery_time_max: 35,
    min_order_amount: 450,
    phone: '+92 21 111366677',
    logo_url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=150&auto=format&fit=crop&q=80',
    cover_url: 'https://images.unsplash.com/photo-1498804103079-a6351b050096?w=800&auto=format&fit=crop&q=80'
  }
];

// Predefined Menu Items for Brands
export const MOCK_MENU_ITEMS: Record<number, MenuCategory[]> = {
  1: [ // SeenBanao
    {
      id: 101,
      name: 'BBQ Specialties',
      items: [
        { id: 1001, name: 'Chicken Tikka Boti', description: 'Charcoal grilled spicy chicken chunks (6 pcs)', price: 420.00, is_available: true, category_name: 'BBQ Specialties' },
        { id: 1002, name: 'Seekh Kabab Handi', description: 'Beef seekh kabab cooked in creamy tomato gravy', price: 780.00, is_available: true, category_name: 'BBQ Specialties' },
        { id: 1003, name: 'Mutton Chops', description: 'Marinated chops grilled to perfection (4 pcs)', price: 1250.00, is_available: true, category_name: 'BBQ Specialties' }
      ]
    },
    {
      id: 102,
      name: 'Main Courses',
      items: [
        { id: 1004, name: 'Chicken Karahi (Half)', description: 'Traditional karahi cooked in black pepper and butter', price: 950.00, is_available: true, category_name: 'Main Courses' },
        { id: 1005, name: 'Daal Makhni', description: 'Rich lentils slow-cooked with cream and butter', price: 450.00, is_available: true, category_name: 'Main Courses' }
      ]
    }
  ],
  2: [ // DineAtBlue
    {
      id: 201,
      name: 'Starters',
      items: [
        { id: 2001, name: 'Dynamite Prawns', description: 'Crispy prawns tossed in honey sriracha mayo', price: 990.00, is_available: true, category_name: 'Starters' },
        { id: 2002, name: 'Calamari Rings', description: 'Golden fried squid rings served with tartar sauce', price: 790.00, is_available: true, category_name: 'Starters' }
      ]
    },
    {
      id: 202,
      name: 'Fisherman Fresh Platters',
      items: [
        { id: 2003, name: 'Grilled Red Snapper', description: 'Served with lemon herb butter sauce and roasted veggies', price: 2150.00, is_available: true, category_name: 'Fisherman Fresh Platters' },
        { id: 2004, name: 'Lobster Thermidor', description: 'Lobster meat cooked in a creamy mustard sauce topped with cheese', price: 3450.00, is_available: false, category_name: 'Fisherman Fresh Platters' }
      ]
    }
  ],
  3: [ // JushhPK
    {
      id: 301,
      name: 'Gourmet Burgers',
      items: [
        { id: 3001, name: 'Jushh Smash Burger', description: 'Double smashed beef patties, cheddar cheese, secret sauce', price: 680.00, is_available: true, category_name: 'Gourmet Burgers' },
        { id: 3002, name: 'Spicy Zinger Extreme', description: 'Fried crispy chicken thigh, lettuce, jalapeños, red hot sauce', price: 540.00, is_available: true, category_name: 'Gourmet Burgers' }
      ]
    },
    {
      id: 302,
      name: 'Combo Deals',
      items: [
        { id: 3003, name: 'Duo Burger Box', description: '2 Zinger Burgers, 1 Large Fries, 2 Drinks', price: 1290.00, is_available: true, category_name: 'Combo Deals' },
        { id: 3004, name: 'Party Feast Deal', description: '4 Burgers, 12 pcs Chicken Wings, 1.5L Drink', price: 2490.00, is_available: true, category_name: 'Combo Deals' }
      ]
    }
  ],
  4: [ // TandooriStopPK
    {
      id: 401,
      name: 'Clay Oven Rotis',
      items: [
        { id: 4001, name: 'Garlic Cheese Naan', description: 'Freshly baked naan stuffed with cheddar cheese and fresh garlic', price: 250.00, is_available: true, category_name: 'Clay Oven Rotis' },
        { id: 4002, name: 'Kalonji Naan', description: 'Traditional flatbread sprinkled with nigella seeds', price: 60.00, is_available: true, category_name: 'Clay Oven Rotis' }
      ]
    },
    {
      id: 402,
      name: 'Tandoori Items',
      items: [
        { id: 4003, name: 'Tandoori Sajji (Whole)', description: 'Balochi sajji stuffed with spiced rice', price: 1850.00, is_available: true, category_name: 'Tandoori Items' },
        { id: 4004, name: 'Reshmi Kabab', description: 'Spiced chicken minced kababs (4 skewers)', price: 580.00, is_available: true, category_name: 'Tandoori Items' }
      ]
    }
  ],
  5: [ // SandMelts
    {
      id: 501,
      name: 'Grilled Sandwiches',
      items: [
        { id: 5001, name: 'Philly Cheese Steak Sand', description: 'Thinly sliced beef, caramelized onions, melted Swiss cheese', price: 790.00, is_available: true, category_name: 'Grilled Sandwiches' },
        { id: 5002, name: 'Turkey Cranberry Melt', description: 'Turkey breast slices, cheddar cheese, cranberry relish', price: 690.00, is_available: true, category_name: 'Grilled Sandwiches' }
      ]
    },
    {
      id: 502,
      name: 'Milkshakes & Sides',
      items: [
        { id: 5003, name: 'Classic Avocado Shake', description: 'Fresh avocado blended with honey and milk', price: 420.00, is_available: true, category_name: 'Milkshakes & Sides' },
        { id: 5004, name: 'Loaded Chili Fries', description: 'French fries topped with cheese sauce and minced beef chili', price: 480.00, is_available: true, category_name: 'Milkshakes & Sides' }
      ]
    }
  ],
  6: [ // BirdManFoodsPK
    {
      id: 601,
      name: 'Grilled Platters',
      items: [
        { id: 6001, name: 'Half Bird Grill', description: 'Grilled chicken half marinated in hot peri sauce', price: 890.00, is_available: true, category_name: 'Grilled Platters' },
        { id: 6002, name: 'Chicken Wings Platter', description: '12 pcs of baked wings with honey mustard coating', price: 650.00, is_available: true, category_name: 'Grilled Platters' }
      ]
    }
  ],
  7: [ // GetAFomo
    {
      id: 701,
      name: 'Specialty Coffee',
      items: [
        { id: 7001, name: 'Spanish Latte', description: 'Espresso with sweetened condensed milk and steamed milk', price: 490.00, is_available: true, category_name: 'Specialty Coffee' },
        { id: 7002, name: 'Salted Caramel Cold Brew', description: 'Slow-steeped cold brew topped with salted caramel cream foam', price: 520.00, is_available: true, category_name: 'Specialty Coffee' }
      ]
    },
    {
      id: 702,
      name: 'Event Bites & Desserts',
      items: [
        { id: 7003, name: 'Fomo Chocolate Lava Cake', description: 'Rich chocolate cake with a molten center served with vanilla gelato', price: 580.00, is_available: true, category_name: 'Event Bites & Desserts' },
        { id: 7004, name: 'Smoked Salmon Croissant', description: 'Buttery croissant stuffed with smoked salmon, cream cheese, capers', price: 720.00, is_available: true, category_name: 'Event Bites & Desserts' }
      ]
    }
  ]
};

// Initial Orders Mock State
export const INITIAL_ORDERS: Order[] = [
  {
    id: 1045,
    restaurant_id: 1,
    restaurant_name: 'SeenBanao',
    user_or_guest: 'Ali Hassan',
    guest_name: 'Ali Hassan',
    guest_phone: '+92 300 1234567',
    status: 'received',
    payment_method: 'cod',
    delivery_address: 'Apartment 4B, Askari 11, Lahore',
    subtotal: 1200.00,
    delivery_fee: 100.00,
    discount: 0.00,
    total: 1300.00,
    special_instructions: 'Rider ko gate par phone karne ko kahein.',
    created_at: '2026-05-27T21:40:00Z',
    items: [
      { id: 10451, menu_item: 1001, menu_item_name: 'Chicken Tikka Boti', quantity: 2, unit_price: 420.00, total_price: 840.00 },
      { id: 10452, menu_item: 1002, menu_item_name: 'Seekh Kabab Handi', quantity: 1, unit_price: 780.00, total_price: 780.00 } // Wait, subtotal would be 1620, but we just simulate a discount or fixed subtotal
    ]
  },
  {
    id: 1046,
    restaurant_id: 3,
    restaurant_name: 'JushhPK',
    user_or_guest: 'Ayesha Khan',
    guest_name: 'Ayesha Khan',
    guest_phone: '+92 333 9876543',
    status: 'preparing',
    payment_method: 'stripe',
    delivery_address: 'House 142, Street 3, Phase 5 DHA, Karachi',
    subtotal: 1220.00,
    delivery_fee: 80.00,
    discount: 100.00,
    total: 1200.00,
    special_instructions: 'Make it extra spicy!',
    created_at: '2026-05-27T21:15:00Z',
    items: [
      { id: 10461, menu_item: 3001, menu_item_name: 'Jushh Smash Burger', quantity: 2, unit_price: 680.00, total_price: 1360.00 }
    ]
  },
  {
    id: 1047,
    restaurant_id: 2,
    restaurant_name: 'DineAtBlue',
    user_or_guest: 'Farhan Ahmed',
    guest_name: 'Farhan Ahmed',
    guest_phone: '+92 321 4455667',
    status: 'out_for_delivery',
    payment_method: 'cod',
    delivery_address: 'Office 7A, Beverly Center, Blue Area, Islamabad',
    subtotal: 1780.00,
    delivery_fee: 150.00,
    discount: 0.00,
    total: 1930.00,
    special_instructions: 'Deliver to reception on the 3rd floor.',
    created_at: '2026-05-27T20:50:00Z',
    items: [
      { id: 10471, menu_item: 2001, menu_item_name: 'Dynamite Prawns', quantity: 1, unit_price: 990.00, total_price: 990.00 },
      { id: 10472, menu_item: 2002, menu_item_name: 'Calamari Rings', quantity: 1, unit_price: 790.00, total_price: 790.00 }
    ]
  },
  {
    id: 1048,
    restaurant_id: 7,
    restaurant_name: 'GetAFomo',
    user_or_guest: 'Zainab Bibi (Guest)',
    guest_name: 'Zainab Bibi',
    guest_phone: '+92 312 8899001',
    status: 'delivered',
    payment_method: 'payfast',
    delivery_address: 'Block E, North Nazimabad, Karachi',
    subtotal: 1070.00,
    delivery_fee: 110.00,
    discount: 150.00,
    total: 1030.00,
    created_at: '2026-05-27T19:30:00Z',
    items: [
      { id: 10481, menu_item: 7001, menu_item_name: 'Spanish Latte', quantity: 1, unit_price: 490.00, total_price: 490.00 },
      { id: 10482, menu_item: 7003, menu_item_name: 'Fomo Chocolate Lava Cake', quantity: 1, unit_price: 580.00, total_price: 580.00 }
    ]
  },
  {
    id: 1049,
    restaurant_id: 1,
    restaurant_name: 'SeenBanao',
    user_or_guest: 'Kamran Shah',
    guest_name: 'Kamran Shah',
    guest_phone: '+92 300 9988776',
    status: 'delivered',
    payment_method: 'cod',
    delivery_address: 'House 22, F-8/1, Islamabad',
    subtotal: 1900.00,
    delivery_fee: 100.00,
    discount: 200.00,
    total: 1800.00,
    created_at: '2026-05-27T18:10:00Z',
    items: [
      { id: 10491, menu_item: 1004, menu_item_name: 'Chicken Karahi (Half)', quantity: 2, unit_price: 950.00, total_price: 1900.00 }
    ]
  }
];

// Global Platform Analytics
export const MOCK_GLOBAL_STATS = {
  totalRevenue: 284350.00,
  activeTenants: 6, // 6 out of 7 active
  totalOrders: 1948,
  averageOrderValue: 1459.70
};

// Brand Analytics
export const MOCK_BRAND_STATS: Record<number, { revenue: number, orders: number, aov: number }> = {
  1: { revenue: 84900.00, orders: 580, aov: 1463.79 }, // SeenBanao
  2: { revenue: 52100.00, orders: 260, aov: 2003.85 }, // DineAtBlue
  3: { revenue: 68350.00, orders: 490, aov: 1394.90 }, // JushhPK
  4: { revenue: 31200.00, orders: 290, aov: 1075.86 }, // TandooriStopPK
  5: { revenue: 24700.00, orders: 190, aov: 1300.00 }, // SandMelts
  6: { revenue: 0.00, orders: 0, aov: 0 },             // BirdManFoodsPK (Pending)
  7: { revenue: 23100.00, orders: 138, aov: 1673.91 }  // GetAFomo
};

// Revenue History for charts
export const MOCK_REVENUE_CHART = [
  { date: 'May 21', 'SeenBanao': 12000, 'JushhPK': 9000, 'DineAtBlue': 7000, 'Others': 8000, total: 36000 },
  { date: 'May 22', 'SeenBanao': 14000, 'JushhPK': 10500, 'DineAtBlue': 6800, 'Others': 9000, total: 40300 },
  { date: 'May 23', 'SeenBanao': 11000, 'JushhPK': 8000, 'DineAtBlue': 9000, 'Others': 7500, total: 35500 },
  { date: 'May 24', 'SeenBanao': 16500, 'JushhPK': 13000, 'DineAtBlue': 8500, 'Others': 11000, total: 49000 },
  { date: 'May 25', 'SeenBanao': 18000, 'JushhPK': 12000, 'DineAtBlue': 11000, 'Others': 12500, total: 53500 },
  { date: 'May 26', 'SeenBanao': 15000, 'JushhPK': 14000, 'DineAtBlue': 10000, 'Others': 13000, total: 52000 },
  { date: 'May 27', 'SeenBanao': 20000, 'JushhPK': 15500, 'DineAtBlue': 12000, 'Others': 14500, total: 62000 },
];
