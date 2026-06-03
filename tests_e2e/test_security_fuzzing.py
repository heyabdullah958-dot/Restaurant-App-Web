import requests
import json
import random
import string
import os

base_url = "https://restaurant-app-web.onrender.com"

def get_random_string(length=8):
    letters = string.ascii_lowercase + string.digits
    return ''.join(random.choice(letters) for i in range(length))

def test_security_fuzzing():
    print("--- [4] DEEP SECURITY & THREAT MODELING AUDIT ---")
    
    # ==========================================
    # Part 1: Mobile Customer Flow
    # ==========================================
    print("\n[PART 1] Testing Mobile Customer Authentication & Profile Update...")
    rand = get_random_string(6)
    username = f"mob_cust_{rand}"
    email = f"{username}@foodsphere.com"
    reg_payload = {
        "username": username,
        "email": email,
        "password": "mobilepassword123",
        "phone": "+923211234567"
    }
    
    # 1. Register
    reg_res = requests.post(f"{base_url}/api/auth/register/", json=reg_payload)
    print(f"Customer Register Status: {reg_res.status_code}")
    if reg_res.status_code == 201:
        token = reg_res.json().get("data", {}).get("tokens", {}).get("access")
        refresh = reg_res.json().get("data", {}).get("tokens", {}).get("refresh")
        cust_headers = {"Authorization": f"Bearer {token}"}
        
        # 2. Update Profile
        print("Updating customer profile...")
        up_res = requests.put(
            f"{base_url}/api/users/profile/", 
            json={"email": f"updated_{email}"}, 
            headers=cust_headers
        )
        print(f"Profile Update Status: {up_res.status_code}")
        if up_res.status_code == 200:
            print("SUCCESS: Profile updated successfully.")
            
        # 3. Log out (blacklist refresh token)
        print("Logging out (blacklisting refresh token)...")
        logout_res = requests.post(f"{base_url}/api/auth/logout/", json={"refresh": refresh})
        print(f"Logout Status: {logout_res.status_code}")
        if logout_res.status_code == 200:
            print("SUCCESS: Logged out and refresh token blacklisted.")
    else:
        print("FAILED to register mobile customer.")

    # ==========================================
    # Part 2: Cross-Restaurant Cart Check
    # ==========================================
    print("\n[PART 2] Testing Cross-Restaurant Cart Validation...")
    # Fetch menu items for SeenBanao (70) and DineAtBlue (71)
    seenbanao_item_id = None
    dineatblue_item_id = None
    
    r_seen = requests.get(f"{base_url}/api/restaurants/seenbanao/menu/")
    if r_seen.status_code == 200:
        cats = r_seen.json().get("data", [])
        if cats and cats[0].get("items"):
            seenbanao_item_id = cats[0]["items"][0]["id"]
            
    r_blue = requests.get(f"{base_url}/api/restaurants/dineatblue/menu/")
    if r_blue.status_code == 200:
        cats = r_blue.json().get("data", [])
        if cats and cats[0].get("items"):
            dineatblue_item_id = cats[0]["items"][0]["id"]
            
    if seenbanao_item_id and dineatblue_item_id:
        # Register a new customer
        rand2 = get_random_string(6)
        payload_reg = {
            "username": f"cart_cust_{rand2}",
            "email": f"cart_cust_{rand2}@foodsphere.com",
            "password": "customerpassword123",
            "phone": "+923221234567"
        }
        res = requests.post(f"{base_url}/api/auth/register/", json=payload_reg)
        token2 = res.json().get("data", {}).get("tokens", {}).get("access")
        cust_headers2 = {"Authorization": f"Bearer {token2}"}
        
        # Place order for SeenBanao but include DineAtBlue item
        print(f"Attempting to order DineAtBlue item {dineatblue_item_id} from SeenBanao (70)...")
        cross_payload = {
            "restaurant": 70,
            "delivery_address": "Islamabad",
            "payment_method": "cod",
            "items": [
                {
                    "menu_item": dineatblue_item_id,
                    "quantity": 1,
                    "special_notes": "Cross-restaurant test"
                }
            ]
        }
        res_cross = requests.post(f"{base_url}/api/orders/", json=cross_payload, headers=cust_headers2)
        print(f"Cross-restaurant Order Status Code: {res_cross.status_code} (Expected: 400)")
        if res_cross.status_code == 400:
            print("SUCCESS: Cross-restaurant order rejected by validation (expected).")
        else:
            print(f"VULNERABILITY: Mismatched restaurant item order was accepted! Response: {res_cross.text}")
    else:
        print("Skipping Cross-Restaurant Cart Check: Item IDs missing.")

    # ==========================================
    # Part 3: Tenant Isolation (Re-Verification)
    # ==========================================
    print("\n[PART 3] Re-verifying Tenant Isolation Bugs...")
    url_login = f"{base_url}/api/auth/login/"
    res = requests.post(url_login, json={"username": "manager_seenbanao", "password": "seenbanao@2025"})
    if res.status_code == 200:
        seenbanao_token = res.json().get("access")
        seen_headers = {"Authorization": f"Bearer {seenbanao_token}"}
        
        # Attempt to modify DineAtBlue restaurant name/settings (ID 71)
        print("manager_seenbanao attempting to PATCH DineAtBlue (71)...")
        patch_res = requests.patch(
            f"{base_url}/api/admin/restaurants/71/", 
            json={"name": "Hacked Blue Seafood"}, 
            headers=seen_headers
        )
        print(f"PATCH status code: {patch_res.status_code}")
        if patch_res.status_code == 200:
            print("VULNERABILITY CONFIRMED: manager_seenbanao can modify another tenant's restaurant settings!")
            # Revert the change just in case
            requests.patch(f"{base_url}/api/admin/restaurants/71/", json={"name": "DineAtBlue"}, headers=seen_headers)
        else:
            print("SUCCESS: Tenant isolation verified.")
    else:
        print("Failed to login as manager_seenbanao.")

    # ==========================================
    # Part 4: Fuzzing & Payload Injection
    # ==========================================
    print("\n[PART 4] Fuzzing and Input Payload Injection...")
    
    # 4a. XSS Payload Injection
    print("Injecting XSS script into guest_name...")
    xss_payload = {
        "restaurant": 70,
        "guest_name": "<script>alert('XSS_ATTACK')</script>",
        "guest_phone": "+923000000000",
        "delivery_address": "Test G-11 Islamabad",
        "payment_method": "cod",
        "items": [
            {
                "menu_item": seenbanao_item_id if seenbanao_item_id else 1,
                "quantity": 3,
                "special_notes": "XSS test"
            }
        ]
    }
    xss_res = requests.post(f"{base_url}/api/orders/", json=xss_payload)
    print(f"XSS Order placement status: {xss_res.status_code}")
    if xss_res.status_code == 201:
        # Check if guest_name is returned without stripping
        g_name = xss_res.json().get("data", {}).get("guest_name")
        print(f"Order created with guest_name: {g_name}")
        if "<script>" in g_name:
            print("VULNERABILITY: Raw XSS payload stored and reflected in order metadata!")
        else:
            print("SUCCESS: XSS script stripped or sanitized.")
    else:
        print(f"XSS payload rejected: {xss_res.text}")
        
    # 4b. Invalid media format upload
    print("\nUploading text file renamed as PNG for restaurant cover...")
    os.makedirs("tests_e2e/assets", exist_ok=True)
    with open("tests_e2e/assets/fake_image.png", "w") as f:
        f.write("This is a plain text file, not a valid PNG image!")
        
    # We use Super Admin login for this check
    res_admin = requests.post(url_login, json={"username": "admin", "password": "admin123"})
    if res_admin.status_code == 200:
        admin_token = res_admin.json().get("access")
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        payload_fake = {
            "name": "Fuzzed Fake Cover Restaurant",
            "slug": "fake-cover-slug",
            "cuisine_type": "Fuzzing",
            "address": "Islamabad",
            "city": "Islamabad",
            "phone": "+923000000000",
            "is_active": "true"
        }
        files = {
            "cover_image": ("fake_image.png", open("tests_e2e/assets/fake_image.png", "rb"), "image/png")
        }
        
        fake_res = requests.post(f"{base_url}/api/admin/restaurants/", data=payload_fake, files=files, headers=admin_headers)
        print(f"Invalid image upload status code: {fake_res.status_code} (Expected: 400)")
        
        files["cover_image"][1].close()
        
        if fake_res.status_code == 500:
            print("CRITICAL BUG: Uploading invalid image structure caused a 500 Internal Server Error!")
        elif fake_res.status_code == 400:
            print("SUCCESS: Invalid image format caught and rejected by DRF validation.")
    else:
        print("Failed to login as admin for fake image upload check.")

if __name__ == "__main__":
    test_security_fuzzing()
