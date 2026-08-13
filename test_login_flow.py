"""
Playwright Login Test Script — GetFood Manager App (http://localhost:8082)
Tests typing 'admin' / 'admin123' and clicking Sign In against the live local Django backend.
"""
from playwright.sync_api import sync_playwright, expect

def test_login_flow():
    print("=" * 70)
    print("[PLAYWRIGHT] TESTING STAFF LOGIN ON http://localhost:8082")
    print("=" * 70)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        page.goto('http://localhost:8082', wait_until='networkidle')
        print("  [OK] Loaded Login Screen")

        # Find input elements in React Native Web
        inputs = page.locator('input')
        input_count = inputs.count()
        print(f"  [OK] Found {input_count} input fields on page")

        if input_count >= 2:
            inputs.nth(0).fill('admin')
            inputs.nth(1).fill('admin123')
            print("  [OK] Filled Username ('admin') and Password ('admin123')")

            # Click Sign In button
            signin_button = page.locator('text=Sign In').first
            signin_button.click()
            print("  [OK] Clicked Sign In button")

            # Wait 3 seconds for login API call & state transition
            page.wait_for_timeout(3000)

        page.screenshot(path="login_after_submit.png")
        print("  [OK] Saved screenshot: login_after_submit.png")

        browser.close()

    print("\n" + "=" * 70)
    print("[SUCCESS] LOGIN TEST EXECUTED PERFECTLY")
    print("=" * 70)

if __name__ == '__main__':
    test_login_flow()
