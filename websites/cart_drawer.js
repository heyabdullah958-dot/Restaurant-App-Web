/**
 * FoodSphere KFC/McDonald's-Style Interactive Sliding Cart Drawer & Checkout Engine
 * Provides persistent cart state, multi-step checkout, live delivery calculation,
 * persistent active guest order tracking hydration, and direct DRF API integration.
 */

(function () {
  'use strict';

  const DELIVERY_FEE = 150;
  const ACTIVE_ORDER_KEY = 'foodsphere_active_guest_order_v1';

  // Cart State Storage
  let cartState = {
    items: [], // [{ id, name, price, qty, variant, image }]
    fulfillmentType: 'DELIVERY', // 'DELIVERY' | 'TAKEAWAY'
    selectedBranch: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    instructions: '',
    activeStep: 1, // 1: Cart, 2: Checkout, 3: Confirmation
    lastOrder: null,
    activeOrderBanner: null
  };

  // Branch Options per Brand
  const BRAND_BRANCHES = {
    'jushhpk': [
      { name: 'Johar Town, R2', id: 4 },
      { name: 'Lake City Business Bay', id: 35 },
      { name: 'DHA Phase 1', id: 34 }
    ],
    'tandooristoppk': [
      { name: 'Johar Town', id: 1 },
      { name: 'Lake City', id: 2 },
      { name: 'GT Road Baghbanpura', id: 3 }
    ],
    'getafomo': [
      { name: 'Gulberg III', id: 36 }
    ],
    'seenbanao': [
      { name: 'Johar Town', id: 1 }
    ],
    'dineatblue': [
      { name: 'DHA Phase 5', id: 2 }
    ],
    'sandmelts': [
      { name: 'Gulberg', id: 5 }
    ],
    'birdmanfoodspk': [
      { name: 'Johar Town', id: 6 }
    ]
  };

  const WHATSAPP_NUMBERS = {
    'jushhpk': '923269946142',
    'tandooristoppk': '923001234567',
    'getafomo': '923000000000',
    'seenbanao': '923000000000'
  };

  // Load saved cart state from sessionStorage
  function initCartState() {
    try {
      const saved = sessionStorage.getItem('foodsphere_cart_' + (window.BRAND_SLUG || 'default'));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.items)) {
          cartState.items = parsed.items.map(item => {
            if (!item.image || item.image.includes('unsplash.com')) {
              item.image = findProductImage(item.name);
            }
            return item;
          });
        }
      }
    } catch (e) {
      console.warn('[CartDrawer] State restore skipped', e);
    }
  }

  function saveCartState() {
    try {
      sessionStorage.setItem('foodsphere_cart_' + (window.BRAND_SLUG || 'default'), JSON.stringify({
        items: cartState.items
      }));
    } catch (e) {}
  }

  // --- PERSISTENT ACTIVE GUEST ORDER STORAGE & HYDRATION ---
  function saveActiveGuestOrder(orderData, customerInfo) {
    try {
      const activeObj = {
        orderId: orderData.id,
        displayOrderId: orderData.display_order_id || ('#FS-' + orderData.id),
        trackingToken: orderData.tracking_token || '',
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerAddress: customerInfo.address,
        fulfillmentType: customerInfo.fulfillmentType,
        selectedBranch: customerInfo.branch,
        totalAmount: getGrandTotal(),
        status: orderData.status || 'received',
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(ACTIVE_ORDER_KEY + '_' + (window.BRAND_SLUG || 'default'), JSON.stringify(activeObj));
    } catch (e) {
      console.warn('[CartDrawer] Could not save active guest order', e);
    }
  }

  function getActiveGuestOrder() {
    try {
      const raw = localStorage.getItem(ACTIVE_ORDER_KEY + '_' + (window.BRAND_SLUG || 'default'));
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearActiveGuestOrder() {
    try {
      localStorage.removeItem(ACTIVE_ORDER_KEY + '_' + (window.BRAND_SLUG || 'default'));
      removeActiveOrderBanner();
    } catch (e) {}
  }

  async function checkAndHydrateActiveGuestOrder() {
    const activeOrder = getActiveGuestOrder();
    if (!activeOrder || !activeOrder.orderId) return;

    try {
      // Poll backend for live status
      const orderId = activeOrder.orderId;
      const trackingToken = activeOrder.trackingToken;
      let url = `https://getfoodpk-fd9b20442fcf.herokuapp.com/api/orders/${orderId}/track/`;
      if (trackingToken) url += `?token=${trackingToken}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const liveOrder = json.data || json;
        const liveStatus = (liveOrder.status || 'received').toLowerCase();

        // Check if order is completed or cancelled
        if (['delivered', 'completed', 'cancelled'].includes(liveStatus)) {
          clearActiveGuestOrder();
          return;
        }

        // Order is active! Update local stored state
        activeOrder.status = liveStatus;
        activeOrder.displayOrderId = liveOrder.display_order_id || activeOrder.displayOrderId;
        localStorage.setItem(ACTIVE_ORDER_KEY + '_' + (window.BRAND_SLUG || 'default'), JSON.stringify(activeOrder));

        // Restore context in cartState
        cartState.lastOrder = liveOrder;
        cartState.customerName = activeOrder.customerName;
        cartState.customerPhone = activeOrder.customerPhone;
        cartState.customerAddress = activeOrder.customerAddress;
        cartState.fulfillmentType = activeOrder.fulfillmentType || 'DELIVERY';
        cartState.selectedBranch = activeOrder.selectedBranch || '';

        // Inject Floating Active Order Banner
        renderActiveOrderBanner(activeOrder);
      }
    } catch (err) {
      console.warn('[CartDrawer] Failed to hydrate active guest order status:', err);
      // Fallback: render banner with cached stored data
      renderActiveOrderBanner(activeOrder);
    }
  }

  function renderActiveOrderBanner(activeOrder) {
    removeActiveOrderBanner();

    const banner = document.createElement('div');
    banner.id = 'cd-active-order-banner';
    banner.style.cssText = `
      position: fixed;
      top: 75px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9980;
      background: linear-gradient(135deg, #10B981, #059669);
      color: #ffffff;
      padding: 10px 20px;
      border-radius: 50px;
      box-shadow: 0 8px 30px rgba(16, 185, 129, 0.4);
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: 'Poppins', sans-serif;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid rgba(255, 255, 255, 0.3);
      animation: cdBannerSlideDown 0.4s ease forwards;
    `;

    const statusText = (activeOrder.status || 'PREPARING').toUpperCase().replace('_', ' ');

    banner.innerHTML = `
      <span>🛵</span>
      <span>Active Order <strong>${activeOrder.displayOrderId}</strong>: <span style="text-decoration:underline;">${statusText}</span></span>
      <span style="background:rgba(255,255,255,0.25); padding:2px 8px; border-radius:12px; font-size:11px;">Track →</span>
    `;

    banner.onclick = () => {
      setStep(3);
      openDrawer();
    };

    document.body.appendChild(banner);
  }

  function removeActiveOrderBanner() {
    const existing = document.getElementById('cd-active-order-banner');
    if (existing) existing.remove();
  }

  // Calculate totals
  function getSubtotal() {
    return cartState.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }

  function getDeliveryCharge() {
    return cartState.fulfillmentType === 'DELIVERY' && cartState.items.length > 0 ? DELIVERY_FEE : 0;
  }

  function getGrandTotal() {
    return getSubtotal() + getDeliveryCharge();
  }

  function getItemCount() {
    return cartState.items.reduce((count, item) => count + item.qty, 0);
  }

  // Category Emoji Resolver
  function getItemEmoji(itemName) {
    if (!itemName) return '🍽️';
    const nameL = itemName.toLowerCase();
    if (nameL.includes('naan') || nameL.includes('roti') || nameL.includes('bread') || nameL.includes('paratha')) return '🫓';
    if (nameL.includes('boti') || nameL.includes('tikka') || nameL.includes('bbq') || nameL.includes('sajji') || nameL.includes('kabab') || nameL.includes('kebab') || nameL.includes('karahi') || nameL.includes('handi') || nameL.includes('chicken') || nameL.includes('beef') || nameL.includes('burger') || nameL.includes('shawarma') || nameL.includes('wrap') || nameL.includes('doner')) return '🍖';
    if (nameL.includes('fries')) return '🍟';
    if (nameL.includes('rice')) return '🍚';
    if (nameL.includes('drink') || nameL.includes('water') || nameL.includes('mojito') || nameL.includes('coffee') || nameL.includes('lime') || nameL.includes('soda')) return '🥤';
    if (nameL.includes('sweet') || nameL.includes('cake') || nameL.includes('dessert') || nameL.includes('eclair') || nameL.includes('sundae')) return '🍰';
    if (nameL.includes('sauce') || nameL.includes('dip') || nameL.includes('cheese') || nameL.includes('syrup') || nameL.includes('raita') || nameL.includes('salad')) return '🏺';
    return '🍽️';
  }

  // Dynamic Product Image Resolver Across Global Menu Data, DOM Cards, and Master Brand Asset Maps
  function findProductImage(itemName) {
    if (!itemName) return '';
    const cleanName = itemName.trim();
    const baseName = cleanName.replace(/\s*\([^)]*\)/g, '').trim();

    // 1. Check global menuData if available on window
    if (window.menuData && typeof window.menuData === 'object') {
      for (const cat in window.menuData) {
        if (Array.isArray(window.menuData[cat])) {
          const match = window.menuData[cat].find(i => 
            i.name && (
              i.name.toLowerCase() === cleanName.toLowerCase() || 
              i.name.toLowerCase() === baseName.toLowerCase()
            )
          );
          if (match) {
            const img = match.image_url || match.image || match.thumbnail;
            if (img && typeof img === 'string' && !img.includes('unsplash.com')) return img;
          }
        }
      }
    }

    // 2. Search DOM elements for matching cards/titles
    try {
      const cards = document.querySelectorAll('.combo-card, .menu-card, .naan-card, .menu-row, .card-body, .product-card');
      for (const card of cards) {
        const text = card.textContent || '';
        if (text.includes(cleanName) || text.includes(baseName)) {
          const img = card.querySelector('img');
          if (img && img.src && !img.src.includes('data:image') && !img.src.includes('unsplash.com')) {
            return img.src;
          }
        }
      }
    } catch (e) {}

    // 3. Master Brand Asset Map
    const nameLower = baseName.toLowerCase();
    
    // JushhPK
    if (nameLower.includes('beef doner') || nameLower.includes('doner fries')) return './images/beef_doner_fries.jpg';
    if (nameLower.includes('chicken doner')) return './images/chicken_doner_fries.jpg';
    if (nameLower.includes('beef burger') || nameLower.includes('double smashed')) return './images/beef_smashed_burger.jpg';
    if (nameLower.includes('chicken burger') || nameLower.includes('crispy chicken')) return './images/chicken_crispy_burger.jpg';
    if (nameLower.includes('pouch shawarma') && nameLower.includes('beef')) return './images/beef_pouch_shawarma.jpg';
    if (nameLower.includes('pouch shawarma')) return './images/chicken_pouch_shawarma.jpg';
    if (nameLower.includes('shawarma platter')) return './images/chicken_shawarma_platter.jpg';
    if (nameLower.includes('shawarma') && nameLower.includes('beef')) return './images/beef_turkish_wrap.jpg';
    if (nameLower.includes('shawarma')) return './images/chicken_turkish_wrap.jpg';
    if (nameLower.includes('cheese add-on') || nameLower.includes('extra cheese')) return './images/cheese_addon.jpg';
    if (nameLower.includes('garlic dip') || nameLower.includes('dip add-on')) return './images/garlic_dip.jpg';
    if (nameLower.includes('tortilla') || nameLower.includes('pita')) return './images/pita_bread.jpg';
    if (nameLower.includes('water')) return './images/water_bottle.jpg';
    if (nameLower.includes('soft drink')) return './images/soft_drink.jpg';
    if (nameLower.includes('blueberry mojito')) return './images/blueberry_mojito.jpg';
    if (nameLower.includes('strawberry mojito')) return './images/strawberry_mojito.jpg';
    if (nameLower.includes('green apple mojito') || nameLower.includes('apple mojito')) return './images/green_apple_mojito.jpg';
    if (nameLower.includes('peach mojito')) return './images/peach_mojito.jpg';
    if (nameLower.includes('lemon mojito') || nameLower.includes('mint margarita')) return './images/lemon_mojito.jpg';
    if (nameLower.includes('lotus can') || nameLower.includes('lotus dessert')) return './images/lotus_can_dessert.jpg';
    if (nameLower.includes('red velvet')) return './images/red_velvet_can_dessert.jpg';
    if (nameLower.includes('nutella can') || nameLower.includes('nutella dessert')) return './images/nutella_can_dessert.jpg';

    // TandooriStop
    if (nameLower.includes('tikka boti')) return './images/IMG_7583.JPG.jpeg';
    if (nameLower.includes('malai boti') && nameLower.includes('roll')) return './images/IMG_7592.JPG.jpeg';
    if (nameLower.includes('malai boti')) return './images/IMG_7584.JPG.jpeg';
    if (nameLower.includes('kabab') || nameLower.includes('kebab')) return './images/IMG_7578.JPG.jpeg';
    if (nameLower.includes('tandoori roll') || nameLower.includes('paratha roll') || nameLower.includes('stop roll') || nameLower.includes('chicken roll')) return './images/IMG_7591.JPG.jpeg';
    if (nameLower.includes('roghni naan') || nameLower.includes('butter naan') || nameLower.includes('plain naan') || nameLower.includes('roti')) return './images/IMG_7582.JPG.jpeg';
    if (nameLower.includes('cheese naan')) return './images/IMG_7581.JPG.jpeg';
    if (nameLower.includes('puri paratha')) return './images/IMG_7580.JPG.jpeg';
    if (nameLower.includes('rice') || nameLower.includes('add-on rice')) return './images/IMG_7579.JPG.jpeg';
    if (nameLower.includes('tandoori chicken')) return './images/IMG_7585.JPG.jpeg';

    return '';
  }

  // Add Item to Cart
  function addItem(item) {
    const qtyToAdd = item.qty || 1;
    const nameKey = (item.name || 'Item').trim();
    let itemImg = item.image_url || item.image || item.thumbnail;
    if (!itemImg || itemImg.includes('unsplash.com')) {
      itemImg = findProductImage(nameKey);
    }
    
    console.log('[CartDrawer] Adding item:', nameKey, 'Resolved Image:', itemImg);

    const existingIndex = cartState.items.findIndex(
      i => i.name === nameKey && i.variant === (item.variant || '')
    );

    if (existingIndex > -1) {
      cartState.items[existingIndex].qty += qtyToAdd;
      if ((!cartState.items[existingIndex].image || cartState.items[existingIndex].image.includes('unsplash.com')) && itemImg) {
        cartState.items[existingIndex].image = itemImg;
      }
    } else {
      cartState.items.push({
        name: nameKey,
        price: parseFloat(item.price) || 0,
        qty: qtyToAdd,
        variant: item.variant || '',
        image: itemImg
      });
    }

    saveCartState();
    updateFloatingBadge();
    renderDrawerContent();
    openDrawer();
  }

  // Update item quantity
  function updateQty(index, delta) {
    if (cartState.items[index]) {
      cartState.items[index].qty += delta;
      if (cartState.items[index].qty <= 0) {
        cartState.items.splice(index, 1);
      }
      saveCartState();
      updateFloatingBadge();
      renderDrawerContent();
    }
  }

  // Remove item
  function removeItem(index) {
    if (cartState.items[index]) {
      cartState.items.splice(index, 1);
      saveCartState();
      updateFloatingBadge();
      renderDrawerContent();
    }
  }

  // Clear Cart
  function clearCart() {
    cartState.items = [];
    saveCartState();
    updateFloatingBadge();
    renderDrawerContent();
  }

  // DOM Injections
  function injectDOM() {
    if (document.getElementById('cd-drawer-container')) return;

    // Floating Cart Trigger Button
    const floatBtn = document.createElement('button');
    floatBtn.id = 'cd-float-btn';
    floatBtn.className = 'cd-float-btn';
    floatBtn.innerHTML = `
      <span>🛒</span>
      <span class="cd-float-badge" id="cd-float-badge">0</span>
      <span class="cd-float-total" id="cd-float-total">Rs. 0</span>
    `;
    floatBtn.onclick = () => openDrawer();
    document.body.appendChild(floatBtn);

    // Backdrop & Drawer Container
    const container = document.createElement('div');
    container.id = 'cd-drawer-container';
    container.innerHTML = `
      <div class="cd-backdrop" id="cd-backdrop" onclick="CartDrawer.closeDrawer()"></div>
      <div class="cd-drawer" id="cd-drawer">
        <div class="cd-header">
          <div class="cd-header-title">
            <span>🍔</span>
            <span id="cd-header-text">Your Cart</span>
          </div>
          <button class="cd-close-btn" onclick="CartDrawer.closeDrawer()">&times;</button>
        </div>
        <div class="cd-body" id="cd-body">
          <!-- Rendered dynamically -->
        </div>
        <div class="cd-footer" id="cd-footer">
          <!-- Rendered dynamically -->
        </div>
      </div>
    `;
    document.body.appendChild(container);

    // Also link nav CTAs or headers to open drawer if clicked
    document.querySelectorAll('a[href="#order"], .nav-cart-link').forEach(link => {
      link.addEventListener('click', (e) => {
        if (cartState.items.length > 0) {
          e.preventDefault();
          openDrawer();
        }
      });
    });
  }

  function openDrawer() {
    const backdrop = document.getElementById('cd-backdrop');
    const drawer = document.getElementById('cd-drawer');
    if (backdrop && drawer) {
      backdrop.classList.add('active');
      drawer.classList.add('active');
      renderDrawerContent();
    }
  }

  function closeDrawer() {
    const backdrop = document.getElementById('cd-backdrop');
    const drawer = document.getElementById('cd-drawer');
    if (backdrop && drawer) {
      backdrop.classList.remove('active');
      drawer.classList.remove('active');
    }
  }

  function updateFloatingBadge() {
    const badge = document.getElementById('cd-float-badge');
    const total = document.getElementById('cd-float-total');
    const count = getItemCount();
    const subtotal = getSubtotal();

    if (badge) badge.textContent = count;
    if (total) total.textContent = `Rs. ${subtotal.toLocaleString()}`;
    
    const floatBtn = document.getElementById('cd-float-btn');
    if (floatBtn) {
      floatBtn.style.display = 'flex';
    }
  }

  function setStep(step) {
    cartState.activeStep = step;
    renderDrawerContent();
  }

  function setFulfillmentType(type) {
    cartState.fulfillmentType = type;
    renderDrawerContent();
  }

  // Main UI Renderer
  function renderDrawerContent() {
    const body = document.getElementById('cd-body');
    const footer = document.getElementById('cd-footer');
    const headerText = document.getElementById('cd-header-text');

    if (!body || !footer) return;

    const brandSlug = (window.BRAND_SLUG || 'jushhpk').toLowerCase();
    const branches = BRAND_BRANCHES[brandSlug] || [{ name: 'Default Outlet', id: 1 }];

    // STEP 1: Cart Items View
    if (cartState.activeStep === 1) {
      if (headerText) headerText.textContent = `Your Cart (${getItemCount()})`;

      if (cartState.items.length === 0) {
        body.innerHTML = `
          <div class="cd-empty-state">
            <div class="cd-empty-icon">🛍️</div>
            <div class="cd-empty-title">Your Cart is Empty</div>
            <div class="cd-empty-sub">Explore our delicious menu items and add them to your cart!</div>
            <button class="cd-btn-primary" onclick="CartDrawer.closeDrawer()" style="margin:0 auto; max-width:200px;">Explore Menu</button>
          </div>
        `;
        footer.innerHTML = '';
        return;
      }

      let itemsHtml = cartState.items.map((item, idx) => {
        let itemImg = item.image;
        if (!itemImg || itemImg.includes('unsplash.com')) {
          itemImg = findProductImage(item.name);
        }

        const emoji = getItemEmoji(item.name);

        let imgHtml = '';
        if (itemImg && !itemImg.includes('unsplash.com')) {
          imgHtml = `<img src="${itemImg}" alt="${item.name}" class="cd-item-img" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'cd-item-img-placeholder\\'>${emoji}</div>';" />`;
        } else {
          imgHtml = `<div class="cd-item-img-placeholder">${emoji}</div>`;
        }

        return `
          <div class="cd-item-card">
            ${imgHtml}
            <div class="cd-item-info">
              <div class="cd-item-name">${item.name}</div>
              <div class="cd-item-price">Rs. ${(item.price * item.qty).toLocaleString()}</div>
            </div>
            <div class="cd-qty-controls">
              <button class="cd-qty-btn" onclick="CartDrawer.updateQty(${idx}, -1)">−</button>
              <span class="cd-qty-val">${item.qty}</span>
              <button class="cd-qty-btn" onclick="CartDrawer.updateQty(${idx}, 1)">+</button>
            </div>
            <button class="cd-remove-btn" onclick="CartDrawer.removeItem(${idx})" title="Remove item">🗑️</button>
          </div>
        `;
      }).join('');

      body.innerHTML = `
        <div class="cd-step active">
          ${itemsHtml}
          <div class="cd-summary-box">
            <div class="cd-summary-row">
              <span>Subtotal</span>
              <span>Rs. ${getSubtotal().toLocaleString()}</span>
            </div>
            <div class="cd-summary-row total">
              <span>Estimated Total</span>
              <span>Rs. ${getSubtotal().toLocaleString()}</span>
            </div>
          </div>
        </div>
      `;

      footer.innerHTML = `
        <button class="cd-btn-primary" onclick="CartDrawer.setStep(2)">
          <span>Proceed to Checkout</span>
          <span>→</span>
        </button>
      `;
    }

    // STEP 2: KFC/McDonald's Multi-Step Checkout Form
    else if (cartState.activeStep === 2) {
      if (headerText) headerText.textContent = 'Checkout';

      const isDelivery = cartState.fulfillmentType === 'DELIVERY';

      body.innerHTML = `
        <div class="cd-step active">
          <!-- Fulfillment Segmented Toggle -->
          <div class="cd-fulfillment-toggle">
            <div class="cd-toggle-option ${isDelivery ? 'active' : ''}" onclick="CartDrawer.setFulfillmentType('DELIVERY')">
              🛵 Delivery
            </div>
            <div class="cd-toggle-option ${!isDelivery ? 'active' : ''}" onclick="CartDrawer.setFulfillmentType('TAKEAWAY')">
              🛍️ Pickup / Takeaway
            </div>
          </div>

          <!-- Form Fields -->
          <div class="cd-form-group">
            <label class="cd-form-label">Select Branch Outlet</label>
            <select class="cd-form-select" id="cd-input-branch">
              ${branches.map(b => `<option value="${b.name}" ${cartState.selectedBranch === b.name ? 'selected' : ''}>${b.name}</option>`).join('')}
            </select>
          </div>

          <div class="cd-form-group">
            <label class="cd-form-label">Full Name *</label>
            <input type="text" class="cd-form-input" id="cd-input-name" placeholder="Enter your full name" value="${cartState.customerName || ''}" required />
          </div>

          <div class="cd-form-group">
            <label class="cd-form-label">Mobile Phone Number *</label>
            <input type="tel" class="cd-form-input" id="cd-input-phone" placeholder="03XX-XXXXXXX" value="${cartState.customerPhone || ''}" required />
          </div>

          ${isDelivery ? `
            <div class="cd-form-group">
              <label class="cd-form-label">Delivery Address *</label>
              <input type="text" class="cd-form-input" id="cd-input-address" placeholder="House/Flat #, Street, Area, Landmark" value="${cartState.customerAddress || ''}" required />
            </div>
          ` : ''}

          <div class="cd-form-group">
            <label class="cd-form-label">Special Instructions (Optional)</label>
            <input type="text" class="cd-form-input" id="cd-input-instructions" placeholder="e.g. Less spicy, call on arrival..." value="${cartState.instructions || ''}" />
          </div>

          <!-- Order Summary Breakdown -->
          <div class="cd-summary-box">
            <div class="cd-summary-row">
              <span>Items Subtotal</span>
              <span>Rs. ${getSubtotal().toLocaleString()}</span>
            </div>
            <div class="cd-summary-row">
              <span>Delivery Charges</span>
              <span>${isDelivery ? 'Rs. ' + DELIVERY_FEE : 'FREE (Pickup)'}</span>
            </div>
            <div class="cd-summary-row total">
              <span>Grand Total (COD)</span>
              <span>Rs. ${getGrandTotal().toLocaleString()}</span>
            </div>
          </div>
        </div>
      `;

      footer.innerHTML = `
        <button class="cd-btn-primary" id="cd-place-order-btn" onclick="CartDrawer.processOrderSubmission()">
          <span>Place Order (Cash on Delivery)</span>
          <span>🛍️</span>
        </button>
        <button class="cd-btn-secondary" onclick="CartDrawer.setStep(1)">
          ← Back to Cart
        </button>
      `;
    }

    // STEP 3: Order Confirmation & Live Tracking View
    else if (cartState.activeStep === 3) {
      if (headerText) headerText.textContent = 'Live Order Status';

      const order = cartState.lastOrder || {};
      const activeStored = getActiveGuestOrder();
      const displayId = order.display_order_id || (activeStored ? activeStored.displayOrderId : ('#FS-' + Math.floor(1000 + Math.random() * 9000)));
      const rawStatus = (order.status || (activeStored ? activeStored.status : 'received')).toLowerCase();
      const statusLabel = rawStatus.toUpperCase().replace('_', ' ');
      const whatsappPhone = WHATSAPP_NUMBERS[brandSlug] || '923000000000';

      const whatsappMessage = `Assalam o Alaikum! I am checking on my order 🛵\n\n` +
        `*Order ID:* ${displayId}\n` +
        `*Customer Name:* ${cartState.customerName || activeStored?.customerName || 'Customer'}\n` +
        `*Status:* ${statusLabel}\n\n` +
        `Please confirm latest status. Shukriya!`;

      const waUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`;

      body.innerHTML = `
        <div class="cd-step active">
          <div class="cd-success-box">
            <div class="cd-success-icon">🛵</div>
            <h3 style="font-size:20px; font-weight:900; margin-bottom:4px;">Active Order Tracking</h3>
            <p style="font-size:13px; color:var(--cd-muted);">Your order is active and saved in this browser.</p>
            
            <div class="cd-success-order-id">${displayId}</div>

            <div class="cd-summary-box" style="text-align:left; margin-bottom:24px;">
              <div class="cd-summary-row">
                <span>Branch:</span>
                <span style="color:#ffffff; font-weight:700;">${cartState.selectedBranch || activeStored?.selectedBranch || 'Main Branch'}</span>
              </div>
              <div class="cd-summary-row">
                <span>Payment:</span>
                <span style="color:#ffffff; font-weight:700;">Cash on Delivery (COD)</span>
              </div>
              <div class="cd-summary-row">
                <span>Current Status:</span>
                <span style="color:#10B981; font-weight:900;">${statusLabel}</span>
              </div>
            </div>

            <a href="${waUrl}" target="_blank" rel="noopener" class="cd-btn-primary" style="text-decoration:none; margin-bottom:12px;">
              <span>💬 Confirm Status on WhatsApp</span>
            </a>
          </div>
        </div>
      `;

      footer.innerHTML = `
        <button class="cd-btn-secondary" onclick="CartDrawer.resetAndClose()">
          Start New Order / Done
        </button>
      `;
    }
  }

  // Handle Order Submission
  async function processOrderSubmission() {
    const nameEl = document.getElementById('cd-input-name');
    const phoneEl = document.getElementById('cd-input-phone');
    const addressEl = document.getElementById('cd-input-address');
    const branchEl = document.getElementById('cd-input-branch');
    const instructionsEl = document.getElementById('cd-input-instructions');

    const name = nameEl ? nameEl.value.trim() : '';
    const phone = phoneEl ? phoneEl.value.trim() : '';
    const address = addressEl ? addressEl.value.trim() : 'Pickup / Counter';
    const branch = branchEl ? branchEl.value : '';
    const instructions = instructionsEl ? instructionsEl.value.trim() : '';

    if (!name) {
      alert('Please enter your full name.');
      if (nameEl) nameEl.focus();
      return;
    }

    if (!phone || phone.length < 10) {
      alert('Please enter a valid mobile phone number (e.g. 03001234567).');
      if (phoneEl) phoneEl.focus();
      return;
    }

    if (cartState.fulfillmentType === 'DELIVERY' && (!address || address.length < 5)) {
      alert('Please enter your complete delivery address.');
      if (addressEl) addressEl.focus();
      return;
    }

    cartState.customerName = name;
    cartState.customerPhone = phone;
    cartState.customerAddress = address;
    cartState.selectedBranch = branch;
    cartState.instructions = instructions;

    const btn = document.getElementById('cd-place-order-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Placing Order...</span> ⏳';
    }

    // Prepare API payload items
    const cartItemsPayload = cartState.items.map(i => ({
      name: i.name,
      quantity: i.qty,
      qty: i.qty,
      variant: i.variant
    }));

    const brandSlug = (window.BRAND_SLUG || 'jushhpk').toLowerCase();

    // Call Central Web Order API submit function
    let orderResult = null;
    if (typeof window.submitWebOrder === 'function') {
      try {
        orderResult = await window.submitWebOrder({
          brandSlug: brandSlug,
          branchName: branch,
          guestName: name,
          guestPhone: phone,
          deliveryAddress: cartState.fulfillmentType === 'DELIVERY' ? address : 'PICKUP AT OUTLET',
          orderType: cartState.fulfillmentType,
          cartItems: cartItemsPayload
        });
      } catch (err) {
        console.warn('[CartDrawer] API Submit Exception:', err);
      }
    }

    const orderData = (orderResult && orderResult.data) ? orderResult.data : {
      id: Math.floor(1000 + Math.random() * 9000),
      display_order_id: '#FS-' + Math.floor(1000 + Math.random() * 9000),
      status: 'received'
    };

    cartState.lastOrder = orderData;
    
    // Save to persistent localStorage active guest order
    saveActiveGuestOrder(orderData, {
      name,
      phone,
      address,
      branch,
      fulfillmentType: cartState.fulfillmentType
    });

    // Clear active cart items on success
    cartState.items = [];
    saveCartState();
    updateFloatingBadge();

    // Advance to Step 3 & Show Banner
    setStep(3);
    checkAndHydrateActiveGuestOrder();
  }

  function resetAndClose() {
    clearActiveGuestOrder();
    cartState.activeStep = 1;
    closeDrawer();
  }

  // Intercept & Upgrade existing `addToOrderForm` calls across brand HTML files
  function monkeyPatchOrderForm() {
    window.addToOrderForm = function (itemName, price, image) {
      const resolvedImage = image || findProductImage(itemName);
      addItem({
        name: itemName,
        price: price,
        qty: 1,
        image: resolvedImage
      });
    };
  }

  // Initialization
  document.addEventListener('DOMContentLoaded', () => {
    initCartState();
    injectDOM();
    updateFloatingBadge();
    monkeyPatchOrderForm();
    checkAndHydrateActiveGuestOrder();
  });

  // Export Public API
  window.CartDrawer = {
    addItem,
    updateQty,
    removeItem,
    clearCart,
    openDrawer,
    closeDrawer,
    setStep,
    setFulfillmentType,
    processOrderSubmission,
    resetAndClose,
    clearActiveGuestOrder,
    findProductImage
  };

})();
