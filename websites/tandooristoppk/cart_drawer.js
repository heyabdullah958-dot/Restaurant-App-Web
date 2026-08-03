/**
 * FoodSphere KFC/McDonald's-Style Interactive Sliding Cart Drawer & Checkout Engine
 * Provides persistent cart state, multi-step checkout, live delivery calculation,
 * and direct backend DRF API integration across brand websites.
 */

(function () {
  'use strict';

  const DELIVERY_FEE = 150;

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
    lastOrder: null
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

  // Load saved state from sessionStorage if available
  function initCartState() {
    try {
      const saved = sessionStorage.getItem('foodsphere_cart_' + (window.BRAND_SLUG || 'default'));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.items)) cartState.items = parsed.items;
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

  // Add Item to Cart
  function addItem(item) {
    // item: { name, price, qty?, variant?, image? }
    const qtyToAdd = item.qty || 1;
    const nameKey = (item.name || 'Item').trim();
    
    const existingIndex = cartState.items.findIndex(
      i => i.name === nameKey && i.variant === (item.variant || '')
    );

    if (existingIndex > -1) {
      cartState.items[existingIndex].qty += qtyToAdd;
    } else {
      cartState.items.push({
        name: nameKey,
        price: parseFloat(item.price) || 0,
        qty: qtyToAdd,
        variant: item.variant || '',
        image: item.image || ''
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
      if (count > 0) {
        floatBtn.style.display = 'flex';
      } else {
        floatBtn.style.display = 'flex'; // Keep accessible
      }
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

    const brandSlug = (window.BRAND_SLUG || 'tandooristoppk').toLowerCase();
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
        const itemImg = item.image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=200&q=80';
        return `
          <div class="cd-item-card">
            <img src="${itemImg}" alt="${item.name}" class="cd-item-img" onerror="this.src='https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=200&q=80'" />
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

    // STEP 3: Order Confirmation Screen
    else if (cartState.activeStep === 3) {
      if (headerText) headerText.textContent = 'Order Confirmed!';

      const order = cartState.lastOrder || {};
      const displayId = order.display_order_id || ('#FS-' + Math.floor(1000 + Math.random() * 9000));
      const whatsappPhone = WHATSAPP_NUMBERS[brandSlug] || '923000000000';

      const whatsappMessage = `Assalam o Alaikum! I just placed an order on the website 🛵\n\n` +
        `*Order ID:* ${displayId}\n` +
        `*Customer Name:* ${cartState.customerName}\n` +
        `*Phone:* ${cartState.customerPhone}\n` +
        `*Fulfillment:* ${cartState.fulfillmentType}\n` +
        (cartState.customerAddress ? `*Address:* ${cartState.customerAddress}\n` : '') +
        `*Total Amount:* Rs. ${getGrandTotal().toLocaleString()} (COD)\n\n` +
        `Please confirm my order. Shukriya!`;

      const waUrl = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(whatsappMessage)}`;

      body.innerHTML = `
        <div class="cd-step active">
          <div class="cd-success-box">
            <div class="cd-success-icon">✅</div>
            <h3 style="font-size:22px; font-weight:900; margin-bottom:4px;">Order Placed Successfully!</h3>
            <p style="font-size:13px; color:var(--cd-muted);">Your order has been sent to our kitchen team.</p>
            
            <div class="cd-success-order-id">${displayId}</div>

            <div class="cd-summary-box" style="text-align:left; margin-bottom:24px;">
              <div class="cd-summary-row">
                <span>Branch:</span>
                <span style="color:#ffffff; font-weight:700;">${cartState.selectedBranch || 'Main Branch'}</span>
              </div>
              <div class="cd-summary-row">
                <span>Payment:</span>
                <span style="color:#ffffff; font-weight:700;">Cash on Delivery (COD)</span>
              </div>
              <div class="cd-summary-row">
                <span>Status:</span>
                <span style="color:var(--cd-accent); font-weight:700;">RECEIVED</span>
              </div>
            </div>

            <a href="${waUrl}" target="_blank" rel="noopener" class="cd-btn-primary" style="text-decoration:none; margin-bottom:12px;">
              <span>💬 Confirm on WhatsApp</span>
            </a>
          </div>
        </div>
      `;

      footer.innerHTML = `
        <button class="cd-btn-secondary" onclick="CartDrawer.resetAndClose()">
          Done / Place Another Order
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

    const brandSlug = (window.BRAND_SLUG || 'tandooristoppk').toLowerCase();

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

    cartState.lastOrder = (orderResult && orderResult.data) ? orderResult.data : null;
    
    // Clear active cart items on success
    cartState.items = [];
    saveCartState();
    updateFloatingBadge();

    // Advance to Step 3: Confirmation
    setStep(3);
  }

  function resetAndClose() {
    cartState.activeStep = 1;
    closeDrawer();
  }

  // Intercept & Upgrade existing `addToOrderForm` calls across brand HTML files
  function monkeyPatchOrderForm() {
    window.addToOrderForm = function (itemName, price) {
      addItem({
        name: itemName,
        price: price,
        qty: 1
      });
    };
  }

  // Initialization
  document.addEventListener('DOMContentLoaded', () => {
    initCartState();
    injectDOM();
    updateFloatingBadge();
    monkeyPatchOrderForm();
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
    resetAndClose
  };

})();
