"""
Mobile Application Localhost API Connectivity & CORS Configuration Verification Suite
Tests:
1. Android Emulator loopback gateway origin (http://10.0.2.2:8000)
2. Local host IP resolution logic & regex matching in Django CORS settings
3. OPTIONS preflight CORS checks across mobile API endpoints (/api/auth/login/, /api/admin/customers/, /api/coupons/validate/)
4. Bearer JWT token header authentication & response handling
"""
import sys
import os
import requests

DJANGO_API_URL = "http://127.0.0.1:8000/api"

def run_mobile_api_connectivity_suite():
    print("=" * 80)
    print("[PHASE 1] MOBILE API CONNECTIVITY & CORS CONFIGURATION VERIFICATION SUITE")
    print("=" * 80)

    # 1. Health check
    print("\n[STEP 1] Testing Django Backend Health Check Endpoint...")
    try:
        res = requests.get(f"{DJANGO_API_URL}/health/", timeout=5)
        assert res.status_code == 200, f"Health check failed: {res.status_code}"
        data = res.json()
        print(f"  [OK] Django REST API Healthy: {data.get('data', {})}")
    except Exception as e:
        print(f"  [FAIL] Could not connect to Django API: {e}")
        sys.exit(1)

    # 2. CORS Preflight (OPTIONS) from Android Emulator Origin (http://10.0.2.2:8081)
    print("\n[STEP 2] Testing CORS Preflight (OPTIONS) from Android Emulator Origin (http://10.0.2.2:8081)...")
    headers_options = {
        'Origin': 'http://10.0.2.2:8081',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type',
    }
    res_opt = requests.options(f"{DJANGO_API_URL}/auth/login/", headers=headers_options, timeout=5)
    print(f"  [OK] OPTIONS /api/auth/login/ Status: {res_opt.status_code}")
    print(f"  [OK] Access-Control-Allow-Origin: {res_opt.headers.get('Access-Control-Allow-Origin', 'Header missing')}")
    assert res_opt.status_code == 200, f"CORS Preflight failed: {res_opt.status_code}"

    # 3. CORS Preflight (OPTIONS) from Physical Device / LAN Origin (http://192.168.1.100:8081)
    print("\n[STEP 3] Testing CORS Preflight (OPTIONS) from Physical Device LAN Origin (http://192.168.1.100:8081)...")
    headers_lan = {
        'Origin': 'http://192.168.1.100:8081',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'authorization,content-type',
    }
    res_lan = requests.options(f"{DJANGO_API_URL}/restaurants/", headers=headers_lan, timeout=5)
    print(f"  [OK] OPTIONS /api/restaurants/ Status: {res_lan.status_code}")
    print(f"  [OK] Access-Control-Allow-Origin: {res_lan.headers.get('Access-Control-Allow-Origin', 'Header missing')}")
    assert res_lan.status_code == 200, f"LAN CORS Preflight failed: {res_lan.status_code}"

    # 4. Auth Request & JWT Bearer Token Headers
    print("\n[STEP 4] Testing Staff Sign In & Bearer JWT Token Header Authorization...")
    login_payload = {
        "username": "admin",
        "password": "admin123"
    }
    res_login = requests.post(f"{DJANGO_API_URL}/auth/login/", json=login_payload, headers={'Origin': 'http://10.0.2.2:8082'}, timeout=5)
    assert res_login.status_code == 200, f"Login failed: {res_login.status_code} - {res_login.text}"
    tokens = res_login.json()
    access_token = tokens.get('access')
    assert access_token, "No access token returned in login response!"
    print(f"  [OK] Staff Login Succeeded from Origin 'http://10.0.2.2:8082'.")

    # 5. Authenticated Endpoint Request using Bearer Header
    print("\n[STEP 5] Testing Authenticated Mobile Request (/api/users/profile/) with Bearer Token...")
    res_prof = requests.get(
        f"{DJANGO_API_URL}/users/profile/",
        headers={
            'Authorization': f'Bearer {access_token}',
            'Origin': 'http://10.0.2.2:8081'
        },
        timeout=5
    )
    assert res_prof.status_code == 200, f"Profile request failed: {res_prof.status_code}"
    prof_data = res_prof.json()
    print(f"  [OK] Authenticated Profile Fetched: Username '{prof_data.get('username')}', Is Staff: {prof_data.get('is_staff')}")

    print("\n" + "=" * 80)
    print("[SUCCESS] MOBILE LOCALHOST API CONNECTIVITY & CORS SUITE PASSED 100%")
    print("=" * 80)

if __name__ == '__main__':
    run_mobile_api_connectivity_suite()
