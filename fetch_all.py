import urllib.request
import json

def fetch_all_orders_info():
    base_url = "https://restaurant-app-web.onrender.com"
    
    login_credentials = [
        {"username": "admin", "password": "admin123password"},
        {"username": "admin", "password": "admin123"},
        {"username": "seenbanao_manager", "password": "seenbanao123password"},
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
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        count = data.get('count', len(data) if isinstance(data, list) else 0)
        results = data.get('results', data) if isinstance(data, dict) else data
        print(f"Total count in DB: {count}")
        print("Latest 10 orders returned:")
        for o in results[:10]:
            print(f"  ID #{o.get('id')} | Rest ID: {o.get('restaurant')} | Branch: {o.get('branch')} | Name: {o.get('guest_name')} | Created: {o.get('created_at')}")

if __name__ == "__main__":
    fetch_all_orders_info()
