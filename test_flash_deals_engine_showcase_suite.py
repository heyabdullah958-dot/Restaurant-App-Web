import os
import sys
from datetime import timedelta
import django

# Setup Django Environment
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend'))
sys.path.insert(0, backend_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from django.utils import timezone
from restaurants.models import Restaurant
from promotions.models import FlashDeal
from promotions.views import ActiveFlashDealsView
from promotions.serializers import FlashDealSerializer

def run_tests():
    print("\n=======================================================")
    print("[*] FLASH DEALS ENGINE & SHOWCASE INTEGRATION TEST SUITE")
    print("=======================================================\n")

    factory = RequestFactory()
    now = timezone.now()

    # 1. Setup Test Restaurants
    jush, _ = Restaurant.objects.get_or_create(slug='jushhpk', defaults={'name': 'Jush PK', 'is_active': True})
    ts, _ = Restaurant.objects.get_or_create(slug='tandooristoppk', defaults={'name': 'Tandoori Stop', 'is_active': True})
    fomo, _ = Restaurant.objects.get_or_create(slug='getafomo', defaults={'name': 'Get A Fomo', 'is_active': True})

    # Clear test deals
    FlashDeal.objects.all().delete()

    # 2. Create Active Deal (Delivery & Takeaway)
    active_deal = FlashDeal.objects.create(
        title='30% OFF Smash Burgers',
        description='Flat 30% discount on smash burgers',
        deal_type='percentage',
        discount_value=30,
        restaurant=jush,
        is_dine_in_only=False,
        start_time=now - timedelta(hours=2),
        end_time=now + timedelta(days=2),
        is_active=True,
    )

    # 3. Create Active Dine-In Deal
    dine_in_deal = FlashDeal.objects.create(
        title='20% OFF Coffee Dine-In',
        description='Specialty coffee discount',
        deal_type='percentage',
        discount_value=20,
        restaurant=fomo,
        is_dine_in_only=True,
        start_time=now - timedelta(hours=1),
        end_time=now + timedelta(days=1),
        is_active=True,
    )

    # 4. Create Future Scheduled Deal (Starts Tomorrow)
    future_deal = FlashDeal.objects.create(
        title='Midnight Special Upcoming',
        description='Starts tomorrow',
        deal_type='flat',
        discount_value=200,
        restaurant=ts,
        is_dine_in_only=False,
        start_time=now + timedelta(days=1),
        end_time=now + timedelta(days=3),
        is_active=True,
    )

    # 5. Create Expired Deal (Ended yesterday)
    expired_deal = FlashDeal.objects.create(
        title='Old Flash Sale Expired',
        description='Ended yesterday',
        deal_type='percentage',
        discount_value=40,
        restaurant=jush,
        is_dine_in_only=False,
        start_time=now - timedelta(days=5),
        end_time=now - timedelta(days=1),
        is_active=True,
    )

    print("[TEST 1] Testing Active Flash Deals Temporal Filtering...")
    view = ActiveFlashDealsView.as_view()
    req = factory.get('/api/promotions/flash-deals/')
    res = view(req)

    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    deals_data = res.data.get('results', res.data) if isinstance(res.data, dict) else res.data
    deal_titles = [d['title'] for d in deals_data]

    assert '30% OFF Smash Burgers' in deal_titles, "Active deal should be present"
    assert '20% OFF Coffee Dine-In' in deal_titles, "Active dine-in deal should be present"
    assert 'Midnight Special Upcoming' not in deal_titles, "Future scheduled deal MUST NOT appear"
    assert 'Old Flash Sale Expired' not in deal_titles, "Expired deal MUST NOT appear"
    print(f"  --> PASSED: Exactly {len(deals_data)} active deals returned (future & expired properly excluded).")

    print("\n[TEST 2] Testing Dine-In Filtering Parameter (?is_dine_in_only=true)...")
    req_dine_in = factory.get('/api/promotions/flash-deals/?is_dine_in_only=true')
    res_dine_in = view(req_dine_in)
    dine_in_data = res_dine_in.data.get('results', res_dine_in.data) if isinstance(res_dine_in.data, dict) else res_dine_in.data
    assert len(dine_in_data) == 1, f"Expected 1 dine-in deal, got {len(dine_in_data)}"
    assert dine_in_data[0]['title'] == '20% OFF Coffee Dine-In'
    print("  --> PASSED: Dine-In filter accurately returns exclusive deals.")

    print("\n[TEST 3] Testing Delivery Filtering Parameter (?is_dine_in_only=false)...")
    req_deliv = factory.get('/api/promotions/flash-deals/?is_dine_in_only=false')
    res_deliv = view(req_deliv)
    deliv_data = res_deliv.data.get('results', res_deliv.data) if isinstance(res_deliv.data, dict) else res_deliv.data
    assert len(deliv_data) == 1, f"Expected 1 delivery deal, got {len(deliv_data)}"
    assert deliv_data[0]['title'] == '30% OFF Smash Burgers'
    print("  --> PASSED: Delivery filter accurately returns delivery deals.")

    print("\n[TEST 4] Testing Serializer Restaurant Metadata Hydration...")
    serializer = FlashDealSerializer(active_deal)
    serialized = serializer.data
    assert serialized['restaurant_name'] in ['Jush PK', 'JushhPK'], f"Expected 'Jush PK' or 'JushhPK', got {serialized.get('restaurant_name')}"
    assert serialized['restaurant_slug'] == 'jushhpk', f"Expected 'jushhpk', got {serialized.get('restaurant_slug')}"
    print(f"  --> PASSED: Serializer correctly attaches restaurant_name ('{serialized['restaurant_name']}') and restaurant_slug ('{serialized['restaurant_slug']}').")

    print("\n[TEST 5] Re-seeding 3 Live Launch Brand Flash Deals...")
    FlashDeal.objects.all().delete()
    from django.core.management import call_command
    call_command('seed_flash_deals')
    all_active = FlashDeal.objects.filter(is_active=True, start_time__lte=now, end_time__gte=now).count()
    assert all_active == 3, f"Expected 3 active seeded deals, got {all_active}"
    print(f"  --> PASSED: Seeded {all_active} live active flash deals for Jush PK, Tandoori Stop, and Get A Fomo.")

    print("\n=======================================================")
    print("[SUCCESS] ALL 5 FLASH DEALS ENGINE TESTS PASSED WITH 100% SUCCESS")
    print("=======================================================\n")

if __name__ == '__main__':
    run_tests()
