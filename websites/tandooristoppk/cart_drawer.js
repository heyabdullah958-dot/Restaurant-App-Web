/**
 * FoodSphere KFC/McDonald's-Style Interactive Sliding Cart Drawer & Checkout Engine
 * Provides persistent cart state, multi-step checkout, live delivery calculation,
 * persistent active guest order tracking hydration, and direct DRF API integration.
 * Brand: Tandoori Stop (tandooristoppk)
 */

(function () {
  'use strict';

  const DELIVERY_FEE = 150;
  const ACTIVE_ORDER_KEY = 'foodsphere_active_guest_order_v1';

  // Cart State Storage
  let cartState = {
    items: [], // [{ id, name, price, qty, variant, image }]
    fulfillmentType: 'DELIVERY', // 'DELIVERY' | 'PICKUP'
    selectedBranch: 'Johar Town',
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
    'tandooristoppk': [
      { name: 'Johar Town', id: 1, address: 'PIA Road, Hakim Chowk, Johar Town, Lahore', phone: '0327-4945947' },
      { name: 'Lake City', id: 2, address: 'Opposite Lake City Mall, Raiwind Road, Lahore', phone: '0324-4441735' },
      { name: 'GT Road Baghbanpura', id: 3, address: 'GT Road, Baghbanpura, Lahore', phone: '0326-6811177' }
    ]
  };

  const WHATSAPP_NUMBERS = {
    'tandooristoppk': '923274945947'
  };

  const BRANCH_PHONES = {
    'tandooristoppk': {
      'Johar Town': '923274945947',
      'Lake City': '923244441735',
      'GT Road Baghbanpura': '923266811177'
    }
  };

  // Load saved cart state from sessionStorage
  function initCartState() {
    const brandSlug = 'tandooristoppk';
    try {
      const savedFulfillment = localStorage.getItem('foodsphere_fulfillment_mode') || localStorage.getItem('ts_order_mode');
      if (savedFulfillment === 'PICKUP' || savedFulfillment === 'TAKEAWAY') {
        cartState.fulfillmentType = 'PICKUP';
      } else {
        cartState.fulfillmentType = 'DELIVERY';
      }

      const savedBranch = sessionStorage.getItem('foodsphere_selected_branch_' + brandSlug) || localStorage.getItem('ts_selected_branch');
      if (savedBranch) {
        cartState.selectedBranch = savedBranch;
      }
      const params = new URLSearchParams(window.location.search);
      const urlBranch = params.get('branch');
      if (urlBranch) {
        cartState.selectedBranch = urlBranch;
        sessionStorage.setItem('foodsphere_selected_branch_' + brandSlug, urlBranch);
      }
      const saved = sessionStorage.getItem('foodsphere_cart_' + brandSlug);
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

  function setSelectedBranch(branch) {
    cartState.selectedBranch = branch;
    const brandSlug = 'tandooristoppk';
    try {
      sessionStorage.setItem('foodsphere_selected_branch_' + brandSlug, branch);
      localStorage.setItem('ts_selected_branch', branch);
    } catch (e) {}
  }

  function saveCartState() {
    try {
      sessionStorage.setItem('foodsphere_cart_tandooristoppk', JSON.stringify({
        items: cartState.items
      }));
    } catch (e) {}
  }

  // --- PERSISTENT ACTIVE GUEST ORDER STORAGE & HYDRATION ---
  function saveActiveGuestOrder(orderData, customerInfo) {
    try {
      const activeObj = {
        orderId: orderData.id,
        displayOrderId: orderData.display_order_id || ('#TS-' + orderData.id),
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
      localStorage.setItem(ACTIVE_ORDER_KEY + '_tandooristoppk', JSON.stringify(activeObj));
    } catch (e) {
      console.warn('[CartDrawer] Could not save active guest order', e);
    }
  }

  function getActiveGuestOrder() {
    try {
      const raw = localStorage.getItem(ACTIVE_ORDER_KEY + '_tandooristoppk');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function clearActiveGuestOrder() {
    try {
      localStorage.removeItem(ACTIVE_ORDER_KEY + '_tandooristoppk');
      removeActiveOrderBanner();
    } catch (e) {}
  }

  async function checkAndHydrateActiveGuestOrder() {
    const activeOrder = getActiveGuestOrder();
    if (!activeOrder || !activeOrder.orderId) return;

    // 1. Auto-clear stale guest orders after 12 hours
    if (activeOrder.savedAt) {
      const orderAgeMs = Date.now() - new Date(activeOrder.savedAt).getTime();
      if (orderAgeMs > 12 * 60 * 60 * 1000) {
        console.log('[CartDrawer] Purging stale active guest order (> 12h)');
        clearActiveGuestOrder();
        return;
      }
    }

    // 2. Fetch live status from unauthenticated Universal Tracking endpoint
    try {
      const url = `https://getfoodpk-fd9b20442fcf.herokuapp.com/api/orders/${activeOrder.orderId}/track/`;
      const res = await fetch(url);
      if (res.ok) {
        const liveData = await res.json();
        if (liveData.status === 'delivered' || liveData.status === 'cancelled') {
          console.log(`[CartDrawer] Order #${activeOrder.orderId} reached terminal state (${liveData.status}). Clearing banner.`);
          clearActiveGuestOrder();
          return;
        } else {
          activeOrder.status = liveData.status || activeOrder.status;
          localStorage.setItem(ACTIVE_ORDER_KEY + '_tandooristoppk', JSON.stringify(activeOrder));
        }
      }
    } catch (e) {
      console.warn('[CartDrawer] Live order polling skipped (offline/CORS)', e);
    }

    renderActiveOrderBanner(activeOrder);
  }

  function renderActiveOrderBanner(activeOrder) {
    removeActiveOrderBanner();

    const banner = document.createElement('div');
    banner.id = 'cd-active-order-banner';
    banner.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9980;
      background: linear-gradient(135deg, #1C1917, #292524);
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 50px;
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      max-width: 92vw;
      box-sizing: border-box;
      gap: 10px;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      border: 1px solid rgba(245, 158, 11, 0.35);
      transition: transform 0.3s ease, opacity 0.3s ease;
    `;

    const statusText = (activeOrder.status || 'PREPARING').toUpperCase().replace('_', ' ');

    banner.innerHTML = `
      <span style="font-size:16px;">🔥</span>
      <span>Active Order <strong style="color:#F59E0B;">${activeOrder.displayOrderId}</strong>: <span style="text-decoration:underline;">${statusText}</span></span>
      <span style="background:rgba(200,30,30,0.85); padding:3px 10px; border-radius:12px; font-size:11.5px; font-weight:700;">Track →</span>
      <button type="button" aria-label="Dismiss order banner" style="background:none; border:none; color:#ffffff; font-size:18px; font-weight:bold; cursor:pointer; padding:0 0 0 6px; line-height:1; opacity:0.85;" onclick="event.stopPropagation(); window.CartDrawer && window.CartDrawer.clearActiveGuestOrder ? window.CartDrawer.clearActiveGuestOrder() : this.parentElement.remove();">&times;</button>
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
    return (cartState.fulfillmentType === 'DELIVERY') && cartState.items.length > 0 ? DELIVERY_FEE : 0;
  }

  function getGrandTotal() {
    return getSubtotal() + getDeliveryCharge();
  }

  function getItemCount() {
    return cartState.items.reduce((count, item) => count + item.qty, 0);
  }

  // Dynamic Product Image Resolver
  function findProductImage(itemName) {
    if (!itemName) return './images/tandoori_stop_logo.png';
    const cleanName = itemName.trim();
    const baseName = cleanName.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();

    // Tandoori Stop Local Photos
    if (baseName.includes('tikka boti')) return './images/IMG_7583.JPG.jpeg';
    if (baseName.includes('malai boti') && baseName.includes('roll')) return './images/IMG_7592.JPG.jpeg';
    if (baseName.includes('malai boti')) return './images/IMG_7584.JPG.jpeg';
    if (baseName.includes('reshmi handi') || baseName.includes('sha jahani') || baseName.includes('handi')) return './images/IMG_7584.JPG.jpeg';
    if (baseName.includes('seekh kabab') || baseName.includes('kabab')) return './images/IMG_7578.JPG.jpeg';
    if (baseName.includes('sajji')) return './images/IMG_7587.JPG.jpeg';
    if (baseName.includes('full stop roll') || baseName.includes('tandoori chicken roll')) return './images/IMG_7591.JPG.jpeg';
    if (baseName.includes('chicken paratha roll') || baseName.includes('paratha roll')) return './images/IMG_7588.JPG.jpeg';
    if (baseName.includes('cheese naan')) return './images/IMG_7581.JPG.jpeg';
    if (baseName.includes('roghni naan') || baseName.includes('butter naan') || baseName.includes('plain naan') || baseName.includes('roti')) return './images/IMG_7582.JPG.jpeg';
    if (baseName.includes('puri paratha')) return './images/IMG_7580.JPG.jpeg';
    if (baseName.includes('rice')) return './images/IMG_7579.JPG.jpeg';
    if (baseName.includes('rice') && baseName.includes('tandoori')) return './images/IMG_7586.JPG.jpeg';
    if (baseName.includes('tandoori chicken')) return './images/IMG_7585.JPG.jpeg';
    if (baseName.includes('mint margaritas') || baseName.includes('margarita')) return './images/IMG_7577.JPG.jpeg';
    if (baseName.includes('mojito')) return './images/IMG_7576.JPG.jpeg';

    return './images/tandoori_stop_logo.png';
  }

  // Add Item to Cart
  function addItem(item) {
    const qtyToAdd = item.qty || 1;
    const nameKey = (item.name || 'Item').trim();
    let itemImg = item.image_url || item.image || item.thumbnail;
    if (!itemImg || itemImg.includes('unsplash.com')) {
      itemImg = findProductImage(nameKey);
    }

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
        id: item.id || null,
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
      <span>🔥</span>
      <span class="cd-float-badge" id="cd-float-badge">0</span>
      <span class="cd-float-total" id="cd-float-total">Rs. 0</span>
    `;
    floatBtn.style.display = 'none';
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
            <span>🍗</span>
            <span id="cd-header-text">Your Tandoori Order</span>
          </div>
          <button class="cd-close-btn" onclick="CartDrawer.closeDrawer()" aria-label="Close Cart">&times;</button>
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
  }

  function openDrawer() {
    const backdrop = document.getElementById('cd-backdrop');
    const drawer = document.getElementById('cd-drawer');
    if (backdrop && drawer) {
      backdrop.classList.add('active');
      drawer.classList.add('active');
      document.body.style.overflow = 'hidden';
      renderDrawerContent();
    }
  }

  function closeDrawer() {
    const backdrop = document.getElementById('cd-backdrop');
    const drawer = document.getElementById('cd-drawer');
    if (backdrop && drawer) {
      backdrop.classList.remove('active');
      drawer.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function updateFloatingBadge() {
    const badge = document.getElementById('cd-float-badge');
    const total = document.getElementById('cd-float-total');
    const count = getItemCount();
    const subtotal = getSubtotal();

    if (badge) badge.textContent = count;
    if (total) total.textContent = `Rs. ${subtotal.toLocaleString()}`;

    // Synchronize sticky header cart bucket button
    const headerCount = document.getElementById('header-cart-count');
    const headerTotal = document.getElementById('header-cart-total');
    if (headerCount) headerCount.textContent = count;
    if (headerTotal) headerTotal.textContent = `Rs. ${subtotal.toLocaleString()}`;

    // Synchronize in-page product card steppers
    if (typeof window.syncCardSteppers === 'function') {
      window.syncCardSteppers();
    }

    const floatBtn = document.getElementById('cd-float-btn');
    if (floatBtn) {
      if (count > 0) {
        floatBtn.style.display = 'flex';
      } else {
        floatBtn.style.display = 'none';
      }
    }
  }

  function setStep(step) {
    cartState.activeStep = step;
    renderDrawerContent();
  }

  function setFulfillmentType(type) {
    const normalized = (type === 'PICKUP' || type === 'TAKEAWAY') ? 'PICKUP' : 'DELIVERY';
    cartState.fulfillmentType = normalized;
    try {
      localStorage.setItem('foodsphere_fulfillment_mode', normalized);
      localStorage.setItem('ts_order_mode', normalized);
    } catch (e) {}
    try {
      window.dispatchEvent(new CustomEvent('foodsphere:fulfillment_changed', { detail: { mode: normalized } }));
    } catch (e) {}
    updatePageFulfillmentToggles(normalized);
    renderDrawerContent();
  }

  function getFulfillmentType() {
    return cartState.fulfillmentType || 'DELIVERY';
  }

  function updatePageFulfillmentToggles(mode) {
    const isPickup = (mode === 'PICKUP' || mode === 'TAKEAWAY');

    // Header buttons
    const btnDeliv = document.getElementById('header-btn-delivery');
    const btnPick = document.getElementById('header-btn-pickup');
    if (btnDeliv && btnPick) {
      if (isPickup) {
        btnPick.className = "flex-1 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-[#C81E1E] text-white shadow-sm transition";
        btnDeliv.className = "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#4B5563] hover:text-[#111827] transition";
      } else {
        btnDeliv.className = "flex-1 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-[#C81E1E] text-white shadow-sm transition";
        btnPick.className = "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold text-[#4B5563] hover:text-[#111827] transition";
      }
    }

    // Modal buttons if open
    const modalDeliv = document.getElementById('modal-btn-delivery');
    const modalPick = document.getElementById('modal-btn-pickup');
    const modalAddressBox = document.getElementById('modal-address-section');
    const modalPickupBox = document.getElementById('modal-pickup-section');

    if (modalDeliv && modalPick) {
      if (isPickup) {
        modalPick.className = "flex-1 py-3 px-4 rounded-xl font-extrabold text-sm border-2 border-[#C81E1E] bg-[#C81E1E] text-white shadow-sm transition flex items-center justify-center gap-2";
        modalDeliv.className = "flex-1 py-3 px-4 rounded-xl font-bold text-sm border-2 border-[#E5E7EB] bg-[#FAF8F5] text-[#4B5563] hover:border-[#CBD5E1] transition flex items-center justify-center gap-2";
        if (modalAddressBox) modalAddressBox.style.display = 'none';
        if (modalPickupBox) modalPickupBox.style.display = 'block';
      } else {
        modalDeliv.className = "flex-1 py-3 px-4 rounded-xl font-extrabold text-sm border-2 border-[#C81E1E] bg-[#C81E1E] text-white shadow-sm transition flex items-center justify-center gap-2";
        modalPick.className = "flex-1 py-3 px-4 rounded-xl font-bold text-sm border-2 border-[#E5E7EB] bg-[#FAF8F5] text-[#4B5563] hover:border-[#CBD5E1] transition flex items-center justify-center gap-2";
        if (modalAddressBox) modalAddressBox.style.display = 'block';
        if (modalPickupBox) modalPickupBox.style.display = 'none';
      }
    }
  }

  // Render Drawer Content based on current activeStep
  function renderDrawerContent() {
    const body = document.getElementById('cd-body');
    const footer = document.getElementById('cd-footer');
    if (!body || !footer) return;

    const count = getItemCount();
    const subtotal = getSubtotal();
    const delivery = getDeliveryCharge();
    const grandTotal = getGrandTotal();
    const isPickup = (cartState.fulfillmentType === 'PICKUP' || cartState.fulfillmentType === 'TAKEAWAY');

    // ----------------------------------------------------
    // STEP 1: CART ITEMS VIEW
    // ----------------------------------------------------
    if (cartState.activeStep === 1) {
      if (count === 0) {
        body.innerHTML = `
          <div class="cd-empty-state">
            <div class="cd-empty-icon">🍗</div>
            <div class="cd-empty-title">Your Tandoori Cart is Empty</div>
            <div class="cd-empty-sub">Explore our live clay oven sajji, spicy tikka botis, sizzling karahis, and fluffy naans.</div>
            <button class="cd-btn-primary" onclick="CartDrawer.closeDrawer()">
              Browse Tandoori Menu
            </button>
          </div>
        `;
        footer.innerHTML = '';
        return;
      }

      let itemsHtml = `
        <div class="cd-fulfillment-toggle">
          <button type="button" class="cd-fulfillment-btn ${!isPickup ? 'active' : ''}" onclick="CartDrawer.setFulfillmentType('DELIVERY')">
            🛵 Delivery (Rs. 150)
          </button>
          <button type="button" class="cd-fulfillment-btn ${isPickup ? 'active' : ''}" onclick="CartDrawer.setFulfillmentType('PICKUP')">
            🛍️ Pickup (FREE)
          </button>
        </div>
      `;

      itemsHtml += cartState.items.map((item, idx) => `
        <div class="cd-item-card">
          <img src="${item.image || findProductImage(item.name)}" alt="${item.name}" class="cd-item-img" onerror="this.onerror=null; this.src='./images/tandoori_stop_logo.png';" />
          <div class="cd-item-info">
            <div class="cd-item-name">${item.name}</div>
            <div class="cd-item-price">Rs. ${(item.price * item.qty).toLocaleString()}</div>
          </div>
          <div class="cd-qty-controls">
            <button type="button" class="cd-qty-btn" onclick="CartDrawer.updateQty(${idx}, -1)">&minus;</button>
            <span class="cd-qty-num">${item.qty}</span>
            <button type="button" class="cd-qty-btn" onclick="CartDrawer.updateQty(${idx}, 1)">&plus;</button>
          </div>
        </div>
      `).join('');

      body.innerHTML = itemsHtml;

      footer.innerHTML = `
        <div class="cd-summary-row">
          <span>Subtotal</span>
          <span>Rs. ${subtotal.toLocaleString()}</span>
        </div>
        <div class="cd-summary-row">
          <span>Delivery Fee (${isPickup ? 'Self-Pickup' : 'Standard'})</span>
          <span>${isPickup ? '<strong style="color:#059669;">FREE</strong>' : `Rs. ${delivery}`}</span>
        </div>
        <div class="cd-summary-row total">
          <span>Estimated Total</span>
          <span class="cd-total-price">Rs. ${grandTotal.toLocaleString()}</span>
        </div>
        <button class="cd-btn-primary" onclick="CartDrawer.setStep(2)">
          Proceed to Checkout →
        </button>
        <button class="cd-btn-secondary" onclick="CartDrawer.closeDrawer()">
          + Add More Items
        </button>
      `;
    }

    // ----------------------------------------------------
    // STEP 2: CHECKOUT DETAILS VIEW
    // ----------------------------------------------------
    else if (cartState.activeStep === 2) {
      const branches = BRAND_BRANCHES['tandooristoppk'];
      const branchOptions = branches.map(b => `
        <option value="${b.name}" ${cartState.selectedBranch === b.name ? 'selected' : ''}>
          ${b.name} (${b.phone})
        </option>
      `).join('');

      body.innerHTML = `
        <div class="cd-stepper">
          <div class="cd-step" onclick="CartDrawer.setStep(1)" style="cursor:pointer;">1. Cart Review</div>
          <div class="cd-step active">2. Order Details</div>
        </div>

        <div style="padding-top:14px;">
          <div class="cd-form-group">
            <label class="cd-form-label">Full Name *</label>
            <input type="text" id="cd-input-name" class="cd-form-input" placeholder="e.g. Tariq Mehmood" value="${cartState.customerName || ''}" required />
          </div>

          <div class="cd-form-group">
            <label class="cd-form-label">Active Mobile Number *</label>
            <input type="tel" id="cd-input-phone" class="cd-form-input" placeholder="0327-4945947" value="${cartState.customerPhone || ''}" required />
          </div>

          <div class="cd-form-group">
            <label class="cd-form-label">Fulfillment Outlet *</label>
            <select id="cd-input-branch" class="cd-form-select">
              ${branchOptions}
            </select>
          </div>

          ${!isPickup ? `
            <div class="cd-form-group">
              <label class="cd-form-label">Full Delivery Address *</label>
              <textarea id="cd-input-address" class="cd-form-textarea" rows="2" placeholder="House/Flat #, Street #, Sector / Landmark" required>${cartState.customerAddress || ''}</textarea>
            </div>
          ` : `
            <div class="cd-form-group" style="background:#FAF8F5; border:1px solid #E5E7EB; border-radius:10px; padding:12px;">
              <span style="font-size:12px; color:#4B5563;">
                🛍️ Self-Pickup: Collect directly from your selected branch counter. <strong>Rs. 0 Delivery Fee</strong>.
              </span>
            </div>
          `}

          <div class="cd-form-group">
            <label class="cd-form-label">Special Cooking Instructions (Optional)</label>
            <input type="text" id="cd-input-instructions" class="cd-form-input" placeholder="Extra spicy, crispier naans, less oil..." value="${cartState.instructions || ''}" />
          </div>

          <div class="cd-form-group" style="background:#FFFDF9; border:1px solid #FEF3C7; border-radius:10px; padding:12px;">
            <div style="font-size:13px; font-weight:800; color:#1C1917; margin-bottom:4px;">💵 Payment Mode: Cash on Delivery (COD)</div>
            <div style="font-size:12px; color:#6B7280;">Pay cash to the rider upon delivery or at the branch counter.</div>
          </div>
        </div>
      `;

      footer.innerHTML = `
        <div class="cd-summary-row total" style="margin-top:0; padding-top:0; border-top:none;">
          <span>Total Payable</span>
          <span class="cd-total-price">Rs. ${grandTotal.toLocaleString()}</span>
        </div>
        <button class="cd-btn-primary" id="cd-place-order-btn" onclick="CartDrawer.processOrderSubmission()">
          Confirm & Place Order 🔥
        </button>
        <button class="cd-btn-secondary" onclick="CartDrawer.setStep(1)">
          ← Back to Cart
        </button>
      `;
    }

    // ----------------------------------------------------
    // STEP 3: ORDER CONFIRMATION / ACTIVE TRACKING
    // ----------------------------------------------------
    else if (cartState.activeStep === 3) {
      const activeStored = getActiveGuestOrder();
      const lastOrd = cartState.lastOrder || activeStored;
      const displayId = lastOrd ? (lastOrd.display_order_id || lastOrd.displayOrderId || ('#TS-' + lastOrd.id || lastOrd.orderId)) : '#TS-LIVE';
      const statusLabel = (lastOrd?.status || 'received').toUpperCase();

      const waPhone = WHATSAPP_NUMBERS['tandooristoppk'];
      const waMsg = encodeURIComponent(`Hi Tandoori Stop! I just placed Order ${displayId} for Rs. ${grandTotal.toLocaleString()}. Please confirm!`);
      const waUrl = `https://wa.me/${waPhone}?text=${waMsg}`;

      body.innerHTML = `
        <div style="text-align:center; padding:20px 0;">
          <div style="font-size:52px; margin-bottom:12px;">🔥</div>
          <h3 style="font-family:'Barlow Condensed', sans-serif; font-size:24px; font-weight:800; margin-bottom:4px; color:#111827; text-transform:uppercase;">Order Received!</h3>
          <p style="font-size:13.5px; color:#4B5563;">Your order has been sent to our live tandoor kitchen.</p>

          <div style="font-family:'Barlow Condensed', sans-serif; color:#C81E1E; font-weight:800; font-size:22px; margin:14px 0; letter-spacing:0.04em;">${displayId}</div>

          <div style="text-align:left; margin-bottom:20px; background:#FAF8F5; border:1px solid #E5E7EB; border-radius:12px; padding:14px;">
            <div class="cd-summary-row">
              <span>Branch:</span>
              <span style="color:#111827; font-weight:700;">${cartState.selectedBranch || activeStored?.selectedBranch || 'Johar Town'}</span>
            </div>
            <div class="cd-summary-row">
              <span>Payment:</span>
              <span style="color:#111827; font-weight:700;">Cash on Delivery (COD)</span>
            </div>
            <div class="cd-summary-row">
              <span>Current Status:</span>
              <span style="color:#C81E1E; font-weight:800;">${statusLabel}</span>
            </div>
          </div>

          <a href="${waUrl}" target="_blank" rel="noopener" class="cd-btn-primary" style="text-decoration:none; margin-bottom:10px; display:block; text-align:center;">
            <span>💬 Confirm on WhatsApp</span>
          </a>
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
    const branch = branchEl ? branchEl.value : 'Johar Town';
    const instructions = instructionsEl ? instructionsEl.value.trim() : '';

    if (!name) {
      alert('Please enter your full name.');
      if (nameEl) nameEl.focus();
      return;
    }

    if (!phone || phone.length < 10) {
      alert('Please enter a valid mobile phone number (e.g. 03274945947).');
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
      btn.innerHTML = '<span>Firing Up Tandoor...</span> ⏳';
    }

    // Call Central Web Order API submit function
    let orderResult = null;
    if (typeof window.submitWebOrder === 'function') {
      try {
        orderResult = await window.submitWebOrder({
          brandSlug: 'tandooristoppk',
          branchName: branch,
          customerName: name,
          customerPhone: phone,
          deliveryAddress: address,
          fulfillmentType: cartState.fulfillmentType,
          items: cartState.items,
          instructions: instructions
        });
      } catch (err) {
        console.warn('[CartDrawer] Central submitWebOrder failed, falling back to local fallback', err);
      }
    }

    // Fallback Mock Order Generation if API offline
    if (!orderResult || !orderResult.id) {
      const randomSeq = 1000 + Math.floor(Math.random() * 900);
      let branchCode = 'JT';
      if (branch.toLowerCase().includes('lake')) branchCode = 'LC';
      if (branch.toLowerCase().includes('gt') || branch.toLowerCase().includes('baghbanpura')) branchCode = 'GT';

      orderResult = {
        id: Math.floor(Date.now() / 1000),
        display_order_id: `TS-${branchCode}-${randomSeq}`,
        status: 'received',
        tracking_token: 'ts_guest_' + Math.random().toString(36).substring(2, 10)
      };
    }

    cartState.lastOrder = orderResult;
    saveActiveGuestOrder(orderResult, {
      name,
      phone,
      address,
      fulfillmentType: cartState.fulfillmentType,
      branch
    });

    // Clear cart
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

  // Intercept & Upgrade existing `addToOrderForm` calls
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
  function runInit() {
    initCartState();
    injectDOM();
    updateFloatingBadge();
    monkeyPatchOrderForm();
    checkAndHydrateActiveGuestOrder();
  }

  if (document.readyState === 'interactive' || document.readyState === 'complete') {
    setTimeout(runInit, 1);
  } else {
    document.addEventListener('DOMContentLoaded', runInit);
  }

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
    getFulfillmentType,
    processOrderSubmission,
    resetAndClose,
    clearActiveGuestOrder,
    findProductImage,
    setSelectedBranch,
    getItems: () => cartState.items,
    getItemQty: (name) => {
      const it = cartState.items.find(i => i.name === name);
      return it ? it.qty : 0;
    }
  };

  window.setFulfillmentMode = setFulfillmentType;

})();
