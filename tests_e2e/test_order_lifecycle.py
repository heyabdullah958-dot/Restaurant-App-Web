import requests
import json
import random
import string

base_url = "https://getfoodpk-fd9b20442fcf.herokuapp.com"

def get_random_string(length=8):
    letters = string.ascii_lowercase + string.digits
    return ''.join(random.choice(letters) for i in range(length))

def login(username, password):
    url = f"{base_url}/api/auth/login/"
    try:
        res = requests.post(url, json={"username": username, "password": password})
        if res.status_code == 200:
            return res.json().get("access")
    except Exception as e:
        print(f"Error logging in: {e}")
    return None

def test_order_lifecycle():
    print("--- [2] ORDER LIFECYCLE & STATE MACHINE TESTING ---")

    # 1. Fetch menu items for SeenBanao (restaurant 1)
    print("\nFetching SeenBanao (1) menu...")
    menu_res = requests.get(f"{base_url}/api/restaurants/seenbanao/menu/")
    if menu_res.status_code != 200:
        print("ERROR: Failed to retrieve SeenBanao menu.")
        return
    
    categories = menu_res.json().get("data", [])
    menu_item_id = None
    menu_item_price = None
    for cat in categories:
        items = cat.get("items", [])
        if items:
            menu_item_id = items[0]["id"]
            menu_item_price = items[0]["price"]
            print(f"Found active menu item: {items[0]['name']} (ID: {menu_item_id}, Price: Rs. {menu_item_price})")
            break
            
    if not menu_item_id:
        print("ERROR: No active menu items found for SeenBanao.")
        return

    # 2. Simulate Guest Order
    print("\n[TEST] Placing Guest Order...")
    guest_payload = {
        "restaurant": 1,
        "guest_name": "E2E Test Guest",
        "guest_phone": "+923999999999",
        "delivery_address": "Street 10, Sector G-11, Islamabad",
        "payment_method": "cod",
        "items": [
            {
                "menu_item": menu_item_id,
                "quantity": 2,
                "special_notes": "Extra spicy, E2E test"
            }
        ]
    }
    
    # SeenBanao has a min order amount of 500, let's verify if the subtotal satisfies it
    subtotal = float(menu_item_price) * 2
    if subtotal < 500.00:
        # Increase quantity
        guest_payload["items"][0]["quantity"] = 4
        print(f"Adjusted quantity to 4 (Subtotal Rs. {float(menu_item_price)*4}) to satisfy min order of Rs. 500.")
        
    guest_res = requests.post(f"{base_url}/api/orders/", json=guest_payload)
    print(f"Guest Order Creation Status: {guest_res.status_code}")
    guest_order_id = None
    if guest_res.status_code == 201:
        data = guest_res.json().get("data", {})
        guest_order_id = data.get("id")
        print(f"SUCCESS: Guest Order Placed Successfully! Order ID: {guest_order_id}, Status: {data.get('status')}")
    else:
        print(f"FAILED: Guest Order Failed: {guest_res.text}")

    # 3. Simulate Registered User Order
    # 3a. Register a new user
    rand = get_random_string(6)
    username = f"e2e_cust_{rand}"
    email = f"{username}@foodsphere.com"
    reg_payload = {
        "username": username,
        "email": email,
        "password": "customerpassword123",
        "phone": "+923888888888"
    }
    print(f"\nRegistering new customer: {username}...")
    reg_res = requests.post(f"{base_url}/api/auth/register/", json=reg_payload)
    customer_token = None
    if reg_res.status_code == 201:
        reg_data = reg_res.json().get("data", {})
        customer_token = reg_data.get("tokens", {}).get("access")
        print("SUCCESS: Registered and logged in successfully!")
    else:
        print(f"FAILED: Registration failed: {reg_res.text}")
        return

    # 3b. Place order as registered user
    print("\n[TEST] Placing Registered Customer Order...")
    cust_headers = {"Authorization": f"Bearer {customer_token}"}
    cust_payload = {
        "restaurant": 1,
        "delivery_address": "Apartment 4B, Sector F-11, Islamabad",
        "payment_method": "cod",
        "items": [
            {
                "menu_item": menu_item_id,
                "quantity": guest_payload["items"][0]["quantity"],
                "special_notes": "Registered user E2E test"
            }
        ]
    }
    
    cust_res = requests.post(f"{base_url}/api/orders/", json=cust_payload, headers=cust_headers)
    print(f"Customer Order Creation Status: {cust_res.status_code}")
    cust_order_id = None
    if cust_res.status_code == 201:
        data = cust_res.json().get("data", {})
        cust_order_id = data.get("id")
        print(f"SUCCESS: Customer Order Placed Successfully! Order ID: {cust_order_id}, Status: {data.get('status')}")
    else:
        print(f"FAILED: Customer Order Failed: {cust_res.text}")
        return

    # 4. Transition Order Status Step-by-Step
    # Manager token
    manager_token = login("manager_seenbanao_dha", "Branch@Seenbanao2025!")
    if not manager_token:
        manager_token = login("admin", "admin123")
    if not manager_token:
        print("ERROR: Failed to acquire manager token.")
        return
    manager_headers = {"Authorization": f"Bearer {manager_token}"}

    stages = ["received", "preparing", "out_for_delivery", "delivered"]
    
    print("\nStarting status transitions for registered order...")
    for stage in stages:
        print(f"Transitioning Order {cust_order_id} to '{stage}'...")
        patch_res = requests.patch(
            f"{base_url}/api/orders/{cust_order_id}/", 
            json={"status": stage}, 
            headers=manager_headers
        )
        print(f"PATCH status code: {patch_res.status_code}")
        if patch_res.status_code == 200:
            updated_status = patch_res.json().get("status")
            print(f"SUCCESS: Order status successfully updated to: {updated_status}")
            if updated_status != stage:
                print(f"MISMATCH: Requested '{stage}', got '{updated_status}'")
        else:
            print(f"FAILED: Failed to transition to '{stage}': {patch_res.text}")

    # 5. Test Cancellation Constraints
    # Try to cancel a DELIVERED order
    print(f"\n[TEST] Attempting to cancel the DELIVERED order {cust_order_id}...")
    cancel_res = requests.patch(
        f"{base_url}/api/orders/{cust_order_id}/", 
        json={"status": "cancelled"}, 
        headers=manager_headers
    )
    print(f"Cancel Delivered Order status code: {cancel_res.status_code}")
    if cancel_res.status_code == 200:
        updated_status = cancel_res.json().get("status")
        print(f"BUG: A delivered order was successfully CANCELLED! (Status is now: {updated_status})")
    else:
        print("SUCCESS: Delivered order cancellation blocked (expected behavior).")

    # Let's create another order to test cancellation of a PENDING order
    print("\nPlacing a new order to test cancellation of a PENDING/RECEIVED order...")
    pending_res = requests.post(f"{base_url}/api/orders/", json=cust_payload, headers=cust_headers)
    if pending_res.status_code == 201:
        pending_order_id = pending_res.json().get("data", {}).get("id")
        print(f"New Order ID: {pending_order_id}")
        
        print(f"Attempting to cancel the PENDING order {pending_order_id}...")
        cancel_pending = requests.patch(
            f"{base_url}/api/orders/{pending_order_id}/", 
            json={"status": "cancelled"}, 
            headers=manager_headers
        )
        print(f"Cancel Pending Order status code: {cancel_pending.status_code}")
        if cancel_pending.status_code == 200:
            print(f"SUCCESS: Pending order successfully cancelled (expected behavior).")
        else:
            print(f"FAILED: Failed to cancel pending order: {cancel_pending.text}")
    else:
        print("Failed to place pending order for cancellation test.")

if __name__ == "__main__":
    test_order_lifecycle()
