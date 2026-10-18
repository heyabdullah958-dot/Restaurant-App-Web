import re

with open('websites/tandooristoppk/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

initial_openings = html.count('<div')
initial_closings = html.count('</div')
print(f"Initial: {initial_openings} openings, {initial_closings} closings")

# 1. Update Category Navigation Tabs
def repl_cat_btn(m):
    full = m.group(0)
    onclick_match = re.search(r'onclick="([^"]+)"', full)
    onclick_attr = onclick_match.group(1) if onclick_match else ""
    text_match = re.search(r'>\s*([^<]+)\s*</button>', full)
    text = text_match.group(1).strip() if text_match else ""
    
    if 'active' in full:
        return f'<button type="button" class="category-tab active font-[\'Barlow_Condensed\'] text-[17px] font-extrabold uppercase tracking-wider py-3.5 px-3 border-b-4 border-[#C81E1E] text-[#C81E1E] bg-transparent rounded-none whitespace-nowrap cursor-pointer" onclick="{onclick_attr}">{text}</button>'
    else:
        return f'<button type="button" class="category-tab font-[\'Barlow_Condensed\'] text-[17px] font-bold uppercase tracking-wider py-3.5 px-3 border-b-4 border-transparent text-[#4B5563] hover:text-[#C81E1E] bg-transparent rounded-none whitespace-nowrap transition cursor-pointer" onclick="{onclick_attr}">{text}</button>'

nav_match = re.search(r'(<nav class="sticky top-\[76px\].*?id="category-pills">)(.*?)(</div>\s*</nav>)', html, re.DOTALL)
if nav_match:
    nav_inner = nav_match.group(2)
    new_nav_inner = re.sub(r'<button type="button" class="category-pill[^>]*>.*?</button>', repl_cat_btn, nav_inner, flags=re.DOTALL)
    html = html[:nav_match.start(2)] + new_nav_inner + html[nav_match.end(2):]
    print("Updated category buttons")

# 2. Update initCategoryObserver
old_observer_js = """    function initCategoryObserver() {
      const sections = document.querySelectorAll('.category-section');
      const pills = document.querySelectorAll('.category-pill');

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            pills.forEach(pill => {
              const targetCall = pill.getAttribute('onclick') || '';
              if (targetCall.includes(id)) {
                pills.forEach(p => {
                  p.classList.remove('active');
                  p.className = "category-pill bg-[#F3F2EE] text-[#111827] hover:border-[#C81E1E] border border-[#E5E7EB] font-heading font-bold px-4 py-2 rounded-full text-sm whitespace-nowrap transition cursor-pointer uppercase";
                });
                pill.classList.add('active');
                pill.className = "category-pill active bg-[#C81E1E] text-white border border-[#C81E1E] font-heading font-extrabold px-4 py-2 rounded-full text-sm whitespace-nowrap shadow-sm cursor-pointer uppercase";
              }
            });
          }
        });
      }, { rootMargin: '-140px 0px -60% 0px' });

      sections.forEach(sec => observer.observe(sec));
    }"""

new_observer_js = """    function initCategoryObserver() {
      const sections = document.querySelectorAll('.category-section');
      const tabs = document.querySelectorAll('.category-tab');

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            tabs.forEach(tab => {
              const targetCall = tab.getAttribute('onclick') || '';
              if (targetCall.includes(id)) {
                tabs.forEach(t => {
                  t.classList.remove('active');
                  t.className = "category-tab font-['Barlow_Condensed'] text-[17px] font-bold uppercase tracking-wider py-3.5 px-3 border-b-4 border-transparent text-[#4B5563] hover:text-[#C81E1E] bg-transparent rounded-none whitespace-nowrap transition cursor-pointer";
                });
                tab.classList.add('active');
                tab.className = "category-tab active font-['Barlow_Condensed'] text-[17px] font-extrabold uppercase tracking-wider py-3.5 px-3 border-b-4 border-[#C81E1E] text-[#C81E1E] bg-transparent rounded-none whitespace-nowrap cursor-pointer";
              }
            });
          }
        });
      }, { rootMargin: '-140px 0px -60% 0px' });

      sections.forEach(sec => observer.observe(sec));
    }"""

if old_observer_js in html:
    html = html.replace(old_observer_js, new_observer_js)
    print("Updated initCategoryObserver")

# 3. Process each card
# Each card's bottom bar looks like:
#           <div class="pt-3 border-t border-[#E5E7EB] flex items-center justify-between gap-2">
#             <span class="font-heading font-extrabold text-[18px] text-[#1C1917]">Rs. 1,150</span>
#             <div class="card-action-container min-w-[110px]" data-item-id="70" data-item-name="Tandoori Chicken Bone (Cheese Naan Single)" data-item-price="1150" data-item-image="./images/IMG_7585.JPG.jpeg">
#               <button type="button" onclick="handleAddToCart(70, 'Tandoori Chicken Bone (Cheese Naan Single)', 1150, './images/IMG_7585.JPG.jpeg')" class="btn-add-cart w-full bg-[#C81E1E] hover:bg-[#991B1B] text-white font-heading font-extrabold uppercase text-xs px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer">+ Add to Cart</button>
#             </div>
#           </div>

# We can match this bottom block using regex:
bottom_pattern = re.compile(
    r'<div class="pt-3 border-t border-\[#E5E7EB\] flex items-center justify-between gap-2">\s*'
    r'<span class="font-heading font-extrabold text-\[18px\] text-\[#1C1917\]">([^<]+)</span>\s*'
    r'<div class="card-action-container min-w-\[110px\]" data-item-id="([^"]+)" data-item-name="([^"]+)" data-item-price="([^"]+)" data-item-image="([^"]+)">\s*'
    r'<button[^>]*>.*?</button>\s*'
    r'</div>\s*'
    r'</div>',
    re.DOTALL
)

handi_names = [
    'nawabi handi',
    'shahi kabab masala handi',
    'mughlai cheese handi',
    'reshmi handi'
]

# Let's find all matches of bottom_pattern
matches = list(bottom_pattern.finditer(html))
print(f"Found {len(matches)} card bottom bars")

# We will replace from end of file backwards so offsets remain valid
for m in reversed(matches):
    price_text = m.group(1).strip()
    item_id = m.group(2).strip()
    item_name = m.group(3).strip()
    item_price = m.group(4).strip()
    item_image = m.group(5).strip()
    start_pos = m.start()
    end_pos = m.end()
    
    is_handi = any(h in item_name.lower() for h in handi_names)
    if is_handi:
        item_image = './images/tandoori_stop_logo.png'
        
    safe_name = item_name.replace("'", "\\'")
    new_bottom = f'''<div class="pt-3 border-t border-[#E5E7EB]">
            <div class="card-action-container w-full" data-item-id="{item_id}" data-item-name="{item_name}" data-item-price="{item_price}" data-item-image="{item_image}">
              <button type="button" onclick="handleAddToCart({item_id}, '{safe_name}', {item_price}, '{item_image}')" class="btn-add-cart w-full bg-[#C81E1E] hover:bg-[#1C1917] text-white font-heading font-extrabold uppercase text-sm py-2.5 px-4 rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2">+ Add to Cart</button>
            </div>
          </div>'''
          
    # Now find the image container of this card (it precedes start_pos)
    # Search backwards for `<div class="bg-[#FAF8F5] relative h-48 rounded-xl overflow-hidden mb-3 border border-[#E5E7EB]">`
    img_start = html.rfind('<div class="bg-[#FAF8F5] relative h-48 rounded-xl overflow-hidden mb-3 border border-[#E5E7EB]">', 0, start_pos)
    if img_start != -1:
        img_end = html.find('</div>', img_start)
        if img_end != -1 and img_end < start_pos:
            img_block = html[img_start:img_end]
            if is_handi:
                new_img_div = f'''<div class="bg-[#1C1917] relative h-48 rounded-xl overflow-hidden mb-3 border border-[#E5E7EB] flex items-center justify-center p-6">
              <img src="./images/tandoori_stop_logo.png" alt="{item_name}" class="w-full h-full object-contain" />
              <span class="absolute top-2 left-2 bg-[#F59E0B] text-[#1C1917] text-[11px] font-heading font-extrabold uppercase px-2 py-0.5 rounded-md shadow-xs">Handi Special</span>
              <span class="absolute bottom-2.5 right-2.5 bg-[#1C1917]/95 text-white font-heading font-extrabold text-sm px-3 py-1 rounded-md border border-[#F59E0B]/60 shadow-sm tracking-wide">{price_text}</span>'''
            else:
                price_badge = f'\n              <span class="absolute bottom-2.5 right-2.5 bg-[#1C1917]/95 text-white font-heading font-extrabold text-sm px-3 py-1 rounded-md border border-[#F59E0B]/60 shadow-sm tracking-wide">{price_text}</span>'
                new_img_div = img_block + price_badge
                
            # Replace bottom bar first, then img container
            html = html[:start_pos] + new_bottom + html[end_pos:]
            html = html[:img_start] + new_img_div + html[img_end:]
        else:
            html = html[:start_pos] + new_bottom + html[end_pos:]
    else:
        html = html[:start_pos] + new_bottom + html[end_pos:]

# 4. Update syncCardSteppers JS in index.html
old_stepper_js = """        if (qty > 0) {
          wrap.innerHTML = `
            <div class="inline-qty-stepper">
              <button type="button" onclick="handleCardQtyChange('${name.replace(/'/g, "\\\\'")}', -1)" aria-label="Decrease">&minus;</button>
              <span class="font-heading font-extrabold min-w-[16px] text-center text-sm">${qty}</span>
              <button type="button" onclick="handleCardQtyChange('${name.replace(/'/g, "\\\\'")}', 1)" aria-label="Increase">&plus;</button>
            </div>
          `;
        } else {
          wrap.innerHTML = `
            <button type="button" onclick="handleAddToCart(${id}, '${name.replace(/'/g, "\\\\'")}', ${price}, '${image}')" class="btn-add-cart w-full bg-[#C81E1E] hover:bg-[#991B1B] text-white font-heading font-extrabold uppercase text-xs px-4 py-2.5 rounded-xl shadow-xs transition cursor-pointer">+ Add to Cart</button>
          `;
        }"""

new_stepper_js = """        if (qty > 0) {
          wrap.innerHTML = `
            <div class="w-full bg-[#1C1917] text-white font-bold py-2 px-3 rounded-xl flex items-center justify-between text-sm shadow-xs border border-[#F59E0B]/40">
              <button type="button" class="w-8 h-8 rounded-lg bg-white/20 hover:bg-[#C81E1E] text-white font-extrabold text-base flex items-center justify-center transition cursor-pointer" onclick="handleCardQtyChange('${name.replace(/'/g, "\\\\'")}', -1)" aria-label="Decrease">&minus;</button>
              <span class="font-heading font-extrabold min-w-[24px] text-center text-base text-[#F59E0B]">${qty}</span>
              <button type="button" class="w-8 h-8 rounded-lg bg-white/20 hover:bg-[#C81E1E] text-white font-extrabold text-base flex items-center justify-center transition cursor-pointer" onclick="handleCardQtyChange('${name.replace(/'/g, "\\\\'")}', 1)" aria-label="Increase">&plus;</button>
            </div>
          `;
        } else {
          wrap.innerHTML = `
            <button type="button" onclick="handleAddToCart(${id}, '${name.replace(/'/g, "\\\\'")}', ${price}, '${image}')" class="btn-add-cart w-full bg-[#C81E1E] hover:bg-[#1C1917] text-white font-heading font-extrabold uppercase text-sm py-2.5 px-4 rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center gap-2">+ Add to Cart</button>
          `;
        }"""

if old_stepper_js in html:
    html = html.replace(old_stepper_js, new_stepper_js)
    print("Updated syncCardSteppers JS")

final_openings = html.count('<div')
final_closings = html.count('</div')
print(f"Final: {final_openings} openings, {final_closings} closings")

with open('websites/tandooristoppk/index.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("Saved websites/tandooristoppk/index.html")
