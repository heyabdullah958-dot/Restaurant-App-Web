import requests
import random
import string
import json
import time

base_url = "https://restaurant-app-web.onrender.com"
restaurant_ids = [70, 71, 72, 73, 74, 75, 76]

def get_random_string(length=8):
    letters = string.ascii_lowercase + string.digits
    return ''.join(random.choice(letters) for i in range(length))

def discover_restaurants_and_items():
    print("Discovering active restaurant menus...")
    discovered = {}
    for r_id in restaurant_ids:
        try:
            res = requests.get(f"{base_url}/api/restaurants/")
            if res.status_code == 200:
                results = res.json().get("results", [])
                matching = [r for r in results if r["id"] == r_id]
                if not matching:
                    continue
                rest = matching[0]
                slug = rest["slug"]
                min_order = float(rest["min_order_amount"])
                
                menu_res = requests.get(f"{base_url}/api/restaurants/{slug}/menu/")
                if menu_res.status_code == 200:
                    categories = menu_res.json().get("data", [])
                    items = []
                    for cat in categories:
                        for item in cat.get("items", []):
                            items.append({
                                "id": item["id"],
                                "price": float(item["price"]),
                                "name": item["name"]
                            })
                    if items:
                        discovered[r_id] = {
                            "slug": slug,
                            "min_order": min_order,
                            "items": items
                        }
                        print(f"Discovered {len(items)} items for {rest['name']} (ID: {r_id}, Min Order: Rs. {min_order})")
        except Exception as e:
            print(f"Error discovering {r_id}: {e}")
    return discovered

def register_customer():
    rand = get_random_string(6)
    username = f"stress_cust_{rand}"
    email = f"{username}@foodsphere.com"
    payload = {
        "username": username,
        "email": email,
        "password": "customerpassword123",
        "phone": f"+92300{random.randint(1000000, 9999999)}"
    }
    for attempt in range(3):
        try:
            res = requests.post(f"{base_url}/api/auth/register/", json=payload, timeout=20)
            if res.status_code == 201:
                token = res.json().get("data", {}).get("tokens", {}).get("access")
                return token
            elif res.status_code == 429:
                print("Throttled on register. Sleeping 2s...")
                time.sleep(2)
        except Exception:
            time.sleep(1)
    return None

def place_single_order(order_num, discovered_menus):
    r_id = random.choice(list(discovered_menus.keys()))
    rest_info = discovered_menus[r_id]
    
    menu_item = random.choice(rest_info["items"])
    item_id = menu_item["id"]
    item_price = menu_item["price"]
    
    min_order = rest_info["min_order"]
    qty = 1
    while (qty * item_price) < min_order:
        qty += 1
    qty += random.randint(0, 2)
    
    is_guest = random.choice([True, False])
    
    headers = {}
    payload = {
        "restaurant": r_id,
        "delivery_address": f"Street {random.randint(1, 50)}, Area Phase {random.randint(1, 8)}, Islamabad",
        "payment_method": "cod",
        "items": [
            {
                "menu_item": item_id,
                "quantity": qty,
                "special_notes": f"Stress test order #{order_num}"
            }
        ]
    }
    
    if is_guest:
        payload["guest_name"] = f"Stress Guest {order_num}"
        payload["guest_phone"] = f"+92311{random.randint(1000000, 9999999)}"
    else:
        token = register_customer()
        if token:
            headers["Authorization"] = f"Bearer {token}"
        else:
            payload["guest_name"] = f"Stress Guest {order_num}"
            payload["guest_phone"] = f"+92311{random.randint(1000000, 9999999)}"
            
    # POST order with retries
    for attempt in range(3):
        try:
            start_time = time.time()
            res = requests.post(f"{base_url}/api/orders/", json=payload, headers=headers, timeout=30)
            latency = time.time() - start_time
            if res.status_code == 201:
                order_data = res.json().get("data", {})
                order_id = order_data.get("id")
                print(f"Order #{order_num} Placed: ID {order_id} (Restaurant {r_id}, Latency: {latency:.2f}s, Guest: {is_guest})")
                return {"success": True, "order_id": order_id, "restaurant_id": r_id, "total": float(order_data.get("total", 0))}
            elif res.status_code == 429:
                print(f"Throttled on placing order. Retrying in 3s (Attempt {attempt+1})...")
                time.sleep(3)
            else:
                print(f"Order #{order_num} Failed with status {res.status_code}. Retrying...")
                time.sleep(2)
        except Exception as e:
            print(f"Order #{order_num} Exception on attempt {attempt+1}: {e}")
            time.sleep(2)
            
    return {"success": False, "error": "Failed after 3 attempts"}

def run_stress_test():
    discovered = discover_restaurants_and_items()
    if not discovered:
        print("ERROR: No active menus discovered. Exiting.")
        return
        
    print("\nStarting sequential stress test (50 bulk orders)...")
    results = []
    
    # We want to place exactly 50 orders
    orders_to_place = 50
    success_count = 0
    i = 0
    while success_count < orders_to_place and i < 70: # Cap at 70 attempts
        i += 1
        print(f"Placing order {success_count+1}/{orders_to_place} (Attempt {i})...")
        res = place_single_order(success_count + 1, discovered)
        if res.get("success"):
            results.append(res)
            success_count += 1
        # Add a tiny delay between requests to keep the server happy
        time.sleep(0.3)
                
    placed = [r for r in results if r.get("success")]
    print(f"\nStress Test Completed. Placed {len(placed)}/50 orders successfully.")
    
    # Save order IDs to file
    with open("tests_e2e/placed_orders.json", "w") as f:
        json.dump(placed, f, indent=2)
    print("Placed orders details written to tests_e2e/placed_orders.json.")

if __name__ == "__main__":
    run_stress_test()
