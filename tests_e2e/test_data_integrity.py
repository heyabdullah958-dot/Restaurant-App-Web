import requests
import json
import random
import string

base_url = "https://restaurant-app-web.onrender.com"

def get_random_string(length=8):
    letters = string.ascii_lowercase + string.digits
    return ''.join(random.choice(letters) for i in range(length))

def test_data_integrity():
    print("--- [3] DATA INTEGRITY & API VALIDATION TESTING ---")

    # Fetch SeenBanao menu to get active items
    print("Fetching SeenBanao (70) menu...")
    menu_res = requests.get(f"{base_url}/api/restaurants/seenbanao/menu/")
    if menu_res.status_code != 200:
        print("ERROR: Failed to retrieve menu.")
        return

    categories = menu_res.json().get("data", [])
    seenbanao_item_id = None
    seenbanao_item_price = None
    for cat in categories:
        items = cat.get("items", [])
        if items:
            seenbanao_item_id = items[0]["id"]
            seenbanao_item_price = items[0]["price"]
            print(f"SeenBanao item ID: {seenbanao_item_id}, Price: Rs. {seenbanao_item_price}")
            break

    # Fetch DineAtBlue menu to get active items for cross-tenant mismatches
    print("\nFetching DineAtBlue (71) menu...")
    menu_res2 = requests.get(f"{base_url}/api/restaurants/dineatblue/menu/")
    dineatblue_item_id = None
    if menu_res2.status_code == 200:
        categories2 = menu_res2.json().get("data", [])
        for cat in categories2:
            items = cat.get("items", [])
            if items:
                dineatblue_item_id = items[0]["id"]
                print(f"DineAtBlue item ID: {dineatblue_item_id}")
                break

    # ==========================================
    # Part 1: Loyalty Points Audit
    # ==========================================
    print("\n[PART 1] Auditing Loyalty Points Calculation...")
    # Register a new customer
    rand = get_random_string(6)
    username = f"e2e_loy_{rand}"
    email = f"{username}@foodsphere.com"
    reg_payload = {
        "username": username,
        "email": email,
        "password": "custpassword123",
        "phone": "+923777777777"
    }
    reg_res = requests.post(f"{base_url}/api/auth/register/", json=reg_payload)
    if reg_res.status_code != 201:
        print("Failed to register customer for loyalty audit.")
        return
        
    token = reg_res.json().get("data", {}).get("tokens", {}).get("access")
    cust_headers = {"Authorization": f"Bearer {token}"}
    
    # Check initial loyalty points
    profile_res = requests.get(f"{base_url}/api/users/profile/", headers=cust_headers)
    initial_points = profile_res.json().get("data", {}).get("loyalty_points", 0)
    print(f"Initial loyalty points: {initial_points}")

    # Place an order (ensure total is high enough to generate points, min order Rs. 500)
    qty = 4
    subtotal = float(seenbanao_item_price) * qty
    # SeenBanao delivery fee is Rs. 0.00. Total = subtotal
    expected_total = subtotal
    ratio = 100 # SeenBanao ratio is 100
    expected_earned_points = int(expected_total // ratio)
    print(f"Placing order for SeenBanao. Total: Rs. {expected_total}. Expected earned points: {expected_earned_points}")
    
    order_payload = {
        "restaurant": 70,
        "delivery_address": "Test street 123, Islamabad",
        "payment_method": "cod",
        "items": [
            {
                "menu_item": seenbanao_item_id,
                "quantity": qty,
                "special_notes": "Loyalty audit order"
            }
        ]
    }
    
    order_res = requests.post(f"{base_url}/api/orders/", json=order_payload, headers=cust_headers)
    if order_res.status_code == 201:
        print("Order placed successfully. Re-fetching profile to audit loyalty points...")
        profile_res = requests.get(f"{base_url}/api/users/profile/", headers=cust_headers)
        new_points = profile_res.json().get("data", {}).get("loyalty_points", 0)
        print(f"New loyalty points: {new_points}")
        diff = new_points - initial_points
        if diff == expected_earned_points:
            print(f"SUCCESS: Loyalty points correctly calculated and updated (Earned: {diff}, Expected: {expected_earned_points})")
        else:
            print(f"ERROR: Loyalty points mismatch! Earned: {diff}, Expected: {expected_earned_points}")
    else:
        print(f"Order placement failed: {order_res.text}")

    # ==========================================
    # Part 2: Invalid Payload & Edge Cases
    # ==========================================
    print("\n[PART 2] Testing API Validation & Edge Cases...")
    
    # 2a. Negative quantity
    print("Testing negative quantity payload...")
    payload_neg = {
        "restaurant": 70,
        "delivery_address": "Test street",
        "payment_method": "cod",
        "items": [{"menu_item": seenbanao_item_id, "quantity": -2}]
    }
    res = requests.post(f"{base_url}/api/orders/", json=payload_neg, headers=cust_headers)
    print(f"Negative qty status code: {res.status_code} (Expected: 400)")
    if res.status_code == 500:
        print("CRITICAL BUG: Negative quantity caused 500 Internal Server Error!")
    elif res.status_code == 400:
        print("SUCCESS: Negative quantity correctly validated and rejected.")
        
    # 2b. Non-existent item ID
    print("Testing non-existent menu item ID...")
    payload_fake = {
        "restaurant": 70,
        "delivery_address": "Test street",
        "payment_method": "cod",
        "items": [{"menu_item": 999999, "quantity": 1}]
    }
    res = requests.post(f"{base_url}/api/orders/", json=payload_fake, headers=cust_headers)
    print(f"Non-existent item status code: {res.status_code} (Expected: 400)")
    if res.status_code == 500:
        print("CRITICAL BUG: Non-existent menu item ID caused 500 Internal Server Error!")
    elif res.status_code == 400:
        print("SUCCESS: Non-existent item ID correctly validated and rejected.")

    # 2c. Mismatched item (DineAtBlue item ordered from SeenBanao)
    if dineatblue_item_id:
        print("Testing mismatched menu item (DineAtBlue item ordered from SeenBanao)...")
        payload_mismatch = {
            "restaurant": 70,
            "delivery_address": "Test street",
            "payment_method": "cod",
            "items": [{"menu_item": dineatblue_item_id, "quantity": 3}]
        }
        res = requests.post(f"{base_url}/api/orders/", json=payload_mismatch, headers=cust_headers)
        print(f"Mismatched item status code: {res.status_code} (Expected: 400)")
        if res.status_code == 500:
            print("CRITICAL BUG: Cross-restaurant menu item caused 500 Internal Server Error!")
        elif res.status_code == 400:
            print("SUCCESS: Cross-restaurant item correctly validated and rejected.")

    # 2d. Missing delivery address
    print("Testing missing delivery address...")
    payload_no_addr = {
        "restaurant": 70,
        "payment_method": "cod",
        "items": [{"menu_item": seenbanao_item_id, "quantity": 3}]
    }
    res = requests.post(f"{base_url}/api/orders/", json=payload_no_addr, headers=cust_headers)
    print(f"Missing address status code: {res.status_code} (Expected: 400)")
    if res.status_code == 500:
        print("CRITICAL BUG: Missing address caused 500 Internal Server Error!")
    elif res.status_code == 400:
        print("SUCCESS: Missing address correctly validated and rejected.")

    # ==========================================
    # Part 3: Rate Limiting / Throttling
    # ==========================================
    print("\n[PART 3] Testing Rate Limiting...")
    print("Sending rapid guest auth requests to trigger throttle...")
    throttled = False
    for i in range(40):
        res = requests.post(f"{base_url}/api/auth/guest/")
        if res.status_code == 429:
            print(f"SUCCESS: Rate limit triggered at request {i+1}! Status code: 429")
            throttled = True
            break
            
    if not throttled:
        print("WARNING: Rate limit was not triggered after 40 consecutive requests!")

if __name__ == "__main__":
    test_data_integrity()
