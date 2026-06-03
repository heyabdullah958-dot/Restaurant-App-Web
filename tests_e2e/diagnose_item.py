import requests
import json

base_url = "https://restaurant-app-web.onrender.com"

def diagnose():
    # Login as manager_seenbanao
    url_login = f"{base_url}/api/auth/login/"
    res = requests.post(url_login, json={"username": "manager_seenbanao", "password": "seenbanao@2025"})
    token = res.json().get("access")
    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Fetch item 1311
    item_res = requests.get(f"{base_url}/api/admin/menu-items/1311/", headers=headers)
    print("Item 1311 status:", item_res.status_code)
    if item_res.status_code == 200:
        item = item_res.json()
        print("Item 1311 data:", json.dumps(item, indent=2))
        
        # 2. Fetch category
        cat_id = item.get("category")
        cat_res = requests.get(f"{base_url}/api/admin/menu-categories/{cat_id}/", headers=headers)
        print(f"Category {cat_id} status:", cat_res.status_code)
        if cat_res.status_code == 200:
            cat = cat_res.json()
            print(f"Category {cat_id} data:", json.dumps(cat, indent=2))
            
            # 3. Fetch restaurant
            rest_id = cat.get("restaurant")
            rest_res = requests.get(f"{base_url}/api/restaurants/", headers=headers)
            if rest_res.status_code == 200:
                results = rest_res.json().get("results", [])
                matching = [r for r in results if r["id"] == rest_id]
                if matching:
                    print("Restaurant of category:", matching[0]["name"], f"(ID: {rest_id})")
                else:
                    print(f"Restaurant ID {rest_id} not found in active list.")
            
if __name__ == "__main__":
    diagnose()
