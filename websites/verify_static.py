import re

print("=== STATIC CHECKS ===")
for b in ['jushhpk', 'tandooristoppk', 'dineatblue']:
    for p in ['index.html', 'menu.html']:
        path = f"websites/{b}/{p}"
        with open(path, 'r', encoding='utf-8') as f:
            t = f.read()
        
        # 1. Header is first child
        body_idx = t.find('<body')
        header_idx = t.find('<header')
        between = t[body_idx:header_idx]
        clean_between = re.sub(r'<!--.*?-->', '', between, flags=re.DOTALL)
        body_tag_end = clean_between.find('>')
        after_body = clean_between[body_tag_end+1:].strip()
        assert after_body == '', f"Failed first child check on {path}: {repr(after_body)}"

        # 2. Hamburger button present
        assert 'id="hamburger-btn"' in t, f"Missing hamburger-btn in {path}"
        assert 'id="mobile-nav-drawer"' in t, f"Missing mobile-nav-drawer in {path}"

        # 3. Header Cart button has NO 'Rs'
        header_area = t[header_idx:t.find('</header>')]
        cart_btn = re.search(r'<button[^>]*id=["\']header-cart-[^"\']+["\'][^>]*>.*?</button>', header_area, re.DOTALL)
        assert cart_btn, f"Missing header cart button in {path}"
        cart_html = cart_btn.group(0)
        cart_text = re.sub(r'<[^>]+>', ' ', cart_html).strip()
        assert not re.search(r'\bRs\b', cart_text, re.I), f"Header cart button contains Rs in text on {path}: {cart_text}"
        assert 'header-cart-count' in cart_html, f"Missing header-cart-count badge in {path}"

        # 4. Check index.html specifics
        if p == 'index.html':
            assert 'EXPLORE MENU' in t, f"Missing EXPLORE MENU in {path}"
            assert 'VIEW ALL' in t, f"Missing VIEW ALL in {path}"
            assert 'BEST SELLERS' in t, f"Missing BEST SELLERS in {path}"
            # Check max product cards on index.html
            cards = re.findall(r'class="[^"]*product-card', t)
            assert len(cards) <= 6, f"Too many product cards on {path}: {len(cards)}"
            if b == 'dineatblue':
                assert 'SIGNATURE OCEAN BANQUET' not in t, f"Found SIGNATURE OCEAN BANQUET in {path}"
        
        # 5. Check menu.html specifics
        if p == 'menu.html':
            assert 'category-section' in t, f"Missing category-section in {path}"
            cards = re.findall(r'class="[^"]*product-card', t)
            assert len(cards) >= 35, f"Not enough product cards on {path}: {len(cards)}"

print("ALL STATIC CHECKS PASSED 100%!")
