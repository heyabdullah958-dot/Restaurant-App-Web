import urllib.request
import json

BASE = "https://restaurant-app-web.onrender.com/api"

# Step 1: Login as admin — check actual response structure
login_data = json.dumps({"username": "admin", "password": "admin123"}).encode()
req = urllib.request.Request(
    f"{BASE}/auth/login/",
    data=login_data,
    headers={"Content-Type": "application/json"},
    method="POST"
)
with urllib.request.urlopen(req) as resp:
    login_resp = json.loads(resp.read())

print("Login response keys:", list(login_resp.keys()))
print("Full response:", json.dumps(login_resp, indent=2)[:500])

# Try to extract token flexibly
token = (
    login_resp.get("access") or
    login_resp.get("token") or
    (login_resp.get("data") or {}).get("access") or
    (login_resp.get("data") or {}).get("token")
)
print(f"\nToken extracted: {token[:30] if token else 'NOT FOUND'}...")

if not token:
    print("Could not find token. Full response:")
    print(json.dumps(login_resp, indent=2))
    exit(1)

# Step 2: Fetch orders
req2 = urllib.request.Request(
    f"{BASE}/orders/",
    headers={"Authorization": f"Bearer {token}"}
)
with urllib.request.urlopen(req2) as resp2:
    orders_resp = json.loads(resp2.read())

if isinstance(orders_resp, dict):
    orders = orders_resp.get("results", [])
    total = orders_resp.get("count", len(orders))
else:
    orders = orders_resp
    total = len(orders)

print(f"\n=== PRODUCTION HEROKU ORDERS (Total: {total}) ===\n")

for o in orders:
    print(f"Order #{o['id']}")
    print(f"  Restaurant : {o.get('restaurant_name') or o.get('restaurant')}")
    print(f"  Branch     : {o.get('branch_name') or o.get('branch') or 'N/A'}")
    print(f"  Customer   : {o.get('guest_name') or o.get('user') or 'N/A'}")
    print(f"  Phone      : {o.get('guest_phone') or 'N/A'}")
    print(f"  Address    : {o.get('delivery_address')}")
    items = o.get('items', [])
    print(f"  Items      : {len(items)} item(s)")
    for item in items:
        name = item.get('menu_item_name') or item.get('menu_item')
        qty = item.get('quantity')
        price = item.get('subtotal') or item.get('price') or ''
        print(f"             - {name} x{qty}  Rs.{price}")
    print(f"  Total      : Rs. {o.get('total')}")
    print(f"  Status     : {o.get('status')}")
    print(f"  Payment    : {o.get('payment_method')}")
    print(f"  Created    : {o.get('created_at')}")
    print()
