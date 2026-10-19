import re

def update_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    orig = content
    for pattern, repl in replacements:
        content = re.sub(pattern, repl, content, flags=re.DOTALL)
    if content != orig:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'[UPDATED] {path}')
    else:
        print(f'[NO CHANGE] {path}')

# 1. Tandoori Stop Headers
ts_header_pattern = r'<!-- B\. STICKY COMMERCIAL HEADER.*?<!-- SLIDE-OUT HAMBURGER'
ts_header_replacement = '''<!-- B. STICKY COMMERCIAL HEADER (NO TOP ANNOUNCEMENT BAR) -->
  <header class="sticky top-0 z-40 h-16 sm:h-[72px] bg-white border-b border-[#E5E7EB] px-2.5 sm:px-6">
    <div class="max-w-7xl mx-auto h-full flex items-center justify-between gap-1.5 sm:gap-4">
      
      <!-- LEFT GROUP: Hamburger + Brand Logo -->
      <div class="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button id="hamburger-btn" aria-label="Open Menu" onclick="openMobileNavDrawer()" class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F3F4F6] hover:bg-[#E5E7EB] flex items-center justify-center text-[#111827] transition cursor-pointer shrink-0">
          <svg class="w-5 h-5 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <a href="index.html" class="shrink-0 flex items-center" aria-label="Tandoori Stop Home">
          <img src="./images/tandoori_logo_horizontal_clean.png" alt="Tandoori Stop Logo" class="h-7 sm:h-10 max-w-[125px] sm:max-w-[190px] w-auto object-contain" onerror="this.onerror=null; this.src='./images/tandoori_stop_logo.png';" />
        </a>
      </div>

      <!-- CENTER GROUP: Compact Delivery/Pickup Switcher + Location Pill -->
      <div class="flex items-center gap-1 sm:gap-2">
        <div class="bg-[#F3F4F6] p-0.5 sm:p-1 rounded-xl flex items-center border border-[#E5E7EB]" role="group" aria-label="Fulfillment Mode Toggle">
          <button type="button" id="header-btn-delivery" onclick="setOrderMode('DELIVERY')" class="bg-[#C81E1E] text-white font-['Barlow_Condensed'] font-extrabold px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm uppercase tracking-wider shadow-sm transition cursor-pointer whitespace-nowrap">
            🛵 Delivery
          </button>
          <button type="button" id="header-btn-pickup" onclick="setOrderMode('PICKUP')" class="text-[#4B5563] hover:text-[#111827] font-['Barlow_Condensed'] font-bold px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm uppercase tracking-wider transition cursor-pointer whitespace-nowrap">
            🛍️ Pickup
          </button>
        </div>

        <button type="button" id="header-branch-btn" onclick="openOrderModal()" class="hidden md:flex items-center gap-1.5 bg-[#FAF8F5] border border-[#E5E7EB] hover:border-[#C81E1E] px-3 py-1.5 rounded-xl text-xs font-bold text-[#1C1917] transition cursor-pointer select-none">
          <span id="header-branch-text">📍 Johar Town • Change</span>
        </button>
      </div>

      <!-- RIGHT GROUP: Compact Cart Button (NO 'Rs. 0' TEXT) -->
      <div class="flex items-center shrink-0">
        <button type="button" id="header-cart-bucket" onclick="if(window.CartDrawer) window.CartDrawer.openDrawer();" class="bg-[#1C1917] hover:bg-[#C81E1E] text-white font-extrabold h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0" aria-label="Open Cart Bucket">
          <svg class="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
          <span id="header-cart-count" class="bg-[#C81E1E] text-white text-[11px] sm:text-xs font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">0</span>
        </button>
      </div>

    </div>
  </header>

  <!-- SLIDE-OUT HAMBURGER'''

update_file('websites/tandooristoppk/index.html', [(ts_header_pattern, ts_header_replacement)])
update_file('websites/tandooristoppk/menu.html', [(ts_header_pattern, ts_header_replacement)])


# 2. Dine At Blue Headers
blue_header_pattern = r'<!-- B\. STICKY COMMERCIAL HEADER.*?<!-- SLIDE-OUT HAMBURGER'
blue_header_replacement = '''<!-- B. STICKY COMMERCIAL HEADER (NO TOP ANNOUNCEMENT BAR) -->
  <header class="sticky top-0 z-40 h-16 sm:h-[72px] bg-white border-b border-[#E2E8F0] px-2.5 sm:px-6">
    <div class="max-w-7xl mx-auto h-full flex items-center justify-between gap-1.5 sm:gap-4">
      
      <!-- LEFT GROUP: Hamburger + Circular Brand Logo + Wordmark -->
      <div class="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button id="hamburger-btn" aria-label="Open Menu" onclick="openMobileNavDrawer()" class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#F4F7F9] hover:bg-[#E2E8F0] flex items-center justify-center text-[#0F172A] transition cursor-pointer shrink-0">
          <svg class="w-5 h-5 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
        </button>
        <a href="index.html" class="shrink-0 flex items-center gap-2 sm:gap-2.5 group" aria-label="Dine At Blue Home">
          <img src="./images/logo.png" alt="Dine At Blue Emblem" class="h-9 w-9 sm:h-11 sm:w-11 rounded-full object-contain drop-shadow-xs transition group-hover:scale-105 shrink-0" />
          <div class="flex flex-col">
            <span class="font-['Montserrat'] font-extrabold text-sm sm:text-base text-[#16384C] tracking-tight leading-tight hidden min-[440px]:inline">Dine At Blue</span>
            <span class="text-[10px] font-semibold text-[#64748B] tracking-wider uppercase leading-none hidden sm:inline">Ocean Catch & Pan-Asian</span>
          </div>
        </a>
      </div>

      <!-- CENTER GROUP: Compact Delivery/Pickup Switcher + Location Pill -->
      <div class="flex items-center gap-1 sm:gap-2">
        <div class="bg-[#EDF2F7] p-0.5 sm:p-1 rounded-xl flex items-center border border-[#E2E8F0]" role="group" aria-label="Fulfillment Mode Toggle">
          <button type="button" id="header-mode-delivery" onclick="setOrderMode('DELIVERY')" class="bg-[#16384C] text-white font-['Montserrat'] font-extrabold px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm shadow-sm transition cursor-pointer whitespace-nowrap">
            🛵 Delivery
          </button>
          <button type="button" id="header-mode-pickup" onclick="setOrderMode('PICKUP')" class="text-[#0F172A] font-['Montserrat'] font-bold px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm hover:text-[#16384C] transition cursor-pointer whitespace-nowrap">
            🛍️ Pickup
          </button>
        </div>

        <div id="header-location-pill" onclick="openOrderModal()" class="hidden md:flex items-center gap-1.5 bg-[#F9F6F0] border border-[#EFE6D5] px-3 py-1.5 rounded-xl text-xs font-bold text-[#16384C] hover:border-[#16384C] cursor-pointer transition select-none">
          <span id="header-location-text">📍 Gulberg III • Change</span>
        </div>
      </div>

      <!-- RIGHT GROUP: Compact Cart Button (NO 'Rs. 0' TEXT) -->
      <div class="flex items-center shrink-0">
        <button type="button" id="header-cart-bucket" onclick="if(window.CartDrawer) window.CartDrawer.openDrawer();" class="bg-[#16384C] hover:bg-[#0D2331] text-white font-['Montserrat'] font-extrabold h-9 sm:h-10 px-2.5 sm:px-3.5 rounded-xl flex items-center gap-1.5 shadow-xs transition cursor-pointer shrink-0" aria-label="Open Cart Bucket">
          <svg class="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
          <span id="header-cart-count" class="bg-[#EFE6D5] text-[#16384C] text-[11px] sm:text-xs font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">0</span>
        </button>
      </div>

    </div>
  </header>

  <!-- SLIDE-OUT HAMBURGER'''

update_file('websites/dineatblue/index.html', [(blue_header_pattern, blue_header_replacement)])
update_file('websites/dineatblue/menu.html', [(blue_header_pattern, blue_header_replacement)])


# 3. Jushh PK Headers
jushh_header_pattern = r'<!-- B\. STICKY COMMERCIAL HEADER.*?<!-- SLIDE-OUT HAMBURGER'
jushh_header_replacement = '''<!-- B. STICKY COMMERCIAL HEADER (NO TOP ANNOUNCEMENT BAR) -->
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

  <!-- SLIDE-OUT HAMBURGER'''

update_file('websites/jushhpk/index.html', [(jushh_header_pattern, jushh_header_replacement)])
update_file('websites/jushhpk/menu.html', [(jushh_header_pattern, jushh_header_replacement)])

print('All 6 files updated with de-congested headers and clean logo layout!')
