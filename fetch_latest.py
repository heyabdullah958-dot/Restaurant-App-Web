import urllib.request
import json

def fetch_latest_order():
    base_url = "https://restaurant-app-web.onrender.com"
    
    login_credentials = [
        {"username": "admin", "password": "admin123password"},
        {"username": "admin", "password": "admin123"},
        {"username": "admin", "password": "password123"},
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
                    print(f"Logged in as {cred['username']}")
                    break
        except Exception:
            continue

    if not token:
        print("No valid token")
        return

    req = urllib.request.Request(f"{base_url}/api/orders/", headers={'Authorization': f'Bearer {token}'})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            orders = data.get('results', data) if isinstance(data, dict) else data
            print(f"Total orders: {len(orders)}")
            for o in orders[:5]:
                print(f"ID #{o.get('id')} | Guest: {o.get('guest_name')} | Phone: {o.get('guest_phone')} | Branch: {o.get('branch')} | Total: {o.get('total_amount')} | Date: {o.get('created_at')}")
    except Exception as e:
        print("Error fetching orders:", e)

if __name__ == "__main__":
    fetch_latest_order()
