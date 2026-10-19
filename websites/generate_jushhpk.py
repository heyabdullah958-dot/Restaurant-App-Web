import json
import re

with open('websites/jushhpk_items.json', 'r', encoding='utf-8') as f:
    items = json.load(f)

# Group items into 6 categories
cat_11 = [i for i in items if int(i['id']) in [37, 38]]
cat_12 = [i for i in items if int(i['id']) in range(39, 50) or int(i['id']) in [201, 202]]
cat_13 = [i for i in items if int(i['id']) in [50, 51, 52, 53, 54, 55, 69]]
cat_14 = [i for i in items if int(i['id']) in [56, 57, 58]]
cat_15 = [i for i in items if int(i['id']) in [59, 60, 61, 62, 63]]
cat_16 = [i for i in items if int(i['id']) in [64, 65, 66, 67, 68, 70, 71]]

categories = [
    {
        'id': 'cat-11',
        'slug': 'appetizers',
        'title': 'APPETIZER',
        'badge': f'{len(cat_11)} Items',
        'items': cat_11,
        'explore_img': './images/chicken_doner_fries.jpg',
        'explore_name': 'Appetizer'
    },
    {
        'id': 'cat-12',
        'slug': 'turkish-specials',
        'title': 'TURKISH SPECIALS',
        'badge': f'{len(cat_12)} Items',
        'items': cat_12,
        'explore_img': './images/chicken_turkish_doner.jpg',
        'explore_name': 'Turkish Specials'
    },
    {
        'id': 'cat-13',
        'slug': 'shawarma',
        'title': 'SHAWARMA',
        'badge': f'{len(cat_13)} Items',
        'items': cat_13,
        'explore_img': './images/chicken_shawarma_platter.jpg',
        'explore_name': 'Shawarma'
    },
    {
        'id': 'cat-14',
        'slug': 'desserts',
        'title': 'DESSERTS',
        'badge': f'{len(cat_14)} Items',
        'items': cat_14,
        'explore_img': './images/nutella_can_dessert.jpg',
        'explore_name': 'Desserts'
    },
    {
        'id': 'cat-15',
        'slug': 'add-ons',
        'title': 'ADD ONS',
        'badge': f'{len(cat_15)} Items',
        'items': cat_15,
        'explore_img': './images/garlic_dip.jpg',
        'explore_name': 'Add Ons'
    },
    {
        'id': 'cat-16',
        'slug': 'beverages',
        'title': 'BEVERAGES',
        'badge': f'{len(cat_16)} Items',
        'items': cat_16,
        'explore_img': './images/blueberry_mojito.jpg',
        'explore_name': 'Beverages'
    }
]

# 6 Bestsellers
best_seller_ids = ['37', '46', '47', '41', '53', '57']
best_sellers = []
for bid in best_seller_ids:
    found = next((i for i in items if str(i['id']) == bid), None)
    if found:
        best_sellers.append(found)

def render_product_card(item, compact=False):
    badge_html = f'<span class="bg-[#8B1D1D] text-white text-[11px] font-extrabold px-2.5 py-1 rounded-md absolute top-2.5 left-2.5 z-10 shadow-2xs">{item["badge"]}</span>' if item.get('badge') else ''
    h_img = "h-36 sm:h-44" if not compact else "h-32 sm:h-40"
    return f'''
        <article class="product-card bg-white border border-[#E5E7EB] rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs hover:shadow-md transition" data-item-id="{item['id']}" data-item-name="{item['name']}">
          <div>
            <div class="w-full {h_img} bg-[#FFF7ED] rounded-xl overflow-hidden mb-2.5 relative">
              {badge_html}
              <img src="{item['image']}" alt="{item['name']}" class="w-full h-full object-cover object-center" onerror="this.onerror=null; this.src='./images/jushh_logo.jpg';" />
            </div>
            <h3 class="text-[15px] sm:text-[17px] font-extrabold text-[#111827] leading-snug mb-1">{item['name']}</h3>
            <p class="text-xs sm:text-[13.5px] font-medium text-[#4B5563] line-clamp-2 mb-3">{item['description']}</p>
          </div>
          <div class="pt-2.5 border-t border-[#F3F4F6] flex items-center justify-between gap-2">
            <span class="text-base sm:text-[18px] font-extrabold text-[#8B1D1D]">Rs. {item['price_str']}</span>
            <div class="card-action-container" data-item-name="{item['name']}" data-item-id="{item['id']}" data-item-price="{item['price']}" data-item-image="{item['image']}">
              <button type="button" onclick="handleAddToCart({item['id']}, '{item['name']}', {item['price']}, '{item['image']}')" class="btn-add-cart bg-[#EA580C] hover:bg-[#8B1D1D] text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer">+ Add to Cart</button>
            </div>
          </div>
        </article>'''

# SHARED HEADER HTML
header_html = '''
  <!-- B. STICKY COMMERCIAL HEADER (NO TOP ANNOUNCEMENT BAR) -->
  <header class="sticky top-0 z-40 h-16 sm:h-[72px] bg-white border-b border-[#E5E7EB] px-2.5 sm:px-6">
    <div class="max-w-7xl mx-auto h-full flex items-center justify-between gap-1.5 sm:gap-4">
      
      <!-- LEFT GROUP: Hamburger + Brand Logo -->
      <div class="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button id="hamburger-btn" aria-label="Open Menu" onclick="openMobileNavDrawer()" class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] flex items-center justify-center text-[#111827] transition cursor-pointer shrink-0">
          <svg class="w-5 h-5 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <a href="index.html" class="shrink-0 flex items-center" aria-label="Jushh!! Home">
          <img src="./images/jushh_logo_clean.png" alt="Jushh!! Logo" class="h-8 sm:h-11 max-w-[115px] sm:max-w-[160px] w-auto object-contain" onerror="this.onerror=null; this.src='./images/jushh_logo.jpg';" />
        </a>
      </div>

      <!-- CENTER GROUP: Compact Delivery/Pickup Switcher + Location Pill -->
      <div class="flex items-center gap-1 sm:gap-2">
        <div class="bg-[#F3F4F6] p-0.5 sm:p-1 rounded-xl flex items-center border border-[#E5E7EB]" role="group" aria-label="Fulfillment Mode Toggle">
          <button type="button" id="header-mode-delivery" onclick="setOrderMode('DELIVERY')" class="bg-[#EA580C] text-white font-extrabold px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm shadow-sm transition cursor-pointer whitespace-nowrap">
            🛵 Delivery
          </button>
          <button type="button" id="header-mode-pickup" onclick="setOrderMode('PICKUP')" class="text-[#111827] font-bold px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm hover:text-[#EA580C] transition cursor-pointer whitespace-nowrap">
            🛍️ Pickup
          </button>
        </div>

        <div id="header-location-pill" onclick="openOrderModal()" class="hidden md:flex items-center gap-1.5 bg-[#FFF7ED] border border-[#FED7AA] px-3 py-1.5 rounded-xl text-xs font-bold text-[#8B1D1D] hover:border-[#EA580C] cursor-pointer transition select-none">
          <span id="header-location-text">📍 Lahore (Johar Town) • Change</span>
        </div>
      </div>

      <!-- RIGHT GROUP: Compact Cart Button (NO 'Rs. 0' TEXT) -->
      <div class="flex items-center shrink-0">
        <button type="button" id="header-cart-bucket" onclick="if(window.CartDrawer) window.CartDrawer.openDrawer();" class="bg-[#8B1D1D] hover:bg-[#6E1515] text-white font-extrabold h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0" aria-label="Open Cart Bucket">
          <svg class="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
          <span id="header-cart-count" class="bg-[#EA580C] text-white text-[11px] sm:text-xs font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">0</span>
        </button>
      </div>

    </div>
  </header>

  <!-- SLIDE-OUT HAMBURGER NAVIGATION DRAWER -->
  <div id="mobile-nav-backdrop" onclick="closeMobileNavDrawer()" class="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 opacity-0 pointer-events-none" aria-hidden="true"></div>
  <aside id="mobile-nav-drawer" class="fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-2xl border-r border-[#E5E7EB] flex flex-col justify-between p-5 transform -translate-x-full transition-transform duration-300 ease-in-out" aria-label="Main Navigation">
    <div>
      <!-- Drawer Top -->
      <div class="flex items-center justify-between pb-4 border-b border-[#E5E7EB]">
        <div class="flex items-center gap-2.5">
          <img src="./images/jushh_logo.jpg" alt="Jushh!!" class="h-9 w-auto object-contain rounded-md" onerror="this.onerror=null; this.src='https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/jushh_logo.jpg';"/>
          <span class="font-extrabold text-[#111827] text-base">JUSHH!!</span>
        </div>
        <button type="button" id="close-drawer-btn" onclick="closeMobileNavDrawer()" class="w-9 h-9 rounded-lg bg-[#F3F4F6] hover:bg-[#E5E7EB] flex items-center justify-center text-[#111827] text-xl font-bold cursor-pointer transition" aria-label="Close menu">&times;</button>
      </div>
      <!-- Drawer Navigation Links -->
      <nav class="mt-4 space-y-1">
        <a href="index.html" class="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[#111827] hover:bg-[#F3F4F6] transition">
          <span class="text-lg">🏠</span>
          <span>Home</span>
        </a>
        <a href="menu.html" class="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[#111827] hover:bg-[#F3F4F6] transition">
          <span class="text-lg">📖</span>
          <span>All Menu (Full Catalog)</span>
        </a>
        <button type="button" onclick="closeMobileNavDrawer(); openOrderModal();" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[#111827] hover:bg-[#F3F4F6] transition text-left cursor-pointer">
          <span class="text-lg">🛵</span>
          <span>Change Order Mode / Branch</span>
        </button>
        <a href="locations.html" class="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[#111827] hover:bg-[#F3F4F6] transition">
          <span class="text-lg">📍</span>
          <span>Branch Locations</span>
        </a>
        <a href="index.html#about-section" onclick="closeMobileNavDrawer()" class="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[#111827] hover:bg-[#F3F4F6] transition">
          <span class="text-lg">ℹ️</span>
          <span>About Us</span>
        </a>
      </nav>
    </div>
    <!-- Drawer Bottom: Active Branch, Phone, WhatsApp -->
    <div class="pt-4 border-t border-[#E5E7EB] text-xs text-[#4B5563] space-y-2">
      <div>
        <span class="font-bold text-[#111827] block">Active Outlet:</span>
        <span id="drawer-active-branch" class="text-xs font-semibold text-[#8B1D1D]">Johar Town (Phase 2, Block R2)</span>
      </div>
      <div>
        <span class="font-bold text-[#111827] block">Helpline:</span>
        <a href="tel:03269946142" class="text-xs font-semibold text-[#111827] hover:underline">0326-9946142</a>
      </div>
      <a href="https://wa.me/923269946142" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-2 rounded-xl text-xs hover:bg-[#20ba59] transition">
        <span>💬 WhatsApp Support</span>
      </a>
    </div>
  </aside>

  <!-- C. MANDATORY KFC-STYLE ENTRY ORDER MODE & LOCATION POPUP MODAL -->
  <div id="jushh-order-modal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 transition-opacity duration-200" style="display: none;">
    <div class="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-[#E5E7EB] transform transition-all">
      <!-- Modal Top Header Bar -->
      <div class="bg-[#8B1D1D] text-white p-4 text-center relative flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <img src="./images/jushh_logo.jpg" alt="Jushh!!" class="h-9 w-9 rounded-md object-contain bg-white p-0.5" />
          <h3 class="font-extrabold text-base text-white tracking-wide">Select Your Order Type</h3>
        </div>
        <button type="button" onclick="closeOrderModal()" class="text-white/80 hover:text-white text-2xl font-bold leading-none p-1 cursor-pointer transition" aria-label="Close dialog">&times;</button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 space-y-4">
        <!-- 2-Column Mode Selector -->
        <div class="grid grid-cols-2 gap-2 bg-[#F3F4F6] p-1.5 rounded-xl border border-[#E5E7EB]">
          <button type="button" id="modal-mode-delivery" onclick="setModalMode('DELIVERY')" class="bg-[#EA580C] text-white font-extrabold py-3 rounded-lg shadow-sm text-sm transition cursor-pointer">
            🛵 DELIVERY
          </button>
          <button type="button" id="modal-mode-pickup" onclick="setModalMode('PICKUP')" class="text-[#111827] font-bold py-3 rounded-lg text-sm hover:text-[#EA580C] transition cursor-pointer">
            🛍️ PICKUP
          </button>
        </div>

        <!-- Dynamic Content Panel -->
        <div id="modal-delivery-panel" class="space-y-3">
          <div>
            <label class="block text-xs font-bold text-[#4B5563] mb-1">Select Delivery Branch / Sector</label>
            <select id="modal-branch-select" class="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm font-bold text-[#111827] outline-none focus:border-[#EA580C]">
              <option value="Johar Town">Jushh PK — Johar Town (Phase 2, Block R2)</option>
              <option value="Lake City">Jushh PK — Lake City (Business Bay M1)</option>
              <option value="DHA Phase 1">Jushh PK — DHA Phase 1 (Sector H)</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-[#4B5563] mb-1">Street Address in Lahore</label>
            <input type="text" id="modal-address-input" placeholder="Enter your block, street & house no. in Lahore" class="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm font-medium text-[#111827] outline-none focus:border-[#EA580C]" />
          </div>
          <div class="bg-[#FFF7ED] border border-[#FED7AA] text-[#8B1D1D] text-xs font-bold p-3 rounded-xl flex items-center gap-2">
            <span class="text-base">🛵</span>
            <span>Standard Delivery Fee: <strong>Rs. 150</strong> • Estimated Delivery: <strong>30–40 mins</strong></span>
          </div>
        </div>

        <div id="modal-pickup-panel" class="space-y-3" style="display: none;">
          <div>
            <label class="block text-xs font-bold text-[#4B5563] mb-1">Select Pickup Outlet</label>
            <select id="modal-pickup-branch-select" onchange="updatePickupBranchCard(this.value)" class="w-full bg-[#F8F9FA] border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm font-bold text-[#111827] outline-none focus:border-[#EA580C]">
              <option value="Johar Town">Jushh PK — Johar Town (Phase 2, Block R2)</option>
              <option value="Lake City">Jushh PK — Lake City (Business Bay M1)</option>
              <option value="DHA Phase 1">Jushh PK — DHA Phase 1 (Sector H)</option>
            </select>
          </div>
          <div class="bg-[#FFF7ED] border-2 border-[#EA580C] p-3.5 rounded-xl">
            <div class="text-[11px] font-extrabold text-[#EA580C] uppercase tracking-wide">Pickup Location</div>
            <div class="font-extrabold text-sm text-[#111827] mt-0.5" id="modal-pickup-branch-name">📍 Johar Town (Phase 2, Block R2)</div>
            <div class="text-xs text-[#4B5563] mt-1" id="modal-pickup-branch-desc">Phase 2, Block R2, Johar Town, Lahore • 0326-9946142</div>
          </div>
          <div class="bg-[#FEF2F2] border border-[#FECACA] text-[#8B1D1D] text-xs font-bold p-3 rounded-xl flex items-center gap-2">
            <span class="text-base">🛍️</span>
            <span>Self-Pickup: <strong>Rs. 0 Delivery Fee</strong> • Ready in <strong>15–20 mins</strong></span>
          </div>
        </div>

        <!-- Primary Confirm Button -->
        <button type="button" onclick="confirmOrderModal()" class="w-full bg-[#EA580C] hover:bg-[#C2410C] text-white font-extrabold py-3.5 rounded-xl text-base shadow-md transition cursor-pointer">
          Start My Order
        </button>
      </div>
    </div>
  </div>
'''

# SHARED FOOTER & SCRIPTS
shared_footer_html = '''
  <!-- G. COMPACT RESTAURANT DETAILS & ABOUT SNIPPET -->
  <footer class="bg-white border-t border-[#E5E7EB] mt-12 py-10" id="about-section">
    <div class="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div>
        <div class="flex items-center gap-3 mb-3">
          <img src="./images/jushh_logo.jpg" alt="Jushh!!" class="h-10 w-auto object-contain rounded-md" />
          <h4 class="font-extrabold text-lg text-[#111827]">Jushh!! Lahore</h4>
        </div>
        <p class="text-xs text-[#4B5563] leading-relaxed mb-4">
          Food That Makes You Go Uff.. Freshly spiced Turkish doner spits, loaded fries, sizzling shawarmas and pull-tab can desserts served with uncompromising quality.
        </p>
        <div class="flex items-center gap-3">
          <a href="https://wa.me/923269946142" target="_blank" rel="noopener noreferrer" class="bg-[#25D366] text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs hover:bg-[#20ba59] transition">
            <span>💬 WhatsApp</span>
          </a>
          <a href="tel:03269946142" class="bg-[#F3F4F6] text-[#111827] font-bold text-xs px-3.5 py-2 rounded-lg hover:bg-[#E5E7EB] transition">
            📞 0326-9946142
          </a>
        </div>
      </div>

      <div>
        <h4 class="font-extrabold text-sm uppercase tracking-wider text-[#111827] mb-3">Operational Outlets</h4>
        <ul class="text-xs text-[#4B5563] space-y-2">
          <li><strong>Johar Town:</strong> Block R2, Phase 2 Johar Town, Lahore</li>
          <li><strong>Lake City:</strong> Business Bay M1, Lake City, Lahore</li>
          <li><strong>DHA Phase 1:</strong> Sector H, DHA Phase 1, Lahore</li>
        </ul>
      </div>

      <div>
        <h4 class="font-extrabold text-sm uppercase tracking-wider text-[#111827] mb-3">Opening Hours & Delivery</h4>
        <p class="text-xs text-[#4B5563] leading-relaxed mb-2">
          🕒 <strong>Open Daily:</strong> 12:00 PM – 02:00 AM<br/>
          🛵 <strong>Delivery Time:</strong> 30–45 mins • Standard Fee Rs. 150<br/>
          🛍️ <strong>Self-Pickup:</strong> 15–20 mins • Free
        </p>
        <p class="text-[11px] text-[#9CA3AF] mt-4">
          &copy; 2026 Jushh!! PK. Part of FoodSphere Aggregator Platform. All rights reserved.
        </p>
      </div>
    </div>
  </footer>

  <!-- SCRIPT HELPERS -->
  <script>
    window.BRAND_SLUG = 'jushhpk';

    // Drawer Controls
    function openMobileNavDrawer() {
      const drawer = document.getElementById('mobile-nav-drawer');
      const backdrop = document.getElementById('mobile-nav-backdrop');
      if (drawer && backdrop) {
        drawer.classList.remove('-translate-x-full');
        backdrop.classList.remove('opacity-0', 'pointer-events-none');
        backdrop.classList.add('opacity-100');
        document.body.classList.add('overflow-hidden');
      }
    }

    function closeMobileNavDrawer() {
      const drawer = document.getElementById('mobile-nav-drawer');
      const backdrop = document.getElementById('mobile-nav-backdrop');
      if (drawer && backdrop) {
        drawer.classList.add('-translate-x-full');
        backdrop.classList.add('opacity-0', 'pointer-events-none');
        backdrop.classList.remove('opacity-100');
        document.body.classList.remove('overflow-hidden');
      }
    }

    // Modal Controls
    function openOrderModal() {
      const modal = document.getElementById('jushh-order-modal');
      if (modal) modal.style.display = 'flex';
    }

    function closeOrderModal() {
      const modal = document.getElementById('jushh-order-modal');
      if (modal) modal.style.display = 'none';
    }

    function setModalMode(mode) {
      const delBtn = document.getElementById('modal-mode-delivery');
      const pickBtn = document.getElementById('modal-mode-pickup');
      const delPanel = document.getElementById('modal-delivery-panel');
      const pickPanel = document.getElementById('modal-pickup-panel');
      if (mode === 'PICKUP') {
        pickBtn.className = "bg-[#EA580C] text-white font-extrabold py-3 rounded-lg shadow-sm text-sm transition cursor-pointer";
        delBtn.className = "text-[#111827] font-bold py-3 rounded-lg text-sm hover:text-[#EA580C] transition cursor-pointer";
        delPanel.style.display = 'none';
        pickPanel.style.display = 'block';
      } else {
        delBtn.className = "bg-[#EA580C] text-white font-extrabold py-3 rounded-lg shadow-sm text-sm transition cursor-pointer";
        pickBtn.className = "text-[#111827] font-bold py-3 rounded-lg text-sm hover:text-[#EA580C] transition cursor-pointer";
        delPanel.style.display = 'block';
        pickPanel.style.display = 'none';
      }
    }

    function updatePickupBranchCard(branch) {
      const nameEl = document.getElementById('modal-pickup-branch-name');
      const descEl = document.getElementById('modal-pickup-branch-desc');
      if (branch === 'Lake City') {
        nameEl.textContent = '📍 Lake City (Business Bay M1)';
        descEl.textContent = 'Business Bay M1, Lake City, Lahore • 0324-4441735';
      } else if (branch === 'DHA Phase 1') {
        nameEl.textContent = '📍 DHA Phase 1 (Sector H)';
        descEl.textContent = 'Sector H, DHA Phase 1, Lahore • 0325-7217221';
      } else {
        nameEl.textContent = '📍 Johar Town (Phase 2, Block R2)';
        descEl.textContent = 'Block R2, Phase 2 Johar Town, Lahore • 0326-9946142';
      }
    }

    function confirmOrderModal() {
      const delPanel = document.getElementById('modal-delivery-panel');
      const isPickup = (delPanel.style.display === 'none');
      const mode = isPickup ? 'PICKUP' : 'DELIVERY';
      const branch = isPickup ? document.getElementById('modal-pickup-branch-select').value : document.getElementById('modal-branch-select').value;
      const addr = document.getElementById('modal-address-input') ? document.getElementById('modal-address-input').value.trim() : '';

      setOrderMode(mode);
      if (window.CartDrawer && window.CartDrawer.setSelectedBranch) {
        window.CartDrawer.setSelectedBranch(branch);
      }
      const locText = document.getElementById('header-location-text');
      if (locText) {
        locText.textContent = `📍 Lahore (${branch}) • Change`;
      }
      const drawerBranch = document.getElementById('drawer-active-branch');
      if (drawerBranch) {
        drawerBranch.textContent = branch;
      }
      localStorage.setItem('jushh_order_mode', mode);
      localStorage.setItem('jushh_selected_branch', branch);
      localStorage.setItem('jushh_mode_confirmed', 'true');
      closeOrderModal();
    }

    function setOrderMode(mode) {
      if (window.CartDrawer && window.CartDrawer.setFulfillmentType) {
        window.CartDrawer.setFulfillmentType(mode);
      }
      const headerDel = document.getElementById('header-mode-delivery');
      const headerPick = document.getElementById('header-mode-pickup');
      if (headerDel && headerPick) {
        if (mode === 'PICKUP') {
          headerPick.className = "bg-[#EA580C] text-white font-extrabold px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm shadow-sm transition cursor-pointer whitespace-nowrap";
          headerDel.className = "text-[#111827] font-bold px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm hover:text-[#EA580C] transition cursor-pointer whitespace-nowrap";
        } else {
          headerDel.className = "bg-[#EA580C] text-white font-extrabold px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm shadow-sm transition cursor-pointer whitespace-nowrap";
          headerPick.className = "text-[#111827] font-bold px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm hover:text-[#EA580C] transition cursor-pointer whitespace-nowrap";
        }
      }
    }

    function handleAddToCart(id, name, price, img) {
      if (window.CartDrawer && window.CartDrawer.addItem) {
        window.CartDrawer.addItem(id, name, price, img);
      }
    }

    function handleCardQty(name, delta) {
      if (window.CartDrawer && window.CartDrawer.updateQty) {
        window.CartDrawer.updateQty(name, delta);
      }
    }

    window.syncCardSteppers = function() {
      const items = (window.CartDrawer && window.CartDrawer.getItems) ? window.CartDrawer.getItems() : [];
      document.querySelectorAll('.card-action-container').forEach(container => {
        const name = container.getAttribute('data-item-name');
        const id = container.getAttribute('data-item-id');
        const price = container.getAttribute('data-item-price');
        const img = container.getAttribute('data-item-image');
        const cartItem = items.find(i => i.name === name);
        const qty = cartItem ? cartItem.qty : 0;

        if (qty > 0) {
          container.innerHTML = `
            <div class="stepper-wrap flex items-center bg-[#8B1D1D] rounded-xl overflow-hidden shadow-xs text-white">
              <button type="button" onclick="handleCardQty('${name.replace(/'/g, "\\'")}', -1)" class="w-8 h-8 flex items-center justify-center font-bold text-sm hover:bg-[#6E1515] transition cursor-pointer">-</button>
              <span class="w-8 text-center text-xs font-extrabold">${qty}</span>
              <button type="button" onclick="handleCardQty('${name.replace(/'/g, "\\'")}', 1)" class="w-8 h-8 flex items-center justify-center font-bold text-sm hover:bg-[#6E1515] transition cursor-pointer">+</button>
            </div>
          `;
        } else {
          container.innerHTML = `
            <button type="button" onclick="handleAddToCart(${id}, '${name.replace(/'/g, "\\'")}', ${price}, '${img}')" class="btn-add-cart bg-[#EA580C] hover:bg-[#8B1D1D] text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer">+ Add to Cart</button>
          `;
        }
      });
    };

    document.addEventListener('DOMContentLoaded', () => {
      try {
        const confirmed = localStorage.getItem('jushh_mode_confirmed');
        if (confirmed !== 'true') {
          openOrderModal();
        } else {
          const savedMode = localStorage.getItem('jushh_order_mode') || 'DELIVERY';
          setOrderMode(savedMode);
        }
      } catch (e) {
        openOrderModal();
      }
      setTimeout(() => {
        if (typeof window.syncCardSteppers === 'function') window.syncCardSteppers();
      }, 50);
    });
  </script>

  <!-- External Cart & Catalog Engine -->
  <script src="cart_drawer.js?v=20261019"></script>
  <script src="live_catalog.js?v=20261019"></script>
'''

# 1. GENERATE index.html (Showcase only)
explore_cards_html = ""
for c in categories:
    explore_cards_html += f'''
      <a href="menu.html#{c['id']}" class="bg-white border border-[#E5E7EB] rounded-2xl p-3 shadow-xs hover:shadow-md hover:border-[#EA580C] transition cursor-pointer flex flex-col justify-between group">
        <div class="w-full h-24 sm:h-28 bg-[#FFF7ED] rounded-xl overflow-hidden mb-2.5">
          <img src="{c['explore_img']}" alt="{c['explore_name']}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" onerror="this.onerror=null; this.src='./images/jushh_logo.jpg';" />
        </div>
        <span class="text-xs sm:text-sm font-extrabold text-[#111827] text-center group-hover:text-[#EA580C] transition">{c['explore_name']}</span>
      </a>'''

bestsellers_cards_html = ""
for b in best_sellers:
    bestsellers_cards_html += render_product_card(b, compact=True)

index_html = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>JUSHH!! — Food That Makes You Go Uff.. | KFC-Style Street Gourmet | Lahore</title>
  <meta name="description" content="Jushh!! Lahore — Authentic Turkish Doner spits, loaded doner fries, flame-roasted shawarmas, signature pull-tab can desserts and refreshing mojitos. Order delivery or self-pickup."/>
  
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"/>
  
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {{
      theme: {{
        extend: {{
          colors: {{
            jushhOrange: '#EA580C',
            jushhOrangeHover: '#C2410C',
            jushhOrangeTint: '#FFF7ED',
            jushhMaroon: '#8B1D1D',
            jushhMaroonHover: '#6E1515',
            jushhCanvas: '#F8F9FA',
            jushhCharcoal: '#111827',
            jushhGrey: '#4B5563'
          }},
          fontFamily: {{
            sans: ['"Plus Jakarta Sans"', 'sans-serif']
          }}
        }}
      }}
    }}
  </script>

  <link rel="stylesheet" href="cart_drawer.css?v=20261019"/>
  <link rel="stylesheet" href="theme_jushh.css?v=20261019"/>
</head>
<body class="bg-[#F8F9FA] text-[#111827] font-sans antialiased min-h-screen flex flex-col">

{header_html}

  <main class="flex-1 w-full space-y-6 sm:space-y-8 pb-10">

    <!-- HERO SECTION: DESIGN TYPE 3 (Compact Horizontal Split Card) -->
    <section class="max-w-7xl mx-auto px-4 pt-3 pb-2 w-full">
      <div class="bg-white border-2 border-[#FED7AA] rounded-2xl overflow-hidden shadow-sm grid grid-cols-12 items-center min-h-[155px] sm:min-h-[210px]">
        <div class="col-span-7 p-4 sm:p-7 bg-gradient-to-r from-[#8B1D1D] to-[#EA580C] text-white h-full flex flex-col justify-center">
          <h1 class="text-lg sm:text-3xl font-extrabold leading-tight text-white">Turkish Doners, Wraps &amp; Shawaya</h1>
          <a href="menu.html" class="inline-block bg-white text-[#8B1D1D] hover:bg-[#FFF7ED] font-extrabold text-xs sm:text-sm px-3.5 py-2 rounded-xl mt-3 w-fit shadow-xs transition">
            Order Full Menu &rarr;
          </a>
        </div>
        <div class="col-span-5 h-full min-h-[155px] sm:min-h-[210px] relative bg-[#FFF7ED]">
          <img src="./images/chicken_turkish_doner.jpg" alt="Turkish Doners, Wraps & Shawaya" class="w-full h-full object-cover object-center" onerror="this.onerror=null; this.src='./images/half_dubai_shawaya.jpg';"/>
        </div>
      </div>
    </section>

    <!-- EXPLORE MENU: KFC-Style Category Boxes -->
    <section class="max-w-7xl mx-auto px-4 w-full">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-lg sm:text-xl font-extrabold uppercase tracking-tight text-[#111827]">EXPLORE MENU</h2>
          <div class="w-12 h-1 mt-1 rounded-full bg-[#EA580C]"></div>
        </div>
        <a href="menu.html" class="text-xs sm:text-sm font-extrabold uppercase underline tracking-wider text-[#EA580C] hover:text-[#C2410C] transition">
          VIEW ALL
        </a>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {explore_cards_html}
      </div>
    </section>

    <!-- BEST SELLERS: 6 Featured Items Only -->
    <section class="max-w-7xl mx-auto px-4 w-full">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-lg sm:text-xl font-extrabold uppercase tracking-tight text-[#111827]">BEST SELLERS</h2>
          <div class="w-12 h-1 mt-1 rounded-full bg-[#8B1D1D]"></div>
        </div>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {bestsellers_cards_html}
      </div>
      <div class="mt-6 text-center">
        <a href="menu.html" class="inline-block bg-[#8B1D1D] hover:bg-[#6E1515] text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-sm transition">
          Explore Full Menu &rarr;
        </a>
      </div>
    </section>

  </main>

{shared_footer_html}

</body>
</html>
'''

with open('websites/jushhpk/index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)
print("Successfully generated websites/jushhpk/index.html")

# 2. GENERATE menu.html (Full Categorized Catalog)
menu_categories_html = ""
for c in categories:
    cat_items_html = ""
    for item in c['items']:
        cat_items_html += render_product_card(item)
    menu_categories_html += f'''
    <section class="category-section scroll-mt-36" id="{c['id']}" data-cat-id="{c['id']}">
      <div class="flex items-center gap-2.5 mb-4">
        <span class="w-2 h-7 bg-[#8B1D1D] rounded-full"></span>
        <h2 class="text-xl sm:text-2xl font-extrabold text-[#111827] uppercase">{c['title']}</h2>
        <span class="bg-[#FFF7ED] text-[#EA580C] text-xs font-extrabold px-2.5 py-1 rounded-full">{c['badge']}</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {cat_items_html}
      </div>
    </section>'''

category_pills_html = '''
      <button type="button" class="category-pill active bg-[#EA580C] text-white border border-[#EA580C] font-extrabold px-4 py-2 rounded-full text-xs sm:text-sm whitespace-nowrap shadow-sm cursor-pointer" onclick="scrollToCategorySection('all')">
        All Menu
      </button>'''
for c in categories:
    category_pills_html += f'''
      <button type="button" class="category-pill bg-[#F3F4F6] text-[#111827] hover:border-[#EA580C] border border-[#E5E7EB] font-bold px-4 py-2 rounded-full text-xs sm:text-sm whitespace-nowrap transition cursor-pointer" onclick="scrollToCategorySection('{c['id']}')">
        {c['explore_name']}
      </button>'''

menu_html = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>JUSHH!! — Full Menu &amp; Catalog | Lahore</title>
  <meta name="description" content="Explore Jushh!! Lahore's complete Turkish gourmet menu: Doners, Loaded Fries, Shawarmas, Desserts, and Refreshing Mojitos."/>
  
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"/>
  
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {{{{
      theme: {{{{
        extend: {{{{
          colors: {{{{
            jushhOrange: '#EA580C',
            jushhOrangeHover: '#C2410C',
            jushhOrangeTint: '#FFF7ED',
            jushhMaroon: '#8B1D1D',
            jushhMaroonHover: '#6E1515',
            jushhCanvas: '#F8F9FA',
            jushhCharcoal: '#111827',
            jushhGrey: '#4B5563'
          }}}},
          fontFamily: {{{{
            sans: ['"Plus Jakarta Sans"', 'sans-serif']
          }}}}
        }}}}
      }}}}
    }}}}
  </script>

  <link rel="stylesheet" href="cart_drawer.css?v=20261019"/>
  <link rel="stylesheet" href="theme_jushh.css?v=20261019"/>
</head>
<body class="bg-[#F8F9FA] text-[#111827] font-sans antialiased min-h-screen flex flex-col">

{header_html}

  <!-- STICKY CATEGORY RIBBON & LIVE SEARCH BAR -->
  <nav class="sticky top-16 sm:top-[72px] z-30 bg-white border-b border-[#E5E7EB] py-2.5 px-3 sm:px-6 shadow-xs">
    <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
      <!-- Search Input -->
      <div class="relative w-full sm:max-w-xs">
        <input type="text" id="menu-search-input" oninput="handleLiveSearch(this.value)" placeholder="Search Turkish dishes..." class="w-full bg-[#F3F4F6] border border-[#E5E7EB] focus:border-[#EA580C] focus:bg-white rounded-xl pl-9 pr-3 py-1.5 text-xs sm:text-sm font-medium text-[#111827] placeholder-[#6B7280] outline-none transition" />
        <svg class="w-4 h-4 text-[#6B7280] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      </div>

      <!-- Horizontal Scrollable Category Pills -->
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5" id="category-pills">
        {category_pills_html}
      </div>
    </div>
  </nav>

  <!-- FULL CATEGORIZED CATALOG BODY -->
  <main class="max-w-7xl mx-auto px-4 py-6 space-y-10 flex-1 w-full" id="menu">
    {menu_categories_html}
  </main>

{shared_footer_html}

  <script>
    function scrollToCategorySection(catId) {{
      if (catId === 'all') {{
        window.scrollTo({{ top: 0, behavior: 'smooth' }});
        updateActivePill('all');
        return;
      }}
      const el = document.getElementById(catId) || document.querySelector(`[data-cat-id="${{catId}}"]`);
      if (el) {{
        el.scrollIntoView({{ behavior: 'smooth' }});
        updateActivePill(catId);
      }}
    }}

    function updateActivePill(catId) {{
      document.querySelectorAll('.category-pill').forEach(btn => {{
        const onclickAttr = btn.getAttribute('onclick') || '';
        if (onclickAttr.includes(`'${{catId}}'`)) {{
          btn.className = "category-pill active bg-[#EA580C] text-white border border-[#EA580C] font-extrabold px-4 py-2 rounded-full text-xs sm:text-sm whitespace-nowrap shadow-sm cursor-pointer";
        }} else {{
          btn.className = "category-pill bg-[#F3F4F6] text-[#111827] hover:border-[#EA580C] border border-[#E5E7EB] font-bold px-4 py-2 rounded-full text-xs sm:text-sm whitespace-nowrap transition cursor-pointer";
        }}
      }});
    }}

    function handleLiveSearch(query) {{
      const q = query.trim().toLowerCase();
      document.querySelectorAll('#menu .product-card').forEach(card => {{
        const name = (card.getAttribute('data-item-name') || '').toLowerCase();
        const desc = (card.querySelector('p') ? card.querySelector('p').textContent : '').toLowerCase();
        if (!q || name.includes(q) || desc.includes(q)) {{
          card.style.display = 'flex';
        }} else {{
          card.style.display = 'none';
        }}
      }});
    }}

    // Scroll to URL hash on load
    window.addEventListener('load', () => {{
      const hash = window.location.hash.replace('#', '');
      if (hash) {{
        setTimeout(() => {{
          scrollToCategorySection(hash);
        }}, 100);
      }}
    }});
  </script>

</body>
</html>'''
with open('websites/jushhpk/menu.html', 'w', encoding='utf-8') as f:
    f.write(menu_html)
print("Successfully generated websites/jushhpk/menu.html")
