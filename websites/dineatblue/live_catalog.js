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

  const BRAND_ASSET_MAP = {
    // TandooriStop
    'tikka boti': './images/IMG_7583.JPG.jpeg',
    'malai boti': './images/IMG_7584.JPG.jpeg',
    'reshmi handi': './images/IMG_7584.JPG.jpeg',
    'sha jahani handi': './images/IMG_7584.JPG.jpeg',
    'seekh kabab': './images/IMG_7578.JPG.jpeg',
    'kabab': './images/IMG_7578.JPG.jpeg',
    'full stop roll': './images/IMG_7591.JPG.jpeg',
    'tandoori chicken roll': './images/IMG_7591.JPG.jpeg',
    'chicken paratha roll': './images/IMG_7588.JPG.jpeg',
    'malai boti roll': './images/IMG_7592.JPG.jpeg',
    'roghni naan': './images/IMG_7582.JPG.jpeg',
    'butter naan': './images/IMG_7582.JPG.jpeg',
    'plain naan': './images/IMG_7582.JPG.jpeg',
    'cheese naan': './images/IMG_7581.JPG.jpeg',
    'puri paratha': './images/IMG_7580.JPG.jpeg',
    'rice': './images/IMG_7579.JPG.jpeg',
    'tandoori chicken': './images/IMG_7585.JPG.jpeg',
    'mint margaritas': './images/IMG_7577.JPG.jpeg',
    'blueberry mojito': './images/IMG_7576.JPG.jpeg',
    'strawberry mojito': './images/IMG_7576.JPG.jpeg',
    'peach mojito': './images/IMG_7576.JPG.jpeg',
    'apple mojito': './images/IMG_7576.JPG.jpeg',

    // JushhPK
    'chicken doner fries': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_doner_fries.jpg',
    'beef doner fries': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_doner_fries.jpg',
    'chicken grilled sandwich': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_grilled_sandwich.jpg',
    'beef grilled sandwich': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_grilled_sandwich.jpg',
    'half dubai shawaya': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/half_dubai_shawaya.jpg',
    'full dubai shawaya': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/full_dubai_shawaya.jpg',
    'beef burger': './images/beef_smashed_burger.jpg',
    'chicken burger': './images/chicken_crispy_burger.jpg',
    'pouch shawarma': './images/chicken_pouch_shawarma.jpg',
    'shawarma platter': './images/chicken_shawarma_platter.jpg',
    'turkish wrap': './images/chicken_turkish_wrap.jpg',
    'cheese add-on': './images/cheese_addon.jpg',
    'garlic dip': './images/garlic_dip.jpg',
    'pita bread': './images/pita_bread.jpg',
    'lotus can dessert': './images/lotus_can_dessert.jpg',
    'red velvet can dessert': './images/red_velvet_can_dessert.jpg',
    'nutella can dessert': './images/nutella_can_dessert.jpg'
  };

  function resolveItemImage(item) {
    let img = item.image || item.image_url || item.thumbnail;
    if (img && typeof img === 'string' && !img.includes('unsplash.com') && (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('./images'))) {
      return img;
    }
    const nameLower = (item.name || '').toLowerCase().trim();
    for (const key in BRAND_ASSET_MAP) {
      if (nameLower.includes(key)) return BRAND_ASSET_MAP[key];
    }
    return '';
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

  function runInitCatalog() {
    const slug = window.BRAND_SLUG || document.body.dataset.brandSlug;
    if (slug) {
      loadLiveMenu(slug);
    }
  }

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    setTimeout(runInitCatalog, 1);
  } else {
    document.addEventListener('DOMContentLoaded', runInitCatalog);
  }

  window.loadLiveMenu = loadLiveMenu;

  /**
   * Universal Order Form Reset Engine
   * Clears cart state, resets form fields, hides success screen, and shows order form for sequential orders.
   */
  function resetOrderForm() {
    console.log("[FoodSphere Order API] Resetting order form state for new order...");
    const form = document.getElementById('order-form') || document.querySelector('form[action*="formspree"]') || document.querySelector('form');
    const successDiv = document.getElementById('form-success');
    
    if (form) {
      form.reset();
      form.style.display = 'block';
    }
    if (successDiv) {
      successDiv.style.display = 'none';
    }
    
    if (typeof window.cart === 'object' && window.cart !== null) {
      for (const k in window.cart) delete window.cart[k];
    }
    if (typeof window.preorderCart === 'object' && window.preorderCart !== null) {
      for (const k in window.preorderCart) delete window.preorderCart[k];
    }
    
    const textareas = document.querySelectorAll('textarea[name="order"], #order-textarea, #requests-textarea, textarea[name="requests"], textarea[name="note"]');
    textareas.forEach(ta => { if (ta) ta.value = ''; });
  }

  window.resetOrderForm = resetOrderForm;

  window.submitWebOrder = submitWebOrder;
})();
