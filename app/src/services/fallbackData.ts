import { Platform } from 'react-native';

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string | null;
  image_url?: string | null; // FIX 2A: Absolute Cloudinary URL from backend serializer.
                              // Prefer this over `image` (raw storage path) for rendering.
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
    is_active: false,
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
        id: 327,
        name: "BBQ Specials",
        icon: "flame",
        order: 1,
        is_active: true,
        items: [
          {
            id: 1278,
            name: "Beef Seekh Kebab",
            description: "Four skewered minced beef kebab infused with traditional herbs and cooked over open charcoal.",
            price: 650,
            image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 20
          },
          {
            id: 1279,
            name: "Chicken Boti (Plate)",
            description: "Tender boneless chicken chunks marinated in yogurt, lemon, and hot tandoori spices.",
            price: 580,
            image: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: false,
            preparation_time: 15
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
    is_active: false,
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
        id: 362,
        name: "Appetizers",
        icon: "restaurant",
        order: 1,
        is_active: true,
        items: [
          {
            id: 1424,
            name: "Dynamite Shrimp",
            description: "Crispy batter-fried shrimp tossed in our signature creamy, spicy dynamite sauce.",
            price: 950,
            image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 15
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
    logo: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/jushh_logo.jpg",
    cover_image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/jushh_banner_collage.jpg",
    description: "Sizzling gourmet burgers, loaded dynamic fries, and unbeatable value combo meals.",
    address: "Gulberg III, Lahore",
    city: "Lahore",
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
        id: 337,
        name: "Appetizer",
        icon: "restaurant",
        order: 1,
        is_active: true,
        items: [
          { id: 1314, name: "Chicken Doner Fries", description: "Crispy fries topped with sliced chicken doner and sauces", price: 600, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_doner_fries.jpg", is_available: true, is_featured: true, preparation_time: 10 },
          { id: 1315, name: "Beef Doner Fries", description: "Crispy fries topped with sliced beef doner and signature sauces", price: 750, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_doner_fries.jpg", is_available: true, is_featured: false, preparation_time: 10 }
        ]
      },
      {
        id: 338,
        name: "Turkish Specials",
        icon: "restaurant",
        order: 2,
        is_active: true,
        items: [
          { id: 1316, name: "Chicken Grilled Sandwich", description: "Grilled chicken sandwich Turkish style", price: 750, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_grilled_sandwich.jpg", is_available: true, is_featured: true, preparation_time: 12 },
          { id: 1317, name: "Half Dubai Shawaya", description: "Traditional roasted chicken shawaya half portion", price: 1400, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/half_dubai_shawaya.jpg", is_available: true, is_featured: false, preparation_time: 20 }
        ]
      },
      {
        id: 339,
        name: "Shawarma",
        icon: "pizza",
        order: 3,
        is_active: true,
        items: [
          { id: 1324, name: "Chicken Pouch Shawarma", description: "Pocket-style chicken shawarma pocket bread", price: 450, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_pouch_shawarma.jpg", is_available: true, is_featured: false, preparation_time: 10 },
          { id: 1325, name: "Beef Pouch Shawarma", description: "Pocket-style beef shawarma pocket bread", price: 700, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_pouch_shawarma.jpg", is_available: true, is_featured: false, preparation_time: 10 }
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
        id: 343,
        name: "Tandoori Chicken",
        icon: "restaurant",
        order: 1,
        is_active: true,
        items: [
          { id: 1345, name: "Tandoori Chicken Bone (Cheese Naan Single)", description: "Tandoori chicken (with bone) served with 1 cheese naan", price: 1150, image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&auto=format&fit=crop&q=80", is_available: true, is_featured: true, preparation_time: 15 },
          { id: 1346, name: "Tandoori Chicken Boneless (Cheese Naan Single)", description: "Boneless tandoori chicken served with 1 cheese naan", price: 1350, image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&auto=format&fit=crop&q=80", is_available: true, is_featured: false, preparation_time: 15 }
        ]
      },
      {
        id: 344,
        name: "Chicken Sajji",
        icon: "restaurant",
        order: 2,
        is_active: true,
        items: [
          { id: 1353, name: "Quarter Sajji", description: "Slow-roasted quarter chicken sajji", price: 799, image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&auto=format&fit=crop&q=80", is_available: true, is_featured: true, preparation_time: 20 },
          { id: 1354, name: "Half Sajji", description: "Slow-roasted half chicken sajji", price: 1400, image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&auto=format&fit=crop&q=80", is_available: true, is_featured: false, preparation_time: 25 }
        ]
      },
      {
        id: 345,
        name: "Paratha Roll",
        icon: "pizza",
        order: 3,
        is_active: true,
        items: [
          { id: 1359, name: "Full Stop Roll", description: "TandooriStopp signature giant roll", price: 650, image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=400&auto=format&fit=crop&q=80", is_available: true, is_featured: true, preparation_time: 10 },
          { id: 1360, name: "Tandoori Chicken Roll", description: "Tandoori chicken chunks wrapped in paratha", price: 520, image: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=400&auto=format&fit=crop&q=80", is_available: true, is_featured: false, preparation_time: 10 }
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
    is_active: false,
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
        id: 352,
        name: "Signature Melts",
        icon: "bread",
        order: 1,
        is_active: true,
        items: [
          {
            id: 1391,
            name: "Chicken Black Pepper Sandwich",
            description: "Shredded chicken in black pepper sauce melted in toasted sourdough.",
            price: 790,
            image: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 15
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
    is_active: false,
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
        id: 358,
        name: "Fried Chicken",
        icon: "pizza",
        order: 1,
        is_active: true,
        items: [
          {
            id: 1415,
            name: "Crispy Fried Chicken (2pcs)",
            description: "Spicy double-dreaded crisp fried chicken parts served with garlic dip.",
            price: 720,
            image: "https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 12
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
        id: 359,
        name: "Specialty Coffee",
        icon: "cafe",
        order: 1,
        is_active: true,
        items: [
          {
            id: 1418,
            name: "Espresso Double",
            description: "Double shot of premium espresso with sweetened condensed milk and silky microfoam.",
            price: 520,
            image: "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 6
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
  const PROD_API_URL = 'https://restaurant-app-web.onrender.com/api';
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || PROD_API_URL;
  const base = apiUrl.replace(/\/api\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return { uri: `${base}${cleanPath}` };
};
