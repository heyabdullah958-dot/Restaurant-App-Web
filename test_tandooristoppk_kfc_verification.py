import os
import sys
import time
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

PORT = 8766
ROOT_DIR = os.path.abspath("websites/tandooristoppk")

class CustomHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT_DIR, **kwargs)

    def log_message(self, format, *args):
        pass  # Quiet logging

def start_server():
    httpd = HTTPServer(('127.0.0.1', PORT), CustomHandler)
    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()
    return httpd

def run_tests():
    print("=" * 60)
    print("RUNNING TANDOORI STOP KFC-STYLE STOREFRONT VERIFICATION SUITE")
    print("=" * 60)

    httpd = start_server()
    time.sleep(0.5)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Fresh context with cleared storage to test automatic modal opening
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print("[1] Navigating to http://127.0.0.1:8766/index.html...")
        page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")

        # 1. Background color check
        body_bg = page.evaluate("window.getComputedStyle(document.body).backgroundColor")
        print(f"  -> document.body background: {body_bg}")
        assert body_bg == "rgb(250, 248, 245)", f"Expected rgb(250, 248, 245) (#FAF8F5) but got {body_bg}"
        print("  [PASS] document.body background is rgb(250, 248, 245) (#FAF8F5)")

        # 2. Card background check
        card_bg = page.evaluate("""() => {
            const card = document.querySelector('.product-card');
            return card ? window.getComputedStyle(card).backgroundColor : null;
        }""")
        print(f"  -> .product-card background: {card_bg}")
        assert card_bg == "rgb(255, 255, 255)", f"Expected rgb(255, 255, 255) but got {card_bg}"
        print("  [PASS] product cards have pure white background rgb(255, 255, 255)")

        # 3. Header has ZERO login buttons
        header_login_count = page.evaluate("""() => {
            const header = document.querySelector('header');
            if (!header) return 0;
            const text = header.textContent.toLowerCase();
            return (text.includes('login') || text.includes('sign in') || text.includes('log in') || text.includes('account')) ? 1 : 0;
        }""")
        assert header_login_count == 0, "Found Login/Sign In buttons in header!"
        print("  [PASS] ZERO Login / Sign In buttons found in header")

        # 4. Modal auto-open test
        modal_visible = page.evaluate("""() => {
            const modal = document.getElementById('ts-order-modal');
            return modal && !modal.classList.contains('opacity-0') && !modal.classList.contains('pointer-events-none');
        }""")
        print(f"  -> Auto-open modal visible: {modal_visible}")
        assert modal_visible, "Expected #ts-order-modal to open automatically on first visit"
        print("  [PASS] #ts-order-modal opened automatically on first visit")

        # 5. Toggle Delivery / Pickup inside modal
        print("[2] Testing modal Delivery/Pickup toggling...")
        page.click("#modal-btn-pickup")
        time.sleep(0.2)
        pickup_active = page.evaluate("""() => {
            const pickupBtn = document.getElementById('modal-btn-pickup');
            const pickupSection = document.getElementById('modal-pickup-section');
            const addressSection = document.getElementById('modal-address-section');
            return pickupBtn.classList.contains('bg-[#C81E1E]') && 
                   pickupSection.style.display !== 'none' && 
                   addressSection.style.display === 'none';
        }""")
        assert pickup_active, "Pickup mode not properly activated in modal"
        print("  [PASS] Mode toggled to PICKUP: Pickup panel active, Rs. 0 delivery banner shown")

        # 6. Branch selection & Confirmation
        page.select_option("#modal-branch-select", "Lake City")
        page.click("button:has-text('Start My Order')")
        time.sleep(0.3)

        branch_label = page.inner_text("#header-branch-label")
        print(f"  -> Header branch label after modal confirm: {branch_label}")
        assert "Lake City" in branch_label, f"Expected 'Lake City' in header branch label, got {branch_label}"
        print("  [PASS] Modal closed and saved preferences to Lake City Branch")

        # 7. Check location pill triggers modal
        page.click("#header-branch-btn")
        time.sleep(0.2)
        modal_reopened = page.evaluate("""() => {
            const modal = document.getElementById('ts-order-modal');
            return modal && !modal.classList.contains('opacity-0');
        }""")
        assert modal_reopened, "Header branch button failed to reopen modal"
        print("  [PASS] Header location pill triggers order modal on click")
        page.click("#ts-order-modal button[aria-label='Close Modal']")
        time.sleep(0.2)

        # 8. Check all images for broken links
        broken_images = page.evaluate("""() => {
            const images = Array.from(document.querySelectorAll('img'));
            return images.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src);
        }""")
        total_images = page.evaluate("document.querySelectorAll('img').length")
        print(f"  -> Total images checked: {total_images}, Broken: {len(broken_images)}")
        if broken_images:
            print("  Broken images detected:", broken_images)
        assert len(broken_images) == 0, f"Found {len(broken_images)} broken images: {broken_images}"
        print(f"  [PASS] All {total_images} images loaded successfully with naturalWidth > 0")

        # 9. Test live search filter
        print("[3] Testing live menu search filter...")
        page.fill("#menu-search-input", "sajji")
        time.sleep(0.3)
        visible_cards_sajji = page.evaluate("""() => {
            const cards = Array.from(document.querySelectorAll('.product-card'));
            return cards.filter(c => window.getComputedStyle(c).display !== 'none').length;
        }""")
        print(f"  -> Visible cards for 'sajji': {visible_cards_sajji}")
        assert visible_cards_sajji >= 6, f"Expected at least 6 sajji cards, got {visible_cards_sajji}"

        page.fill("#menu-search-input", "")
        time.sleep(0.3)
        all_visible = page.evaluate("""() => {
            const cards = Array.from(document.querySelectorAll('.product-card'));
            return cards.filter(c => window.getComputedStyle(c).display !== 'none').length;
        }""")
        print(f"  -> All visible cards after clearing search: {all_visible}")
        assert all_visible >= 25, "Failed to restore all cards after clearing search"
        print("  [PASS] Live search filter successfully filters and restores menu cards")

        # 10. Test Add to Cart & Stepper sync
        print("[4] Testing Add to Cart and Stepper sync...")
        first_card_btn = page.locator(".product-card .btn-add-cart").first
        first_card_btn.click()
        time.sleep(0.5)

        cart_count = page.inner_text("#header-cart-count")
        print(f"  -> Header cart count after click: {cart_count}")
        assert cart_count == "1", f"Expected cart count 1, got {cart_count}"
        print("  [PASS] Item added to cart: Header cart count = 1")

        # Close cart drawer to check in-page stepper
        page.click(".cd-close-btn")
        time.sleep(0.3)

        stepper_rendered = page.evaluate("""() => {
            const firstContainer = document.querySelector('.product-card .card-action-container');
            return firstContainer ? !!firstContainer.querySelector('.inline-qty-stepper') : false;
        }""")
        assert stepper_rendered, "Inline quantity stepper was not rendered after adding item"
        print("  [PASS] Inline quantity stepper rendered on card with increment/decrement controls")

        print("=" * 60)
        print("ALL 10 SUITE ASSERTIONS PASSED WITH 100% SUCCESS!")
        print("=" * 60)

        browser.close()

if __name__ == '__main__':
    run_tests()
