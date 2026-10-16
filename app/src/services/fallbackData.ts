import { Platform } from 'react-native';
import { API_BASE_URL } from './api';

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
  active_flash_deal?: {
    deal_id: number;
    title: string;
    description?: string;
    badge: string;
    deal_type: string;
    discount_value: number;
    original_price: number;
    discount_amount: number;
    discounted_price: number;
    window_ends_at?: string | null;
  } | null;
  branch_availability_map?: Record<string, boolean>;
  other_available_branches?: Array<{ id: number; name: string }>;
}

export interface MenuCategory {
  id: number;
  name: string;
  icon: string | null;
  order: number;
  is_active: boolean;
  items: MenuItem[];
}

export interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  is_active: boolean;
  area_keywords?: string[];
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
  is_force_closed?: boolean;
  is_open?: boolean;
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
  branches?: Branch[];
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
        id: 1,
        name: "BBQ Specials",
        icon: "flame",
        order: 1,
        is_active: true,
        items: [
          {
            id: 21,
            name: "Beef Seekh Kebab",
            description: "Four skewered minced beef kebab infused with traditional herbs and cooked over open charcoal.",
            price: 650,
            image: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=400&auto=format&fit=crop&q=80",
            is_available: true,
            is_featured: true,
            preparation_time: 20
          },
          {
            id: 23,
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
    "id": 2,
    "name": "Dine At Blue",
    "slug": "dineatblue",
    "cuisine_type": "Seafood & Ocean Fine-Casual",
    "logo": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150463/dineatblue/brand/logo.png",
    "cover_image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150458/dineatblue/brand/hero_seafood.png",
    "description": "Lahore's premier ocean-inspired seafood destination. Fresh steamed lobsters, mud crabs, king prawns, and signature seafood platters.",
    "address": "94-B/2, MM Alam Road, Gulberg III, Lahore",
    "city": "Lahore",
    "phone": "0321-8484111",
    "is_active": true,
    "is_featured": true,
    "opens_at": "00:00:00",
    "closes_at": "23:59:59",
    "delivery_time_min": 35,
    "delivery_time_max": 50,
    "min_order_amount": 1000,
    "delivery_fee": 150,
    "rating": 4.9,
    "total_reviews": 185,
    "branches": [
        {
            "id": 73,
            "name": "Gulberg III Main Outlet",
            "address": "94-B/2, MM Alam Road, Gulberg III, Lahore",
            "phone": "0321-8484111",
            "is_active": true
        }
    ],
    "categories": [
        {
            "id": 201,
            "name": "SIGNATURE PLATTERS",
            "icon": "restaurant",
            "order": 1,
            "is_active": true,
            "items": [
                {
                    "id": 2001,
                    "name": "Blue Seafood Platter (Steamed)",
                    "description": "An indulgent medley of crabs, lobsters, prawns, shrimps, tiger prawns, fish, squid, dumplings, vegetables, boiled eggs, butter mushroom rice, and sauces - delicately steamed to highlight the natural elegance of the sea.",
                    "price": 4999.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150436/dineatblue/menu_items/blue_seafood_platter.png",
                    "is_available": true,
                    "is_featured": true,
                    "preparation_time": 25,
                    "options": [
                        {
                            "name": "2 Person Platter",
                            "price_modifier": 0,
                            "price": 4999
                        },
                        {
                            "name": "Without Lobster",
                            "price_modifier": 3501,
                            "price": 8500
                        },
                        {
                            "name": "With Lobster",
                            "price_modifier": 8001,
                            "price": 13000
                        }
                    ]
                },
                {
                    "id": 2002,
                    "name": "2 Person Seafood & Chicken Platter",
                    "description": "A decadent combination platter featuring succulent seafood and grilled chicken favorites with savory accompaniments.",
                    "price": 3500.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150443/dineatblue/menu_items/chicken_platter_2person.png",
                    "is_available": true,
                    "is_featured": true,
                    "preparation_time": 25
                }
            ]
        },
        {
            "id": 202,
            "name": "STARTERS",
            "icon": "restaurant",
            "order": 2,
            "is_active": true,
            "items": [
                {
                    "id": 2003,
                    "name": "Kunafa Prawns (3 pcs)",
                    "description": "Crispy kataifi-wrapped jumbo prawns garnished with crushed pistachio and sweet spicy dip.",
                    "price": 1100.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150461/dineatblue/menu_items/kunafa_prawns.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2004,
                    "name": "Dynamite Prawns",
                    "description": "Crisp fried prawns tossed in signature creamy spicy dynamite glaze on a bed of fresh slaw.",
                    "price": 1260.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150448/dineatblue/menu_items/dynamite_prawns.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2005,
                    "name": "Seared Dumplings (6 pcs)",
                    "description": "Golden pan-seared gyoza dumplings with savory filling and sesame chili soy dip.",
                    "price": 600.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150480/dineatblue/menu_items/seared_dumplings.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2006,
                    "name": "Chicken Dumplings (6 pcs)",
                    "description": "Steamed chicken dumplings served with aromatic chili soy dipping sauce.",
                    "price": 500.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150442/dineatblue/menu_items/chicken_dumplings.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2007,
                    "name": "Dynamite Chicken",
                    "description": "Crispy chicken bites coated in tangy, fiery dynamite dressing.",
                    "price": 850.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150446/dineatblue/menu_items/dynamite_chicken.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2008,
                    "name": "Honey Wings (6 pcs)",
                    "description": "Glazed sesame chicken wings tossed in sticky honey sauce with crisp garden salad.",
                    "price": 700.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150459/dineatblue/menu_items/honey_wings.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2009,
                    "name": "Fish & Chips",
                    "description": "Golden crispy battered fish fillets served with steak fries and homemade tartar sauce.",
                    "price": 850.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150449/dineatblue/menu_items/fish_and_chips.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2010,
                    "name": "19B Soup",
                    "description": "Traditional thick, savory oriental seafood and chicken soup with fresh herbs.",
                    "price": 390.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150481/dineatblue/menu_items/soup_19b.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2011,
                    "name": "Chicken Corn Soup",
                    "description": "Classic comforting chicken corn soup with shredded chicken and sweet corn.",
                    "price": 350.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150440/dineatblue/menu_items/chicken_corn_soup.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                }
            ]
        },
        {
            "id": 203,
            "name": "SALADS",
            "icon": "restaurant",
            "order": 3,
            "is_active": true,
            "items": [
                {
                    "id": 2012,
                    "name": "BBQ Prawn Salad",
                    "description": "Fresh garden greens tossed with flame-grilled prawns, cherry tomatoes, and citrus vinaigrette.",
                    "price": 900.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150434/dineatblue/menu_items/bbq_prawn_salad.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                }
            ]
        },
        {
            "id": 204,
            "name": "MAINS - SEAFOOD",
            "icon": "restaurant",
            "order": 4,
            "is_active": true,
            "items": [
                {
                    "id": 2013,
                    "name": "Romesco Fish",
                    "description": "Pan-grilled fresh fish fillet smothered in rich Spanish romesco almond-pepper sauce.",
                    "price": 2000.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150479/dineatblue/menu_items/romesco_fish.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2014,
                    "name": "Umami Fish",
                    "description": "Seared fish fillet basted in savory umami glaze topped with fresh herbs.",
                    "price": 1800.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150488/dineatblue/menu_items/umami_fish.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2015,
                    "name": "Pamphlet Fish",
                    "description": "Whole grilled pomfret marinated in aromatic coastal herbs and garlic butter.",
                    "price": 1900.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150472/dineatblue/menu_items/pamphlet_fish.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2016,
                    "name": "Fish Chilli Dry",
                    "description": "Crisp wok-tossed fish chunks with green chilies, onions, and spicy Asian seasonings.",
                    "price": 1500.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150450/dineatblue/menu_items/fish_chilli_dry.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2017,
                    "name": "Vietnamese Fish",
                    "description": "Tender fish fillet wok-cooked with Vietnamese sweet-tangy garlic glaze.",
                    "price": 1500.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150489/dineatblue/menu_items/vietnamese_fish.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2018,
                    "name": "Thermidor Lobster",
                    "description": "Rich baked lobster meat in creamy cheese and white wine reduction topped with melted crust.",
                    "price": 5000.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150487/dineatblue/menu_items/thermidor_lobster.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2019,
                    "name": "Grilled Lobster",
                    "description": "Whole succulent lobster flame-grilled with garlic butter and lemon wedges.",
                    "price": 5000.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150455/dineatblue/menu_items/grilled_lobster.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2020,
                    "name": "BBQ Prawns",
                    "description": "Skewered king prawns chargrilled over live charcoal with smokey glaze.",
                    "price": 2500.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150435/dineatblue/menu_items/bbq_prawns.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2021,
                    "name": "Prawn Pasta",
                    "description": "Al dente fettuccine tossed with saut\u00e9ed prawns in creamy garlic marinara sauce.",
                    "price": 1900.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150475/dineatblue/menu_items/prawn_pasta.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2022,
                    "name": "Steamed Crab",
                    "description": "Fresh mud crab delicately steamed to perfection with ginger scallion dipping oil.",
                    "price": 2000.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150484/dineatblue/menu_items/steamed_crab.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2023,
                    "name": "Mud Crab",
                    "description": "Whole mud crab cooked in savory spicy coastal chili sauce.",
                    "price": 2000.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150471/dineatblue/menu_items/mud_crab.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2024,
                    "name": "Grilled Fish",
                    "description": "Catch of the day fish fillet seasoned with coastal spices and char-grilled.",
                    "price": 2500.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150454/dineatblue/menu_items/grilled_fish.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                }
            ]
        },
        {
            "id": 205,
            "name": "MAINS - CHICKEN",
            "icon": "restaurant",
            "order": 5,
            "is_active": true,
            "items": [
                {
                    "id": 2025,
                    "name": "Chilli Mint Chicken",
                    "description": "Stir-fried chicken tossed with fresh garden mint, green chilies, and tangy soy sauce.",
                    "price": 900.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150443/dineatblue/menu_items/chilli_mint_chicken.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2026,
                    "name": "Cashew Nut Chicken",
                    "description": "Wok-fried chicken breast cubes with roasted cashew nuts and bell peppers.",
                    "price": 1000.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150439/dineatblue/menu_items/cashew_nut_chicken.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2027,
                    "name": "Korean Fried Chicken",
                    "description": "Double-fried crispy chicken glazed in sweet and spicy gochujang sauce.",
                    "price": 1100.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150460/dineatblue/menu_items/korean_fried_chicken.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2028,
                    "name": "Chicken Chilli Dry",
                    "description": "Classic stir-fried boneless chicken with crisp onions, bell peppers, and red chilies.",
                    "price": 1100.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150439/dineatblue/menu_items/chicken_chilli_dry.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2029,
                    "name": "Sweet & Sour Chicken",
                    "description": "Crispy chicken tossed with bell peppers and pineapple in vibrant sweet and sour glaze.",
                    "price": 1050.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150486/dineatblue/menu_items/sweet_and_sour_chicken.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2030,
                    "name": "House Special Chicken",
                    "description": "Chef's signature chicken saut\u00e9ed with secret ocean spices and aromatic sauce.",
                    "price": 1250.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150459/dineatblue/menu_items/house_special_chicken.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                }
            ]
        },
        {
            "id": 206,
            "name": "BEVERAGES & MOJITOS",
            "icon": "restaurant",
            "order": 6,
            "is_active": true,
            "items": [
                {
                    "id": 2031,
                    "name": "Strawberry Mojito",
                    "description": "Chilled sparkling strawberry mocktail with fresh mint and lime.",
                    "price": 350.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150485/dineatblue/menu_items/strawberry_mojito.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2032,
                    "name": "Blueberry Mojito",
                    "description": "Refreshing ocean blueberry cooler with crushed ice and mint.",
                    "price": 350.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150437/dineatblue/menu_items/blueberry_mojito.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2033,
                    "name": "Peach Mojito",
                    "description": "Succulent peach nectar blended with sparkling soda and garden mint.",
                    "price": 350.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150473/dineatblue/menu_items/peach_mojito.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2034,
                    "name": "Green Apple Mojito",
                    "description": "Crisp green apple mocktail with zesty lime splash.",
                    "price": 350.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150453/dineatblue/menu_items/green_apple_mojito.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2035,
                    "name": "Fresh Lemonade",
                    "description": "Freshly squeezed lemon cooler with mint leaves.",
                    "price": 350.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150462/dineatblue/menu_items/lemonade.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2036,
                    "name": "Pepsi / 7Up (Tin)",
                    "description": "Chilled 250ml soda can.",
                    "price": 150.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150474/dineatblue/menu_items/pepsi_7up.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2037,
                    "name": "Mineral Water (Small)",
                    "description": "Chilled pure mineral water.",
                    "price": 100.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150490/dineatblue/menu_items/water.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                }
            ]
        },
        {
            "id": 207,
            "name": "ADD-ONS",
            "icon": "restaurant",
            "order": 7,
            "is_active": true,
            "items": [
                {
                    "id": 2038,
                    "name": "Butter Mushroom Rice",
                    "description": "Fragrant buttered rice saut\u00e9ed with button mushrooms.",
                    "price": 300.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150438/dineatblue/menu_items/butter_rice.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2039,
                    "name": "Roasted Potatoes",
                    "description": "Oven-roasted baby potatoes with rosemary and garlic butter.",
                    "price": 300.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150476/dineatblue/menu_items/roasted_potatoes.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2040,
                    "name": "Steak Fries",
                    "description": "Thick-cut golden salted french fries.",
                    "price": 300.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150452/dineatblue/menu_items/french_fries.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
                },
                {
                    "id": 2041,
                    "name": "Special Dynamite Dip",
                    "description": "Creamy spicy seafood dip.",
                    "price": 200.0,
                    "image": "https://res.cloudinary.com/depa8gfnk/image/upload/v1792150447/dineatblue/menu_items/dynamite_dip.png",
                    "is_available": true,
                    "is_featured": false,
                    "preparation_time": 15
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
    branches: [
      { id: 34, name: "DHA Phase 1 Branch", address: "F9JW+R3G, Sector H Dha Phase 1, Lahore, Pakistan", phone: "03257217221", is_active: true },
      { id: 4, name: "Johar Town Branch", address: "Block R2, 256 / A, Near Shaukat Khanum Hospital Rd, Johar Town, Lahore", phone: "03269946142", is_active: true },
      { id: 35, name: "Lake City Branch", address: "C 4-6 plaza Number, business bay, M1, Lake City, Lahore", phone: "03244441735", is_active: true }
    ],
    categories: [

      {
        id: 3,
        name: "Appetizer",
        icon: "restaurant",
        order: 1,
        is_active: true,
        items: [
          { id: 37, name: "Chicken Doner Fries", description: "Crispy fries topped with sliced chicken doner and sauces", price: 600, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_doner_fries.jpg", is_available: true, is_featured: true, preparation_time: 10 },
          { id: 38, name: "Beef Doner Fries", description: "Crispy fries topped with sliced beef doner and signature sauces", price: 750, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_doner_fries.jpg", is_available: true, is_featured: false, preparation_time: 10 }
        ]
      },
      {
        id: 4,
        name: "Turkish Specials",
        icon: "restaurant",
        order: 2,
        is_active: true,
        items: [
          { id: 39, name: "Chicken Grilled Sandwich", description: "Grilled chicken sandwich Turkish style", price: 750, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_grilled_sandwich.jpg", is_available: true, is_featured: true, preparation_time: 12 },
          { id: 41, name: "Half Dubai Shawaya", description: "Traditional roasted chicken shawaya half portion", price: 1400, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/half_dubai_shawaya.jpg", is_available: true, is_featured: false, preparation_time: 20 }
        ]
      },
      {
        id: 5,
        name: "Shawarma",
        icon: "pizza",
        order: 3,
        is_active: true,
        items: [
          { id: 48, name: "Chicken Pouch Shawarma", description: "Pocket-style chicken shawarma pocket bread", price: 450, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_pouch_shawarma.jpg", is_available: true, is_featured: false, preparation_time: 10 },
          { id: 49, name: "Beef Pouch Shawarma", description: "Pocket-style beef shawarma pocket bread", price: 700, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_pouch_shawarma.jpg", is_available: true, is_featured: false, preparation_time: 10 }
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
    branches: [
      { id: 2, name: "Lake City", address: "Sector M7 Lake City, Lahore", phone: "0324-4441735", is_active: true },
      { id: 48, name: "Mozang Chungi", address: "16-B Temple Road, Shoukat Plaza, Mozang Chungi, Lahore", phone: "0327-4945947", is_active: true },
      { id: 3, name: "Baghbanpura", address: "Ghass Mandi Stop, Baghbanpura, Lahore, 54000", phone: "0326-6811177", is_active: true }
    ],
    categories: [

      {
        id: 6,
        name: "Tandoori Chicken",
        icon: "restaurant",
        order: 1,
        is_active: true,
        items: [
          { id: 70, name: "Tandoori Chicken Bone (Cheese Naan Single)", description: "Tandoori chicken (with bone) served with 1 cheese naan", price: 1150, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1288_IMG_7585.JPG_xhiffo", is_available: true, is_featured: true, preparation_time: 15 },
          { id: 71, name: "Tandoori Chicken Boneless (Cheese Naan Single)", description: "Boneless tandoori chicken served with 1 cheese naan", price: 1350, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1289_IMG_7585.JPG_cxjp6v", is_available: true, is_featured: false, preparation_time: 15 }
        ]
      },
      {
        id: 7,
        name: "Chicken Sajji",
        icon: "restaurant",
        order: 2,
        is_active: true,
        items: [
          { id: 78, name: "Quarter Sajji", description: "Slow-roasted quarter chicken sajji", price: 799, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1296_IMG_7587.JPG_cbsi5z", is_available: true, is_featured: true, preparation_time: 20 },
          { id: 79, name: "Half Sajji", description: "Slow-roasted half chicken sajji", price: 1400, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1297_IMG_7587.JPG_s9a0wa", is_available: true, is_featured: false, preparation_time: 25 }
        ]
      },
      {
        id: 8,
        name: "Paratha Roll",
        icon: "pizza",
        order: 3,
        is_active: true,
        items: [
          { id: 84, name: "Full Stop Roll", description: "TandooriStopp signature giant roll", price: 650, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1302_IMG_7591.JPG_veizgo", is_available: true, is_featured: true, preparation_time: 10 },
          { id: 85, name: "Tandoori Chicken Roll", description: "Tandoori chicken chunks wrapped in paratha", price: 520, image: "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1303_IMG_7591.JPG_kooigy", is_available: true, is_featured: false, preparation_time: 10 }
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
        id: 9,
        name: "Signature Melts",
        icon: "bread",
        order: 1,
        is_active: true,
        items: [
          {
            id: 129,
            name: "Chicken Black Pepper Sandwich",
            description: "Shredded chicken in black pepper sauce melted in toasted sourdough.",
            price: 790,
            image: null,
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
        id: 10,
        name: "Fried Chicken",
        icon: "pizza",
        order: 1,
        is_active: true,
        items: [
          {
            id: 153,
            name: "Crispy Fried Chicken (2pcs)",
            description: "Spicy double-dreaded crisp fried chicken parts served with garlic dip.",
            price: 720,
            image: null,
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
    branches: [
      { id: 36, name: "Gulberg III Branch", address: "65, Block D1 Gulberg III, Lahore, Pakistan", phone: "03212784841", is_active: true }
    ],
    categories: [
      {
        id: 11,
        name: "Specialty Coffee",
        icon: "cafe",
        order: 1,
        is_active: true,
        items: [
          {
            id: 156,
            name: "Espresso Double",
            description: "Double shot of premium espresso with sweetened condensed milk and silky microfoam.",
            price: 520,
            image: null,
            is_available: true,
            is_featured: true,
            preparation_time: 6
          }
        ]
      }
    ]
  }
];

export const getImageUrl = (path: string | null): { uri: string } => {
  if (!path || typeof path !== 'string' || path.trim() === '' || path.includes('unsplash.com')) {
    // Return a minimal transparent placeholder to satisfy Image source type
    return { uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=' };
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return { uri: path };
  }
  // Remove /api if present at the end of the base URL
  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return { uri: `${base}${cleanPath}` };
};
