import json
import re

with open('websites/dineatblue_data.json', 'r', encoding='utf-8') as f:
    categories = json.load(f)

# Also extract item descriptions and badges from original index.html
with open('websites/dineatblue/index.html', 'r', encoding='utf-8') as f:
    orig_html = f.read()

cat_order_map = {
    'cat-platters': {'slug': 'signature-platters', 'title': 'Signature Platters', 'short_name': 'Platters'},
    'cat-starters': {'slug': 'starters', 'title': 'Starters & Prawns', 'short_name': 'Starters & Prawns'},
    'cat-salads': {'slug': 'salads', 'title': 'Salads', 'short_name': 'Salads'},
    'cat-seafood': {'slug': 'mains-seafood', 'title': 'Mains - Seafood', 'short_name': 'Mains Seafood'},
    'cat-chicken': {'slug': 'mains-chicken', 'title': 'Mains - Chicken', 'short_name': 'Mains Chicken'},
    'cat-addons': {'slug': 'add-ons', 'title': 'Sides & Add-Ons', 'short_name': 'Sides & Add-Ons'},
    'cat-drinks': {'slug': 'beverages', 'title': 'Beverages & Mojitos', 'short_name': 'Beverages'}
}

ordered_categories = []
for cat_id in ['cat-platters', 'cat-starters', 'cat-salads', 'cat-seafood', 'cat-chicken', 'cat-addons', 'cat-drinks']:
    found = next((c for c in categories if c['id'] == cat_id), None)
    if found:
        meta = cat_order_map[cat_id]
        found['slug'] = meta['slug']
        found['display_title'] = meta['title']
        found['short_name'] = meta['short_name']
        for item in found['items']:
            name = item['name']
            m = re.search(rf'data-item-name="{re.escape(name)}".*?<p[^>]*class="[^"]*text-\[13px\][^"]*"[^>]*>(.*?)</p>', orig_html, re.DOTALL)
            if not m:
                m = re.search(rf'{re.escape(name)}</h3>\s*<p[^>]*>(.*?)</p>', orig_html, re.DOTALL)
            desc = re.sub(r'<[^>]+>', '', m.group(1)).strip() if m else ''
            item['description'] = desc

            b_match = re.search(rf'data-item-name="{re.escape(name)}".*?<span[^>]*class="[^"]*absolute top-2\.5 left-2\.5[^"]*"[^>]*>(.*?)</span>', orig_html, re.DOTALL)
            item['badge'] = re.sub(r'<[^>]+>', '', b_match.group(1)).strip() if b_match else ''
        ordered_categories.append(found)

bestseller_names = [
    'Blue Seafood Platter (Steamed)',
    '2 Person Seafood & Chicken Platter',
    'Kunafa Prawns (3 pcs)',
    'Dynamite Prawns',
    'Grilled Fish',
    'Korean Fried Chicken'
]

all_items = []
for c in ordered_categories:
    all_items.extend(c['items'])

bestsellers = []
for bname in bestseller_names:
    found = next((i for i in all_items if i['name'] == bname), None)
    if found:
        bestsellers.append(found)

print(f"Loaded {len(all_items)} Blue items across {len(ordered_categories)} categories")

def render_product_card(item, compact=False):
    badge_html = f'<span class="bg-[#16384C] text-[#EFE6D5] text-[11px] font-[\'Montserrat\'] font-extrabold px-2.5 py-1 rounded-md absolute top-2.5 left-2.5 z-10 shadow-2xs uppercase tracking-wider">{item["badge"]}</span>' if item.get('badge') else ''
    h_img = "h-36 sm:h-44" if not compact else "h-32 sm:h-40"
    price_formatted = f"{item['price']:,}"
    return f'''
        <div class="product-card bg-white border border-[#E2E8F0] rounded-2xl p-3 sm:p-3.5 flex flex-col justify-between shadow-xs hover:shadow-md transition" data-item-id="{item['id']}" data-item-name="{item['name']}">
          <div>
            <div class="w-full {h_img} bg-[#F4F7F9] rounded-xl overflow-hidden mb-2.5 relative">
              {badge_html}
              <img src="{item['image']}" alt="{item['name']}" class="w-full h-full object-cover object-center" onerror="this.onerror=null; this.src=\'./images/logo.png\';" />
            </div>
            <h3 class="font-[\'Montserrat\'] text-[15px] sm:text-[17px] font-extrabold text-[#0F172A] leading-snug mb-1">{item['name']}</h3>
            <p class="text-xs sm:text-[13px] font-medium text-[#475569] line-clamp-2 mb-3">{item['description']}</p>
          </div>
          <div class="pt-2.5 border-t border-[#EDF2F7] flex items-center justify-between gap-2">
            <span class="font-[\'Montserrat\'] text-base sm:text-lg font-extrabold text-[#16384C]">Rs. {price_formatted}</span>
            <div class="card-action-container" data-item-name="{item['name']}" data-item-id="{item['id']}" data-item-price="{item['price']}" data-item-image="{item['image']}">
              <button type="button" onclick="handleAddToCart({item['id']}, \'{item['name']}\', {item['price']}, \'{item['image']}\')" class="btn-add-cart bg-[#16384C] hover:bg-[#0D2331] text-white font-[\'Montserrat\'] font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer">+ Add to Cart</button>
            </div>
          </div>
        </div>'''

header_html = '''
  <!-- B. STICKY COMMERCIAL HEADER (NO TOP ANNOUNCEMENT BAR) -->
  <header class="sticky top-0 z-40 h-16 sm:h-[72px] bg-white border-b border-[#E2E8F0] px-3 sm:px-6">
    <div class="max-w-7xl mx-auto h-full flex items-center justify-between gap-2">
      
      <!-- LEFT GROUP: Hamburger + Circular Brand Logo -->
      <div class="flex items-center gap-2 sm:gap-3">
        <button id="hamburger-btn" aria-label="Open Menu" onclick="openMobileNavDrawer()" class="w-10 h-10 rounded-xl bg-[#F4F7F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] transition cursor-pointer shrink-0">
          <svg class="w-5 h-5 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <a href="index.html" class="shrink-0 flex items-center" aria-label="Dine At Blue Home">
          <img src="./images/logo.png" alt="Dine At Blue Logo" class="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-contain drop-shadow-xs" />
        </a>
      </div>

      <!-- CENTER GROUP: Compact Delivery/Pickup Switcher + Location Pill -->
      <div class="flex items-center gap-2">
        <div class="bg-[#EDF2F7] p-1 rounded-xl flex items-center border border-[#E2E8F0]" role="group" aria-label="Fulfillment Mode Toggle">
          <button type="button" id="header-mode-delivery" onclick="setOrderMode('DELIVERY')" class="bg-[#16384C] text-white font-['Montserrat'] font-extrabold px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm shadow-sm transition cursor-pointer whitespace-nowrap">
            🛵 Delivery
          </button>
          <button type="button" id="header-mode-pickup" onclick="setOrderMode('PICKUP')" class="text-[#0F172A] font-['Montserrat'] font-bold px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm hover:text-[#16384C] transition cursor-pointer whitespace-nowrap">
            🛍️ Pickup
          </button>
        </div>

        <div id="header-location-pill" onclick="openOrderModal()" class="hidden md:flex items-center gap-1.5 bg-[#F9F6F0] border border-[#EFE6D5] px-3 py-1.5 rounded-xl text-xs font-bold text-[#16384C] hover:border-[#16384C] cursor-pointer transition select-none">
          <span id="header-location-text">📍 Gulberg III (65, Block D1) • Change</span>
        </div>
      </div>

      <!-- RIGHT GROUP: Compact Cart Button (NO 'Rs. 0' TEXT) -->
      <div class="flex items-center gap-2">
        <button type="button" id="header-cart-bucket" onclick="if(window.CartDrawer) window.CartDrawer.openDrawer();" class="bg-[#16384C] hover:bg-[#0D2331] text-white font-['Montserrat'] font-extrabold h-10 px-3 sm:px-3.5 rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0" aria-label="Open Cart Bucket">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
          <span id="header-cart-count" class="bg-[#EFE6D5] text-[#16384C] text-xs font-extrabold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">0</span>
        </button>
      </div>

    </div>
  </header>

  <!-- SLIDE-OUT HAMBURGER NAVIGATION DRAWER -->
  <div id="mobile-nav-backdrop" onclick="closeMobileNavDrawer()" class="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 opacity-0 pointer-events-none" aria-hidden="true"></div>
  <aside id="mobile-nav-drawer" class="fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-2xl border-r border-[#E2E8F0] flex flex-col justify-between p-5 transform -translate-x-full transition-transform duration-300 ease-in-out" aria-label="Main Navigation">
    <div>
      <!-- Drawer Top -->
      <div class="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
        <div class="flex items-center gap-2.5">
          <img src="./images/logo.png" alt="Dine At Blue" class="h-10 w-10 rounded-full object-contain" />
          <span class="font-['Montserrat'] font-extrabold text-[#0F172A] text-base">Dine At Blue</span>
        </div>
        <button type="button" id="close-drawer-btn" onclick="closeMobileNavDrawer()" class="w-9 h-9 rounded-lg bg-[#F4F7F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] text-xl font-bold cursor-pointer transition" aria-label="Close menu">&times;</button>
      </div>
      <!-- Drawer Navigation Links -->
      <nav class="mt-4 space-y-1 font-['Montserrat'] text-sm font-bold">
        <a href="index.html" class="flex items-center gap-3 px-4 py-3 rounded-xl text-[#0F172A] hover:bg-[#F4F7F9] transition">
          <span class="text-lg">🏠</span>
          <span>Home</span>
        </a>
        <a href="menu.html" class="flex items-center gap-3 px-4 py-3 rounded-xl text-[#0F172A] hover:bg-[#F4F7F9] transition">
          <span class="text-lg">📖</span>
          <span>All Menu (Full Catalog)</span>
        </a>
        <button type="button" onclick="closeMobileNavDrawer(); openOrderModal();" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[#0F172A] hover:bg-[#F4F7F9] transition text-left cursor-pointer font-['Montserrat'] text-sm font-bold">
          <span class="text-lg">🛵</span>
          <span>Change Order Mode / Branch</span>
        </button>
        <a href="locations.html" class="flex items-center gap-3 px-4 py-3 rounded-xl text-[#0F172A] hover:bg-[#F4F7F9] transition">
          <span class="text-lg">📍</span>
          <span>Branch Locations</span>
        </a>
        <a href="index.html#about-section" onclick="closeMobileNavDrawer()" class="flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[#0F172A] hover:bg-[#F4F7F9] transition">
          <span class="text-lg">ℹ️</span>
          <span>About Us</span>
        </a>
      </nav>
    </div>
    <!-- Drawer Bottom: Active Branch, Phone, WhatsApp -->
    <div class="pt-4 border-t border-[#E2E8F0] text-xs text-[#64748B] space-y-2">
      <div>
        <span class="font-bold text-[#0F172A] block">Active Outlet:</span>
        <span id="drawer-active-branch" class="text-xs font-semibold text-[#16384C]">Gulberg III (65, Block D1)</span>
      </div>
      <div>
        <span class="font-bold text-[#0F172A] block">Helpline:</span>
        <a href="tel:03218484111" class="text-xs font-semibold text-[#0F172A] hover:underline">0321-8484111</a>
      </div>
      <a href="https://wa.me/923218484111" target="_blank" rel="noopener noreferrer" class="flex items-center justify-center gap-2 bg-[#25D366] text-white font-bold py-2 rounded-xl text-xs hover:bg-[#20ba59] transition">
        <span>💬 WhatsApp Support</span>
      </a>
    </div>
  </aside>

  <!-- C. MANDATORY KFC-STYLE ENTRY ORDER MODE & LOCATION POPUP MODAL -->
  <div id="blue-order-modal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 transition-opacity duration-200" style="display: none;">
    <div class="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-[#E2E8F0] transform transition-all">
      <!-- Modal Top Header Bar -->
      <div class="bg-[#16384C] text-white p-4 text-center relative flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <img src="./images/logo.png" alt="Dine At Blue" class="h-9 w-9 rounded-full object-contain bg-white p-0.5" />
          <h3 class="font-['Montserrat'] font-extrabold text-base text-[#EFE6D5] tracking-wide">Select Your Dining Mode</h3>
        </div>
        <button type="button" onclick="closeOrderModal()" class="text-white/80 hover:text-white text-2xl font-bold leading-none p-1 cursor-pointer transition" aria-label="Close dialog">&times;</button>
      </div>

      <!-- Modal Body -->
      <div class="p-6 space-y-4">
        <!-- 2-Column Mode Selector -->
        <div class="grid grid-cols-2 gap-2 bg-[#EDF2F7] p-1.5 rounded-xl border border-[#E2E8F0]">
          <button type="button" id="modal-mode-delivery" onclick="setModalMode('DELIVERY')" class="bg-[#16384C] text-white font-['Montserrat'] font-extrabold py-3 rounded-lg shadow-sm text-sm transition cursor-pointer">
            🛵 DELIVERY
          </button>
          <button type="button" id="modal-mode-pickup" onclick="setModalMode('PICKUP')" class="text-[#0F172A] font-['Montserrat'] font-bold py-3 rounded-lg hover:text-[#16384C] text-sm transition cursor-pointer">
            🛍️ SELF-PICKUP
          </button>
        </div>

        <!-- Dynamic Delivery Panel -->
        <div id="modal-delivery-panel" class="space-y-3">
          <label class="block text-xs font-['Montserrat'] font-bold text-[#0F172A] uppercase tracking-wide">Enter Delivery Address</label>
          <div class="relative">
            <input type="text" id="modal-delivery-address" placeholder="e.g. House 14, Street 5, Gulberg III / DHA Phase 5..." class="w-full bg-[#F4F7F9] border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-sm font-medium text-[#0F172A] outline-none focus:border-[#16384C] focus:bg-white" />
          </div>
          <div class="bg-[#F9F6F0] border border-[#EFE6D5] text-[#16384C] text-xs font-medium p-3 rounded-xl flex items-center gap-2">
            <span class="text-base">🌊</span>
            <span>Express Seafood Delivery: <strong>Rs. 200</strong> • Direct from steam &amp; flame kitchen</span>
          </div>
        </div>

        <!-- Dynamic Pickup Panel -->
        <div id="modal-pickup-panel" class="space-y-3" style="display: none;">
          <div>
            <label class="block text-xs font-['Montserrat'] font-bold text-[#0F172A] uppercase tracking-wide mb-1">Select Pickup Outlet</label>
            <select id="modal-pickup-branch-select" onchange="updatePickupBranchCard(this.value)" class="w-full bg-[#F4F7F9] border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm font-bold text-[#0F172A] outline-none focus:border-[#16384C]">
              <option value="Gulberg III">Dine At Blue — Gulberg III (65, Block D1)</option>
            </select>
          </div>
          <div class="bg-[#F9F6F0] border-2 border-[#16384C] p-3.5 rounded-xl">
            <div class="text-[11px] font-['Montserrat'] font-extrabold text-[#16384C] uppercase tracking-wide">Pickup Location</div>
            <div class="font-['Montserrat'] font-extrabold text-sm text-[#0F172A] mt-0.5" id="modal-pickup-branch-name">📍 Dine At Blue — Gulberg III (Open Now)</div>
            <div class="text-xs text-[#475569] mt-1" id="modal-pickup-branch-desc">65, Block D1, Gulberg III, Lahore • 0321-8484111</div>
          </div>
          <div class="bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-bold p-3 rounded-xl flex items-center gap-2">
            <span class="text-base">🛍️</span>
            <span>Self-Pickup: <strong>Rs. 0 Delivery Fee</strong> • Ready in <strong>20–25 mins</strong></span>
          </div>
        </div>

        <!-- Primary Confirm Button -->
        <button type="button" onclick="confirmOrderModal()" class="w-full bg-[#16384C] hover:bg-[#0D2331] text-white font-['Montserrat'] font-extrabold py-3.5 rounded-xl text-base shadow-md transition cursor-pointer">
          Start My Order
        </button>
      </div>
    </div>
  </div>
'''

shared_footer_html = '''
  <!-- G. COMPACT RESTAURANT DETAILS & ABOUT SNIPPET -->
  <footer class="bg-white border-t border-[#E2E8F0] mt-12 py-10" id="about-section">
    <div class="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
      <div>
        <div class="flex items-center gap-3 mb-3">
          <img src="./images/logo.png" alt="Dine At Blue" class="h-10 w-10 rounded-full object-contain" />
          <h4 class="font-['Montserrat'] font-extrabold text-lg text-[#0F172A]">Dine At Blue Lahore</h4>
        </div>
        <p class="text-xs text-[#475569] leading-relaxed mb-4">
          Ocean catch, continental grills &amp; authentic pan-asian wok specialties. Prepared fresh in Gulberg III with strict temperature control and premium oceanic ingredients.
        </p>
        <div class="flex items-center gap-3">
          <a href="https://wa.me/923218484111" target="_blank" rel="noopener noreferrer" class="bg-[#25D366] text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-xs hover:bg-[#20ba59] transition">
            <span>💬 WhatsApp</span>
          </a>
          <a href="tel:03218484111" class="bg-[#F4F7F9] text-[#0F172A] font-bold text-xs px-3.5 py-2 rounded-lg hover:bg-[#E2E8F0] transition">
            📞 0321-8484111
          </a>
        </div>
      </div>

      <div>
        <h4 class="font-['Montserrat'] font-extrabold text-sm uppercase tracking-wider text-[#0F172A] mb-3">Flagship Location</h4>
        <ul class="text-xs text-[#475569] space-y-2">
          <li><strong>Gulberg III Outlet:</strong> 65, Block D1, Gulberg III, Lahore</li>
          <li><strong>Kitchen Contact:</strong> 0321-8484111</li>
          <li><strong>Landmark:</strong> Near Ghalib Market &amp; Main Boulevard</li>
        </ul>
      </div>

      <div>
        <h4 class="font-['Montserrat'] font-extrabold text-sm uppercase tracking-wider text-[#0F172A] mb-3">Hours &amp; Delivery Logistics</h4>
        <p class="text-xs text-[#475569] leading-relaxed mb-2">
          🕒 <strong>Open Daily:</strong> 01:00 PM – 01:00 AM<br/>
          🌊 <strong>Ocean Express Delivery:</strong> 35–50 mins • Temperature-controlled thermal cases<br/>
          🛍️ <strong>Self-Pickup:</strong> 20–25 mins • Free
        </p>
        <p class="text-[11px] text-[#94A3B8] mt-4">
          &copy; 2026 Dine At Blue. Part of FoodSphere Aggregator Platform. All rights reserved.
        </p>
      </div>
    </div>
  </footer>

  <!-- SCRIPT HELPERS -->
  <script>
    window.BRAND_SLUG = 'dineatblue';

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
      const modal = document.getElementById('blue-order-modal');
      if (modal) modal.style.display = 'flex';
    }

    function closeOrderModal() {
      const modal = document.getElementById('blue-order-modal');
      if (modal) modal.style.display = 'none';
    }

    function setModalMode(mode) {
      const delBtn = document.getElementById('modal-mode-delivery');
      const pickBtn = document.getElementById('modal-mode-pickup');
      const delPanel = document.getElementById('modal-delivery-panel');
      const pickPanel = document.getElementById('modal-pickup-panel');
      if (mode === 'PICKUP') {
        pickBtn.className = "bg-[#16384C] text-white font-['Montserrat'] font-extrabold py-3 rounded-lg shadow-sm text-sm transition cursor-pointer";
        delBtn.className = "text-[#0F172A] font-['Montserrat'] font-bold py-3 rounded-lg hover:text-[#16384C] text-sm transition cursor-pointer";
        delPanel.style.display = 'none';
        pickPanel.style.display = 'block';
      } else {
        delBtn.className = "bg-[#16384C] text-white font-['Montserrat'] font-extrabold py-3 rounded-lg shadow-sm text-sm transition cursor-pointer";
        pickBtn.className = "text-[#0F172A] font-['Montserrat'] font-bold py-3 rounded-lg hover:text-[#16384C] text-sm transition cursor-pointer";
        delPanel.style.display = 'block';
        pickPanel.style.display = 'none';
      }
    }

    function updatePickupBranchCard(val) {
      // Single Gulberg III branch
    }

    function confirmOrderModal() {
      const isPickup = (document.getElementById('modal-pickup-panel').style.display === 'block');
      const mode = isPickup ? 'PICKUP' : 'DELIVERY';
      const branch = 'Gulberg III Main Outlet';

      setOrderMode(mode);
      if (window.CartDrawer && window.CartDrawer.setSelectedBranch) {
        window.CartDrawer.setSelectedBranch(branch);
      }

      const locText = document.getElementById('header-location-text');
      if (locText) {
        locText.textContent = `📍 Gulberg III • Change`;
      }
      const drawerBranch = document.getElementById('drawer-active-branch');
      if (drawerBranch) {
        drawerBranch.textContent = "Gulberg III (65, Block D1)";
      }

      localStorage.setItem('blue_selected_branch', branch);
      localStorage.setItem('blue_mode_confirmed', 'true');
      closeOrderModal();
    }

    function setOrderMode(mode) {
      const isPickup = (mode === 'PICKUP');
      if (window.CartDrawer && window.CartDrawer.setFulfillmentType) {
        window.CartDrawer.setFulfillmentType(isPickup ? 'PICKUP' : 'DELIVERY');
      }

      const headerDel = document.getElementById('header-mode-delivery');
      const headerPick = document.getElementById('header-mode-pickup');
      if (headerDel && headerPick) {
        if (isPickup) {
          headerPick.className = "bg-[#16384C] text-white font-['Montserrat'] font-extrabold px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm shadow-sm transition cursor-pointer whitespace-nowrap";
          headerDel.className = "text-[#0F172A] font-['Montserrat'] font-bold px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm hover:text-[#16384C] transition cursor-pointer whitespace-nowrap";
        } else {
          headerDel.className = "bg-[#16384C] text-white font-['Montserrat'] font-extrabold px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm shadow-sm transition cursor-pointer whitespace-nowrap";
          headerPick.className = "text-[#0F172A] font-['Montserrat'] font-bold px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm hover:text-[#16384C] transition cursor-pointer whitespace-nowrap";
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
            <div class="stepper-wrap flex items-center bg-[#16384C] rounded-xl overflow-hidden shadow-xs text-white">
              <button type="button" onclick="handleCardQty('${name.replace(/'/g, "\\'")}', -1)" class="w-8 h-8 flex items-center justify-center font-bold text-sm hover:bg-[#0D2331] transition cursor-pointer">-</button>
              <span class="w-8 text-center text-xs font-extrabold text-[#EFE6D5]">${qty}</span>
              <button type="button" onclick="handleCardQty('${name.replace(/'/g, "\\'")}', 1)" class="w-8 h-8 flex items-center justify-center font-bold text-sm hover:bg-[#0D2331] transition cursor-pointer">+</button>
            </div>
          `;
        } else {
          container.innerHTML = `
            <button type="button" onclick="handleAddToCart(${id}, '${name.replace(/'/g, "\\'")}', ${price}, '${img}')" class="btn-add-cart bg-[#16384C] hover:bg-[#0D2331] text-white font-['Montserrat'] font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs transition cursor-pointer">+ Add to Cart</button>
          `;
        }
      });
    };

    document.addEventListener('DOMContentLoaded', () => {
      try {
        const confirmed = localStorage.getItem('blue_mode_confirmed');
        if (confirmed !== 'true') {
          openOrderModal();
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

carousel_script_html = '''
  <script>
    let currentSlide = 0;
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    let carouselTimer = null;

    function goToCarouselSlide(index) {
      if (!slides.length) return;
      currentSlide = (index + slides.length) % slides.length;
      slides.forEach((s, idx) => {
        if (idx === currentSlide) {
          s.classList.remove('opacity-0', 'z-0');
          s.classList.add('opacity-100', 'z-10');
        } else {
          s.classList.remove('opacity-100', 'z-10');
          s.classList.add('opacity-0', 'z-0');
        }
      });
      dots.forEach((d, idx) => {
        if (idx === currentSlide) {
          d.className = 'carousel-dot w-2.5 h-2.5 rounded-full bg-white transition cursor-pointer';
        } else {
          d.className = 'carousel-dot w-2.5 h-2.5 rounded-full bg-white/40 transition cursor-pointer';
        }
      });
    }

    function startCarousel() {
      if (carouselTimer) clearInterval(carouselTimer);
      carouselTimer = setInterval(() => {
        goToCarouselSlide(currentSlide + 1);
      }, 4000);
    }

    document.addEventListener('DOMContentLoaded', () => {
      startCarousel();
    });
  </script>
'''

bestsellers_cards_html = "".join([render_product_card(b, compact=True) for b in bestsellers])

index_html = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Dine At Blue — Ocean Catch, Continental &amp; Pan-Asian Dining | Lahore</title>
  <meta name="description" content="Experience Lahore's premier ocean dining: Fresh Steamed Seafood Platter, Thermidor &amp; Grilled Lobsters, Mud Crabs, Kunafa Prawns, and Coastal Curations. Order online for Express Delivery or Free Pickup."/>
  
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Montserrat:ital,wght@0,600;0,700;0,800;1,600;1,700;1,800&display=swap"/>
  
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {{
      theme: {{
        extend: {{
          colors: {{
            blueTeal: '#16384C',
            blueNavy: '#0D2331',
            blueSand: '#EFE6D5',
            blueCanvas: '#F4F7F9'
          }},
          fontFamily: {{
            sans: ['"DM Sans"', 'sans-serif'],
            heading: ['"Montserrat"', 'sans-serif']
          }}
        }}
      }}
    }}
  </script>

  <link rel="stylesheet" href="cart_drawer.css?v=20261019"/>
  <link rel="stylesheet" href="theme_blue.css?v=20261019"/>
</head>
<body class="bg-[#F4F7F9] text-[#0F172A] font-['DM_Sans'] antialiased min-h-screen flex flex-col">

{header_html}

  <main class="flex-1 w-full space-y-6 sm:space-y-8 pb-10">

    <!-- HERO SECTION: DESIGN TYPE 1 (Full-Bleed Auto-Sliding Visual Carousel) -->
    <section class="max-w-7xl mx-auto px-4 pt-3 pb-2 w-full">
      <div id="blue-hero-carousel" class="relative w-full h-[195px] sm:h-[290px] rounded-2xl overflow-hidden shadow-md bg-[#0D2331]">
        
        <!-- Slide 1: Blue Seafood Platter -->
        <div class="carousel-slide absolute inset-0 transition-opacity duration-700 ease-in-out opacity-100 z-10" data-slide-index="0">
          <img src="./images/blue_seafood_platter.png" alt="Blue Signature Seafood Platters" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='./images/logo.png';" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#0D2331]/90 via-[#0D2331]/30 to-transparent flex flex-col justify-end p-4 sm:p-7">
            <h1 class="text-white text-xl sm:text-3xl font-extrabold font-['Montserrat'] leading-tight">
              Blue Signature Seafood Platters
            </h1>
            <a href="menu.html" class="bg-[#EFE6D5] text-[#0D2331] hover:bg-white font-['Montserrat'] font-extrabold text-xs sm:text-sm px-4 py-2 rounded-lg mt-2 inline-block w-fit shadow-xs transition">
              Explore Menu &rarr;
            </a>
          </div>
        </div>

        <!-- Slide 2: Kunafa Prawns -->
        <div class="carousel-slide absolute inset-0 transition-opacity duration-700 ease-in-out opacity-0 z-0" data-slide-index="1">
          <img src="./images/kunafa_prawns.png" alt="Crispy Kunafa &amp; Dynamite Prawns" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='./images/logo.png';" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#0D2331]/90 via-[#0D2331]/30 to-transparent flex flex-col justify-end p-4 sm:p-7">
            <h2 class="text-white text-xl sm:text-3xl font-extrabold font-['Montserrat'] leading-tight">
              Crispy Kunafa &amp; Dynamite Prawns
            </h2>
            <a href="menu.html#starters" class="bg-[#EFE6D5] text-[#0D2331] hover:bg-white font-['Montserrat'] font-extrabold text-xs sm:text-sm px-4 py-2 rounded-lg mt-2 inline-block w-fit shadow-xs transition">
              View Starters &rarr;
            </a>
          </div>
        </div>

        <!-- Slide 3: Grilled Fish & Pan-Asian Mains -->
        <div class="carousel-slide absolute inset-0 transition-opacity duration-700 ease-in-out opacity-0 z-0" data-slide-index="2">
          <img src="./images/grilled_fish.png" alt="Fresh Coastal Catch &amp; Pan-Asian Wok" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='./images/logo.png';" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#0D2331]/90 via-[#0D2331]/30 to-transparent flex flex-col justify-end p-4 sm:p-7">
            <h2 class="text-white text-xl sm:text-3xl font-extrabold font-['Montserrat'] leading-tight">
              Fresh Coastal Catch &amp; Pan-Asian Wok
            </h2>
            <a href="menu.html#mains-seafood" class="bg-[#EFE6D5] text-[#0D2331] hover:bg-white font-['Montserrat'] font-extrabold text-xs sm:text-sm px-4 py-2 rounded-lg mt-2 inline-block w-fit shadow-xs transition">
              Order Now &rarr;
            </a>
          </div>
        </div>

        <!-- Carousel Dots Indicator -->
        <div class="absolute bottom-3 right-4 z-20 flex items-center gap-1.5" id="carousel-dots">
          <button type="button" aria-label="Slide 1" class="carousel-dot w-2.5 h-2.5 rounded-full bg-white transition cursor-pointer" onclick="goToCarouselSlide(0)"></button>
          <button type="button" aria-label="Slide 2" class="carousel-dot w-2.5 h-2.5 rounded-full bg-white/40 transition cursor-pointer" onclick="goToCarouselSlide(1)"></button>
          <button type="button" aria-label="Slide 3" class="carousel-dot w-2.5 h-2.5 rounded-full bg-white/40 transition cursor-pointer" onclick="goToCarouselSlide(2)"></button>
        </div>
      </div>
    </section>

    <!-- EXPLORE MENU: KFC-Style Asymmetric Bento Grid -->
    <section class="max-w-7xl mx-auto px-4 w-full">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="font-['Montserrat'] text-lg sm:text-xl font-extrabold uppercase tracking-tight text-[#0F172A]">EXPLORE MENU</h2>
          <div class="w-12 h-1 mt-1 rounded-full bg-[#16384C]"></div>
        </div>
        <a href="menu.html" class="text-xs sm:text-sm font-['Montserrat'] font-extrabold uppercase underline tracking-wider text-[#16384C] hover:text-[#0D2331] transition">
          VIEW ALL
        </a>
      </div>

      <!-- Bento Grid (3-col / 2-row) -->
      <div class="grid grid-cols-3 grid-rows-2 gap-2.5 sm:gap-4 h-64 sm:h-80">
        <!-- Left Tall Box: Signature Platters -->
        <a href="menu.html#signature-platters" class="col-span-1 row-span-2 bg-white border border-[#E2E8F0] rounded-2xl p-2.5 sm:p-4 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-[#16384C] transition group cursor-pointer overflow-hidden">
          <span class="font-['Montserrat'] text-xs sm:text-base font-extrabold text-[#0F172A] group-hover:text-[#16384C] transition">Signature Platters</span>
          <div class="w-full h-36 sm:h-52 rounded-xl overflow-hidden mt-2 bg-[#F4F7F9]">
            <img src="./images/blue_seafood_platter.png" alt="Signature Platters" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" onerror="this.onerror=null; this.src='./images/logo.png';" />
          </div>
        </a>

        <!-- Top-Middle Box: Starters & Prawns -->
        <a href="menu.html#starters" class="col-span-1 row-span-1 bg-white border border-[#E2E8F0] rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-[#16384C] transition group cursor-pointer overflow-hidden">
          <span class="font-['Montserrat'] text-[11px] sm:text-sm font-extrabold text-[#0F172A] group-hover:text-[#16384C] transition line-clamp-1">Starters &amp; Prawns</span>
          <div class="w-full h-16 sm:h-24 rounded-lg overflow-hidden mt-1 bg-[#F4F7F9]">
            <img src="./images/kunafa_prawns.png" alt="Starters &amp; Prawns" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" onerror="this.onerror=null; this.src='./images/logo.png';" />
          </div>
        </a>

        <!-- Top-Right Box: Mains - Seafood -->
        <a href="menu.html#mains-seafood" class="col-span-1 row-span-1 bg-white border border-[#E2E8F0] rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-[#16384C] transition group cursor-pointer overflow-hidden">
          <span class="font-['Montserrat'] text-[11px] sm:text-sm font-extrabold text-[#0F172A] group-hover:text-[#16384C] transition line-clamp-1">Mains - Seafood</span>
          <div class="w-full h-16 sm:h-24 rounded-lg overflow-hidden mt-1 bg-[#F4F7F9]">
            <img src="./images/grilled_fish.png" alt="Mains Seafood" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" onerror="this.onerror=null; this.src='./images/logo.png';" />
          </div>
        </a>

        <!-- Bottom-Middle Box: Mains - Chicken -->
        <a href="menu.html#mains-chicken" class="col-span-1 row-span-1 bg-white border border-[#E2E8F0] rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-[#16384C] transition group cursor-pointer overflow-hidden">
          <span class="font-['Montserrat'] text-[11px] sm:text-sm font-extrabold text-[#0F172A] group-hover:text-[#16384C] transition line-clamp-1">Mains - Chicken</span>
          <div class="w-full h-16 sm:h-24 rounded-lg overflow-hidden mt-1 bg-[#F4F7F9]">
            <img src="./images/korean_fried_chicken.png" alt="Mains Chicken" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" onerror="this.onerror=null; this.src='./images/logo.png';" />
          </div>
        </a>

        <!-- Bottom-Right Box: Beverages & Mojitos -->
        <a href="menu.html#beverages" class="col-span-1 row-span-1 bg-white border border-[#E2E8F0] rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between shadow-xs hover:shadow-md hover:border-[#16384C] transition group cursor-pointer overflow-hidden">
          <span class="font-['Montserrat'] text-[11px] sm:text-sm font-extrabold text-[#0F172A] group-hover:text-[#16384C] transition line-clamp-1">Beverages &amp; Mojitos</span>
          <div class="w-full h-16 sm:h-24 rounded-lg overflow-hidden mt-1 bg-[#F4F7F9]">
            <img src="./images/drinks_feast_grid.png" alt="Beverages &amp; Mojitos" class="w-full h-full object-cover group-hover:scale-105 transition duration-300" onerror="this.onerror=null; this.src='./images/logo.png';" />
          </div>
        </a>
      </div>
    </section>

    <!-- BEST SELLERS: 6 Featured Items Only -->
    <section class="max-w-7xl mx-auto px-4 w-full">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="font-['Montserrat'] text-lg sm:text-xl font-extrabold uppercase tracking-tight text-[#0F172A]">BEST SELLERS</h2>
          <div class="w-12 h-1 mt-1 rounded-full bg-[#16384C]"></div>
        </div>
      </div>
      <div class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        {bestsellers_cards_html}
      </div>
      <div class="mt-6 text-center">
        <a href="menu.html" class="inline-block bg-[#16384C] hover:bg-[#0D2331] text-white font-['Montserrat'] font-extrabold text-sm px-6 py-3 rounded-xl shadow-sm transition">
          Explore Full Menu &rarr;
        </a>
      </div>
    </section>

  </main>

{shared_footer_html}

  <!-- Carousel Script -->
  {carousel_script_html}

</body>
</html>
'''

with open('websites/dineatblue/index.html', 'w', encoding='utf-8') as f:
    f.write(index_html)
print("Successfully generated websites/dineatblue/index.html")

# 2. BUILD menu.html (Full 41 Items Across 7 Categories)
menu_categories_html = ""
for c in ordered_categories:
    cat_items_html = ""
    for item in c['items']:
        cat_items_html += render_product_card(item)
    menu_categories_html += f'''
    <section class="category-section scroll-mt-36" id="{c['slug']}" data-cat-id="{c['id']}">
      <div class="flex items-center gap-2.5 mb-4">
        <span class="w-2 h-7 bg-[#16384C] rounded-full"></span>
        <h2 class="font-[\'Montserrat\'] text-xl sm:text-2xl font-extrabold text-[#0F172A] uppercase">{c['display_title']}</h2>
        <span class="bg-[#F9F6F0] text-[#16384C] font-[\'Montserrat\'] text-xs font-bold px-2.5 py-1 rounded-full border border-[#EFE6D5]">{len(c['items'])} Items</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {cat_items_html}
      </div>
    </section>'''

category_pills_html = '''
      <button type="button" class="category-pill active bg-[#16384C] text-white border border-[#16384C] font-['Montserrat'] font-extrabold px-4 py-2 rounded-full text-xs sm:text-sm whitespace-nowrap shadow-sm cursor-pointer" onclick="scrollToCategorySection('all')">
        All Menu
      </button>'''
for c in ordered_categories:
    category_pills_html += f'''
      <button type="button" class="category-pill bg-[#F4F7F9] text-[#0F172A] hover:border-[#16384C] border border-[#E2E8F0] font-['Montserrat'] font-bold px-4 py-2 rounded-full text-xs sm:text-sm whitespace-nowrap transition cursor-pointer" onclick="scrollToCategorySection('{c['slug']}')">
        {c['short_name']}
      </button>'''

menu_html = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Dine At Blue — Full Menu &amp; Catalog | Lahore</title>
  <meta name="description" content="Explore Dine At Blue Lahore's full coastal menu: Seafood Platters, Kunafa Prawns, Grilled Lobsters, Fish, Korean Chicken &amp; Mocktails."/>
  
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Montserrat:ital,wght@0,600;0,700;0,800;1,600;1,700;1,800&display=swap"/>
  
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {{
      theme: {{
        extend: {{
          colors: {{
            blueTeal: '#16384C',
            blueNavy: '#0D2331',
            blueSand: '#EFE6D5',
            blueCanvas: '#F4F7F9'
          }},
          fontFamily: {{
            sans: ['"DM Sans"', 'sans-serif'],
            heading: ['"Montserrat"', 'sans-serif']
          }}
        }}
      }}
    }}
  </script>

  <link rel="stylesheet" href="cart_drawer.css?v=20261019"/>
  <link rel="stylesheet" href="theme_blue.css?v=20261019"/>
</head>
<body class="bg-[#F4F7F9] text-[#0F172A] font-['DM_Sans'] antialiased min-h-screen flex flex-col">

{header_html}

  <!-- STICKY CATEGORY RIBBON & LIVE SEARCH BAR -->
  <nav class="sticky top-16 sm:top-[72px] z-30 bg-white border-b border-[#E2E8F0] py-2.5 px-3 sm:px-6 shadow-xs">
    <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
      <!-- Search Input -->
      <div class="relative w-full sm:max-w-xs">
        <input type="text" id="menu-search-input" oninput="handleLiveSearch(this.value)" placeholder="Search seafood, prawns, chicken..." class="w-full bg-[#F4F7F9] border border-[#E2E8F0] focus:border-[#16384C] focus:bg-white rounded-xl pl-9 pr-3 py-1.5 text-xs sm:text-sm font-medium text-[#0F172A] placeholder-[#64748B] outline-none transition" />
        <svg class="w-4 h-4 text-[#64748B] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
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
      const el = document.getElementById(catId) || 
                 document.querySelector(`[data-cat-id="${{catId}}"]`) ||
                 document.querySelector(`section#${{catId}}`) ||
                 document.querySelector(`[data-cat-id="cat-${{catId}}"]`);
      if (el) {{
        el.scrollIntoView({{ behavior: 'smooth' }});
        updateActivePill(catId);
      }}
    }}

    function updateActivePill(catId) {{
      document.querySelectorAll('.category-pill').forEach(btn => {{
        const onclickAttr = btn.getAttribute('onclick') || '';
        if (onclickAttr.includes(`'${{catId}}'`)) {{
          btn.className = "category-pill active bg-[#16384C] text-white border border-[#16384C] font-['Montserrat'] font-extrabold px-4 py-2 rounded-full text-xs sm:text-sm whitespace-nowrap shadow-sm cursor-pointer";
        }} else {{
          btn.className = "category-pill bg-[#F4F7F9] text-[#0F172A] hover:border-[#16384C] border border-[#E2E8F0] font-['Montserrat'] font-bold px-4 py-2 rounded-full text-xs sm:text-sm whitespace-nowrap transition cursor-pointer";
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
</html>
'''

with open('websites/dineatblue/menu.html', 'w', encoding='utf-8') as f:
    f.write(menu_html)
print("Successfully generated websites/dineatblue/menu.html")
