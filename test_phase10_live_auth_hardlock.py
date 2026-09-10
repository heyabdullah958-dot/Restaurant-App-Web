import requests
import time

HEROKU_BASE_URL = 'https://getfoodpk-fd9b20442fcf.herokuapp.com/api'

def run_phase10_verification():
    print('=' * 75)
    print('PHASE 10: LIVE HEROKU V86 AUTHENTICATION & PRODUCTION HARD-LOCK SUITE')
    print('Target Endpoint:', HEROKU_BASE_URL)
    print('=' * 75)

    ts = int(time.time())
    username = f'clienttest{ts}'
    email = f'ClientTest_{ts}@Example.COM'
    phone = f'0300{ts % 10000000:07d}'
    password = 'TestPassword123!'

    # 1. Registration with whitespace & mixed-case email
    print(f'\n[STEP 1] Testing live registration for {username}...')
    reg_resp = requests.post(f'{HEROKU_BASE_URL}/auth/register/', json={
        'username': f'  {username}  ',
        'email': f'  {email}  ',
        'phone': f'  {phone[:4]} {phone[4:7]} {phone[7:]}  ',
        'password': password
    }, timeout=15)
    print('Registration status:', reg_resp.status_code)
    assert reg_resp.status_code == 201, f'Registration failed: {reg_resp.text}'
    reg_data = reg_resp.json()
    created_user = reg_data['data']['user']
    created_username = created_user['username']
    created_email = created_user['email']
    created_phone = created_user['phone']
    print(f'  Created user: {created_username}')
    print(f'  Cleaned email: {created_email}')
    print(f'  Cleaned phone: {created_phone}')
    assert created_username == username, f'Expected {username}, got {created_username}'
    assert created_email == email.strip().lower(), f'Email was not lowercased'
    assert ' ' not in created_phone, f'Phone was not stripped of spaces'

    # 2. Immediate Login via exact username
    print('\n[STEP 2] Testing immediate login with exact username...')
    login_resp1 = requests.post(f'{HEROKU_BASE_URL}/auth/login/', json={
        'username': username,
        'password': password
    }, timeout=15)
    print('Login exact status:', login_resp1.status_code)
    assert login_resp1.status_code == 200, f'Login failed: {login_resp1.text}'
    log1_data = login_resp1.json()
    assert 'access' in log1_data and 'refresh' in log1_data, 'SimpleJWT tokens missing'
    assert 'user' in log1_data, 'Embedded user payload missing in login response'
    print(f"  Embedded user verified: {log1_data['user']['username']} (Loyalty: {log1_data['user']['loyalty_points']})")

    # 3. Login via uppercase/mixed-case username with whitespace
    print('\n[STEP 3] Testing login with case-insensitive username and whitespace...')
    login_resp2 = requests.post(f'{HEROKU_BASE_URL}/auth/login/', json={
        'username': f'  {username.upper()}  ',
        'password': password
    }, timeout=15)
    print('Login case-insensitive whitespace status:', login_resp2.status_code)
    assert login_resp2.status_code == 200, f'Case-insensitive login failed: {login_resp2.text}'
    print('  Case-insensitive & whitespace login authenticated successfully!')

    # 4. Login via EMAIL (mixed case)
    print('\n[STEP 4] Testing login via EMAIL...')
    login_resp3 = requests.post(f'{HEROKU_BASE_URL}/auth/login/', json={
        'username': email,
        'password': password
    }, timeout=15)
    print('Login via email status:', login_resp3.status_code)
    assert login_resp3.status_code == 200, f'Login via email failed: {login_resp3.text}'
    print('  Email-based login authenticated successfully!')

    # 5. Login via PHONE (with spaces and dashes)
    print('\n[STEP 5] Testing login via PHONE (with spaces and dashes)...')
    login_resp4 = requests.post(f'{HEROKU_BASE_URL}/auth/login/', json={
        'username': f'{phone[:4]}-{phone[4:]}',
        'password': password
    }, timeout=15)
    print('Login via phone status:', login_resp4.status_code)
    assert login_resp4.status_code == 200, f'Login via phone failed: {login_resp4.text}'
    print('  Phone-based login authenticated successfully!')

    # 6. Profile fetch using issued Bearer token
    print('\n[STEP 6] Testing profile fetch using Bearer token...')
    access_token = log1_data['access']
    headers = {'Authorization': f'Bearer {access_token}'}
    profile_resp = requests.get(f'{HEROKU_BASE_URL}/users/profile/', headers=headers, timeout=15)
    print('Profile status:', profile_resp.status_code)
    assert profile_resp.status_code == 200, f'Profile fetch failed: {profile_resp.text}'
    prof_data = profile_resp.json()
    prof_username = prof_data.get('data', prof_data).get('username')
    print(f'  Profile returned canonical username: {prof_username}')
    assert prof_username == username

    # 7. Duplicate Prevention Test
    print('\n[STEP 7] Testing duplicate username & email rejection...')
    dup_resp = requests.post(f'{HEROKU_BASE_URL}/auth/register/', json={
        'username': username.upper(),
        'email': email.lower(),
        'password': password
    }, timeout=15)
    print('Duplicate status:', dup_resp.status_code)
    assert dup_resp.status_code == 400, 'Expected 400 Bad Request for duplicate registration'
    dup_data = dup_resp.json()
    print(f"  Duplicate rejection message: {dup_data.get('message')}")

    # 8. Registration with whitespace-only email (should register cleanly without duplicate error)
    print('\n[STEP 8] Testing live registration with whitespace-only email...')
    ws_user = f'wsemail{ts}'
    ws_resp = requests.post(f'{HEROKU_BASE_URL}/auth/register/', json={
        'username': ws_user,
        'email': '   ',
        'password': password
    }, timeout=15)
    print('Whitespace email registration status:', ws_resp.status_code)
    assert ws_resp.status_code == 201, f'Expected 201 Created for whitespace email, got {ws_resp.status_code}: {ws_resp.text}'
    ws_data = ws_resp.json()
    assert ws_data['data']['user']['email'] == '', 'Email should be empty string'
    print('  Whitespace email registered cleanly as empty string!')

    # 9. Invalid credentials rejection
    print('\n[STEP 9] Testing login with wrong credentials...')
    bad_login = requests.post(f'{HEROKU_BASE_URL}/auth/login/', json={
        'username': username,
        'password': 'WrongPassword999!'
    }, timeout=15)
    print('Wrong login status:', bad_login.status_code)
    assert bad_login.status_code == 401, f'Expected 401 Unauthorized, got {bad_login.status_code}'
    print('  Wrong password properly rejected with 401 Unauthorized!')

    print('\n' + '=' * 75)
    print('ALL 9 LIVE HEROKU V87 VERIFICATION TESTS PASSED (100%)!')
    print('=' * 75)

if __name__ == '__main__':
    run_phase10_verification()
