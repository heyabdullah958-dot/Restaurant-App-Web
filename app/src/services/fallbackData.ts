export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string | null;
  is_available: boolean;
  is_featured: boolean;
  preparation_time: number;
  options?: any;
  categoryName?: string;
}

export interface MenuCategory {
  id: number;
  name: string;
  icon: string | null;
  order: number;
  is_active: boolean;
  items: MenuItem[];
}

export interface Restaurant {
  id: number;
  name: string;
  slug: string;
  cuisine_type: string;
  logo: string | null;
  cover_image: string | null;
  banner_image?: string | null;
  description: string;
  address: string;
  city: string;
  phone: string;
  is_active: boolean;
  is_featured: boolean;
  opens_at: string;
  closes_at: string;
  delivery_time_min: number;
  delivery_time_max: number;
  min_order_amount: number;
  delivery_fee: number;
  rating: number;
  total_reviews: number;
  categories?: MenuCategory[];
}

export const FALLBACK_RESTAURANTS: Restaurant[] = [
  {
    id: 1,
    name: "seenbanao",
    slug: "seenbanao",
    cuisine_type: "Desi BBQ & Handi",
    logo: "https://images.unsplash.com/photo-1618220179428-22790b461013?w=200&auto=format&fit=crop&q=80",
    cover_image: "https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=80",
    description: "Authentic Desi BBQ, smokey handis, and traditional clay-oven flatbreads served hot and fresh.",
    address: "Plot 12-C, 11th Commercial Street, Phase 2, Karachi",
    city: "Karachi",
    phone: "+92 300 1234567",
    is_active: true,
    is_featured: true,
    opens_at: "18:00:00",
    closes_at: "02:00:00",
    delivery_time_min: 35,
    delivery_time_max: 50,
    min_order_amount: 500,
    delivery_fee: 120,
    rating: 4.8,
    total_reviews: 245,
    categories: [
      {
        id: 101,
        name: "BBQ Specials",
        icon: "flame",
        order: 1,
        is_active: true,
        items: [
          {
            id: 1001,
            name: "Beef Seekh Kebab",
            description: "Four skewered minced beef kebab infused with traditional herbs and cooked over open charcoal.",
            price: 650,
            image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 20
          },
          {
            id: 1002,
            name: "Chicken Boti (Plate)",
            description: "Tender boneless chicken chunks marinated in yogurt, lemon, and hot tandoori spices.",
            price: 580,
            image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: false,
            preparation_time: 15
          }
        ]
      },
      {
        id: 102,
        name: "Handi & Karahi",
        icon: "bowl",
        order: 2,
        is_active: true,
        items: [
          {
            id: 1003,
            name: "Chicken Makhni Handi",
            description: "Creamy, buttery chicken gravy slow-cooked in a traditional clay handi.",
            price: 1250,
            image: "https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 25
          }
        ]
      },
      {
        id: 103,
        name: "Naan & Roti",
        icon: "disc",
        order: 3,
        is_active: true,
        items: [
          {
            id: 1004,
            name: "Roghni Naan",
            description: "Leavened flatbread brushed with sesame seeds, milk, and melted butter.",
            price: 80,
            image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: false,
            preparation_time: 8
          },
          {
            id: 1005,
            name: "Garlic Naan",
            description: "Freshly baked naan topped with crushed garlic and fresh coriander.",
            price: 100,
            image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: false,
            preparation_time: 8
          }
        ]
      }
    ]
  },
  {
    id: 2,
    name: "dineatblue",
    slug: "dineatblue",
    cuisine_type: "Seafood Specialty",
    logo: "https://images.unsplash.com/photo-1551218808-94e220e084d2?w=200&auto=format&fit=crop&q=80",
    cover_image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800&auto=format&fit=crop&q=80",
    description: "Premium seafood creations, freshly caught and expertly cooked by our master chefs.",
    address: "Block 4, Clifton Beach Road, Karachi",
    city: "Karachi",
    phone: "+92 21 3456789",
    is_active: true,
    is_featured: true,
    opens_at: "12:00:00",
    closes_at: "23:30:00",
    delivery_time_min: 40,
    delivery_time_max: 55,
    min_order_amount: 1000,
    delivery_fee: 150,
    rating: 4.9,
    total_reviews: 188,
    categories: [
      {
        id: 201,
        name: "Appetizers",
        icon: "restaurant",
        order: 1,
        is_active: true,
        items: [
          {
            id: 2001,
            name: "Dynamite Shrimp",
            description: "Crispy batter-fried shrimp tossed in our signature creamy, spicy dynamite sauce.",
            price: 950,
            image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 15
          }
        ]
      },
      {
        id: 202,
        name: "Chef's Specials",
        icon: "star",
        order: 2,
        is_active: true,
        items: [
          {
            id: 2002,
            name: "Grilled Lobster Thermidor",
            description: "Lobster meat cooked in a rich white wine cream sauce, stuffed back into the shell, and topped with parmesan.",
            price: 4500,
            image: "https://images.unsplash.com/photo-1553618551-fba689030290?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 35
          },
          {
            id: 2003,
            name: "Red Snapper with Herb Butter",
            description: "Char-grilled whole red snapper served with a side of garlic-seasoned vegetables and lemon herb butter.",
            price: 2400,
            image: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 25
          }
        ]
      }
    ]
  },
  {
    id: 3,
    name: "jushhpk",
    slug: "jushhpk",
    cuisine_type: "Fast Food & Burgers",
    logo: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=200&auto=format&fit=crop&q=80",
    cover_image: "https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80",
    description: "Sizzling gourmet burgers, loaded dynamic fries, and unbeatable value combo meals.",
    address: "F-11 Markaz, Islamabad",
    city: "Islamabad",
    phone: "+92 51 9876543",
    is_active: true,
    is_featured: true,
    opens_at: "11:00:00",
    closes_at: "03:00:00",
    delivery_time_min: 20,
    delivery_time_max: 35,
    min_order_amount: 300,
    delivery_fee: 60,
    rating: 4.6,
    total_reviews: 412,
    categories: [
      {
        id: 301,
        name: "Burgers",
        icon: "fast-food",
        order: 1,
        is_active: true,
        items: [
          {
            id: 3001,
            name: "Jush Double Smash Burger",
            description: "Two smashed premium beef patties, melted cheddar cheese, caramelized onions, and house Jush sauce on a toasted brioche bun.",
            price: 850,
            image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 12
          },
          {
            id: 3002,
            name: "Spicy Crispy Zinger",
            description: "Crispy fried chicken breast, shredded lettuce, and spicy mayo on a sesame bun.",
            price: 600,
            image: "https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: false,
            preparation_time: 10
          }
        ]
      },
      {
        id: 302,
        name: "Combo Deals",
        icon: "gift",
        order: 2,
        is_active: true,
        items: [
          {
            id: 3003,
            name: "Duo Feast Combo",
            description: "2 Jush Double Smash Burgers, 1 Large Fries, and 2 Soft Drinks.",
            price: 1850,
            image: "https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 15
          }
        ]
      }
    ]
  },
  {
    id: 4,
    name: "tandooristoppk",
    slug: "tandooristoppk",
    cuisine_type: "Tandoori & Desi",
    logo: "https://images.unsplash.com/photo-1585934580916-52b1ca392ac5?w=200&auto=format&fit=crop&q=80",
    cover_image: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&auto=format&fit=crop&q=80",
    description: "Rustic clay-oven grilled tikka, specialty cheese & Nutella naans, and rich buttery lentils.",
    address: "Phase 6 DHA, Lahore",
    city: "Lahore",
    phone: "+92 42 111826366",
    is_active: true,
    is_featured: false,
    opens_at: "17:00:00",
    closes_at: "01:00:00",
    delivery_time_min: 30,
    delivery_time_max: 45,
    min_order_amount: 400,
    delivery_fee: 90,
    rating: 4.5,
    total_reviews: 154,
    categories: [
      {
        id: 401,
        name: "Tandoori Platters",
        icon: "restaurant",
        order: 1,
        is_active: true,
        items: [
          {
            id: 4001,
            name: "Tandoori Chicken Tikka (Leg)",
            description: "Traditional spicy red chicken leg quarter grilled to perfection in clay oven.",
            price: 380,
            image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 15
          }
        ]
      },
      {
        id: 402,
        name: "Specialty Naans",
        icon: "pizza",
        order: 2,
        is_active: true,
        items: [
          {
            id: 4002,
            name: "Cheese Stuffed Naan",
            description: "Soft naan bread stuffed with a blend of mozzarella and cheddar cheese, sprinkled with herbs.",
            price: 350,
            image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 10
          },
          {
            id: 4003,
            name: "Dessert Nutella Naan",
            description: "Warm naan bread slathered with rich chocolate Nutella and sliced almonds.",
            price: 450,
            image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: false,
            preparation_time: 10
          }
        ]
      }
    ]
  },
  {
    id: 5,
    name: "sandmelts",
    slug: "sandmelts",
    cuisine_type: "Sandwiches & Melts",
    logo: "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=200&auto=format&fit=crop&q=80",
    cover_image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80",
    description: "Sourdough grilled melts, healthy club sandwiches, and thick creamy dairy shakes.",
    address: "Gulshan-e-Iqbal, Block 13-D, Karachi",
    city: "Karachi",
    phone: "+92 321 9876543",
    is_active: true,
    is_featured: false,
    opens_at: "10:00:00",
    closes_at: "23:00:00",
    delivery_time_min: 25,
    delivery_time_max: 40,
    min_order_amount: 350,
    delivery_fee: 70,
    rating: 4.4,
    total_reviews: 99,
    categories: [
      {
        id: 501,
        name: "Signature Melts",
        icon: "bread",
        order: 1,
        is_active: true,
        items: [
          {
            id: 5001,
            name: "Spicy Roast Beef Melt",
            description: "Shredded roast beef, green chillies, spicy cheese sauce, and cheddar melted in toasted sourdough.",
            price: 790,
            image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 15
          }
        ]
      },
      {
        id: 502,
        name: "Shakes",
        icon: "cafe",
        order: 2,
        is_active: true,
        items: [
          {
            id: 5002,
            name: "Lotus Biscoff Shake",
            description: "Thick creamy vanilla ice cream blended with Lotus biscoff butter and cookies.",
            price: 590,
            image: "https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 8
          }
        ]
      }
    ]
  },
  {
    id: 6,
    name: "birdmanfoodspk",
    slug: "birdmanfoodspk",
    cuisine_type: "Grilled & Fried Chicken",
    logo: "https://images.unsplash.com/photo-1627662236973-4f8259fa2441?w=200&auto=format&fit=crop&q=80",
    cover_image: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=800&auto=format&fit=crop&q=80",
    description: "Ultra-crispy Southern style fried chicken and juicy flame-grilled Peri Peri items.",
    address: "Johar Town, Civic Center, Lahore",
    city: "Lahore",
    phone: "+92 312 4567890",
    is_active: true,
    is_featured: false,
    opens_at: "12:00:00",
    closes_at: "02:00:00",
    delivery_time_min: 20,
    delivery_time_max: 35,
    min_order_amount: 300,
    delivery_fee: 80,
    rating: 4.7,
    total_reviews: 215,
    categories: [
      {
        id: 601,
        name: "Fried Chicken",
        icon: "pizza",
        order: 1,
        is_active: true,
        items: [
          {
            id: 6001,
            name: "Crispy Drum & Thigh Combo (3pcs)",
            description: "Spicy double-dreaded crisp fried chicken parts served with garlic dip.",
            price: 720,
            image: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 12
          }
        ]
      },
      {
        id: 602,
        name: "Grilled Chicken",
        icon: "flame",
        order: 2,
        is_active: true,
        items: [
          {
            id: 6002,
            name: "Half Peri Peri Grilled Chicken",
            description: "Flame-broiled chicken half marinated in spicy African bird's eye chili marinade.",
            price: 1100,
            image: "https://images.unsplash.com/photo-1598515214211-89d3e73ae83b?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 22
          }
        ]
      }
    ]
  },
  {
    id: 7,
    name: "getafomo",
    slug: "getafomo",
    cuisine_type: "Trendy Café & Bakery",
    logo: "https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=200&auto=format&fit=crop&q=80",
    cover_image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800&auto=format&fit=crop&q=80",
    description: "Indulge in artisanal sourdough toasts, high-grade specialty coffee, and photo-ready waffles.",
    address: "E-Street, Phase 5 DHA, Karachi",
    city: "Karachi",
    phone: "+92 21 111366677",
    is_active: true,
    is_featured: true,
    opens_at: "08:00:00",
    closes_at: "23:00:00",
    delivery_time_min: 20,
    delivery_time_max: 30,
    min_order_amount: 400,
    delivery_fee: 100,
    rating: 4.8,
    total_reviews: 310,
    categories: [
      {
        id: 701,
        name: "Specialty Coffee",
        icon: "cafe",
        order: 1,
        is_active: true,
        items: [
          {
            id: 7001,
            name: "Artisanal Spanish Latte",
            description: "Double shot of premium espresso with sweetened condensed milk and silky microfoam.",
            price: 520,
            image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 6
          }
        ]
      },
      {
        id: 702,
        name: "All Day Breakfast",
        icon: "restaurant",
        order: 2,
        is_active: true,
        items: [
          {
            id: 7002,
            name: "Smashed Avocado Toast",
            description: "Poached eggs, crushed avocado, chili flakes, and feta cheese on thick cut artisanal sourdough.",
            price: 850,
            image: "https://images.unsplash.com/photo-1541532713592-79a0317b6b77?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 15
          }
        ]
      }
    ]
  }
];

export const getImageUrl = (path: string | null) => {
  if (!path) {
    return { uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80' };
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return { uri: path };
  }
  // Remove /api if present at the end of the base URL
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';
  const base = apiUrl.replace(/\/api\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return { uri: `${base}${cleanPath}` };
};
