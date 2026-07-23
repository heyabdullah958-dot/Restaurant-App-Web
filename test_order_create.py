import urllib.request
import json

def test_place_order():
    base_url = "https://restaurant-app-web.onrender.com/api"
    payload = {
        "restaurant": 73, # TandooriStoppk live DB ID
        "branch": 1,      # Johar Town branch ID
        "items": [
            {
                "menu_item": 1345, # Tandoori Chicken Bone
                "quantity": 1,
                "special_notes": "Extra spicy"
            }
        ],
        "payment_method": "cod",
        "delivery_address": "Test Order Address, Johar Town, Lahore",
        "guest_name": "Test Customer",
        "guest_phone": "03214204514"
    }

    req_data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(f"{base_url}/orders/", data=req_data, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
    
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            print("HTTP Status:", resp.getcode())
            res = json.loads(resp.read().decode('utf-8'))
            print("Order Created Successfully!")
            print("Order ID:", res.get('id'))
            print("Guest Name:", res.get('guest_name'))
            print("Restaurant:", res.get('restaurant'))
            print("Branch:", res.get('branch'))
            print("Status:", res.get('status'))
            print("Total Amount:", res.get('total_amount'))
    except Exception as e:
        print("Failed to place order:", e)

if __name__ == "__main__":
    test_place_order()
