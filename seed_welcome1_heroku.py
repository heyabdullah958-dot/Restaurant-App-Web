import urllib.request
import json

BASE_URL = "https://getfoodpk-fd9b20442fcf.herokuapp.com"

def seed_welcome1_on_heroku():
    print(f"Connecting to Heroku API at {BASE_URL}...")
    
    # 1. Obtain Admin JWT Token
    login_url = f"{BASE_URL}/api/auth/login/"
    login_data = json.dumps({"username": "admin", "password": "admin123"}).encode('utf-8')
    req_login = urllib.request.Request(login_url, data=login_data, headers={"Content-Type": "application/json"})
    
    try:
        res = urllib.request.urlopen(req_login)
        resp_data = json.loads(res.read().decode('utf-8'))
        access_token = resp_data.get('access') or resp_data.get('token')
        print("  [OK] Admin Auth Token Obtained.")
    except Exception as e:
        print(f"  [ERROR] Admin Login Failed: {e}")
        return

    # 2. Get GetAFomo Restaurant ID from Heroku
    rests_url = f"{BASE_URL}/api/restaurants/"
    req_rests = urllib.request.Request(rests_url)
    res_rests = urllib.request.urlopen(req_rests)
    rests = json.loads(res_rests.read().decode('utf-8'))
    
    fomo_id = None
    for r in rests:
        if r.get('slug', '').lower() == 'getafomo' or 'fomo' in r.get('name', '').lower():
            fomo_id = r['id']
            break
            
    assert fomo_id is not None, "GetAFomo restaurant not found on Heroku!"
    print(f"  [OK] GetAFomo Restaurant ID on Heroku = #{fomo_id}")

    # 3. Create or Update WELCOME1 Coupon via API
    coupon_payload = {
        "code": "WELCOME1",
        "discount_type": "percentage",
        "discount_value": "15.00",
        "min_subtotal": "0.00",
        "max_discount": "500.00",
        "restaurant": fomo_id,
        "is_active": True,
        "usage_limit": 1000,
        "per_user_limit": 5,
        "valid_to": None
    }
    
    coupons_url = f"{BASE_URL}/api/coupons/"
    req_create = urllib.request.Request(
        coupons_url,
        data=json.dumps(coupon_payload).encode('utf-8'),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {access_token}"
        }
    )
    
    try:
        res_c = urllib.request.urlopen(req_create)
        c_data = json.loads(res_c.read().decode('utf-8'))
        print(f"  [SUCCESS] 'WELCOME1' Coupon Seeded on Heroku DB! ID #{c_data.get('id')}")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        print(f"  [INFO] HTTP {e.code}: {err_body}")

if __name__ == "__main__":
    seed_welcome1_on_heroku()
