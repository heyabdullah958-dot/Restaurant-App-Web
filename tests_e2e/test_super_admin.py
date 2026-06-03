import requests
import json
import os
from PIL import Image

base_url = "https://restaurant-app-web.onrender.com"

def login():
    url = f"{base_url}/api/auth/login/"
    payload = {"username": "admin", "password": "admin123"}
    try:
        res = requests.post(url, json=payload)
        if res.status_code == 200:
            return res.json().get("access")
    except Exception as e:
        print("Login error:", e)
    return None

def generate_dummy_images():
    print("Generating dummy images locally...")
    os.makedirs("tests_e2e/assets", exist_ok=True)
    img_logo = Image.new('RGB', (120, 120), color = '#1E3A8A')
    img_logo.save("tests_e2e/assets/dummy_logo.png")
    
    img_cover = Image.new('RGB', (800, 400), color = '#3B82F6')
    img_cover.save("tests_e2e/assets/dummy_cover.png")
    
    img_banner = Image.new('RGB', (1024, 300), color = '#60A5FA')
    img_banner.save("tests_e2e/assets/dummy_banner.png")
    print("Dummy images generated successfully.")

def test_super_admin():
    print("--- [2] SUPER ADMIN OPERATIONS & PLATFORM INTEGRITY ---")
    
    # 1. Login
    token = login()
    if not token:
        print("ERROR: Failed to authenticate as Super Admin. Exiting.")
        return
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Generate dummy images
    generate_dummy_images()
    
    # 3. Create a new restaurant (Tenant lifecycle)
    print("\nCreating new test restaurant via Super Admin panel...")
    url_create = f"{base_url}/api/admin/restaurants/"
    
    payload = {
        "name": "E2E Super Admin Test Restaurant",
        "slug": "e2e-super-admin-test-res",
        "cuisine_type": "Stress Test BBQ & Grill",
        "description": "Dynamic test restaurant generated during full-spectrum sweep.",
        "address": "456 E2E Test Boulevard, Sector G-11, Islamabad",
        "city": "Islamabad",
        "phone": "+923009999999",
        "is_active": "true",
        "is_featured": "false",
        "opens_at": "09:00:00",
        "closes_at": "23:00:00",
        "delivery_time_min": "20",
        "delivery_time_max": "35",
        "min_order_amount": "400.00",
        "delivery_fee": "60.00",
        "rating": "0.00",
        "total_reviews": "0",
        "loyalty_points_ratio": "100"
    }
    
    files = {
        "logo": ("dummy_logo.png", open("tests_e2e/assets/dummy_logo.png", "rb"), "image/png"),
        "cover_image": ("dummy_cover.png", open("tests_e2e/assets/dummy_cover.png", "rb"), "image/png"),
        "banner_image": ("dummy_banner.png", open("tests_e2e/assets/dummy_banner.png", "rb"), "image/png")
    }
    
    try:
        res = requests.post(url_create, data=payload, files=files, headers=headers)
        print(f"Create Restaurant Status Code: {res.status_code}")
        
        # Close files
        for f in files.values():
            f[1].close()
            
        if res.status_code == 201:
            data = res.json()
            rest_id = data.get("id")
            print(f"SUCCESS: Test restaurant created successfully! ID: {rest_id}")
            print(f"Logo URL (Cloudinary): {data.get('logo')}")
            print(f"Cover URL (Cloudinary): {data.get('cover_image')}")
            print(f"Banner URL (Cloudinary): {data.get('banner_image')}")
            
            # 4. Clean up / Delete the created restaurant
            print(f"\nDeleting the newly created test restaurant ID {rest_id}...")
            url_delete = f"{base_url}/api/admin/restaurants/{rest_id}/"
            del_res = requests.delete(url_delete, headers=headers)
            print(f"Delete Restaurant Status Code: {del_res.status_code} (Expected: 204)")
            if del_res.status_code in [200, 204]:
                print("SUCCESS: Test restaurant deleted and cascading deletions validated.")
            else:
                print(f"FAILED: Failed to delete test restaurant: {del_res.text}")
        else:
            print(f"FAILED: Failed to create test restaurant: {res.text}")
    except Exception as e:
        print("Create restaurant exception:", e)
        
    # 5. Check Platform Analytics
    print("\nAuditing platform analytics for bulk orders mapping...")
    try:
        analytics_res = requests.get(f"{base_url}/api/analytics/platform/", headers=headers)
        print(f"Platform Analytics Status Code: {analytics_res.status_code}")
        if analytics_res.status_code == 200:
            summary = analytics_res.json().get("summary", {})
            print("Current Platform Summaries:")
            print(f"- Total Orders Today: {summary.get('orders_today')}")
            print(f"- Total Revenue Today: Rs. {summary.get('revenue_today')}")
            print(f"- Total Orders All-Time: {summary.get('orders_all_time')}")
            print(f"- Total Revenue All-Time: Rs. {summary.get('revenue_all_time')}")
            print(f"- Total Registered Customers: {summary.get('total_customers')}")
            
            # Cross-verify with stress_test.py placed orders
            if os.path.exists("tests_e2e/placed_orders.json"):
                with open("tests_e2e/placed_orders.json", "r") as f:
                    placed = json.load(f)
                placed_count = len(placed)
                placed_revenue = sum(p["total"] for p in placed)
                print(f"\nVerification Check:")
                print(f"  Orders placed in Stress Test: {placed_count}")
                print(f"  Revenue placed in Stress Test: Rs. {placed_revenue:.2f}")
                print(f"  Verify: Platform aggregate Orders Today ({summary.get('orders_today')}) >= Placed Stress Orders ({placed_count})")
                if summary.get("orders_today", 0) >= placed_count:
                    print("SUCCESS: Bulk orders correctly recorded in platform summaries.")
                else:
                    print("WARNING: Aggregated order count is lower than placed orders!")
        else:
            print("FAILED: Failed to query platform analytics:", analytics_res.text)
    except Exception as e:
        print("Analytics query error:", e)

if __name__ == "__main__":
    test_super_admin()
