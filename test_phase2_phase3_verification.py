import os
import sys
import time
import subprocess
import threading
import http.server
import socketserver
from playwright.sync_api import sync_playwright

PORT = 8199

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.abspath("websites"), **kwargs)
    def log_message(self, format, *args):
        pass # suppress logs

def run_server():
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        httpd.serve_forever()

def main():
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(1)

    print("=== STARTING PHASE 2 & 3 AUTOMATED VERIFICATION ===")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # 1. Test Dine At Blue 5 Pages
        blue_pages = ['index.html', 'menu.html', 'deals.html', 'about.html', 'locations.html']
        for pg in blue_pages:
            url = f"http://localhost:{PORT}/dineatblue/{pg}"
            page.goto(url)
            page.wait_for_load_state("networkidle")
            title = page.title()
            print(f"  [Dine At Blue] {pg} loaded successfully — Title: {title[:40]}...")
            assert "DINE AT BLUE" in title, f"Title should have brand name: {title}"
            # Check logo exists
            logo = page.locator("img.blue-brand-logo")
            assert logo.count() > 0 or page.locator("img[alt*='Dine At Blue Logo']").count() > 0, f"Logo should be present on {pg}"

        # 2. Test Dine At Blue Menu Items & Modals
        page.goto(f"http://localhost:{PORT}/dineatblue/menu.html")
        page.wait_for_load_state("networkidle")
        cards = page.locator(".blue-dish-card")
        card_count = cards.count()
        print(f"  [Dine At Blue] Menu rendered {card_count} dishes (Expected 41)")
        assert card_count == 41, f"Expected 41 dishes rendered, got {card_count}"

        # Open modal for seafood platter
        cards.first.click()
        page.wait_for_selector("#blue-item-modal.active", timeout=3000)
        modal_title = page.locator("#blue-modal-title").text_content()
        print(f"  [Dine At Blue] Modal opened for: {modal_title}")
        assert "Platter" in modal_title or "Blue" in modal_title, f"Modal opened wrong dish: {modal_title}"
        page.click(".blue-modal-close")
        page.wait_for_selector("#blue-item-modal:not(.active)", timeout=3000)

        # 3. Test KFC Toggle on Dine At Blue
        page.goto(f"http://localhost:{PORT}/dineatblue/index.html")
        page.wait_for_load_state("networkidle")
        
        # Click Pickup
        page.click("button[data-fulfillment-mode='PICKUP']")
        time.sleep(0.5)
        mode = page.evaluate("() => localStorage.getItem('foodsphere_fulfillment_mode')")
        print(f"  [Toggle Test] Clicked Pickup -> localStorage mode is: {mode}")
        assert mode == "PICKUP", f"Expected mode PICKUP, got {mode}"

        # Verify address wrapper is hidden
        addr_display = page.evaluate("() => document.querySelector('.direct-checkout-address-wrap')?.style.display")
        print(f"  [Toggle Test] Address wrap display when PICKUP: '{addr_display}'")
        assert addr_display == "none", f"Expected none, got {addr_display}"

        # Click Delivery
        page.click("button[data-fulfillment-mode='DELIVERY']")
        time.sleep(0.5)
        mode = page.evaluate("() => localStorage.getItem('foodsphere_fulfillment_mode')")
        print(f"  [Toggle Test] Clicked Delivery -> localStorage mode is: {mode}")
        assert mode == "DELIVERY", f"Expected mode DELIVERY, got {mode}"

        addr_display = page.evaluate("() => document.querySelector('.direct-checkout-address-wrap')?.style.display")
        print(f"  [Toggle Test] Address wrap display when DELIVERY: '{addr_display}'")
        assert addr_display != "none", "Expected address field to be visible for DELIVERY"

        # 4. Test Tandoori Stop & Jushh PK 5 Pages & Toggles
        for brand in ['tandooristoppk', 'jushhpk']:
            for pg in ['index.html', 'menu.html', 'deals.html']:
                url = f"http://localhost:{PORT}/{brand}/{pg}"
                page.goto(url)
                page.wait_for_load_state("networkidle")
                toggle = page.locator(".kfc-fulfillment-toggle")
                assert toggle.count() > 0, f"KFC Toggle missing on {brand}/{pg}"
            print(f"  [{brand}] KFC Toggle present on index, menu, and deals pages!")

        # 5. Test Cart Drawer delivery fee behavior
        page.goto(f"http://localhost:{PORT}/tandooristoppk/index.html")
        page.wait_for_load_state("networkidle")
        
        # Select DELIVERY and add an item
        page.evaluate("() => { window.setFulfillmentMode('DELIVERY'); window.CartDrawer.addItem({ name: 'Traditional Chicken Sajji', price: 799 }); }")
        time.sleep(0.5)
        fee_delivery = page.evaluate("() => window.CartDrawer.getFulfillmentType()")
        print(f"  [CartDrawer Test] Fulfillment type is: {fee_delivery}")
        assert fee_delivery == "DELIVERY"

        # Change to PICKUP
        page.evaluate("() => window.setFulfillmentMode('PICKUP')")
        time.sleep(0.5)
        fee_pickup = page.evaluate("() => window.CartDrawer.getFulfillmentType()")
        print(f"  [CartDrawer Test] Changed to: {fee_pickup}")
        assert fee_pickup == "PICKUP"

        browser.close()

    print("\n[SUCCESS] ALL PHASE 2 & PHASE 3 VERIFICATION TESTS PASSED 100%!")

if __name__ == "__main__":
    main()
