import urllib.request
import json
import sys

HEROKU_BASE_URL = 'https://getfoodpk-fd9b20442fcf.herokuapp.com/api'

def run_heroku_verification_suite():
    print("=" * 65)
    print(" RUNNING LIVE HEROKU BACKEND E2E SUITE")
    print(f" Target URL: {HEROKU_BASE_URL}")
    print("=" * 65)

    passed_tests = 0
    total_tests = 0

    def assert_test(name, condition, details=""):
        nonlocal passed_tests, total_tests
        total_tests += 1
        if condition:
            passed_tests += 1
            print(f" [PASS] [OK] {name} {details}")
        else:
            print(f" [FAIL] [ERR] {name} {details}")

    # TEST 1: Health Check Endpoint
    try:
        req = urllib.request.Request(f"{HEROKU_BASE_URL}/health/", headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            assert_test("Health Check Endpoint", resp.status == 200, f"(Status: {resp.status})")
    except Exception as e:
        assert_test("Health Check Endpoint", False, f"Error: {e}")

    # TEST 2: Admin Login & JWT Generation
    token = None
    try:
        login_url = f"{HEROKU_BASE_URL}/auth/login/"
        payload = json.dumps({"username": "admin", "password": "admin123"}).encode()
        req = urllib.request.Request(login_url, data=payload, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            token = data.get('access')
            assert_test("Admin Login JWT Auth", token is not None, f"(Access token received)")
    except Exception as e:
        assert_test("Admin Login JWT Auth", False, f"Error: {e}")

    # TEST 3: Fetch Restaurants List (Public)
    try:
        req = urllib.request.Request(f"{HEROKU_BASE_URL}/restaurants/", headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            restaurants = data.get('results', data) if isinstance(data, dict) else data
            assert_test("Fetch Restaurants List", len(restaurants) >= 7, f"(Found {len(restaurants)} restaurants)")
    except Exception as e:
        assert_test("Fetch Restaurants List", False, f"Error: {e}")

    # TEST 4: Verify Primary Keys (Heroku Standard 1..7)
    try:
        req = urllib.request.Request(f"{HEROKU_BASE_URL}/restaurants/", headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            restaurants = data.get('results', data) if isinstance(data, dict) else data
            ids = set(r.get('id') for r in restaurants)
            has_heroku_pks = {1, 2, 3, 4, 5, 6, 7}.issubset(ids)
            assert_test("Heroku Primary Keys Match (1..7)", has_heroku_pks, f"(Found IDs: {sorted(list(ids))})")
    except Exception as e:
        assert_test("Heroku Primary Keys Match (1..7)", False, f"Error: {e}")

    # TEST 5: Restaurant Detail Endpoint (by Slug)
    try:
        req = urllib.request.Request(f"{HEROKU_BASE_URL}/restaurants/jushhpk/", headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            name = data.get('name')
            assert_test("Restaurant Detail (JushhPK by Slug)", name == "JushhPK", f"(Name: '{name}')")
    except Exception as e:
        assert_test("Restaurant Detail (JushhPK by Slug)", False, f"Error: {e}")

    # TEST 6: Fetch Branches List
    try:
        req = urllib.request.Request(f"{HEROKU_BASE_URL}/branches/", headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            branches = data.get('results', data) if isinstance(data, dict) else data
            assert_test("Fetch Branches List", len(branches) > 0, f"(Found {len(branches)} active branches)")
    except Exception as e:
        assert_test("Fetch Branches List", False, f"Error: {e}")

    # TEST 7: Order Placement on Heroku (JushhPK - ID 3)
    new_order_id = None
    try:
        order_url = f"{HEROKU_BASE_URL}/orders/"
        order_payload = {
            "restaurant": 3,
            "payment_method": "cod",
            "guest_name": "Heroku Verification Suite",
            "guest_phone": "03001234567",
            "delivery_address": "Automated Suite Address, Johar Town, Lahore",
            "special_instructions": "E2E Verification",
            "items": [
                {
                    "menu_item": 37,
                    "quantity": 1
                }
            ]
        }
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0'
        }
        if token:
            headers['Authorization'] = f'Bearer {token}'

        req = urllib.request.Request(order_url, data=json.dumps(order_payload).encode(), headers=headers, method='POST')
        with urllib.request.urlopen(req, timeout=15) as resp:
            resp_data = json.loads(resp.read().decode())
            new_order_id = resp_data.get('data', {}).get('id') or resp_data.get('id')
            assert_test("Order Placement on Heroku", new_order_id is not None, f"(Order #{new_order_id} created)")
    except urllib.error.HTTPError as e:
        body = e.read().decode()
        assert_test("Order Placement on Heroku", False, f"HTTPError {e.code}: {body}")
    except Exception as e:
        assert_test("Order Placement on Heroku", False, f"Error: {e}")

    # TEST 8: Authenticated Order Detail Retrieval
    if token and new_order_id:
        try:
            req = urllib.request.Request(
                f"{HEROKU_BASE_URL}/orders/{new_order_id}/",
                headers={'Authorization': f'Bearer {token}', 'User-Agent': 'Mozilla/5.0'}
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode())
                retrieved_id = data.get('id')
                assert_test("Fetch Order Detail via Admin Token", retrieved_id == new_order_id, f"(Retrieved Order #{retrieved_id})")
        except Exception as e:
            assert_test("Fetch Order Detail via Admin Token", False, f"Error: {e}")

    print("=" * 65)
    print(f" SUITE SUMMARY: {passed_tests}/{total_tests} TESTS PASSED")
    print("=" * 65)

    if passed_tests == total_tests:
        print(" SUCCESS: HEROKU BACKEND IS 100% OPERATIONAL & VERIFIED!")
        sys.exit(0)
    else:
        print(" WARNING: SOME TESTS FAILED.")
        sys.exit(1)

if __name__ == '__main__':
    run_heroku_verification_suite()
