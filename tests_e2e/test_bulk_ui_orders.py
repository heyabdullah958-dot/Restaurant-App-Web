import os
import sys
import json
import time
import random
import string
import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

# Force stdout to be line buffered to prevent Windows buffering in background tasks
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(line_buffering=True)

base_url = "https://restaurant-app-web.onrender.com"
brand_mappings = {
    70: {"slug": "seenbanao", "name": "SeenBanao"},
    71: {"slug": "dineatblue", "name": "DineAtBlue"},
    72: {"slug": "jushhpk", "name": "JushhPK"},
    73: {"slug": "tandooristoppk", "name": "TandooriStoppk"},
    74: {"slug": "sandmelts", "name": "SandMelts"},
    75: {"slug": "birdmanfoodspk", "name": "BirdmanFoodsPK"},
    76: {"slug": "getafomo", "name": "GetAFomo"}
}

active_brand_ids = [70, 71, 72, 73, 74]  # Active brands to rotate orders
STATE_FILE = os.path.join(os.path.dirname(__file__), "bulk_ui_orders_state.json")

def load_state():
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, "r") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading state: {e}", flush=True)
    return {"placed_orders": [], "failed_count": 0}

def save_state(state):
    try:
        with open(STATE_FILE, "w") as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"Error saving state: {e}", flush=True)

def get_random_string(length=8):
    letters = string.ascii_lowercase + string.digits
    return ''.join(random.choice(letters) for _ in range(length))

def click_element(driver, element):
    """Scrolls to element center and clicks it via JavaScript to bypass sticky header overlays."""
    try:
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
        time.sleep(0.5)
        driver.execute_script("arguments[0].click();", element)
    except Exception:
        element.click()

def register_user(username, email, password, phone):
    """Registers a standard user dynamically to avoid 429 guest throttling."""
    reg_url = f"{base_url}/api/auth/register/"
    for attempt in range(3):
        try:
            res = requests.post(reg_url, json={
                "username": username,
                "email": email,
                "password": password,
                "phone": phone
            }, timeout=15)
            if res.status_code == 201:
                return True
            elif res.status_code == 429:
                time.sleep(3)
        except Exception:
            time.sleep(2)
    return False

def get_manager_token(brand_slug):
    """Obtains a branch manager JWT token."""
    login_url = f"{base_url}/api/auth/login/"
    payload = {"username": f"manager_{brand_slug}", "password": f"{brand_slug}@2025"}
    try:
        res = requests.post(login_url, json=payload, timeout=15)
        if res.status_code == 200:
            return res.json().get("access")
    except Exception as e:
        print(f"Error logging in manager for {brand_slug}: {e}", flush=True)
    return None

def transition_order_status(order_id, brand_slug):
    """Transitions order status from pending to delivered via branch manager account."""
    token = get_manager_token(brand_slug)
    if not token:
        print(f"  [ERROR] Could not log in as manager_{brand_slug} for Order #{order_id}", flush=True)
        return False
        
    headers = {"Authorization": f"Bearer {token}"}
    order_url = f"{base_url}/api/orders/{order_id}/"
    stages = ["received", "preparing", "out_for_delivery", "delivered"]
    
    print(f"  Transitioning Order #{order_id} using manager_{brand_slug} credentials...", flush=True)
    for stage in stages:
        for attempt in range(3):
            try:
                res = requests.patch(order_url, json={"status": stage}, headers=headers, timeout=15)
                if res.status_code == 200:
                    print(f"    -> Updated status to: '{stage}'", flush=True)
                    break
                else:
                    print(f"    -> [FAILED] Status '{stage}' attempt {attempt+1}: {res.text}", flush=True)
                    if attempt == 2:
                        return False
                    time.sleep(2)
            except Exception as e:
                print(f"    -> [EXCEPTION] Status '{stage}' attempt {attempt+1}: {e}", flush=True)
                if attempt == 2:
                    return False
                time.sleep(2)
    return True

def run_bulk_ui_orders():
    state = load_state()
    print(f"=== Starting Bulk Order Placement via Mobile App UI ===", flush=True)
    print(f"Current State: {len(state['placed_orders'])} placed, {state['failed_count']} failed", flush=True)
    
    # First, transition any previously placed but undelivered orders
    undelivered = [o for o in state["placed_orders"] if not o.get("delivered", False)]
    if undelivered:
        print(f"\nFound {len(undelivered)} undelivered orders in state. Resolving now...", flush=True)
        for item in undelivered:
            o_id = item["order_id"]
            slug = item["brand_slug"]
            print(f"Resolving Order #{o_id} ({slug})...", flush=True)
            if transition_order_status(o_id, slug):
                item["delivered"] = True
                save_state(state)
                print(f"Order #{o_id} successfully delivered.", flush=True)
            else:
                print(f"Could not deliver Order #{o_id} at this time.", flush=True)
    
    # Configure Chrome
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1280,1024")
    options.add_argument("--disable-web-security")
    options.add_argument("--disable-site-isolation-trials")
    
    import tempfile
    temp_profile_dir = tempfile.mkdtemp(prefix="chrome_bulk_profile_")
    options.add_argument(f"--user-data-dir={temp_profile_dir}")
    options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    driver.implicitly_wait(5)
    
    try:
        while True:
            placed_count = len(state["placed_orders"])
            total_processed = placed_count + state["failed_count"]
            if placed_count >= 50:
                print("\n=== Placed all 50 orders successfully! ===", flush=True)
                break
                
            order_num = placed_count + 1
            idx = total_processed
            
            brand_id = active_brand_ids[idx % len(active_brand_ids)]
            brand_info = brand_mappings[brand_id]
            brand_slug = brand_info["slug"]
            brand_name = brand_info["name"]
            
            # Setup dynamic user credentials
            rand_str = get_random_string(6)
            username = f"ui_bulk_{rand_str}"
            password = "password123"
            email = f"{username}@foodsphere.com"
            phone = f"+92300{random.randint(1000000, 9999999)}"
            fullname = f"Selenium Tester {order_num}"
            address = f"House {random.randint(1, 99)}, Street {random.randint(1, 20)}, Sector F-{random.choice(['6', '7', '8', '10', '11'])}, Islamabad"
            
            print(f"\n--- Placing Order {order_num}/50 (Restaurant: {brand_name}) ---", flush=True)
            
            # 1. Register User via API
            print(f"  Registering user '{username}'...", flush=True)
            if not register_user(username, email, password, phone):
                print(f"  [ERROR] User registration failed for '{username}'. Retrying in next loop iteration...", flush=True)
                state["failed_count"] += 1
                save_state(state)
                continue
                
            # 2. Reset session data in Browser for a clean slate
            print("  Clearing cookies and local storage...", flush=True)
            driver.get("http://localhost:8081")
            driver.delete_all_cookies()
            driver.execute_script("window.localStorage.clear(); window.sessionStorage.clear();")
            
            # 3. Load App
            driver.get("http://localhost:8081")
            time.sleep(3)
            
            # 4. Skip Onboarding
            try:
                skip_btn = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH, "//*[text()='Skip']"))
                )
                click_element(driver, skip_btn)
                print("  Skipped onboarding.", flush=True)
            except Exception:
                pass
                
            # 5. Log in
            print("  Logging in...", flush=True)
            try:
                username_input = WebDriverWait(driver, 5).until(
                    EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Enter your username']"))
                )
                username_input.clear()
                username_input.send_keys(username)
                
                password_input = driver.find_element(By.XPATH, "//input[@placeholder='Enter your password']")
                password_input.clear()
                password_input.send_keys(password)
                
                submit_btn = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH, "//input[@placeholder='Enter your password']/following::*[text()='Login']"))
                )
                click_element(driver, submit_btn)
                print("  Logged in successfully.", flush=True)
            except Exception as login_err:
                print(f"  [ERROR] Login flow failed: {login_err}", flush=True)
                state["failed_count"] += 1
                save_state(state)
                continue
                
            time.sleep(2)
            
            # 6. Click Restaurant Card
            print(f"  Navigating to restaurant '{brand_name}'...", flush=True)
            try:
                rest_card = WebDriverWait(driver, 8).until(
                    EC.element_to_be_clickable((By.XPATH, f"//*[text()='{brand_name}']"))
                )
                click_element(driver, rest_card)
                print("  Entered restaurant menu.", flush=True)
            except Exception as rest_err:
                print(f"  [ERROR] Could not find restaurant card: {rest_err}", flush=True)
                state["failed_count"] += 1
                save_state(state)
                continue
                
            time.sleep(2)
            
            # 7. Add multiple items to satisfy Rs. 500 minimum
            print("  Adding items to cart...", flush=True)
            try:
                add_buttons = driver.find_elements(By.XPATH, "//*[text()='ADD']")
                if not add_buttons:
                    add_buttons = driver.find_elements(By.XPATH, "//*[contains(text(), 'ADD')]")
                    
                if not add_buttons:
                    print("  [ERROR] No ADD buttons found.", flush=True)
                    state["failed_count"] += 1
                    save_state(state)
                    continue
                    
                # Click the first 4 ADD buttons
                added = 0
                for btn_idx, btn in enumerate(add_buttons):
                    if added >= 4:
                        break
                    try:
                        click_element(driver, btn)
                        time.sleep(0.5)
                        
                        # Dismiss variant modal if it pops up
                        try:
                            modal_add_btn = driver.find_element(By.XPATH, "//*[contains(text(), 'Add to Cart - Rs.')]")
                            click_element(driver, modal_add_btn)
                            time.sleep(0.5)
                        except Exception:
                            pass
                        added += 1
                    except Exception:
                        pass
                print(f"  Added {added} items to cart.", flush=True)
            except Exception as cart_err:
                print(f"  [ERROR] Cart operation failed: {cart_err}", flush=True)
                state["failed_count"] += 1
                save_state(state)
                continue
                
            # 8. View Cart
            print("  Going to basket...", flush=True)
            try:
                view_cart_btn = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH, "//*[text()='View Cart']"))
                )
                click_element(driver, view_cart_btn)
            except Exception:
                try:
                    cart_tab = driver.find_element(By.XPATH, "//*[text()='Cart']")
                    click_element(driver, cart_tab)
                except Exception as cart_nav_err:
                    print(f"  [ERROR] Could not navigate to cart: {cart_nav_err}", flush=True)
                    state["failed_count"] += 1
                    save_state(state)
                    continue
                    
            time.sleep(1.5)
            
            # 9. Proceed to Checkout
            print("  Proceeding to checkout...", flush=True)
            try:
                checkout_btn = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH, "//*[text()='Proceed to Checkout']"))
                )
                click_element(driver, checkout_btn)
            except Exception as checkout_err:
                print(f"  [ERROR] Proceed to checkout failed: {checkout_err}", flush=True)
                state["failed_count"] += 1
                save_state(state)
                continue
                
            time.sleep(1.5)
            
            # 10. Fill Checkout Fields
            print("  Filling checkout form...", flush=True)
            try:
                phone_input = driver.find_element(By.XPATH, "//input[contains(@placeholder, 'Phone Number')]")
                phone_input.clear()
                phone_input.send_keys(phone)
                
                address_input = driver.find_element(By.XPATH, "//textarea[contains(@placeholder, 'Street No.')]")
                address_input.clear()
                address_input.send_keys(address)
            except Exception as fields_err:
                # Fallback to tag names
                try:
                    inputs = driver.find_elements(By.TAG_NAME, "input")
                    if inputs:
                        inputs[0].clear()
                        inputs[0].send_keys(phone)
                    textarea = driver.find_element(By.TAG_NAME, "textarea")
                    textarea.clear()
                    textarea.send_keys(address)
                except Exception as fb_err:
                    print(f"  [ERROR] Form filling failed: {fb_err}", flush=True)
                    state["failed_count"] += 1
                    save_state(state)
                    continue
                    
            # 11. Place Order
            print("  Submitting order...", flush=True)
            try:
                place_order_btn = WebDriverWait(driver, 5).until(
                    EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Place Order')]"))
                )
                click_element(driver, place_order_btn)
            except Exception as submit_err:
                print(f"  [ERROR] Could not click Place Order: {submit_err}", flush=True)
                state["failed_count"] += 1
                save_state(state)
                continue
                
            # 12. Accept Alert
            for _ in range(5):
                try:
                    alert = driver.switch_to.alert
                    alert.accept()
                    print("  Accepted alert.", flush=True)
                    break
                except Exception:
                    time.sleep(0.5)
                    
            # 13. Wait for confirmation page and extract Order ID
            try:
                WebDriverWait(driver, 12).until(
                    EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Order Placed') or contains(text(), 'ORDER ID')]"))
                )
                # Wait 2.5 seconds to let animations complete and text become visible to Selenium
                time.sleep(2.5)
                
                # Fetch text via Selenium (visible elements)
                body_text = driver.find_element(By.TAG_NAME, "body").text
                
                # Fallback: Fetch text via JS textContent (ignores opacity/visibility)
                js_text = driver.execute_script("return document.body.textContent;")
                combined_text = f"{body_text}\n{js_text}"
                
                safe_text = combined_text.replace('\n', ' ').encode('ascii', errors='ignore').decode('ascii')
                print(f"  Debug: Confirmation text: {safe_text}", flush=True)
                
                # Match order ID using regex
                import re
                created_id = None
                
                # Try finding "#<digits>"
                match = re.search(r"#(\d+)", combined_text)
                if match:
                    created_id = int(match.group(1))
                else:
                    # Try finding "ORDER ID <digits>" or "ORDER ID #<digits>"
                    match2 = re.search(r"ORDER ID\s+#?(\d+)", combined_text, re.IGNORECASE)
                    if match2:
                        created_id = int(match2.group(1))
                        
                if created_id:
                    print(f"  [SUCCESS] Placed Order ID: {created_id}", flush=True)
                    
                    # Store in state
                    new_order = {
                        "order_id": created_id,
                        "restaurant_id": brand_id,
                        "brand_slug": brand_slug,
                        "brand_name": brand_name,
                        "customer": username,
                        "delivered": False
                    }
                    state["placed_orders"].append(new_order)
                    save_state(state)
                    
                    # Immediate transition to delivered via brand manager credentials
                    if transition_order_status(created_id, brand_slug):
                        new_order["delivered"] = True
                        save_state(state)
                        print(f"  Order #{created_id} successfully delivered immediately.", flush=True)
                    else:
                        print(f"  [WARNING] Order #{created_id} placed but failed to transition status to delivered.", flush=True)
                else:
                    print("  [WARNING] Order confirmation loaded, but could not parse Order ID.", flush=True)
                    state["failed_count"] += 1
                    save_state(state)
            except Exception as confirmation_err:
                print(f"  [ERROR] Confirmation page check failed: {confirmation_err}", flush=True)
                state["failed_count"] += 1
                save_state(state)
                
    finally:
        driver.quit()
        print("=== WebDriver closed ===", flush=True)
        try:
            import shutil
            shutil.rmtree(temp_profile_dir)
            print("Cleaned up temporary Chrome profile.", flush=True)
        except Exception as ce:
            print(f"Could not remove temp profile: {ce}", flush=True)

if __name__ == "__main__":
    run_bulk_ui_orders()
