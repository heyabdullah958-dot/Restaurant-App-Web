import requests
import json
import os
import urllib.parse
from PIL import Image

base_url = "https://restaurant-app-web.onrender.com"

def login(username, password):
    url = f"{base_url}/api/auth/login/"
    try:
        res = requests.post(url, json={"username": username, "password": password})
        if res.status_code == 200:
            return res.json().get("access")
    except Exception as e:
        print("Login error:", e)
    return None

def test_manager_workflow():
    print("--- [3] BRANCH MANAGER WORKFLOW & CONTENT MANAGEMENT ---")
    
    # 1. Login
    token = login("manager_seenbanao", "seenbanao@2025")
    if not token:
        print("ERROR: Failed to authenticate as SeenBanao manager.")
        return
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create category
    print("\nCreating new menu category...")
    url_cat = f"{base_url}/api/admin/menu-categories/"
    cat_payload = {
        "restaurant": 70,
        "name": "E2E Manager Category",
        "icon": "pizza-slice",
        "order": 10,
        "is_active": True
    }
    
    try:
        res = requests.post(url_cat, json=cat_payload, headers=headers)
        print(f"Create Category Status: {res.status_code}")
        if res.status_code in [200, 201]:
            category_data = res.json()
            category_id = category_data.get("id")
            print(f"SUCCESS: Category created! ID: {category_id}")
            
            # 3. Add menu item with image
            print("\nCreating menu item with image upload...")
            os.makedirs("tests_e2e/assets", exist_ok=True)
            img = Image.new('RGB', (100, 100), color = '#EF4444')
            img.save("tests_e2e/assets/dummy_item.png")
            
            url_item = f"{base_url}/api/admin/menu-items/"
            item_payload = {
                "category": category_id,
                "name": "E2E Manager Burger",
                "description": "Premium E2E test item.",
                "price": "450.00",
                "is_available": "true",
                "is_featured": "false",
                "preparation_time": "15",
                "options": "[]"
            }
            files = {
                "image": ("dummy_item.png", open("tests_e2e/assets/dummy_item.png", "rb"), "image/png")
            }
            
            res_item = requests.post(url_item, data=item_payload, files=files, headers=headers)
            print(f"Create Menu Item Status: {res_item.status_code}")
            
            # Close file
            files["image"][1].close()
            
            if res_item.status_code in [200, 201]:
                item_data = res_item.json()
                item_id = item_data.get("id")
                print(f"SUCCESS: Menu Item created! ID: {item_id}, Image URL: {item_data.get('image')}")
                
                # 4. Toggle Availability and verify public menu sync
                print(f"\nToggling menu item {item_id} availability to False...")
                patch_res = requests.patch(
                    f"{base_url}/api/admin/menu-items/{item_id}/", 
                    json={"is_available": False}, 
                    headers=headers
                )
                print(f"Toggle OFF Status Code: {patch_res.status_code}")
                
                # Retrieve public menu
                menu_res = requests.get(f"{base_url}/api/restaurants/seenbanao/menu/")
                if menu_res.status_code == 200:
                    categories = menu_res.json().get("data", [])
                    found = False
                    for cat in categories:
                        for item in cat.get("items", []):
                            if item["id"] == item_id:
                                found = True
                    if not found:
                        print("SUCCESS: Item successfully hidden from public menu (instant sync confirmed).")
                    else:
                        print("ERROR: Item is still visible in public menu despite is_available=False!")
                        
                print(f"Toggling menu item {item_id} availability back to True...")
                patch_res2 = requests.patch(
                    f"{base_url}/api/admin/menu-items/{item_id}/", 
                    json={"is_available": True}, 
                    headers=headers
                )
                print(f"Toggle ON Status Code: {patch_res2.status_code}")
                
                # Clean up created items/category
                print(f"\nDeleting menu item ID {item_id}...")
                requests.delete(f"{base_url}/api/admin/menu-items/{item_id}/", headers=headers)
            else:
                print(f"FAILED: Failed to create menu item: {res_item.text}")
                
            print(f"Deleting category ID {category_id}...")
            requests.delete(f"{base_url}/api/admin/menu-categories/{category_id}/", headers=headers)
        else:
            print(f"FAILED: Failed to create category: {res.text}")
    except Exception as e:
        print("Menu workflow exception:", e)
        
    # 5. Order Management status transitions
    print("\nLoading placed orders from stress test...")
    if not os.path.exists("tests_e2e/placed_orders.json"):
        print("WARNING: No placed_orders.json found. Skipping status transitions.")
        return
        
    with open("tests_e2e/placed_orders.json", "r") as f:
        orders = json.load(f)
        
    # Find orders placed for SeenBanao (restaurant 70)
    seenbanao_orders = [o for o in orders if o.get("restaurant_id") == 70]
    print(f"Found {len(seenbanao_orders)} orders belonging to SeenBanao.")
    
    stages = ["received", "preparing", "out_for_delivery", "delivered"]
    
    # Let's transition a subset or all of them
    for idx, order in enumerate(seenbanao_orders):
        order_id = order["order_id"]
        print(f"\nProcessing Order ID: {order_id} ({idx+1}/{len(seenbanao_orders)})")
        
        # Transition status
        for stage in stages:
            url_order = f"{base_url}/api/orders/{order_id}/"
            patch_order = requests.patch(url_order, json={"status": stage}, headers=headers)
            if patch_order.status_code == 200:
                print(f"  Transitioned to '{stage}' (Status: 200)")
            else:
                print(f"  Failed to transition to '{stage}': {patch_order.status_code} - {patch_order.text}")
                break
                
        # Generate and print WhatsApp Dispatch URL
        # We fetch the order details to get delivery_address and customer name
        det_res = requests.get(f"{base_url}/api/orders/{order_id}/", headers=headers)
        if det_res.status_code == 200:
            order_data = det_res.json()
            name = order_data.get("guest_name") or "Customer"
            phone = order_data.get("guest_phone") or "N/A"
            address = order_data.get("delivery_address", "")
            location_link = f"https://maps.google.com/?q={urllib.parse.quote(address)}"
            
            message = (
                f"Rider Bhai, ye order deliver karna hai:\n"
                f"Restaurant: SeenBanao\n"
                f"Order ID: #{order_id}\n"
                f"Naam: {name}\n"
                f"Phone: {phone}\n"
                f"Address: {address}\n"
                f"Location Link: {location_link}"
            )
            encoded_message = urllib.parse.quote(message)
            whatsapp_url = f"https://wa.me/923000000000?text={encoded_message}"
            print(f"Generated Rider WhatsApp dispatch URL:")
            print(f"  {whatsapp_url}")
            
if __name__ == "__main__":
    test_manager_workflow()
