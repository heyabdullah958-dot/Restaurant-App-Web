import requests
import json
import time

HEROKU_BASE_URL = 'https://getfoodpk-fd9b20442fcf.herokuapp.com/api'

def run_live_heroku_deep_suite():
    print('=' * 80)
    print('LIVE HEROKU PRODUCTION BACKEND DEEP API VERIFICATION')
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
            raise AssertionError(f'Live Heroku API Failure: {desc}')

    # 1. Health & Restaurant Discovery API
    print('\n[STEP 1] Testing Public Restaurants Listing (GET /restaurants/)...')
    resp = requests.get(f'{HEROKU_BASE_URL}/restaurants/', timeout=15)
    check(resp.status_code == 200, f'Public restaurant endpoint returned HTTP {resp.status_code}')
    
    data = resp.json()
    restaurants = data.get('results', data) if isinstance(data, dict) else data
    check(len(restaurants) >= 3, f'Returned {len(restaurants)} active restaurant brands')
    
    active_slugs = [r.get('slug') for r in restaurants]
    check('tandooristoppk' in active_slugs, 'Tandoori Stop is present in live feed')
    check('jushhpk' in active_slugs, 'Jush PK is present in live feed')
    check('getafomo' in active_slugs, 'Get A Fomo is present in live feed')
    
    # 2. Branch Resolution on Live API
    print('\n[STEP 2] Testing Nested Branch Serializer on Live API...')
    tandoori = next((r for r in restaurants if r.get('slug') == 'tandooristoppk'), None)
    check(tandoori is not None, 'Tandoori Stop record found')
    branches = tandoori.get('branches', [])
    check(len(branches) >= 3, f'Tandoori Stop has {len(branches)} live branches (Expected >= 3)')
    
    # 3. Public Popular Search Tags API
    print('\n[STEP 3] Testing Popular Tags Endpoint (GET /v1/search/popular-tags/)...')
    tag_resp = requests.get(f'{HEROKU_BASE_URL}/v1/search/popular-tags/', timeout=15)
    check(tag_resp.status_code in [200, 404], f'Search tags endpoint responded with HTTP {tag_resp.status_code}')

    # 4. Public Active Flash Deals Feed (GET /flash-deals/active/)
    print('\n[STEP 4] Testing Active Flash Deals Feed (GET /flash-deals/active/)...')
    deals_resp = requests.get(f'{HEROKU_BASE_URL}/flash-deals/active/', timeout=15)
    check(deals_resp.status_code == 200, f'Flash deals feed returned HTTP {deals_resp.status_code}')

    # 5. Coupon Validation API on Live Heroku (POST /coupons/validate/)
    print('\n[STEP 5] Testing Coupon Validation Endpoint on Live Heroku...')
    coupon_resp = requests.post(f'{HEROKU_BASE_URL}/coupons/validate/', 
                                json={'code': 'NON_EXISTENT_PROMO_999', 'subtotal': 1000.0},
                                timeout=15)
    check(coupon_resp.status_code in [400, 404], f'Invalid coupon properly rejected with HTTP {coupon_resp.status_code}')

    # 6. Unauthenticated Live Order Track API (GET /v1/orders/{pk}/track/)
    print('\n[STEP 6] Testing Unauthenticated Universal Live Track API...')
    track_resp = requests.get(f'{HEROKU_BASE_URL}/v1/orders/1/track/', timeout=15)
    check(track_resp.status_code in [200, 404], f'Live Track endpoint accessible without auth (HTTP {track_resp.status_code})')

    print('\n' + '=' * 80)
    print(f'LIVE HEROKU PRODUCTION API VERIFICATION COMPLETED: {passed}/{total} PASSED (100%)')
    print('=' * 80)
    return True

if __name__ == '__main__':
    run_live_heroku_deep_suite()
