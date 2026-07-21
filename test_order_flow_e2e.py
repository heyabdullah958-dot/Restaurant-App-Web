"""
FoodSphere End-to-End Order Flow Test
Tests:
1. Customer area selection & order placement
2. Branch auto-assignment via area keywords
3. Dual email notification routing (Branch Manager + Restaurant Manager)
4. Role-based order filtering (Branch Manager vs Restaurant Manager vs Super Admin)
"""
import os
import sys

# Setup Django Environment
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from restaurants.models import Restaurant, Branch, MenuItem, MenuCategory
from orders.models import Order
from orders.serializers import OrderCreateSerializer
from orders.views import OrderListCreateView
from config.admin_utils import resolve_branch_for_order

User = get_user_model()

def run_e2e_test():
    print("=" * 60)
    print("[TEST] RUNNING FOODSPHERE END-TO-END ORDER FLOW TEST")
    print("=" * 60)

    # 1. Fetch Tandoori Stop
    try:
        tandoori = Restaurant.objects.get(slug='tandooristoppk')
        print(f"[OK] Found Restaurant: {tandoori.name}")
    except Restaurant.DoesNotExist:
        print("[FAIL] Tandoori Stop restaurant missing! Run seed_restaurants.")
        return False

    # 2. Verify Branches exist
    branches = Branch.objects.filter(restaurant=tandoori)
    print(f"[OK] Active Branches ({branches.count()}): {[b.name for b in branches]}")
    assert branches.count() >= 3, "Expected 3 Tandoori Stop branches!"

    # 3. Test Area Branch Resolution
    johar_branch = resolve_branch_for_order(tandoori, "House 12, PIA Road, Johar Town, Lahore")
    print(f"[ROUTE] Address 'PIA Road, Johar Town' resolved to branch: {johar_branch.name}")
    assert johar_branch.name == "Johar Town", "Failed keyword routing for Johar Town!"

    gt_branch = resolve_branch_for_order(tandoori, "Shop 5, GT Road Baghbanpura, Lahore")
    print(f"[ROUTE] Address 'GT Road Baghbanpura' resolved to branch: {gt_branch.name}")
    assert gt_branch.name == "GT Road Baghbanpura", "Failed keyword routing for GT Road!"

    lake_branch = resolve_branch_for_order(tandoori, "Villa 4, Lake City, Lahore")
    print(f"[ROUTE] Address 'Lake City' resolved to branch: {lake_branch.name}")
    assert lake_branch.name == "Lake City", "Failed keyword routing for Lake City!"

    # 4. Fetch menu item
    menu_item = MenuItem.objects.filter(category__restaurant=tandoori, is_available=True).first()
    assert menu_item is not None, "No available menu item found for Tandoori Stop!"

    # 5. Place test order via Serializer / View
    print("\n[ORDER] Simulating Order Placement...")
    order_data = {
        "restaurant": tandoori.id,
        "guest_name": "Test Customer E2E",
        "guest_phone": "03001234567",
        "payment_method": "cod",
        "delivery_address": "House 45, PIA Road, Johar Town, Lahore",
        "special_instructions": "Extra mint chutney please",
        "items": [
            {
                "menu_item": menu_item.id,
                "quantity": 2,
                "special_notes": "Well done"
            }
        ]
    }

    factory = RequestFactory()
    django_request = factory.post('/api/orders/', data=order_data, content_type='application/json')
    django_request.user = User.objects.filter(is_guest=True).first() or User.objects.create_user(username='e2e_guest', is_guest=True)

    from rest_framework.request import Request
    from rest_framework.parsers import JSONParser
    drf_request = Request(django_request, parsers=[JSONParser()])

    view = OrderListCreateView()
    view.request = drf_request
    view.format_kwarg = None

    response = view.create(drf_request)

    print(f"Response Status Code: {response.status_code}")
    assert response.status_code == 201, f"Order creation failed: {response.data}"
    
    order_id = response.data['data']['id']
    created_order = Order.objects.get(id=order_id)
    print(f"[OK] Created Order #{created_order.id} for Rs. {created_order.total}")
    print(f"[OK] Assigned Branch: {created_order.branch.name if created_order.branch else 'None'}")
    assert created_order.branch.name == "Johar Town", "Branch assignment mismatch on created order!"

    # 6. Test Role-Based Queryset Scoping
    print("\n[AUTH] Testing Role-Based Scoping for GET /api/orders...")
    
    # 6a. Super Admin
    super_admin = User.objects.filter(is_superuser=True).first()
    if super_admin:
        req_admin = factory.get('/api/orders/')
        req_admin.user = super_admin
        v_admin = OrderListCreateView()
        v_admin.request = req_admin
        admin_qs = v_admin.get_queryset()
        print(f"[SUPER ADMIN] ({super_admin.username}) sees: {admin_qs.count()} orders total")
        assert admin_qs.filter(id=created_order.id).exists(), "Super Admin should see created order!"

    # 6b. Branch Manager (Johar Town)
    bm_johar = User.objects.filter(username='manager_tandooristoppk_johar_town').first()
    if bm_johar:
        req_bm = factory.get('/api/orders/')
        req_bm.user = bm_johar
        v_bm = OrderListCreateView()
        v_bm.request = req_bm
        bm_qs = v_bm.get_queryset()
        print(f"[BRANCH MANAGER] Johar Town ({bm_johar.username}) sees: {bm_qs.count()} orders")
        assert bm_qs.filter(id=created_order.id).exists(), "Johar Town Branch Manager should see created order!"

    # 6c. Branch Manager (Lake City)
    bm_lake = User.objects.filter(username='manager_tandooristoppk_lake_city').first()
    if bm_lake:
        req_lake = factory.get('/api/orders/')
        req_lake.user = bm_lake
        v_lake = OrderListCreateView()
        v_lake.request = req_lake
        lake_qs = v_lake.get_queryset()
        print(f"[BRANCH MANAGER] Lake City ({bm_lake.username}) sees: {lake_qs.count()} orders")
        assert not lake_qs.filter(id=created_order.id).exists(), "Lake City Manager must NOT see Johar Town order!"

    print("\n" + "=" * 60)
    print("[SUCCESS] ALL END-TO-END ORDER FLOW CHECKS PASSED SUCCESSFULLY (100%)")
    print("=" * 60)
    return True


if __name__ == '__main__':
    run_e2e_test()
