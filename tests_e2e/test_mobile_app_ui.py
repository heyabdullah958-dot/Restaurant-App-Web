import os
import sys
import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

# Ensure output stream uses UTF-8 to prevent encoding crashes on Windows
if sys.platform.startswith('win'):
    import sys
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def click_element(driver, element):
    """
    Scrolls the element to the center of the screen and clicks it via JavaScript
    to bypass any click interceptions by sticky headers/banners.
    """
    try:
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
        time.sleep(0.5)
        driver.execute_script("arguments[0].click();", element)
    except Exception:
        # Fallback to standard selenium click
        element.click()

def run_mobile_ui_test():
    print("=== [1] Starting Mobile Web UI Test ===")
    
    # Configure headless Chrome with disabled web security to bypass CORS checks
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1280,1024")
    options.add_argument("--disable-web-security")
    options.add_argument("--disable-site-isolation-trials")
    
    # Use a unique temporary user data directory (required by Chrome when disabling web security)
    import tempfile
    temp_profile_dir = tempfile.mkdtemp(prefix="chrome_temp_profile_")
    print(f"Created temporary Chrome profile at: {temp_profile_dir}")
    options.add_argument(f"--user-data-dir={temp_profile_dir}")
    
    options.set_capability('goog:loggingPrefs', {'browser': 'ALL'})
    
    # Register a new customer user dynamically to bypass the guest account creation throttle
    import requests
    import random
    
    rng = random.randint(10000, 99999)
    new_username = f"testui_{rng}"
    new_password = "password123"
    new_email = f"testui_{rng}@foodsphere.com"
    new_phone = "+923123456789"
    
    print(f"Registering new test user: {new_username}...")
    reg_url = "https://restaurant-app-web.onrender.com/api/auth/register/"
    try:
        reg_res = requests.post(reg_url, json={
            "username": new_username,
            "email": new_email,
            "password": new_password,
            "phone": new_phone
        })
        if reg_res.status_code == 201:
            print(f"User {new_username} registered successfully.")
        else:
            print(f"Failed to register user: {reg_res.text}")
            raise Exception("Registration failed")
    except Exception as reg_err:
        print(f"Registration request error: {reg_err}")
        raise reg_err

    # Initialize driver
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    driver.implicitly_wait(10)
    
    try:
        url = "http://localhost:8081"
        print(f"Loading Mobile App at: {url}")
        driver.get(url)
        time.sleep(5)  # Wait for Metro bundler / loading screen to clear
        
        # Look for the onboarding Skip button
        print("Looking for onboarding 'Skip' button...")
        try:
            skip_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//*[text()='Skip']"))
            )
            click_element(driver, skip_btn)
            print("Successfully clicked 'Skip' onboarding button.")
        except Exception as e:
            print(f"Warning: Could not find or click 'Skip' button: {e}")
            try:
                get_started = driver.find_element(By.XPATH, "//*[text()='Get Started']")
                click_element(driver, get_started)
                print("Clicked 'Get Started' instead.")
            except:
                pass

        time.sleep(2)
        
        # Now on Auth Screen, log in as the newly registered user
        print("Entering login credentials on Auth screen...")
        try:
            username_input = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Enter your username']"))
            )
            username_input.clear()
            username_input.send_keys(new_username)
            print("Entered username.")
            
            password_input = driver.find_element(By.XPATH, "//input[@placeholder='Enter your password']")
            password_input.clear()
            password_input.send_keys(new_password)
            print("Entered password.")
            
            # Click the Login submit button located after the password input field
            submit_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//input[@placeholder='Enter your password']/following::*[text()='Login']"))
            )
            click_element(driver, submit_btn)
            print("Clicked Login submit button.")
        except Exception as e:
            print(f"Error logging in: {e}")
            # Dump page content for diagnostics
            print("Current page HTML summary:")
            print(driver.page_source[:2000])
            raise e
            
        time.sleep(3)  # Wait for Home screen to load and fetch restaurants from backend
        
        # Validate that we are on the Home screen (should see "Explore Brands" or "SeenBanao")
        print("Verifying home screen load...")
        try:
            WebDriverWait(driver, 15).until(
                EC.element_to_be_clickable((By.XPATH, "//*[text()='Explore Brands']"))
            )
            print("Home Screen loaded successfully.")
        except Exception as e:
            print("Timeout waiting for Home Screen. Let's dump text elements on page:")
            for elem in driver.find_elements(By.XPATH, "//*[text()]")[:10]:
                print(f"  Element text: '{elem.text}'")
            print("Browser console logs:")
            try:
                for entry in driver.get_log('browser'):
                    print(f"  {entry.get('level')}: {entry.get('message')}")
            except Exception as le:
                print(f"  Could not get browser logs: {le}")
            raise e
            
        # Let's find "SeenBanao" restaurant card and click it
        print("Looking for 'SeenBanao' restaurant card...")
        try:
            seenbanao_card = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//*[text()='SeenBanao']"))
            )
            click_element(driver, seenbanao_card)
            print("Clicked SeenBanao card.")
        except Exception as e:
            print("Could not find SeenBanao card. Listing available restaurant texts on page:")
            for elem in driver.find_elements(By.XPATH, "//*[contains(text(), 'Banao')]"):
                print(f"  Found text: '{elem.text}'")
            raise e
            
        time.sleep(3)  # Wait for SeenBanao menu to load
        
        # Verify we are on SeenBanao detail view
        print("Verifying SeenBanao Restaurant page load...")
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.XPATH, "//*[text()='Open Now' or text()='Currently Closed']"))
        )
        print("SeenBanao details loaded.")
        
        # Find the first "ADD" button to add a menu item to the cart
        print("Looking for 'ADD' buttons...")
        add_buttons = driver.find_elements(By.XPATH, "//*[text()='ADD']")
        if not add_buttons:
            # Maybe the text is different or inside input. Let's look for elements containing 'ADD'
            add_buttons = driver.find_elements(By.XPATH, "//*[contains(text(), 'ADD')]")
            
        if not add_buttons:
            print("No ADD buttons found. Printing available buttons or clickable elements:")
            for btn in driver.find_elements(By.XPATH, "//*[@role='button']"):
                print(f"  Button role text: '{btn.text}'")
            raise Exception("No ADD buttons found on the menu.")
            
        # Click the first 4 ADD buttons to satisfy SeenBanao's minimum order amount (Rs. 500)
        clicked_count = 0
        for i, btn in enumerate(add_buttons):
            if clicked_count >= 4:
                break
            try:
                click_element(driver, btn)
                print(f"Clicked ADD button {i+1} to add item to cart.")
                time.sleep(1)
                
                # Check if variant modal popped up
                try:
                    modal_add_btn = driver.find_element(By.XPATH, "//*[contains(text(), 'Add to Cart - Rs.')]")
                    click_element(driver, modal_add_btn)
                    print(f"Item {i+1} has variants. Clicked variant modal add button.")
                    time.sleep(1)
                except Exception:
                    pass
                clicked_count += 1
            except Exception as click_err:
                print(f"Skipping ADD button {i+1} due to error: {click_err}")
            
        # Now click the sticky bottom cart bar "View Cart"
        print("Looking for bottom cart bar 'View Cart'...")
        try:
            view_cart_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//*[text()='View Cart']"))
            )
            click_element(driver, view_cart_btn)
            print("Clicked 'View Cart'.")
        except Exception as e:
            print("Could not find bottom cart bar. Trying to click cart tab button in bottom navigation bar...")
            # Cart tab has tabBarLabel: 'Cart'
            cart_tab = driver.find_element(By.XPATH, "//*[text()='Cart']")
            click_element(driver, cart_tab)
            print("Clicked Cart tab from bottom navigation.")
            
        time.sleep(2)  # Wait for Cart screen
        
        # In Cart screen, click "Proceed to Checkout"
        print("Looking for 'Proceed to Checkout' button...")
        checkout_btn = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//*[text()='Proceed to Checkout']"))
        )
        click_element(driver, checkout_btn)
        print("Clicked 'Proceed to Checkout'.")
        time.sleep(2)  # Wait for Checkout screen
        
        # Fill out Checkout fields:
        print("Filling out checkout details...")
        
        # Phone Number
        try:
            phone_input = driver.find_element(By.XPATH, "//input[contains(@placeholder, 'Phone Number')]")
            phone_input.clear()
            phone_input.send_keys("03001234567")
            print("Entered phone number.")
        except Exception as e:
            print(f"Warning: Phone field lookup by placeholder failed: {e}. Trying fallback...")
            inputs = driver.find_elements(By.TAG_NAME, "input")
            if inputs:
                inputs[0].clear()
                inputs[0].send_keys("03001234567")
                print("Entered phone number on the first input element.")
                
        # Address
        try:
            address_input = driver.find_element(By.XPATH, "//textarea[contains(@placeholder, 'Street No.')]")
            address_input.clear()
            address_input.send_keys("123 Cloud Automation Highway, Phase 5, Islamabad")
            print("Entered delivery address in textarea.")
        except Exception as e:
            try:
                textarea = driver.find_element(By.TAG_NAME, "textarea")
                textarea.clear()
                textarea.send_keys("123 Cloud Automation Highway, Phase 5, Islamabad")
                print("Entered address in textarea by tag name.")
            except Exception as e2:
                print(f"Error entering address: {e2}")
                raise e2
                
        # Submit the order
        print("Locating 'Place Order' button...")
        try:
            place_order_btn = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Place Order')]"))
            )
            click_element(driver, place_order_btn)
            print("Clicked Place Order button.")
        except Exception as e:
            print("Could not find Place Order button. Trying elements by text content:")
            for elem in driver.find_elements(By.XPATH, "//*[contains(text(), 'Order')]"):
                print(f"  Element text: '{elem.text}'")
            raise e
            
        # Handle browser alert dialogs (e.g. success confirmation)
        print("Waiting for any success/confirmation alerts...")
        alert_accepted = False
        for i in range(10):  # Check every 1s for up to 10s
            try:
                alert = driver.switch_to.alert
                print(f"Found alert: '{alert.text}'. Accepting it...")
                alert.accept()
                alert_accepted = True
                print("Alert accepted.")
                break
            except Exception:
                time.sleep(1)
                
        if not alert_accepted:
            print("No alert was detected after 10 seconds. Proceeding to check confirmation page...")
            
        time.sleep(3)  # Wait for transition after alert acceptance
        
        # Verify order confirmation page
        print("Checking for Order Confirmation Screen...")
        try:
            # Look for order confirmation text e.g. "Order Placed!"
            WebDriverWait(driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Order Placed') or contains(text(), 'ORDER ID') or contains(text(), 'Track Your Order')]"))
            )
            print("Order confirmed on UI screen successfully.")
            
            # Let's try to extract Order ID from page text
            page_text = driver.find_element(By.TAG_NAME, "body").text
            print("--- Confirmation Page Text ---")
            print(page_text[:1000])
            print("------------------------------")
            
        except Exception as e:
            print(f"Timeout waiting for Order Confirmation screen: {e}")
            print("Current page HTML summary:")
            print(driver.page_source[:2000])
            print("Browser console logs:")
            try:
                for entry in driver.get_log('browser'):
                    print(f"  {entry.get('level')}: {entry.get('message')}")
            except Exception as le:
                print(f"  Could not get browser logs: {le}")
            raise e
            
    finally:
        driver.quit()
        print("=== WebDriver closed ===")
        # Clean up temporary profile directory
        try:
            import shutil
            shutil.rmtree(temp_profile_dir)
            print("Cleaned up temporary Chrome profile.")
        except Exception as clean_err:
            print(f"Warning: Could not delete temporary Chrome profile: {clean_err}")

if __name__ == "__main__":
    run_mobile_ui_test()
