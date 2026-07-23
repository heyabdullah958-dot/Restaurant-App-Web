import urllib.request
import json

def fetch_admin_orders():
    base_url = "https://restaurant-app-web.onrender.com"
    
    # Try admin credentials
    login_credentials = [
        {"username": "admin", "password": "adminpassword"},
        {"username": "admin", "password": "admin123password"},
        {"username": "admin", "password": "password123"},
        {"username": "admin", "password": "admin123"},
        {"username": "seenbanao_manager", "password": "seenbanao123password"},
        {"username": "dineatblue_manager", "password": "dineatblue123password"},
        {"username": "jushhpk_manager", "password": "jushhpk123password"},
        {"username": "tandooristoppk_manager", "password": "tandooristoppk123password"},
    ]
    
    token = None
    for cred in login_credentials:
        try:
            req_data = json.dumps(cred).encode('utf-8')
            req = urllib.request.Request(f"{base_url}/api/auth/login/", data=req_data, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req, timeout=10) as resp:
                res = json.loads(resp.read().decode('utf-8'))
                token = res.get('access') or res.get('data', {}).get('access')
                if token:
                    print(f"Successfully logged in as: {cred['username']}")
                    break
        except Exception as e:
            continue
            
    if not token:
        print("Could not obtain admin token from known list.")
        return

    # Fetch orders with Authorization header
    req = urllib.request.Request(f"{base_url}/api/orders/", headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            orders = data.get('results', data) if isinstance(data, dict) else data
            print(f"\n--- Total Orders Found: {len(orders)} ---")
            for o in orders[:8]:
                print(f"Order #{o.get('id')} | Status: {o.get('status')} | Customer: {o.get('guest_name')} ({o.get('guest_phone')})")
                print(f"  Restaurant: {o.get('restaurant')} | Branch: {o.get('branch')} | Total: Rs {o.get('total_amount')}")
                print(f"  Address: {o.get('delivery_address')}")
                print(f"  Created At: {o.get('created_at')}")
                print("-" * 50)
    except Exception as e:
        print("Failed to fetch orders:", e)

if __name__ == "__main__":
    fetch_admin_orders()
