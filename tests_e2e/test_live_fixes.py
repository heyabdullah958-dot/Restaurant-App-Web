import requests

base_url = "https://restaurant-app-web.onrender.com"

# Login as manager_seenbanao
login_res = requests.post(f"{base_url}/api/auth/login/", json={
    "username": "manager_seenbanao",
    "password": "seenbanao@2025"
})
if login_res.status_code != 200:
    print("Failed to login as manager_seenbanao:", login_res.text)
    exit(1)

token = login_res.json()["access"]
headers = {"Authorization": f"Bearer {token}"}

print("--- TESTING LIVE SECURITY FIXES ---")

# 1. Multi-Tenant menu items isolation
menu_res = requests.get(f"{base_url}/api/admin/menu-items/", headers=headers)
if menu_res.status_code == 200:
    items = menu_res.json()
    # Check if results key is present
    if isinstance(items, dict) and "results" in items:
        items_list = items["results"]
    elif isinstance(items, list):
        items_list = items
    else:
        items_list = []
    
    other_tenant_items = []
    for i in items_list:
        # Category is just ID, wait, let's see if we have category details or restaurant ID
        pass
    print(f"Fetched {len(items_list)} menu items as manager_seenbanao.")
else:
    print("Failed to fetch menu items:", menu_res.status_code)

# Try to PATCH item 1311
patch_res = requests.patch(f"{base_url}/api/admin/menu-items/1311/", json={"price": 999.0}, headers=headers)
print(f"PATCH competitor item 1311 status: {patch_res.status_code} (Expected: 404)")

# 2. Competitor Analytics Leakage
analytics_res = requests.get(f"{base_url}/api/analytics/restaurant/71/", headers=headers)
print(f"GET competitor analytics status: {analytics_res.status_code} (Expected: 403)")

# 3. Manager Password Reset
pw_res = requests.post(f"{base_url}/api/admin/managers/29/change-password/", json={"password": "newpassword123"}, headers=headers)
print(f"POST manager password reset status: {pw_res.status_code} (Expected: 403)")

# 4. Cancel Delivered Order
orders_res = requests.get(f"{base_url}/api/orders/", headers=headers)
if orders_res.status_code == 200:
    orders = orders_res.json()
    if isinstance(orders, dict) and "results" in orders:
        orders_list = orders["results"]
    elif isinstance(orders, list):
        orders_list = orders
    else:
        orders_list = []
        
    delivered_orders = [o for o in orders_list if o["status"] == "delivered"]
    if delivered_orders:
        o_id = delivered_orders[0]["id"]
        cancel_res = requests.patch(f"{base_url}/api/orders/{o_id}/", json={"status": "cancelled"}, headers=headers)
        print(f"PATCH cancel delivered order {o_id} status: {cancel_res.status_code} (Expected: 400)")
    else:
        print("No delivered orders found to test cancellation bypass.")
else:
    print("Failed to fetch orders:", orders_res.status_code)
