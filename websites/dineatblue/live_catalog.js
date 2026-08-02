/**
 * FoodSphere Live Catalog & Image Asset Sync Component for Brand Websites
 * Synchronizes real product catalog data and media assets directly from Heroku REST API / Cloudinary CDN.
 */

(function () {
  const API_HOST = "https://getfoodpk-fd9b20442fcf.herokuapp.com/api/restaurants";

  const DEFAULT_CATEGORY_IMAGES = {
    'fries': 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&h=400&q=80',
    'doner': 'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=600&h=400&q=80',
    'wrap': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&h=400&q=80',
    'shawarma': 'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=600&h=400&q=80',
    'sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&h=400&q=80',
    'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&h=400&q=80',
    'tandoori': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=600&h=400&q=80',
    'kabab': 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=600&h=400&q=80',
    'sajji': 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&h=400&q=80',
    'naan': 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=600&h=400&q=80',
    'roti': 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=600&h=400&q=80',
    'fish': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&h=400&q=80',
    'seafood': 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&h=400&q=80',
    'prawn': 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&h=400&q=80',
    'mojito': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&h=400&q=80',
    'drink': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&h=400&q=80',
    'dessert': 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&h=400&q=80',
    'sundae': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&h=400&q=80',
    'default': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&h=400&q=80'
  };

  const JUSHHPK_CDN_MAP = {
    'Chicken Doner Fries': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_doner_fries.jpg',
    'Beef Doner Fries': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_doner_fries.jpg',
    'Chicken Grilled Sandwich': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_grilled_sandwich.jpg',
    'Beef Grilled Sandwich': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_grilled_sandwich.jpg',
    'Half Dubai Shawaya': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/half_dubai_shawaya.jpg',
    'Full Dubai Shawaya': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/full_dubai_shawaya.jpg',
    'Add-on Rice': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/addon_rice.jpg',
    'Chicken Turkish Wrap': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_turkish_wrap.jpg',
    'Beef Turkish Wrap': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_turkish_wrap.jpg',
    'Chicken Turkish Doner': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_turkish_doner.jpg',
    'Beef Turkish Doner': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_turkish_doner.jpg',
    'Chicken Pouch Shawarma': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_pouch_shawarma.jpg',
    'Beef Pouch Shawarma': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_pouch_shawarma.jpg',
    'Chicken Shawarma': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_turkish_wrap.jpg',
    'Beef Shawarma': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_turkish_wrap.jpg',
    'Charcoal Shawarma Chicken': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/charcoal_shawarma_chicken.jpg',
    'Chicken Shawarma Platter': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_shawarma_platter.jpg',
    'Chicken Shawarma Platter (with cheese)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_shawarma_platter.jpg',
    'Lotus Can Dessert': 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&h=400&q=80',
    'Red Velvet Can Dessert': 'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?auto=format&fit=crop&w=600&h=400&q=80',
    'Nutella Can Dessert': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&h=400&q=80',
    'Cheese Add-on': 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&h=400&q=80',
    'Tortilla Bread': 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=600&h=400&q=80',
    'Plain Fries': 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&h=400&q=80'
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
    if (img && typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
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
      console.warn('[FoodSphere Catalog] Live API fetch failed, loading local catalog...', err);
    }

    if (categories.length === 0) {
      try {
        const fallbackRes = await fetch('../shared_catalog.json');
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData[brandSlug] && fallbackData[brandSlug].categories) {
            categories = fallbackData[brandSlug].categories;
          }
        }
      } catch (fErr) {}
    }

    if (categories.length === 0) return;

    window.LIVE_MENU_CATEGORIES = categories;

    // Check if the page has a native renderMenu function
    if (typeof window.renderMenu === 'function' && typeof window.menuData === 'object') {
      try {
        categories.forEach(cat => {
          (cat.items || []).forEach(item => {
            const catKey = (cat.name || '').toLowerCase().replace(/[^a-z]/g, '');
            for (const key in window.menuData) {
              if (Array.isArray(window.menuData[key])) {
                window.menuData[key].forEach(nativeItem => {
                  if (nativeItem.name.trim().toLowerCase() === item.name.trim().toLowerCase()) {
                    nativeItem.image = resolveItemImage(item);
                    nativeItem.price = item.price;
                    nativeItem.desc = item.description || nativeItem.desc;
                  }
                });
              }
            }
          });
        });
        window.renderMenu('all');
        return;
      } catch (nativeErr) {
        console.warn('[FoodSphere Catalog] Native renderMenu update error:', nativeErr);
      }
    }

    renderDefaultMenu(brandSlug, categories, 'all');
  }

  function renderDefaultMenu(slug, categories, activeCatId) {
    const container = document.getElementById('menu-grid-container') || document.querySelector('.menu-grid') || document.querySelector('.dishes-grid') || document.querySelector('.combos-grid');
    if (!container) return;

    let displayItems = [];
    categories.forEach(cat => {
      const catId = String(cat.id || cat.name);
      if (activeCatId === 'all' || activeCatId === catId) {
        (cat.items || []).forEach(item => {
          displayItems.push({ ...item, category_name: cat.name });
        });
      }
    });

    container.innerHTML = '';
    displayItems.forEach((item) => {
      const card = document.createElement('div');
      card.className = 'combo-card menu-card dish-card';
      const imgSrc = resolveItemImage(item);
      const fallbackSrc = getFallbackMedia(item.name);
      const formattedPrice = Number(item.price || 0).toLocaleString();

      card.innerHTML = `
        <div class="combo-img card-img-wrap" style="height:170px; overflow:hidden; position:relative; background:#18181b;">
          <img src="${imgSrc}" alt="${item.name}" loading="lazy" style="width:100%; height:100%; object-fit:cover;"
               onerror="this.onerror=null; this.src='${fallbackSrc}';" />
          ${!item.is_available ? '<span style="position:absolute; top:8px; right:8px; background:rgba(225,29,72,0.9); color:white; font-size:10px; font-weight:800; padding:4px 8px; border-radius:6px; z-index:5;">OUT OF STOCK</span>' : ''}
        </div>
        <div class="combo-body card-body" style="padding:16px;">
          <div class="combo-name card-name" style="font-size:16px; font-weight:700; margin-bottom:6px;">${item.name}</div>
          <div class="combo-includes card-desc" style="font-size:12px; opacity:0.75; margin-bottom:12px; line-height:1.4;">${item.description || 'Prepared fresh with premium ingredients.'}</div>
          <div class="combo-foot card-foot" style="display:flex; align-items:center; justify-content:space-between;">
            <span class="combo-price card-price" style="font-size:15px; font-weight:800;">Rs. ${formattedPrice}</span>
            <button class="order-btn" style="cursor:pointer;" onclick="if(typeof addToOrderForm==='function'){addToOrderForm('${item.name.replace(/'/g, "\\'")}', ${item.price});} else if(typeof selectItemForOrder==='function'){selectItemForOrder('${item.name.replace(/'/g, "\\'")}');}">Order</button>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const slug = window.BRAND_SLUG || document.body.dataset.brandSlug;
    if (slug) {
      loadLiveMenu(slug);
    }
  });

  window.loadLiveMenu = loadLiveMenu;
})();
