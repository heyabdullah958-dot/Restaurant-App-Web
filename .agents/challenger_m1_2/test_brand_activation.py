import os
import sys
import django

# Setup Django environment
backend_path = r"d:\sitesdata\Resturent App\backend"
sys.path.insert(0, backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from restaurants.models import Restaurant
from rest_framework.test import APIClient

def test_brand_activation():
    print("=== TASK 1: EMPIRICAL BRAND ACTIVATION AUDIT ===")
    
    active_slugs = {'tandooristoppk', 'jushhpk', 'getafomo'}
    inactive_slugs = {'seenbanao', 'dineatblue', 'sandmelts', 'birdmanfoodspk'}
    
    # 1. Database Query Verification
    all_restaurants = list(Restaurant.objects.all())
    print(f"Total restaurants found in database: {len(all_restaurants)}")
    
    db_active = {r.slug for r in all_restaurants if r.is_active}
    db_inactive = {r.slug for r in all_restaurants if not r.is_active}
    
    print(f"DB Active Slugs: {sorted(list(db_active))}")
    print(f"DB Inactive Slugs: {sorted(list(db_inactive))}")
    
    assert db_active == active_slugs, f"DB active mismatch: Expected {active_slugs}, got {db_active}"
    assert db_inactive == inactive_slugs, f"DB inactive mismatch: Expected {inactive_slugs}, got {db_inactive}"
    print("[PASS] Database active/inactive flags strictly conform to Phase 1 spec.")
    
    # 2. REST API /api/restaurants/ Endpoint Verification
    client = APIClient()
    response = client.get('/api/restaurants/')
    assert response.status_code == 200, f"API failed with status {response.status_code}"
    
    data = response.json()
    items = data if isinstance(data, list) else data.get('results', [])
    print(f"API Endpoint Returned {len(items)} restaurants.")
    
    api_active = {r['slug'] for r in items if r['is_active']}
    api_inactive = {r['slug'] for r in items if not r['is_active']}
    
    print(f"API Active Slugs: {sorted(list(api_active))}")
    print(f"API Inactive Slugs: {sorted(list(api_inactive))}")
    
    for item in items:
        slug = item['slug']
        is_active = item['is_active']
        if slug in active_slugs:
            assert is_active is True, f"Brand {slug} should have is_active=True"
        elif slug in inactive_slugs:
            assert is_active is False, f"Brand {slug} should have is_active=False"
        else:
            raise AssertionError(f"Unexpected restaurant slug in DB: {slug}")
            
    print("[PASS] REST API /api/restaurants/ accurately exposes is_active=False for inactive brands and is_active=True for active brands.")
    print("=== TASK 1 AUDIT COMPLETE: ALL PASS ===")

if __name__ == '__main__':
    test_brand_activation()
