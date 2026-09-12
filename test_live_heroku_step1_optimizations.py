import time
import requests

HEROKU_BASE_URL = 'https://getfoodpk-fd9b20442fcf.herokuapp.com/api'

def run_live_step1_verification():
    print('=' * 80)
    print('LIVE HEROKU STEP 1 ZERO-COST CODE OPTIMIZATIONS VERIFICATION')
    print(f'Target Endpoint: {HEROKU_BASE_URL}')
    print('=' * 80)

    passed = 0
    total = 0

    def check(condition, desc):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f'  [PASS] {desc}')
        else:
            print(f'  [FAIL] {desc}')
            raise AssertionError(f'Live Step 1 Verification Failure: {desc}')

    test_username = f'step1_live_{int(time.time())}'
    test_password = 'Password123!'
    test_email = f'{test_username}@example.com'
    test_phone = '+923001234567'

    # Step 1: Register customer on live Heroku backend
    print(f'\n[STEP 1] Registering live customer ({test_username})...')
    reg_resp = requests.post(
        f'{HEROKU_BASE_URL}/auth/register/',
        json={
            'username': test_username,
            'password': test_password,
            'email': test_email,
            'phone': test_phone,
            'first_name': 'Step1',
            'last_name': 'Tester'
        },
        timeout=15
    )
    check(reg_resp.status_code in [200, 201], f'Live registration returned HTTP {reg_resp.status_code}')

    # Step 2: Login and extract access token
    print('\n[STEP 2] Authenticating on live Heroku backend...')
    login_resp = requests.post(
        f'{HEROKU_BASE_URL}/auth/login/',
        json={'username': test_username, 'password': test_password},
        timeout=15
    )
    check(login_resp.status_code == 200, f'Live login returned HTTP {login_resp.status_code}')
    login_data = login_resp.json()
    access_token = login_data.get('access') or login_data.get('tokens', {}).get('access') or login_data.get('token')
    check(bool(access_token), 'Access token received')

    headers = {'Authorization': f'Bearer {access_token}'}

    # Step 3: Discover live restaurant, branch, and menu item
    print('\n[STEP 3] Discovering live restaurant, branch, and menu item...')
    rests_resp = requests.get(f'{HEROKU_BASE_URL}/restaurants/', timeout=15)
    check(rests_resp.status_code == 200, f'Restaurants endpoint returned HTTP {rests_resp.status_code}')
    rests_data = rests_resp.json()
    restaurants = rests_data.get('results', rests_data) if isinstance(rests_data, dict) else rests_data

    target_rest = None
    target_branch = None
    for r in restaurants:
        if r.get('branches') and len(r['branches']) > 0:
            target_rest = r
            target_branch = r['branches'][0]
            break

    check(target_rest is not None, f"Found target restaurant: {target_rest.get('name') if target_rest else 'None'}")
    check(target_branch is not None, f"Found target branch: {target_branch.get('name') if target_branch else 'None'}")

    menu_resp = requests.get(f"{HEROKU_BASE_URL}/restaurants/{target_rest['slug']}/menu/", timeout=15)
    check(menu_resp.status_code == 200, f'Menu endpoint returned HTTP {menu_resp.status_code}')
    menu_data = menu_resp.json()
    categories = menu_data.get('data', menu_data) if isinstance(menu_data, dict) else menu_data
    target_item = None
    for cat in categories:
        items = cat.get('items', [])
        if items:
            target_item = items[0]
            break

    check(target_item is not None, f"Found target menu item: {target_item.get('name') if target_item else 'None'}")

    # Step 4: Place live order & benchmark latency (non-blocking background emails/FCM)
    print('\n[STEP 4] Placing live order with async notification offload...')
    order_payload = {
        'restaurant': target_rest['id'],
        'branch': target_branch['id'],
        'guest_name': 'Step1 Live Tester',
        'guest_phone': '03001234567',
        'order_type': 'DELIVERY',
        'delivery_address': 'Sector B, Phase 5, DHA, Lahore',
        'payment_method': 'cod',
        'items': [
            {
                'menu_item': target_item['id'],
                'quantity': 2
            }
        ]
    }

    t0 = time.time()
    order_resp = requests.post(f'{HEROKU_BASE_URL}/orders/', json=order_payload, headers=headers, timeout=15)
    elapsed_ms = (time.time() - t0) * 1000
    print(f'  -> Order creation latency: {elapsed_ms:.1f}ms')
    if order_resp.status_code != 201:
        print(f'  -> Error response: {order_resp.text}')

    check(order_resp.status_code == 201, f'Order created with HTTP {order_resp.status_code}')
    order_res_json = order_resp.json()
    created_order = order_res_json.get('data', order_res_json)
    display_id = created_order.get('display_order_id')
    tracking_token = created_order.get('tracking_token')

    print(f"  -> Generated display_order_id: {display_id}")
    print(f"  -> Generated tracking_token: {tracking_token}")
    check(bool(display_id and '-' in display_id), f'display_order_id formatted correctly: {display_id}')
    check(bool(tracking_token), f'tracking_token present: {tracking_token}')

    # Step 5: Anonymous Rapid Tracking Poll & Rate-Limit Immunity Test
    print('\n[STEP 5] Testing anonymous live tracking with rapid polling (throttle immunity)...')
    # Perform 12 consecutive rapid live tracking calls to ensure no HTTP 429 occurs
    track_success = 0
    for i in range(12):
        track_resp = requests.get(f'{HEROKU_BASE_URL}/orders/{display_id}/track/', timeout=10)
        if track_resp.status_code == 200:
            track_success += 1
        elif track_resp.status_code == 429:
            raise AssertionError(f'Live tracking was throttled with HTTP 429 on iteration {i+1}!')
        else:
            raise AssertionError(f'Live tracking unexpected status {track_resp.status_code} on iteration {i+1}')

    check(track_success == 12, f'All 12 consecutive live tracking requests succeeded with HTTP 200 OK (0 rate limit hits)')

    # Step 6: Verify tracking data payload
    track_data = track_resp.json().get('data', track_resp.json())
    check(track_data.get('display_order_id') == display_id, f'Live track display_order_id matches: {track_data.get("display_order_id")}')
    check('status' in track_data, f'Live track status returned: {track_data.get("status")}')

    print('\n' + '=' * 80)
    print(f'LIVE HEROKU STEP 1 VERIFICATION COMPLETED: {passed}/{total} PASSED (100%)')
    print('=' * 80)
    return True

if __name__ == '__main__':
    run_live_step1_verification()
