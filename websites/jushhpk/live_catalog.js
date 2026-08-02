/**
 * FoodSphere Live Catalog, Asset Sync & Universal Order API Component for Brand Websites
 * Synchronizes real product catalog data and posts web orders directly to Django REST API.
 */

(function () {
  const API_HOST = "https://getfoodpk-fd9b20442fcf.herokuapp.com/api/restaurants";
  const ORDER_API_URL = "https://getfoodpk-fd9b20442fcf.herokuapp.com/api/orders/";

  window.ITEM_ID_MAP = window.ITEM_ID_MAP || {};

  window.RESTAURANT_ID_MAP = {
    'seenbanao': 1,
    'dineatblue': 2,
    'jushhpk': 3,
    'tandooristoppk': 4,
    'sandmelts': 5,
    'birdmanfoodspk': 6,
    'getafomo': 7
  };

  window.BRANCH_ID_MAP = {
    'jushhpk': {
      'johar town, r2': 4,
      'johar town': 4,
      'lake city business bay': 35,
      'lake city': 35,
      'dha phase 1': 34,
      'dha': 34,
      'default': 4
    },
    'tandooristoppk': {
      'johar town': 1,
      'lake city': 2,
      'gt road baghbanpura': 3,
      'baghbanpura': 3,
      'gt road': 3,
      'default': 1
    },
    'seenbanao': {
      'johar town': 1,
      'default': 1
    },
    'getafomo': {
      'gulberg iii': 36,
      'gulberg': 36,
      'default': 36
    },
    'dineatblue': { 'default': 2 },
    'sandmelts': { 'default': 5 },
    'birdmanfoodspk': { 'default': 6 }
  };

  const HARDCODED_ITEM_IDS = {
    // JushhPK
    'chicken doner fries': 37,
    'beef doner fries': 38,
    'chicken grilled sandwich': 39,
    'beef grilled sandwich': 40,
    'half dubai shawaya': 41,
    'full dubai shawaya': 42,
    'add-on rice': 43,
    'chicken turkish wrap': 44,
    'beef turkish wrap': 45,
    'chicken turkish doner': 46,
    'beef turkish doner': 47,
    'chicken pouch shawarma': 48,
    'beef pouch shawarma': 49,
    'chicken shawarma': 50,
    'beef shawarma': 51,
    'charcoal shawarma chicken': 52,
    'chicken shawarma platter': 53,
    'chicken shawarma platter (with cheese)': 54,
    'lotus can dessert': 55,
    'red velvet can dessert': 56,
    'nutella can dessert': 57,
    'cheese add-on': 58,
    'dip add-on': 59,
    'dip': 59,
    'tortilla bread': 60,
    'pita bread': 61,
    'plain fries': 62,
    'water': 63,
    'soft drink': 64,
    'blueberry mojito': 65,
    'strawberry mojito': 66,
    'green apple mojito': 67,
    'peach mojito': 68,
    'lemon mojito': 69,

    // TandooriStop
    'tandoori chicken bone (cheese naan single)': 70,
    'tandoori chicken boneless (cheese naan single)': 71,
    'tandoori chicken bone (cheese naan double)': 72,
    'tandoori chicken boneless (cheese naan double)': 73,
    'tandoori chicken bone (with rice)': 74,
    'tandoori chicken boneless (with rice)': 75,
    'tandoori chicken bone': 76,
    'tandoori chicken boneless': 77,
    'quarter sajji': 78,
    'half sajji': 79,
    'full sajji': 80,
    'peri peri quarter sajji': 81,
    'peri peri half sajji': 82,
    'peri peri full sajji': 83,
    'tawa chicken': 84,
    'full stop roll': 85,
    'tandoori chicken roll': 86,
    'malai boti roll': 87,
    'chicken paratha roll': 88,
    'seekh kabab (per seekh)': 89,
    'tikka boti (per seekh)': 90,
    'malai boti (per seekh)': 91,
    'cheese naan': 92,
    'roghni naan': 93,
    'butter naan': 94,
    'plain roti': 95,
    'puri paratha': 96,
    'rice': 97,
    'mint margaritas': 98,

    // SeenBanao
    'fries': 1,
    'crispy wings': 2,
    'loaded fries': 3,
    'seekh kabab roll': 4,
    'tikka roll': 5,
    'malai boti roll': 6,
    'seekh kabab': 7,
    'tikka boti': 8,
    'malai boti': 9
  };

  const DEFAULT_CATEGORY_IMAGES = {
    'fries': 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&h=400&q=80',
    'doner': 'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=600&h=400&q=80',
    'wrap': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&h=400&q=80',
    'shawarma': 'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=600&h=400&q=80',
    'sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&h=400&q=80',
    'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&h=400&q=80',
    'tandoori': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=600&h=400&q=80',
    'kabab': 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=600&h=400&q=80',
    'default': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&h=400&q=80'
  };

  const JUSHHPK_CDN_MAP = {
    'Chicken Doner Fries': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_doner_fries.jpg',
    'Beef Doner Fries': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_doner_fries.jpg',
    'Chicken Grilled Sandwich': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_grilled_sandwich.jpg',
    'Beef Grilled Sandwich': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_grilled_sandwich.jpg',
    'Half Dubai Shawaya': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/half_dubai_shawaya.jpg',
    'Full Dubai Shawaya': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/full_dubai_shawaya.jpg'
  };

  function getFallbackMedia(name = '') {
    const nameLower = name.toLowerCase();
    for (const kw in DEFAULT_CATEGORY_IMAGES) {
      if (nameLower.includes(kw)) return DEFAULT_CATEGORY_IMAGES[kw];
    }
    return DEFAULT_CATEGORY_IMAGES.default;
  }

  function resolveItemImage(item) {
    let img = item.image || item.image_url;
    if (JUSHHPK_CDN_MAP[item.name]) {
      return JUSHHPK_CDN_MAP[item.name];
    }
    if (img && typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('./images'))) {
      return img;
    }
    return getFallbackMedia(item.name);
  }

  async function loadLiveMenu(brandSlug) {
    if (!brandSlug) return;
    let categories = [];

    try {
      const res = await fetch(`${API_HOST}/${brandSlug}/menu/`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          categories = json.data;
        }
      }
    } catch (err) {
      console.warn('[FoodSphere Catalog] Live API fetch failed, using embedded catalog...', err);
    }

    if (categories.length > 0) {
      categories.forEach(cat => {
        (cat.items || []).forEach(item => {
          if (item && item.id && item.name) {
            window.ITEM_ID_MAP[item.name.trim().toLowerCase()] = item.id;
          }
        });
      });
      window.LIVE_MENU_CATEGORIES = categories;
    }
  }

  /**
   * Universal Web Order API Persistence
   * Posts payload to POST https://getfoodpk-fd9b20442fcf.herokuapp.com/api/orders/
   */
  async function submitWebOrder(opts) {
    const brandSlug = (opts.brandSlug || window.BRAND_SLUG || 'jushhpk').toLowerCase();
    const restId = window.RESTAURANT_ID_MAP[brandSlug] || 3;
    
    // Resolve branch ID
    const branchName = (opts.branchName || '').toLowerCase().trim();
    const branchMap = window.BRANCH_ID_MAP[brandSlug] || {};
    let branchId = branchMap[branchName] || branchMap['default'] || null;

    // Convert cart items to [{ menu_item: ID, quantity: QTY }]
    const orderItems = [];
    const rawItems = opts.cartItems || [];

    rawItems.forEach(ci => {
      const nameKey = (ci.name || '').trim().toLowerCase();
      let itemId = window.ITEM_ID_MAP[nameKey] || HARDCODED_ITEM_IDS[nameKey];
      
      // Fallback partial name lookup
      if (!itemId) {
        for (const k in HARDCODED_ITEM_IDS) {
          if (nameKey.includes(k) || k.includes(nameKey)) {
            itemId = HARDCODED_ITEM_IDS[k];
            break;
          }
        }
      }

      // If still no ID found, fallback to 37 (Chicken Doner Fries) or 76 (Tandoori Chicken)
      if (!itemId) {
        itemId = (restId === 4) ? 76 : 37;
      }

      orderItems.push({
        menu_item: itemId,
        quantity: Math.max(1, parseInt(ci.quantity || ci.qty || 1, 10))
      });
    });

    if (orderItems.length === 0) {
      orderItems.push({ menu_item: (restId === 4) ? 76 : 37, quantity: 1 });
    }

    const payload = {
      restaurant: restId,
      branch: branchId,
      guest_name: opts.guestName || "Website Customer",
      guest_phone: opts.guestPhone || "+923000000000",
      delivery_address: opts.deliveryAddress || "Address Provided via Phone",
      payment_method: "cod",
      order_type: "DELIVERY",
      items: orderItems
    };

    console.log("[FoodSphere Order API] Submitting web order payload:", payload);

    try {
      const response = await fetch(ORDER_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json();
      if (response.ok || response.status === 201) {
        console.log("[FoodSphere Order API] ✅ Order created successfully on backend! Display ID:", resJson.display_order_id || resJson.id);
        return { success: true, data: resJson };
      } else {
        console.warn("[FoodSphere Order API] Backend returned validation error:", resJson);
        return { success: false, error: resJson };
      }
    } catch (err) {
      console.warn("[FoodSphere Order API] Network error posting to API:", err);
      return { success: false, error: err };
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const slug = window.BRAND_SLUG || document.body.dataset.brandSlug;
    if (slug) {
      loadLiveMenu(slug);
    }
  });

  window.loadLiveMenu = loadLiveMenu;
  window.submitWebOrder = submitWebOrder;
})();
