import json
import re

with open('websites/shared_catalog.json', 'r', encoding='utf-8') as f:
    catalog_data = json.load(f)

blue_catalog = catalog_data.get('dineatblue', {})
categories = blue_catalog.get('categories', [])

# Map category titles to IDs
cat_id_map = {
    'SIGNATURE PLATTERS': 'cat-platters',
    'STARTERS': 'cat-starters',
    'SALADS': 'cat-salads',
    'MAINS - SEAFOOD': 'cat-seafood',
    'MAINS - CHICKEN': 'cat-chicken',
    'BEVERAGES & MOJITOS': 'cat-drinks',
    'ADD-ONS': 'cat-addons'
}

cat_badge_map = {
    'SIGNATURE PLATTERS': 'Ocean Banquet',
    'STARTERS': 'Pan-Asian & Raw Bar',
    'SALADS': 'Fresh Coastal Bowls',
    'MAINS - SEAFOOD': 'Live Catch Specialties',
    'MAINS - CHICKEN': 'Wok & Sizzling Mains',
    'BEVERAGES & MOJITOS': 'Chilled Refreshments',
    'ADD-ONS': 'Sides & Accompaniments'
}

# The 10 dishes that have dedicated high-resolution studio photographs (1254x1254)
studio_dishes = {
    'Blue Seafood Platter (Steamed)': './images/blue_seafood_platter.png',
    'Kunafa Prawns (3 pcs)': './images/kunafa_prawns.png',
    'Dynamite Prawns': './images/dynamite_prawns.png',
    'Seared Dumplings (6 pcs)': './images/seared_dumplings.png',
    'Chicken Dumplings (6 pcs)': './images/chicken_dumplings.png',
    'Honey Wings (6 pcs)': './images/honey_wings.png',
    'Fish & Chips': './images/fish_and_chips.png',
    '19B Soup': './images/soup_19b.png',
    'Chicken Corn Soup': './images/chicken_corn_soup.png',
    'BBQ Prawn Salad': './images/bbq_prawn_salad.png'
}

# Descriptions mapping for dishes without descriptions
dish_descriptions = {
    'Blue Seafood Platter (Steamed)': 'Steamed whole crabs, king prawns, mussels, calamari & tender fish fillets simmered in signature blue seafood broth.',
    '2 Person Seafood & Chicken Platter': 'Generous combination of grilled jumbo prawns, crispy battered fish fillet, and flame-seared chicken with seasoned fries.',
    'Kunafa Prawns (3 pcs)': 'Jumbo ocean prawns wrapped in crispy shredded kataifi pastry, fried golden and drizzled with crushed pistachios & sweet dip.',
    'Dynamite Prawns': 'Crispy golden fried prawns tossed in our fiery, creamy house dynamite sauce served on a bed of fresh garden slaw.',
    'Seared Dumplings (6 pcs)': 'Handcrafted dumplings pan-seared to a golden crisp bottom with savory ginger-scallion filling & chili soy dip.',
    'Chicken Dumplings (6 pcs)': 'Delicate steamed artisanal dumplings packed with seasoned minced chicken, herbs and served with sweet soy sauce.',
    'Dynamite Chicken': 'Tender crispy chicken bites coated in rich, zesty dynamite sauce and sprinkled with toasted sesame seeds.',
    'Honey Wings (6 pcs)': 'Crisp chicken wings glazed in sweet amber honey-garlic glaze and sprinkled with toasted white sesame.',
    'Fish & Chips': 'Traditional crispy battered ocean fish fillet served golden with crunchy steak fries, tartar sauce & lemon wedge.',
    '19B Soup': 'Classic thick oriental hot soup simmered with shredded chicken, prawns, black mushrooms, bamboo shoots & chili vinegar.',
    'Chicken Corn Soup': 'Silky comfort broth loaded with crushed sweet corn kernels, tender shredded chicken & egg drops.',
    'BBQ Prawn Salad': 'Flame-grilled glazed prawns tossed with crisp iceberg lettuce, sweet cherry tomatoes, cucumber & citrus vinaigrette.',
    'Romesco Fish': 'Pan-seared prime ocean fish fillet served over rich Spanish romesco sauce of roasted peppers, garlic and almonds.',
    'Umami Fish': 'Tender white fish fillet glazed in deep savory umami reduction with shiitake mushrooms and scallions.',
    'Pamphlet Fish': 'Whole fresh pomfret pan-fried in coastal spices, served sizzling with fresh lemon wedges and mint dip.',
    'Fish Chilli Dry': 'Sliced fish fillets wok-tossed with spicy green bird-eye chilies, onions, garlic and dark soy glaze.',
    'Vietnamese Fish': 'Crispy fish fillet simmered in fragrant Vietnamese ginger-lime-lemongrass glaze with fresh coriander.',
    'Thermidor Lobster': 'Whole fresh lobster tail baked in rich egg-yolk cognac cream sauce, mustard & gratin melted cheese crust.',
    'Grilled Lobster': 'Live fresh ocean lobster split and flame-grilled with herb-garlic butter and served with seasonal sides.',
    'BBQ Prawns': 'Skewered ocean prawns flame-roasted over charcoal embers with smoky garlic butter & citrus marinade.',
    'Prawn Pasta': 'Al dente fettuccine pasta tossed with juicy sautéed prawns in a velvety garlic parmesan cream sauce.',
    'Steamed Crab': 'Whole live mud crab gently steam-cooked to preserve sweet natural meat, served with hot drawn butter.',
    'Mud Crab': 'Whole succulent mud crab wok-fried in rich Singaporean chili-garlic egg gravy.',
    'Grilled Fish': 'Fresh boneless catch of the day marinated in lemon, herbs & olive oil, flame-seared on the grill.',
    'Chilli Mint Chicken': 'Sliced chicken wok-fried in spicy green bird-eye chilies, fresh mint puree & aromatic garlic.',
    'Cashew Nut Chicken': 'Tender diced chicken breast stir-fried with roasted crunchy cashew nuts, bell peppers and sweet chili paste.',
    'Korean Fried Chicken': 'Ultra-crispy double-fried chicken chunks coated in sweet and spicy gochujang glaze with sesame.',
    'Chicken Chilli Dry': 'Classic Indo-Chinese style shredded chicken stir-fried dry with green chilies, onions and dark soy sauce.',
    'Sweet & Sour Chicken': 'Crispy chicken cubes tossed with pineapple chunks, bell peppers and onions in tangy sweet & sour sauce.',
    'House Special Chicken': 'Signature chef creation of flame-seared chicken supreme served in a velvety peppercorn cream glaze.',
    'Strawberry Mojito': 'Muddled fresh strawberries, wild mint leaves, lime wedges and sparkling soda over crushed ice.',
    'Blueberry Mojito': 'Plump blueberries muddled with fresh mint, lime juice, simple syrup and bubbly club soda.',
    'Peach Mojito': 'Sweet juicy peach nectar muddled with cooling mint leaves, lemon juice and fizzy sparkling soda.',
    'Green Apple Mojito': 'Crisp tart green apple puree shaken with garden mint, lime slices and chilled tonic water.',
    'Fresh Lemonade': 'Freshly squeezed Lahore lemons blended with chilled water, cane sugar, black salt and mint.',
    'Pepsi / 7Up (Tin)': 'Chilled 250ml can of Pepsi, 7Up or diet soft drink served icy fresh.',
    'Mineral Water (Small)': 'Premium purified mineral water bottle (500ml), chilled.',
    'Butter Mushroom Rice': 'Fragrant jasmine rice sautéed in rich French butter with sliced button mushrooms and fresh herbs.',
    'Roasted Potatoes': 'Baby potatoes oven-roasted until crispy skin with rosemary, thyme, garlic and extra virgin olive oil.',
    'Steak Fries': 'Thick-cut golden steak potato wedges fried crispy on the outside and fluffy on the inside.',
    'Special Dynamite Dip': 'Signature creamy, spicy and tangy seafood dip crafted with Japanese mayo and sriracha.'
}

# Generate menu sections HTML
menu_sections_html = []
item_counter = 100

for cat in categories:
    cat_name = cat.get('name', '').upper()
    cat_id = cat_id_map.get(cat_name, f"cat-{len(menu_sections_html)+1}")
    cat_badge = cat_badge_map.get(cat_name, 'Specialty')
    items = cat.get('items', [])
    
    cards_html = []
    for it in items:
        name = it.get('name')
        price = int(float(it.get('price', 0)))
        price_formatted = f"Rs. {price:,}"
        desc = dish_descriptions.get(name, it.get('description', 'Freshly prepared ocean specialty crafted with premium seasonal ingredients.'))
        
        # Determine image
        if name in studio_dishes:
            img_url = studio_dishes[name]
            img_container_html = f'''            <div class="bg-[#F4F7F9] relative h-48 rounded-xl overflow-hidden mb-3 border border-[#E2E8F0]">
              <img src="{img_url}" alt="{name}" class="w-full h-full object-cover transition-transform duration-300 hover:scale-105" onerror="this.onerror=null; this.src='./images/logo.png';" />
              <span class="absolute top-2 left-2 bg-[#16384C] text-[#EFE6D5] text-[11px] font-['Montserrat'] font-bold uppercase px-2 py-0.5 rounded-md shadow-xs">Studio Catch</span>
              <span class="absolute bottom-2.5 right-2.5 bg-[#0D2331]/95 text-white font-['Montserrat'] font-extrabold text-sm px-3 py-1 rounded-md border border-[#EFE6D5]/60 shadow-sm tracking-wide">{price_formatted}</span>
            </div>'''
            cart_img = img_url
        else:
            # Enhanced Official Circular Logo Placeholder Card
            img_container_html = f'''            <div class="bg-[#16384C] relative h-48 rounded-xl overflow-hidden mb-3 border border-[#E2E8F0] flex flex-col items-center justify-center p-6">
              <img src="./images/logo.png" alt="{name}" class="h-28 w-28 object-contain drop-shadow-md transition-transform duration-300 hover:scale-105" />
              <span class="text-[11px] font-['Montserrat'] font-bold text-[#EFE6D5] tracking-widest uppercase mt-2">Dine At Blue</span>
              <span class="absolute bottom-2.5 right-2.5 bg-[#0D2331]/95 text-white font-['Montserrat'] font-extrabold text-sm px-3 py-1 rounded-md border border-[#EFE6D5]/60 shadow-sm tracking-wide">{price_formatted}</span>
            </div>'''
            cart_img = './images/logo.png'
            
        safe_name = name.replace("'", "\\'")
        card_html = f'''        <!-- Item {item_counter}: {name} -->
        <div class="product-card p-4 flex flex-col justify-between" data-item-id="{item_counter}" data-item-name="{name}">
          <div>
{img_container_html}
            <h3 class="font-['Montserrat'] font-extrabold text-[16px] text-[#0F172A] leading-snug mb-1">{name}</h3>
            <p class="font-['DM_Sans'] text-[13px] text-[#475569] line-clamp-2 mb-3">{desc}</p>
          </div>
          <div class="pt-3 border-t border-[#E2E8F0]">
            <div class="card-action-container w-full" data-item-id="{item_counter}" data-item-name="{name}" data-item-price="{price}" data-item-image="{cart_img}">
              <button type="button" onclick="handleAddToCart({item_counter}, '{safe_name}', {price}, '{cart_img}')" class="btn-add-cart w-full bg-[#16384C] hover:bg-[#0D2331] text-white font-['Montserrat'] font-bold text-sm py-2.5 px-4 rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2">+ Add to Cart</button>
            </div>
          </div>
        </div>'''
        cards_html.append(card_html)
        item_counter += 1
        
    grid_inner = "\n\n".join(cards_html)
    section_html = f'''    <!-- CATEGORY: {cat_name} -->
    <section id="{cat_id}" class="category-section mb-10">
      <div class="flex items-center gap-3 mb-5">
        <div class="w-2 h-7 bg-[#16384C] rounded-full"></div>
        <h2 class="font-['Montserrat'] text-2xl font-extrabold text-[#0F172A] tracking-wide">{cat_name}</h2>
        <span class="text-xs text-[#64748B] font-medium hidden sm:inline">• {cat_badge} ({len(items)} Items)</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">

{grid_inner}

      </div>
    </section>'''
    menu_sections_html.append(section_html)

all_sections_str = "\n\n".join(menu_sections_html)

full_html = f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Dine At Blue — Ocean Catch, Continental & Pan-Asian Dining | Lahore</title>
  <meta name="description" content="Experience Lahore's premier ocean dining: Fresh Steamed Seafood Platter, Thermidor & Grilled Lobsters, Mud Crabs, Kunafa Prawns, and Coastal Curations. Order online for Express Delivery or Free Pickup."/>
  
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Montserrat:ital,wght@0,600;0,700;0,800;1,600;1,700;1,800&display=swap"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="cart_drawer.css?v=20261018"/>
  <link rel="stylesheet" href="theme_blue.css?v=20261018"/>
</head>
<body class="bg-[#F4F7F9] text-[#0F172A] font-['DM_Sans'] antialiased min-h-screen flex flex-col">

  <!-- A. TOP BRAND UTILITY STRIP -->
  <aside class="bg-[#16384C] text-[#EFE6D5] text-xs font-bold py-2 px-4 text-center tracking-wide" aria-label="Announcement">
    🌊 Dine At Blue — Ocean Catch, Continental & Pan-Asian Dining | Fresh Express Delivery & Self-Pickup in Gulberg III, Lahore
  </aside>

  <!-- B. STICKY COMMERCIAL HEADER -->
  <header class="sticky top-0 z-40 bg-white border-b border-[#E2E8F0] shadow-sm h-[76px]">
    <div class="max-w-7xl mx-auto px-4 h-full flex items-center justify-between gap-3">
      
      <!-- LEFT GROUP: Logo + Mode Switcher + Location Pill -->
      <div class="flex items-center gap-3">
        <a href="index.html" class="flex items-center flex-shrink-0" aria-label="Dine At Blue Home">
          <img src="./images/logo.png" alt="Dine At Blue Logo" class="h-12 w-auto object-contain drop-shadow-xs" />
        </a>

        <!-- KFC-Style Order Mode Switcher -->
        <div class="bg-[#EDF2F7] p-1 rounded-xl flex items-center border border-[#E2E8F0]" role="group" aria-label="Fulfillment Mode Toggle">
          <button type="button" id="header-mode-delivery" onclick="setOrderMode('DELIVERY')" class="bg-[#16384C] text-white font-['Montserrat'] font-extrabold px-3.5 py-1.5 rounded-lg text-xs sm:text-sm shadow-sm transition cursor-pointer">
            🛵 Delivery
          </button>
          <button type="button" id="header-mode-pickup" onclick="setOrderMode('PICKUP')" class="text-[#0F172A] font-['Montserrat'] font-bold px-3.5 py-1.5 rounded-lg text-xs sm:text-sm hover:text-[#16384C] transition cursor-pointer">
            🛍️ Pickup
          </button>
        </div>

        <!-- Branch / Location Trigger Pill -->
        <div id="header-location-pill" onclick="openOrderModal()" class="hidden md:flex items-center gap-1.5 bg-[#F9F6F0] border border-[#EFE6D5] px-3 py-1.5 rounded-xl text-xs font-bold text-[#16384C] hover:border-[#16384C] cursor-pointer transition select-none">
          <span id="header-location-text">📍 Gulberg III (65, Block D1) • Change</span>
        </div>
      </div>

      <!-- CENTER GROUP: Live Search Input -->
      <div class="hidden lg:block flex-1 max-w-sm mx-4">
        <div class="relative">
          <input type="text" id="menu-search-input" oninput="handleLiveSearch(this.value)" placeholder="Search seafood platters, prawns, lobsters, continental, pan-asian..." class="w-full bg-[#EDF2F7] border border-[#E2E8F0] focus:border-[#16384C] focus:bg-white rounded-full pl-10 pr-4 py-2 text-sm font-medium text-[#0F172A] placeholder-[#64748B] outline-none transition" />
          <svg class="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
      </div>

      <!-- RIGHT GROUP: ONLY Dine At Blue Cart Bucket Button (NO Login Button) -->
      <div class="flex items-center">
        <button type="button" id="header-cart-bucket" onclick="if(window.CartDrawer) window.CartDrawer.openDrawer();" class="bg-[#16384C] hover:bg-[#0D2331] text-white font-['Montserrat'] font-extrabold px-4 py-2.5 rounded-xl flex items-center gap-2.5 shadow-sm transition cursor-pointer" aria-label="Open Cart Bucket">
          <svg class="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
          <span id="header-cart-count" class="bg-[#EFE6D5] text-[#16384C] text-xs font-extrabold px-2 py-0.5 rounded-full min-w-[20px] text-center">0</span>
          <span id="header-cart-total" class="text-sm font-extrabold">Rs. 0</span>
        </button>
      </div>

    </div>
  </header>

  <!-- C. MANDATORY KFC-STYLE ENTRY ORDER MODE & LOCATION POPUP MODAL -->
  <div id="blue-order-modal" class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 transition-opacity duration-200" style="display: none;">
    <div class="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-[#E2E8F0] transform transition-all">
      <!-- Modal Top Header Bar -->
      <div class="bg-[#16384C] text-white p-4 text-center relative flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <img src="./images/logo.png" alt="Dine At Blue" class="h-9 w-9 rounded-md object-contain bg-white p-0.5" />
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
            <span>Express Seafood Delivery: <strong>Rs. 200</strong> • Direct from steam & flame kitchen</span>
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

  <!-- D. COMPACT PROMOTIONAL DEAL BANNER -->
  <section class="max-w-7xl mx-auto px-4 pt-5 pb-2 w-full" id="deals">
    <div class="min-h-[180px] md:min-h-[220px] rounded-2xl overflow-hidden bg-gradient-to-r from-[#16384C] via-[#1E4D68] to-[#16384C] text-white p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm border border-white/10">
      <div class="max-w-xl">
        <span class="bg-[#EFE6D5] text-[#16384C] text-xs font-['Montserrat'] font-extrabold px-3 py-1 rounded-full inline-block mb-2 shadow-2xs">🔥 SIGNATURE OCEAN BANQUET</span>
        <h2 class="font-['Montserrat'] text-2xl md:text-3xl font-extrabold leading-tight mb-2">Grand Ocean Seafood Platters, Kunafa Prawns & Asian Curations</h2>
        <p class="text-white/90 text-sm font-medium mb-4">Handcrafted with the day's freshest catch, flame-seared continental steaks & rich pan-asian wok bowls.</p>
        <a href="#cat-platters" class="inline-block bg-[#EFE6D5] text-[#16384C] hover:bg-white font-['Montserrat'] font-extrabold px-5 py-2.5 rounded-xl text-sm shadow-sm transition">
          Explore Full Menu ↓
        </a>
      </div>
      <div class="flex-shrink-0">
        <img src="./images/blue_seafood_platter.png" alt="Dine At Blue Signature Platter" class="h-36 md:h-44 w-auto object-cover rounded-xl shadow-lg border-2 border-[#EFE6D5]/40" onerror="this.onerror=null; this.src='./images/logo.png';" />
      </div>
    </div>
  </section>

  <!-- E. STICKY HORIZONTAL CATEGORY NAVIGATION RIBBON -->
  <nav class="sticky top-[76px] z-30 bg-white border-b border-[#E2E8F0] py-3 shadow-xs">
    <div class="max-w-7xl mx-auto px-4 flex items-center gap-2.5 overflow-x-auto no-scrollbar" id="category-pills">
      <button type="button" class="category-pill active bg-[#16384C] text-white border border-[#16384C] font-extrabold px-4 py-2 rounded-full text-sm whitespace-nowrap shadow-sm cursor-pointer" onclick="scrollToCategorySection('all')">
        All Menu
      </button>
      <button type="button" class="category-pill bg-[#EDF2F7] text-[#0F172A] hover:border-[#16384C] border border-[#E2E8F0] font-bold px-4 py-2 rounded-full text-sm whitespace-nowrap transition cursor-pointer" onclick="scrollToCategorySection('cat-platters')">
        Signature Platters
      </button>
      <button type="button" class="category-pill bg-[#EDF2F7] text-[#0F172A] hover:border-[#16384C] border border-[#E2E8F0] font-bold px-4 py-2 rounded-full text-sm whitespace-nowrap transition cursor-pointer" onclick="scrollToCategorySection('cat-starters')">
        Starters & Prawns
      </button>
      <button type="button" class="category-pill bg-[#EDF2F7] text-[#0F172A] hover:border-[#16384C] border border-[#E2E8F0] font-bold px-4 py-2 rounded-full text-sm whitespace-nowrap transition cursor-pointer" onclick="scrollToCategorySection('cat-salads')">
        Salads
      </button>
      <button type="button" class="category-pill bg-[#EDF2F7] text-[#0F172A] hover:border-[#16384C] border border-[#E2E8F0] font-bold px-4 py-2 rounded-full text-sm whitespace-nowrap transition cursor-pointer" onclick="scrollToCategorySection('cat-seafood')">
        Mains - Seafood
      </button>
      <button type="button" class="category-pill bg-[#EDF2F7] text-[#0F172A] hover:border-[#16384C] border border-[#E2E8F0] font-bold px-4 py-2 rounded-full text-sm whitespace-nowrap transition cursor-pointer" onclick="scrollToCategorySection('cat-chicken')">
        Mains - Chicken
      </button>
      <button type="button" class="category-pill bg-[#EDF2F7] text-[#0F172A] hover:border-[#16384C] border border-[#E2E8F0] font-bold px-4 py-2 rounded-full text-sm whitespace-nowrap transition cursor-pointer" onclick="scrollToCategorySection('cat-drinks')">
        Beverages & Mojitos
      </button>
      <button type="button" class="category-pill bg-[#EDF2F7] text-[#0F172A] hover:border-[#16384C] border border-[#E2E8F0] font-bold px-4 py-2 rounded-full text-sm whitespace-nowrap transition cursor-pointer" onclick="scrollToCategorySection('cat-addons')">
        Add-Ons
      </button>
    </div>
  </nav>

  <!-- F. FULL CATEGORIZED MENU GRID -->
  <main class="max-w-7xl mx-auto px-4 py-6 space-y-10 flex-1 w-full" id="menu">

{all_sections_str}

  </main>

  <!-- G. CLEAN COMMERCIAL QSR FOOTER -->
  <footer class="bg-white border-t border-[#E2E8F0] pt-10 pb-8 mt-12">
    <div class="max-w-7xl mx-auto px-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <!-- Brand Info -->
        <div>
          <div class="flex items-center gap-2.5 mb-3">
            <img src="./images/logo.png" alt="Dine At Blue Logo" class="h-10 w-auto object-contain" />
            <span class="font-['Montserrat'] font-extrabold text-lg text-[#0F172A]">Dine At Blue</span>
          </div>
          <p class="text-sm text-[#475569] leading-relaxed mb-3">
            Lahore's premier ocean-inspired dining experience. Fine-casual steamed & grilled seafood, live lobsters, mud crabs, and wok pan-asian curations.
          </p>
          <div class="text-xs font-bold text-[#16384C] bg-[#F9F6F0] border border-[#EFE6D5] p-2.5 rounded-xl inline-block">
            🌊 Daily Fresh Catch Delivered Across Lahore
          </div>
        </div>

        <!-- Gulberg III Branch Info -->
        <div>
          <h4 class="font-['Montserrat'] font-extrabold text-sm text-[#0F172A] uppercase tracking-wider mb-3">Operational Outlet</h4>
          <div class="space-y-2.5 text-sm text-[#475569]">
            <div class="flex items-start gap-2">
              <span class="text-base flex-shrink-0">📍</span>
              <div>
                <strong class="text-[#0F172A] block">Gulberg III Branch</strong>
                <span>65, Block D1, Gulberg III, Lahore</span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-base flex-shrink-0">📞</span>
              <a href="tel:03218484111" class="font-bold text-[#16384C] hover:underline">0321-8484111</a>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-base flex-shrink-0">⏰</span>
              <span>Open Daily: 12:00 PM – 12:00 AM Midnight</span>
            </div>
          </div>
        </div>

        <!-- Fast Direct Contact & WhatsApp -->
        <div>
          <h4 class="font-['Montserrat'] font-extrabold text-sm text-[#0F172A] uppercase tracking-wider mb-3">Direct Ordering</h4>
          <p class="text-sm text-[#475569] mb-4">Need help or private booking? Message our team directly on WhatsApp.</p>
          <a href="https://wa.me/923218484111?text=Hello%20Dine%20At%20Blue!%20I%20would%20like%20to%20place%20an%20order." target="_blank" rel="noopener" class="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-extrabold px-4 py-2.5 rounded-xl text-sm shadow-xs transition">
            <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86.174.086.275.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.145.39-.086s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824z"/></svg>
            <span>Chat on WhatsApp</span>
          </a>
        </div>
      </div>

      <div class="border-t border-[#E2E8F0] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
        <p>&copy; 2026 Dine At Blue. Powered by FoodSphere Multi-Brand Aggregator.</p>
        <p>Gulberg III, Lahore, Pakistan • Cash on Delivery & Direct Pickup</p>
      </div>
    </div>
  </footer>

  <!-- JAVASCRIPT LOGIC -->
  <script>
    window.BRAND_SLUG = 'dineatblue';

    // 1. ORDER MODE & MODAL STATE
    let currentMode = 'DELIVERY';
    let currentBranch = 'Gulberg III';

    function setOrderMode(mode) {{
      currentMode = mode;
      try {{ localStorage.setItem('blue_order_mode', mode); }} catch (e) {{}}
      try {{ localStorage.setItem('foodsphere_fulfillment_mode', mode); }} catch (e) {{}}

      const btnDelivery = document.getElementById('header-mode-delivery');
      const btnPickup = document.getElementById('header-mode-pickup');

      if (mode === 'DELIVERY') {{
        btnDelivery.className = "bg-[#16384C] text-white font-['Montserrat'] font-extrabold px-3.5 py-1.5 rounded-lg text-xs sm:text-sm shadow-sm transition cursor-pointer";
        btnPickup.className = "text-[#0F172A] font-['Montserrat'] font-bold px-3.5 py-1.5 rounded-lg text-xs sm:text-sm hover:text-[#16384C] transition cursor-pointer";
        document.getElementById('header-location-text').textContent = "📍 Gulberg III (65, Block D1) • Change";
      }} else {{
        btnPickup.className = "bg-[#16384C] text-white font-['Montserrat'] font-extrabold px-3.5 py-1.5 rounded-lg text-xs sm:text-sm shadow-sm transition cursor-pointer";
        btnDelivery.className = "text-[#0F172A] font-['Montserrat'] font-bold px-3.5 py-1.5 rounded-lg text-xs sm:text-sm hover:text-[#16384C] transition cursor-pointer";
        document.getElementById('header-location-text').textContent = "🛍️ Pickup: Gulberg III Outlet • Change";
      }}

      if (window.CartDrawer && typeof window.CartDrawer.setFulfillmentType === 'function') {{
        window.CartDrawer.setFulfillmentType(mode);
      }}
    }}

    function openOrderModal() {{
      const modal = document.getElementById('blue-order-modal');
      if (modal) modal.style.display = 'flex';
    }}

    function closeOrderModal() {{
      const modal = document.getElementById('blue-order-modal');
      if (modal) modal.style.display = 'none';
    }}

    function setModalMode(mode) {{
      const btnDel = document.getElementById('modal-mode-delivery');
      const btnPick = document.getElementById('modal-mode-pickup');
      const panelDel = document.getElementById('modal-delivery-panel');
      const panelPick = document.getElementById('modal-pickup-panel');

      if (mode === 'DELIVERY') {{
        btnDel.className = "bg-[#16384C] text-white font-['Montserrat'] font-extrabold py-3 rounded-lg shadow-sm text-sm transition cursor-pointer";
        btnPick.className = "text-[#0F172A] font-['Montserrat'] font-bold py-3 rounded-lg hover:text-[#16384C] text-sm transition cursor-pointer";
        panelDel.style.display = 'block';
        panelPick.style.display = 'none';
      }} else {{
        btnPick.className = "bg-[#16384C] text-white font-['Montserrat'] font-extrabold py-3 rounded-lg shadow-sm text-sm transition cursor-pointer";
        btnDel.className = "text-[#0F172A] font-['Montserrat'] font-bold py-3 rounded-lg hover:text-[#16384C] text-sm transition cursor-pointer";
        panelDel.style.display = 'none';
        panelPick.style.display = 'block';
      }}
    }}

    function updatePickupBranchCard(branch) {{
      currentBranch = branch;
      document.getElementById('modal-pickup-branch-name').textContent = "📍 Dine At Blue — " + branch + " (Open Now)";
    }}

    function confirmOrderModal() {{
      const isDelivery = document.getElementById('modal-delivery-panel').style.display !== 'none';
      const mode = isDelivery ? 'DELIVERY' : 'PICKUP';
      setOrderMode(mode);

      try {{
        localStorage.setItem('blue_mode_confirmed', 'true');
      }} catch (e) {{}}

      closeOrderModal();
    }}

    // 2. LIVE SEARCH FILTER
    function handleLiveSearch(query) {{
      const q = (query || '').toLowerCase().trim();
      const cards = document.querySelectorAll('.product-card');
      const sections = document.querySelectorAll('.category-section');

      cards.forEach(card => {{
        const title = (card.querySelector('h3')?.textContent || '').toLowerCase();
        const desc = (card.querySelector('p')?.textContent || '').toLowerCase();
        if (!q || title.includes(q) || desc.includes(q)) {{
          card.style.display = 'flex';
        }} else {{
          card.style.display = 'none';
        }}
      }});

      sections.forEach(sec => {{
        const visibleCards = sec.querySelectorAll('.product-card[style*="display: flex"], .product-card:not([style*="display: none"])');
        if (q && visibleCards.length === 0) {{
          sec.style.display = 'none';
        }} else {{
          sec.style.display = 'block';
        }}
      }});
    }}

    // 3. CATEGORY SCROLL & ACTIVE TABS
    function scrollToCategorySection(sectionId) {{
      if (sectionId === 'all') {{
        window.scrollTo({{ top: 0, behavior: 'smooth' }});
      }} else {{
        const target = document.getElementById(sectionId);
        if (target) {{
          target.scrollIntoView({{ behavior: 'smooth', block: 'start' }});
        }}
      }}
    }}

    function initCategoryObserver() {{
      const sections = document.querySelectorAll('.category-section');
      const pills = document.querySelectorAll('.category-pill');

      const observer = new IntersectionObserver((entries) => {{
        entries.forEach(entry => {{
          if (entry.isIntersecting) {{
            const id = entry.target.id;
            pills.forEach(pill => {{
              const targetCall = pill.getAttribute('onclick') || '';
              if (targetCall.includes(id)) {{
                pills.forEach(p => {{
                  p.classList.remove('active', 'bg-[#16384C]', 'text-white', 'border-[#16384C]');
                  p.classList.add('bg-[#EDF2F7]', 'text-[#0F172A]', 'border-[#E2E8F0]');
                }});
                pill.classList.add('active', 'bg-[#16384C]', 'text-white', 'border-[#16384C]');
                pill.classList.remove('bg-[#EDF2F7]', 'text-[#0F172A]', 'border-[#E2E8F0]');
              }}
            }});
          }}
        }});
      }}, {{ rootMargin: '-140px 0px -60% 0px' }});

      sections.forEach(sec => observer.observe(sec));
    }}

    // 4. ADD TO CART & STEPPER SYNC
    function handleAddToCart(id, name, price, image) {{
      if (window.CartDrawer && typeof window.CartDrawer.addItem === 'function') {{
        window.CartDrawer.addItem({{
          id: id,
          name: name,
          price: price,
          image: image,
          qty: 1
        }});
      }}
      if (typeof window.syncCardSteppers === 'function') {{
        window.syncCardSteppers();
      }}
    }}

    function handleCardQtyChange(name, delta) {{
      if (!window.CartDrawer || !window.CartDrawer.getItems) return;
      const items = window.CartDrawer.getItems();
      const idx = items.findIndex(i => i.name === name);
      if (idx > -1) {{
        window.CartDrawer.updateQty(idx, delta);
      }}
    }}

    window.syncCardSteppers = function() {{
      if (!window.CartDrawer) return;
      const items = (typeof window.CartDrawer.getItems === 'function') ? window.CartDrawer.getItems() : [];
      const itemMap = {{}};
      items.forEach(it => {{ itemMap[it.name] = it.qty; }});

      document.querySelectorAll('.card-action-container').forEach(wrap => {{
        const name = wrap.getAttribute('data-item-name');
        const id = wrap.getAttribute('data-item-id');
        const price = wrap.getAttribute('data-item-price');
        const image = wrap.getAttribute('data-item-image');
        const qty = itemMap[name] || 0;

        if (qty > 0) {{
          wrap.innerHTML = `
            <div class="inline-qty-stepper w-full bg-[#16384C] text-white font-bold py-2 px-3 rounded-xl flex items-center justify-between text-sm shadow-xs border border-[#EFE6D5]/40">
              <button type="button" class="w-8 h-8 rounded-lg bg-white/20 hover:bg-[#0D2331] text-white font-extrabold text-base flex items-center justify-center transition cursor-pointer" onclick="handleCardQtyChange('${{name.replace(/'/g, "\\\\\\'")}}', -1)" aria-label="Decrease">&minus;</button>
              <span class="font-['Montserrat'] font-extrabold min-w-[24px] text-center text-base text-[#EFE6D5]">${{qty}}</span>
              <button type="button" class="w-8 h-8 rounded-lg bg-white/20 hover:bg-[#0D2331] text-white font-extrabold text-base flex items-center justify-center transition cursor-pointer" onclick="handleCardQtyChange('${{name.replace(/'/g, "\\\\\\'")}}', 1)" aria-label="Increase">&plus;</button>
            </div>
          `;
        }} else {{
          wrap.innerHTML = `
            <button type="button" onclick="handleAddToCart(${{id}}, '${{name.replace(/'/g, "\\\\\\'")}}', ${{price}}, '${{image}}')" class="btn-add-cart w-full bg-[#16384C] hover:bg-[#0D2331] text-white font-['Montserrat'] font-bold text-sm py-2.5 px-4 rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2">+ Add to Cart</button>
          `;
        }}
      }});
    }};

    // 5. INITIALIZATION
    document.addEventListener('DOMContentLoaded', () => {{
      initCategoryObserver();

      // Check KFC-Style entry popup trigger
      try {{
        const confirmed = localStorage.getItem('blue_mode_confirmed');
        if (confirmed !== 'true') {{
          openOrderModal();
        }} else {{
          const savedMode = localStorage.getItem('blue_order_mode') || 'DELIVERY';
          setOrderMode(savedMode);
        }}
      }} catch (e) {{
        openOrderModal();
      }}

      // Initial card steppers sync
      setTimeout(() => {{
        if (typeof window.syncCardSteppers === 'function') {{
          window.syncCardSteppers();
        }}
      }}, 50);
    }});
  </script>

  <!-- External Cart & Catalog Engine -->
  <script src="cart_drawer.js?v=20261018"></script>
  <script src="live_catalog.js?v=20261018"></script>

</body>
</html>
'''

with open('websites/dineatblue/index.html', 'w', encoding='utf-8') as f:
    f.write(full_html)

print("Generated websites/dineatblue/index.html successfully!")
print("Openings:", full_html.count('<div'), "Closings:", full_html.count('</div'))
