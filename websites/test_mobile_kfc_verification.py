import os
import sys
import time
import subprocess
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

class CORSRequestHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

def run_server(httpd):
    httpd.serve_forever()

def main():
    # Set cwd to websites directory
    websites_dir = os.path.abspath('websites')
    os.chdir(websites_dir)

    server_address = ('127.0.0.1', 8092)
    httpd = HTTPServer(server_address, CORSRequestHandler)
    thread = threading.Thread(target=run_server, args=(httpd,), daemon=True)
    thread.start()
    print("Serving websites on http://127.0.0.1:8092")

    brands = ['dineatblue', 'tandooristoppk', 'jushhpk']
    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 375, 'height': 812},
            user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
        )
        
        # Suppress local storage prompt by pre-setting confirmation
        context.add_init_script("""
            localStorage.setItem('blue_mode_confirmed', 'true');
            localStorage.setItem('ts_mode_confirmed', 'true');
            localStorage.setItem('jushh_mode_confirmed', 'true');
        """)

        for brand in brands:
            print(f"\n==========================================")
            print(f"TESTING BRAND: {brand.upper()}")
            print(f"==========================================")
            page = context.new_page()

            # ----------------------------------------------------
            # 1. TEST index.html
            # ----------------------------------------------------
            index_url = f"http://127.0.0.1:8092/{brand}/index.html"
            print(f"Navigating to {index_url}...")
            page.goto(index_url, wait_until='networkidle')
            time.sleep(0.5)

            # Assert ZERO announcement bar exists above <header>
            first_el_name = page.evaluate("""() => {
                const bodyChildren = Array.from(document.body.children).filter(el => 
                    el.tagName !== 'SCRIPT' && !el.id.includes('backdrop') && !el.id.includes('modal')
                );
                return bodyChildren[0] ? bodyChildren[0].tagName : '';
            }""")
            print(f"First element in body: <{first_el_name}>")
            assert first_el_name.upper() == 'HEADER', f"[{brand}] <header> is not first body element, found <{first_el_name}>"

            # Check for any announcement elements
            announcement_count = page.locator('aside[aria-label="Announcement"]').count()
            print(f"Announcement strip count: {announcement_count}")
            assert announcement_count == 0, f"[{brand}] Announcement strip still exists!"

            # Assert #hamburger-btn (☰) is visible in header
            hamburger_btn = page.locator('#hamburger-btn')
            assert hamburger_btn.is_visible(), f"[{brand}] #hamburger-btn is not visible on mobile!"
            print(f"#hamburger-btn is visible.")

            # Click #hamburger-btn to open #mobile-nav-drawer
            hamburger_btn.click()
            time.sleep(0.5)
            drawer = page.locator('#mobile-nav-drawer')
            assert drawer.is_visible(), f"[{brand}] #mobile-nav-drawer did not open on hamburger click!"
            print(f"#mobile-nav-drawer is visible.")

            # Assert drawer links
            home_link = drawer.locator('a[href="index.html"]')
            assert home_link.count() > 0, f"[{brand}] Missing Home link in drawer"
            menu_link = drawer.locator('a[href="menu.html"]')
            assert menu_link.count() > 0, f"[{brand}] Missing All Menu link in drawer"
            print(f"Drawer navigation links verified: Home ({home_link.count()}), Menu ({menu_link.count()})")

            # Close drawer
            close_btn = page.locator('#close-drawer-btn')
            if close_btn.count() > 0:
                close_btn.click()
            else:
                page.locator('#mobile-nav-backdrop').click()
            time.sleep(0.3)

            # Assert Header Cart Button innerText has NO 'Rs'
            cart_bucket = page.locator('#header-cart-bucket')
            cart_text = cart_bucket.inner_text().strip()
            print(f"Header Cart button text: '{cart_text}'")
            assert 'rs' not in cart_text.lower(), f"[{brand}] Header cart button text contains 'Rs': '{cart_text}'"

            # Assert index.html contains EXPLORE MENU, VIEW ALL, BEST SELLERS
            page_content = page.content()
            assert "EXPLORE MENU" in page_content, f"[{brand}] 'EXPLORE MENU' not found on index.html"
            assert "VIEW ALL" in page_content, f"[{brand}] 'VIEW ALL' not found on index.html"
            assert "BEST SELLERS" in page_content, f"[{brand}] 'BEST SELLERS' not found on index.html"
            print("EXPLORE MENU, VIEW ALL, and BEST SELLERS verified on index.html")

            # Assert product cards count on index.html is <= 6
            product_cards = page.locator('.product-card')
            card_count = product_cards.count()
            print(f"Product cards on index.html: {card_count} (Mandate: <= 6)")
            assert 0 < card_count <= 6, f"[{brand}] Invalid product cards on index.html: {card_count}"

            # If Dine At Blue, assert 'SIGNATURE OCEAN BANQUET' is purged
            if brand == 'dineatblue':
                assert "SIGNATURE OCEAN BANQUET" not in page_content, "[dineatblue] 'SIGNATURE OCEAN BANQUET' still present on index.html"
                print("'SIGNATURE OCEAN BANQUET' verified absent.")

            # Click VIEW ALL and assert it navigates to menu.html
            view_all_btn = page.locator('a:has-text("VIEW ALL")')
            view_all_btn.click()
            page.wait_for_url("**/menu.html*", timeout=5000)
            print(f"Successfully navigated to: {page.url}")

            # ----------------------------------------------------
            # 2. TEST menu.html
            # ----------------------------------------------------
            # Assert header is first element
            first_el_menu = page.evaluate("""() => {
                const bodyChildren = Array.from(document.body.children).filter(el => 
                    el.tagName !== 'SCRIPT' && !el.id.includes('backdrop') && !el.id.includes('modal')
                );
                return bodyChildren[0] ? bodyChildren[0].tagName : '';
            }""")
            assert first_el_menu.upper() == 'HEADER', f"[{brand}] <header> is not first body element on menu.html"

            # Assert #hamburger-btn visible on menu.html
            assert page.locator('#hamburger-btn').is_visible(), f"[{brand}] #hamburger-btn not visible on menu.html"

            # Assert Header Cart Button innerText has NO 'Rs' on menu.html
            menu_cart_text = page.locator('#header-cart-bucket').inner_text().strip()
            assert 'rs' not in menu_cart_text.lower(), f"[{brand}] Header cart on menu.html contains 'Rs': '{menu_cart_text}'"

            # Assert full catalog rendered on menu.html
            menu_cards = page.locator('#menu .product-card')
            menu_card_count = menu_cards.count()
            print(f"Product cards on menu.html: {menu_card_count}")
            assert menu_card_count >= 35, f"[{brand}] Expected at least 35 cards on menu.html, got {menu_card_count}"

            # Assert sticky category ribbon exists
            category_nav = page.locator('nav')
            assert category_nav.count() > 0, f"[{brand}] Missing category navigation on menu.html"

            # Assert image loads (naturalWidth > 0)
            broken_images = page.evaluate("""() => {
                const imgs = Array.from(document.querySelectorAll('#menu img'));
                const broken = [];
                for (const img of imgs) {
                    if (!img.complete || img.naturalWidth === 0) {
                        broken.push(img.src);
                    }
                }
                return broken;
            }""")
            print(f"Broken images on menu.html: {len(broken_images)}")
            assert len(broken_images) == 0, f"[{brand}] Found broken images on menu.html: {broken_images[:5]}"

            page.close()
            results[brand] = "PASSED (100%)"

        browser.close()

    httpd.shutdown()
    print("\n==========================================")
    print("ALL PLAYWRIGHT TESTS PASSED!")
    print(results)
    print("==========================================")

if __name__ == '__main__':
    main()
