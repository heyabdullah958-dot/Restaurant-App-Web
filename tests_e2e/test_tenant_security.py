import requests
import json

base_url = "https://restaurant-app-web.onrender.com"

def login(username, password):
    url = f"{base_url}/api/auth/login/"
    try:
        res = requests.post(url, json={"username": username, "password": password})
        if res.status_code == 200:
            return res.json().get("access")
    except Exception as e:
        print(f"Error logging in: {e}")
    return None

def test_tenant_security():
    print("--- [1] MULTI-TENANT SECURITY & PRIVILEGE TESTING ---")
    
    # 1. Login
    seenbanao_token = login("manager_seenbanao", "seenbanao@2025")
    dineatblue_token = login("manager_dineatblue", "dineatblue@2025")
    
    if not seenbanao_token or not dineatblue_token:
        print("ERROR: Failed to acquire manager tokens for seenbanao or dineatblue.")
        return
        
    seenbanao_headers = {"Authorization": f"Bearer {seenbanao_token}"}
    dineatblue_headers = {"Authorization": f"Bearer {dineatblue_token}"}
    
    # 2. Fetch menu items to find cross-tenant test subjects
    print("\nListing all admin menu items to discover item IDs...")
    items_res = requests.get(f"{base_url}/api/admin/menu-items/", headers=seenbanao_headers)
    print(f"Admin menu-items list status: {items_res.status_code}")
    
    cross_item_id = None
    own_item_id = None
    
    if items_res.status_code == 200:
        items_data = items_res.json()
        results = items_data.get("results", [])
        print(f"Total admin menu items retrieved: {len(results)}")
        
        # In a secure multi-tenant system, manager_seenbanao should only see items for restaurant 70.
        # Let's count how many items for restaurant 70 vs other restaurants are returned.
        other_tenant_items = []
        own_tenant_items = []
        for item in results:
            category_url = f"{base_url}/api/admin/menu-categories/{item['category']}/"
            cat_res = requests.get(category_url, headers=seenbanao_headers)
            if cat_res.status_code == 200:
                cat_data = cat_res.json()
                rest_id = cat_data.get("restaurant")
                if rest_id == 70:
                    own_tenant_items.append(item)
                else:
                    other_tenant_items.append((item, rest_id))
            
        print(f"Items belonging to SeenBanao (own tenant 70): {len(own_tenant_items)}")
        print(f"Items belonging to other tenants seen by manager_seenbanao: {len(other_tenant_items)}")
        
        if len(other_tenant_items) > 0:
            print("VULNERABILITY: manager_seenbanao can VIEW menu items of other restaurants!")
            cross_item_id = other_tenant_items[0][0]['id']
            cross_rest_id = other_tenant_items[0][1]
            print(f"Found other tenant menu item: ID {cross_item_id} (Restaurant {cross_rest_id})")
        if len(own_tenant_items) > 0:
            own_item_id = own_tenant_items[0]['id']
            
    # If we couldn't list them, we can try to fetch them or try to edit a known menu item ID.
    # From discovery, SeenBanao is 70, DineAtBlue is 71.
    # Let's try to query DineAtBlue menu items via public API to find a DineAtBlue menu item ID.
    if not cross_item_id:
        print("\nFetching DineAtBlue (71) menu from public API to find an item ID...")
        public_res = requests.get(f"{base_url}/api/restaurants/dineatblue/menu/")
        if public_res.status_code == 200:
            categories = public_res.json().get("data", [])
            for cat in categories:
                items = cat.get("items", [])
                if items:
                    cross_item_id = items[0]["id"]
                    print(f"Found cross-tenant menu item ID {cross_item_id} from public menu.")
                    break

    if not own_item_id:
        print("\nFetching SeenBanao (70) menu from public API to find own item ID...")
        public_res = requests.get(f"{base_url}/api/restaurants/seenbanao/menu/")
        if public_res.status_code == 200:
            categories = public_res.json().get("data", [])
            for cat in categories:
                items = cat.get("items", [])
                if items:
                    own_item_id = items[0]["id"]
                    print(f"Found own-tenant menu item ID {own_item_id} from public menu.")
                    break

    # 3. Try to MODIFY cross-tenant menu item
    if cross_item_id:
        print(f"\n[TEST] manager_seenbanao attempting to UPDATE DineAtBlue menu item {cross_item_id}...")
        update_url = f"{base_url}/api/admin/menu-items/{cross_item_id}/"
        # Try to change its description
        payload = {"name": "Hacked Fried Fish", "price": "9999.00"}
        res = requests.patch(update_url, json=payload, headers=seenbanao_headers)
        print(f"PATCH status code: {res.status_code}")
        if res.status_code in [200, 201, 204]:
            print("VULNERABILITY: manager_seenbanao can MODIFY DineAtBlue menu items!")
        else:
            print("SUCCESS: Cross-tenant item modification blocked (expected).")
            
        print(f"\n[TEST] manager_seenbanao attempting to DELETE DineAtBlue menu item {cross_item_id}...")
        res = requests.delete(update_url, headers=seenbanao_headers)
        print(f"DELETE status code: {res.status_code}")
        if res.status_code in [200, 204]:
            print("VULNERABILITY: manager_seenbanao can DELETE DineAtBlue menu items!")
        else:
            print("SUCCESS: Cross-tenant item deletion blocked (expected).")

    # 4. Try to access Platform Analytics
    print("\n[TEST] manager_seenbanao attempting to view Platform Analytics...")
    res = requests.get(f"{base_url}/api/analytics/platform/", headers=seenbanao_headers)
    print(f"Platform Analytics access status: {res.status_code}")
    if res.status_code == 200:
        print("VULNERABILITY: manager_seenbanao has access to platform-wide financial analytics!")
    else:
        print("SUCCESS: Platform analytics access restricted (expected).")

    # 5. Try to access DineAtBlue (71) Analytics
    print("\n[TEST] manager_seenbanao attempting to view DineAtBlue (71) Analytics...")
    res = requests.get(f"{base_url}/api/analytics/restaurant/71/", headers=seenbanao_headers)
    print(f"DineAtBlue Analytics access status: {res.status_code}")
    if res.status_code == 200:
        print("VULNERABILITY: manager_seenbanao has access to another tenant's detailed analytics!")
    else:
        print("SUCCESS: Cross-tenant analytics access restricted (expected).")

    # 6. Guest access to admin endpoints
    print("\n[TEST] Guest user attempting to list admin menu items...")
    res = requests.get(f"{base_url}/api/admin/menu-items/")
    print(f"Guest status: {res.status_code}")
    if res.status_code in [200, 201]:
        print("VULNERABILITY: Guests can access admin menu items list!")
    else:
        print("SUCCESS: Guest access blocked (expected).")

    # 7. Customer management privilege tests
    print("\n[TEST] manager_seenbanao attempting to list customers...")
    res = requests.get(f"{base_url}/api/admin/customers/", headers=seenbanao_headers)
    print(f"Customer list status: {res.status_code}")
    if res.status_code == 200:
        print("VULNERABILITY: Restaurant manager can list all customers platform-wide!")
        customers = res.json().get("results", [])
        if customers:
            cust_id = customers[0]["id"]
            print(f"Attempting to modify customer {cust_id} loyalty points...")
            loy_url = f"{base_url}/api/admin/customers/{cust_id}/loyalty/"
            res_loy = requests.patch(loy_url, json={"loyalty_points": 8888, "reason": "hacking"}, headers=seenbanao_headers)
            print(f"Loyalty change status: {res_loy.status_code}")
            if res_loy.status_code == 200:
                print("VULNERABILITY: Restaurant manager can modify any customer's loyalty points!")
            else:
                print("SUCCESS: Customer loyalty edit blocked.")
    else:
        print("SUCCESS: Customer listing blocked.")

    # 8. Manager list and password change check
    print("\n[TEST] manager_seenbanao attempting to list managers...")
    res = requests.get(f"{base_url}/api/admin/managers/", headers=seenbanao_headers)
    print(f"Managers list status: {res.status_code}")
    if res.status_code == 200:
        print("VULNERABILITY: Restaurant manager can list all other managers!")
        managers = res.json()
        if managers:
            other_mgr = [m for m in managers if m["username"] != "manager_seenbanao"]
            if other_mgr:
                mgr_id = other_mgr[0]["id"]
                mgr_name = other_mgr[0]["username"]
                print(f"Attempting to change password for manager {mgr_name} (ID {mgr_id})...")
                pwd_url = f"{base_url}/api/admin/managers/{mgr_id}/change-password/"
                res_pwd = requests.post(pwd_url, json={"password": "hackedpassword123"}, headers=seenbanao_headers)
                print(f"Change password status: {res_pwd.status_code}")
                if res_pwd.status_code == 200:
                    print("VULNERABILITY: Restaurant manager can change passwords of other managers!")
                else:
                    print("SUCCESS: Cross-manager password change blocked.")
    else:
        print("SUCCESS: Managers listing blocked.")

if __name__ == "__main__":
    test_tenant_security()
