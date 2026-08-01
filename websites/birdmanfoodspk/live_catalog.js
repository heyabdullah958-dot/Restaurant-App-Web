/**
 * FoodSphere Live Catalog Sync Component for Brand Websites
 * Synchronizes real product catalog data and media assets directly from Heroku REST API.
 */

(function () {
  const API_HOST = "https://getfoodpk-fd9b20442fcf.herokuapp.com/api/restaurants";

  // Map of category emojis for aesthetic fallbacks
  const CATEGORY_EMOJIS = {
    'tandoori': '🍗',
    'bbq': '🍢',
    'kabab': '🍢',
    'naan': '🫓',
    'burger': '🍔',
    'fries': '🍟',
    'sandwich': '🥪',
    'seafood': '🐟',
    'drinks': '🥤',
    'beverages': '🍹',
    'platters': '🍱',
    'combos': '🍱',
    'default': '🍽️'
  };

  function getCategoryEmoji(catName = '') {
    const lower = catName.toLowerCase();
    for (const key in CATEGORY_EMOJIS) {
      if (lower.includes(key)) return CATEGORY_EMOJIS[key];
    }
    return CATEGORY_EMOJIS.default;
  }

  async function loadLiveMenu(brandSlug) {
    if (!brandSlug) return;
    const container = document.getElementById('menu-grid-container') || document.querySelector('.menu-grid') || document.querySelector('.dishes-grid') || document.querySelector('.combos-grid');
    if (!container) return;

    // Show initial subtle skeleton / loading state if container is empty
    let categories = [];

    try {
      // 1. Fetch live products directly from DRF Heroku API
      const res = await fetch(`${API_HOST}/${brandSlug}/menu/`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          categories = json.data;
        }
      }
    } catch (err) {
      console.warn('[FoodSphere Catalog] Live API fetch failed, trying local fallback catalog...', err);
    }

    // 2. Fallback to shared_catalog.json if live API is unreachable
    if (categories.length === 0) {
      try {
        const fallbackRes = await fetch('../shared_catalog.json');
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData[brandSlug] && fallbackData[brandSlug].categories) {
            categories = fallbackData[brandSlug].categories;
          }
        }
      } catch (fErr) {
        console.warn('[FoodSphere Catalog] Shared catalog fallback failed', fErr);
      }
    }

    if (categories.length === 0) return; // Keep existing static markup if fetch failed completely

    window.LIVE_MENU_CATEGORIES = categories;
    renderCategoriesAndMenu(brandSlug, categories, 'all');
  }

  function renderCategoriesAndMenu(slug, categories, activeCatId) {
    const container = document.getElementById('menu-grid-container') || document.querySelector('.menu-grid') || document.querySelector('.dishes-grid') || document.querySelector('.combos-grid');
    const tabsContainer = document.querySelector('.menu-tabs') || document.querySelector('.menu-cats');

    if (!container) return;

    // Render Dynamic Tabs if container exists
    if (tabsContainer) {
      let tabsHtml = `<button class="menu-tab ${activeCatId === 'all' ? 'active' : ''}" onclick="window.filterLiveMenu('${slug}', 'all', this)">All Items</button>`;
      categories.forEach(cat => {
        const catId = String(cat.id || cat.name);
        const isActive = activeCatId === catId;
        tabsHtml += `<button class="menu-tab ${isActive ? 'active' : ''}" onclick="window.filterLiveMenu('${slug}', '${catId}', this)">${cat.name}</button>`;
      });
      tabsContainer.innerHTML = tabsHtml;
    }

    // Filter Items
    let displayItems = [];
    categories.forEach(cat => {
      const catId = String(cat.id || cat.name);
      if (activeCatId === 'all' || activeCatId === catId) {
        (cat.items || []).forEach(item => {
          displayItems.push({
            ...item,
            category_name: cat.name
          });
        });
      }
    });

    // Clear and build cards
    container.innerHTML = '';
    displayItems.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'menu-card dish-card combo-card';
      if (!item.is_available) {
        card.classList.add('out-of-stock-card');
      }

      const hasImage = item.image && item.image.trim().length > 0;
      const emoji = getCategoryEmoji(item.category_name || item.name);
      const formattedPrice = Number(item.price || 0).toLocaleString();

      const imageBlock = hasImage ? `
        <div class="card-img-wrap" style="position:relative; width:100%; height:180px; overflow:hidden; border-radius:12px 12px 0 0; background:#1e1b4b;">
          <img src="${item.image}" alt="${item.name}" style="width:100%; height:100%; object-fit:cover; transition:transform 0.4s ease;" 
               onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
          <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; font-size:42px;">${emoji}</div>
          ${!item.is_available ? '<span style="position:absolute; top:8px; right:8px; background:rgba(225,29,72,0.9); color:white; font-size:10px; font-weight:800; padding:4px 8px; border-radius:6px; z-index:5;">OUT OF STOCK</span>' : ''}
        </div>
      ` : `
        <div class="card-img-wrap" style="position:relative; width:100%; height:140px; display:flex; align-items:center; justify-content:center; font-size:48px; background:rgba(255,255,255,0.04); border-radius:12px 12px 0 0;">
          ${emoji}
          ${!item.is_available ? '<span style="position:absolute; top:8px; right:8px; background:rgba(225,29,72,0.9); color:white; font-size:10px; font-weight:800; padding:4px 8px; border-radius:6px; z-index:5;">OUT OF STOCK</span>' : ''}
        </div>
      `;

      card.innerHTML = `
        ${imageBlock}
        <div class="card-body dish-body combo-body" style="padding:16px;">
          <div class="card-name dish-name combo-name" style="font-size:16px; font-weight:700; margin-bottom:6px;">${item.name}</div>
          <div class="card-desc dish-desc combo-desc" style="font-size:12px; opacity:0.75; margin-bottom:12px; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
            ${item.description || 'Prepared fresh with premium ingredients.'}
          </div>
          <div class="card-foot dish-footer combo-foot" style="display:flex; align-items:center; justify-content:space-between;">
            <div class="card-price dish-price combo-price" style="font-size:15px; font-weight:800;">Rs. ${formattedPrice}</div>
            ${item.is_available ? `
              <button class="order-btn order-chip dish-order-btn" style="cursor:pointer;" onclick="if(typeof addToOrderForm==='function'){addToOrderForm('${item.name.replace(/'/g, "\\'")}', ${item.price});} else if(typeof selectItemForOrder==='function'){selectItemForOrder('${item.name.replace(/'/g, "\\'")}');} else { document.getElementById('order')?.scrollIntoView({behavior:'smooth'});}">
                Order
              </button>
            ` : `
              <button class="order-btn dish-order-btn" disabled style="opacity:0.5; cursor:not-allowed; background:#64748b;">
                Unavailable
              </button>
            `}
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  }

  window.filterLiveMenu = function (slug, catId, btnElem) {
    if (btnElem && btnElem.parentElement) {
      btnElem.parentElement.querySelectorAll('.menu-tab, .tab').forEach(t => t.classList.remove('active'));
      btnElem.classList.add('active');
    }
    if (window.LIVE_MENU_CATEGORIES) {
      renderCategoriesAndMenu(slug, window.LIVE_MENU_CATEGORIES, catId);
    }
  };

  // Auto-init on DOMReady
  document.addEventListener('DOMContentLoaded', () => {
    const slug = window.BRAND_SLUG || document.body.dataset.brandSlug;
    if (slug) {
      loadLiveMenu(slug);
    }
  });

  window.loadLiveMenu = loadLiveMenu;
})();
