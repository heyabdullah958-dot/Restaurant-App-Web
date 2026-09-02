import requests
import json
import time

HEROKU_BASE_URL = 'https://getfoodpk-fd9b20442fcf.herokuapp.com/api'

def run_live_auth_journey_suite():
    print('=' * 80)
    print('LIVE HEROKU AUTHENTICATED CUSTOMER JOURNEY TEST')
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
            raise AssertionError(f'Live Auth Journey Failure: {desc}')

    test_username = f'live_user_{int(time.time())}'
    test_password = 'Password123!'
    test_email = f'{test_username}@example.com'
    test_phone = '+923001112233'

    # Step 1: Live User Registration
    print(f'\n[STEP 1] Registering fresh live customer ({test_username})...')
    reg_resp = requests.post(
        f'{HEROKU_BASE_URL}/auth/register/',
        json={
            'username': test_username,
            'password': test_password,
            'email': test_email,
            'phone': test_phone,
            'first_name': 'Live',
            'last_name': 'Tester'
        },
        timeout=15
    )
    check(reg_resp.status_code in [200, 201], f'Live registration returned HTTP {reg_resp.status_code}')
    
    # Step 2: Live User Login & JWT Extraction
    print('\n[STEP 2] Authenticating on live Heroku backend...')
    login_resp = requests.post(
        f'{HEROKU_BASE_URL}/auth/login/',
        json={'username': test_username, 'password': test_password},
        timeout=15
    )
    check(login_resp.status_code == 200, f'Live login returned HTTP {login_resp.status_code}')
    
    login_data = login_resp.json()
    access_token = login_data.get('access') or login_data.get('tokens', {}).get('access') or login_data.get('token')
    refresh_token = login_data.get('refresh') or login_data.get('tokens', {}).get('refresh')
    
    check(access_token is not None and len(access_token) > 20, 'Received valid SimpleJWT Access Token')
    check(refresh_token is not None and len(refresh_token) > 20, 'Received valid SimpleJWT Refresh Token')

    headers = {'Authorization': f'Bearer {access_token}'}

    # Step 3: Fetch Authenticated User Profile
    print('\n[STEP 3] Fetching live profile with Bearer token...')
    profile_resp = requests.get(f'{HEROKU_BASE_URL}/users/profile/', headers=headers, timeout=15)
    check(profile_resp.status_code == 200, f'Profile endpoint returned HTTP {profile_resp.status_code}')
    profile_json = profile_resp.json()
    user_info = profile_json.get('data', profile_json)
    check(user_info.get('username') == test_username, f'Profile username matches: {user_info.get("username")}')
    check('loyalty_points' in user_info, f'Loyalty points ledger returned: {user_info.get("loyalty_points")}')

    # Step 4: Verify Empty Order History Isolation
    print('\n[STEP 4] Verifying Order History Queryset Isolation on Live Backend...')
    my_orders_resp = requests.get(f'{HEROKU_BASE_URL}/orders/my-orders/', headers=headers, timeout=15)
    check(my_orders_resp.status_code == 200, f'My Orders endpoint returned HTTP {my_orders_resp.status_code}')
    orders_data = my_orders_resp.json()
    orders_list = orders_data.get('results', orders_data) if isinstance(orders_data, dict) else orders_data
    if isinstance(orders_list, dict) and 'orders' in orders_list:
        orders_list = orders_list['orders']
    check(len(orders_list) == 0, f'Newly registered account has 0 historical orders (Strictly isolated)')

    # Step 5: Live JWT Token Refresh Flow
    print('\n[STEP 5] Testing SimpleJWT Token Refresh Endpoint...')
    refresh_resp = requests.post(
        f'{HEROKU_BASE_URL}/auth/refresh/',
        json={'refresh': refresh_token},
        timeout=15
    )
    check(refresh_resp.status_code == 200, f'Token refresh returned HTTP {refresh_resp.status_code}')
    new_access_token = refresh_resp.json().get('access')
    check(new_access_token is not None and len(new_access_token) > 20, 'Rotated new access token successfully received')

    # Step 6: Verify New Access Token Authenticates Successfully
    print('\n[STEP 6] Verifying Rotated Token against Profile Endpoint...')
    new_headers = {'Authorization': f'Bearer {new_access_token}'}
    new_profile_resp = requests.get(f'{HEROKU_BASE_URL}/users/profile/', headers=new_headers, timeout=15)
    check(new_profile_resp.status_code == 200, f'Rotated token authenticated successfully (HTTP {new_profile_resp.status_code})')

    print('\n' + '=' * 80)
    print(f'LIVE HEROKU AUTHENTICATED JOURNEY COMPLETED: {passed}/{total} PASSED (100%)')
    print('=' * 80)
    return True

if __name__ == '__main__':
    run_live_auth_journey_suite()
