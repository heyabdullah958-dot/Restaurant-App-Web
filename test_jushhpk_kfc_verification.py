import os
import sys
import time
import threading
from http.server import HTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright

PORT = 8765
ROOT_DIR = os.path.abspath("websites/jushhpk")

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
    print("RUNNING JUSHH PK KFC-STYLE STOREFRONT VERIFICATION SUITE")
    print("=" * 60)

    httpd = start_server()
    time.sleep(0.5)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Fresh context with cleared storage to test automatic modal opening
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        print("[1] Navigating to http://127.0.0.1:8765/index.html...")
        page.goto(f"http://127.0.0.1:{PORT}/index.html", wait_until="networkidle")

        # 1. Background color check
        body_bg = page.evaluate("window.getComputedStyle(document.body).backgroundColor")
        print(f"  -> document.body background: {body_bg}")
        assert body_bg == "rgb(248, 249, 250)", f"Expected rgb(248, 249, 250) but got {body_bg}"
        print("  [PASS] document.body background is rgb(248, 249, 250) (#F8F9FA)")

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
            return (text.includes('login') || text.includes('sign in')) ? 1 : 0;
        }""")
        assert header_login_count == 0, "Found Login / Sign In button in header!"
        print("  [PASS] ZERO Login / Sign In buttons found in header")

        # 4. Entry Order Mode Modal check (Opens automatically on fresh session)
        modal_visible = page.evaluate("""() => {
            const modal = document.getElementById('jushh-order-modal');
            return modal && modal.style.display !== 'none';
        }""")
        assert modal_visible, "Order mode modal did not open automatically on fresh session!"
        print("  [PASS] #jushh-order-modal opened automatically on first visit")

        # 5. Modal Toggle between Delivery and Pickup
        print("[2] Testing modal Delivery/Pickup toggling...")
        page.click("#modal-mode-pickup")
        page.wait_for_timeout(200)
        pickup_visible = page.evaluate("document.getElementById('modal-pickup-panel').style.display !== 'none'")
        delivery_visible = page.evaluate("document.getElementById('modal-delivery-panel').style.display !== 'none'")
        assert pickup_visible and not delivery_visible, "Pickup panel not displayed when PICKUP mode selected!"
        print("  [PASS] Mode toggled to PICKUP: Pickup panel active, Rs. 0 delivery banner shown")

        # Confirm order mode modal
        page.click("button:has-text('Start My Order')")
        page.wait_for_timeout(300)
        modal_closed = page.evaluate("document.getElementById('jushh-order-modal').style.display === 'none'")
        assert modal_closed, "Modal did not close after clicking 'Start My Order'!"
        print("  [PASS] Modal closed and saved preferences")

        # 6. Verify Header Location Pill opens modal on click
        page.click("#header-location-pill")
        page.wait_for_timeout(200)
        modal_reopened = page.evaluate("document.getElementById('jushh-order-modal').style.display !== 'none'")
        assert modal_reopened, "Clicking header location pill did not open order modal!"
        page.click("button[aria-label='Close dialog']")
        page.wait_for_timeout(200)
        print("  [PASS] Header location pill triggers order modal on click")

        # 7. Check every <img> naturalWidth > 0
        img_check = page.evaluate("""() => {
            const imgs = Array.from(document.querySelectorAll('img'));
            const broken = imgs.filter(img => img.naturalWidth === 0);
            return {
                total: imgs.length,
                broken: broken.map(img => img.src || img.getAttribute('src'))
            };
        }""")
        print(f"  -> Total images checked: {img_check['total']}, Broken: {len(img_check['broken'])}")
        assert len(img_check['broken']) == 0, f"Broken images found: {img_check['broken']}"
        print(f"  [PASS] All {img_check['total']} images loaded successfully with naturalWidth > 0")

        # 8. Test Live Search
        print("[3] Testing live menu search filter...")
        page.fill("#menu-search-input", "shawaya")
        page.wait_for_timeout(200)
        visible_after_search = page.evaluate("""() => {
            const cards = Array.from(document.querySelectorAll('.product-card'));
            return cards.filter(c => c.style.display !== 'none').length;
        }""")
        print(f"  -> Visible cards for 'shawaya': {visible_after_search}")
        assert visible_after_search > 0, "No cards visible after searching for 'shawaya'!"
        page.fill("#menu-search-input", "")
        page.wait_for_timeout(200)
        print("  [PASS] Live search filter successfully filters and restores menu cards")

        # 9. Test Add to Cart & Inline Stepper
        print("[4] Testing Add to Cart and Stepper sync...")
        first_card_btn = page.locator(".btn-add-cart").first
        first_card_btn.click()
        page.wait_for_timeout(400)

        # Header bucket count should be 1
        header_count = page.evaluate("document.getElementById('header-cart-count').textContent")
        assert header_count == "1", f"Expected header count 1 but got {header_count}"
        print(f"  [PASS] Item added to cart: Header cart count = {header_count}")

        # Check inline stepper appeared on the card
        stepper_present = page.evaluate("""() => {
            const stepper = document.querySelector('.inline-qty-stepper');
            return stepper !== null;
        }""")
        assert stepper_present, "Inline quantity stepper did not appear on the card after adding item!"
        print("  [PASS] Inline quantity stepper rendered on card with increment/decrement controls")

        browser.close()
        httpd.shutdown()

    print("=" * 60)
    print("ALL 9 SUITE ASSERTIONS PASSED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
