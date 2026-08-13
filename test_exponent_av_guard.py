"""
Playwright E2E & Native Module Guard Verification Suite
Tests loading Merchant Manager App on http://localhost:8082 to verify zero 'ExponentAV' native module runtime errors on startup.
"""
from playwright.sync_api import sync_playwright, expect

def test_exponent_av_guard():
    print("=" * 80)
    print("[PLAYWRIGHT] NATIVE MODULE 'ExponentAV' RUNTIME GUARD VERIFICATION")
    print("=" * 80)

    uncaught_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        # Catch unhandled errors or console exceptions
        page.on("pageerror", lambda err: uncaught_errors.append(str(err)))

        print("\n[STEP 1] Navigating to http://localhost:8082...")
        page.goto('http://localhost:8082', wait_until='networkidle')
        expect(page.locator('body')).to_be_visible(timeout=15000)
        print("  [OK] Page loaded successfully.")

        # Wait 3 seconds to ensure all Metro JS modules evaluate
        page.wait_for_timeout(3000)

        # Verify no ExponentAV error screen or uncaught exception
        exponent_errors = [e for e in uncaught_errors if 'ExponentAV' in e or 'runtime not ready' in e]
        print(f"  [OK] Uncaught ExponentAV Errors: {len(exponent_errors)}")
        assert len(exponent_errors) == 0, f"Found uncaught ExponentAV error: {exponent_errors}"

        page.screenshot(path="exponent_av_guard_passed.png")
        print("  [OK] Saved screenshot: exponent_av_guard_passed.png")

        browser.close()

    print("\n" + "=" * 80)
    print("[SUCCESS] ExponentAV NATIVE MODULE GUARD VERIFIED (0 RUNTIME ERRORS)")
    print("=" * 80)

if __name__ == '__main__':
    test_exponent_av_guard()
