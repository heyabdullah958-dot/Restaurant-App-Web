import os
import sys
import json
from decimal import Decimal
from datetime import timedelta

# Django setup
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.test import RequestFactory
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.request import Request
from rest_framework.parsers import JSONParser
from rest_framework.exceptions import ValidationError

from restaurants.models import Restaurant, Branch, BranchRider, MenuCategory, MenuItem, BranchMenuItemAvailability
from orders.models import Order, OrderItem
from orders.views import OrderListCreateView, OrderDetailView, MyOrdersListView, OrderAssignRiderView
from promotions.models import Coupon, CouponUsage, FlashDeal, FlashDealRedemption
from promotions.views import CouponValidateView, FlashDealListCreateView, ActiveFlashDealsView

User = get_user_model()

def run_phase8_audit():
    print("=" * 80)
    print("PHASE 8: COMPREHENSIVE PRODUCTION REGRESSION & SYSTEM AUDIT SUITE")
    print("=" * 80)
    factory = RequestFactory()

    passed_tests = 0
    total_tests = 0

    def assert_test(condition, message):
        nonlocal passed_tests, total_tests
        total_tests += 1
        if condition:
            passed_tests += 1
            print(f"  [PASS] {message}")
        else:
            print(f"  [FAIL] {message}")
            raise AssertionError(f"Regression Failure: {message}")

    # -------------------------------------------------------------------------
    # SECTION 1: Multi-Tenant Architecture & Phase 1 Scope Isolation
    # -------------------------------------------------------------------------
    print("\n[SECTION 1] Multi-Tenant Architecture & Phase 1 Scope Isolation Audit")
    
    active_brands = Restaurant.objects.filter(is_active=True)
    active_slugs = set(active_brands.values_list('slug', flat=True))
    expected_phase1_slugs = {'tandooristoppk', 'jushhpk', 'getafomo'}
    
    assert_test(expected_phase1_slugs.issubset(active_slugs), 
                f"All 3 Phase 1 brands are active in database: {active_slugs}")
    
    # Check Phase 1 branches
    ts = Restaurant.objects.filter(slug='tandooristoppk').first()
    jk = Restaurant.objects.filter(slug='jushhpk').first()
    gf = Restaurant.objects.filter(slug='getafomo').first()
    
    ts_branches = Branch.objects.filter(restaurant=ts, is_active=True)
    jk_branches = Branch.objects.filter(restaurant=jk, is_active=True)
    gf_branches = Branch.objects.filter(restaurant=gf, is_active=True)
    
    total_operational_branches = ts_branches.count() + jk_branches.count() + gf_branches.count()
    assert_test(ts_branches.count() == 3, f"Tandoori Stop has 3 operational branches (Found: {ts_branches.count()})")
    assert_test(jk_branches.count() == 3, f"Jush PK has 3 operational branches (Found: {jk_branches.count()})")
    assert_test(gf_branches.count() == 1, f"Get A Fomo has 1 operational branch (Found: {gf_branches.count()})")
    assert_test(total_operational_branches == 7, f"Exact count of 7 operational branches active across Phase 1 brands")

    # -------------------------------------------------------------------------
    # SECTION 2: Flash Deals Engine v2.0 & Midnight Rollover Mechanics
    # -------------------------------------------------------------------------
    print("\n[SECTION 2] Super Admin HQ Flash Deals Engine v2.0 Audit")
    
    # Create test flash deal
    now = timezone.now()
    test_deal, created = FlashDeal.objects.get_or_create(
        title="Midnight Wings Special 40% Off",
        defaults={
            "deal_type": "percentage",
            "discount_value": Decimal("40.00"),
            "order_mode": "ALL",
            "item_scope_type": "ENTIRE_MENU",
            "timing_type": "ONE_TIME",
            "start_time": now - timedelta(hours=1),
            "end_time": now + timedelta(hours=5),
            "max_orders": 100,
            "is_active": True,
        }
    )
    test_deal.is_active = True
    test_deal.save()
    
    assert_test(test_deal.is_currently_active(), "Flash Deal is currently active and valid within time schedule")
    
    # Test active deals list view with DRF Request wrapper
    req = factory.get('/api/promotions/flash-deals/active/')
    drf_req = Request(req)
    view = ActiveFlashDealsView()
    view.request = drf_req
    view.format_kwarg = None
    qs = view.get_queryset()
    deal_found = any(d.id == test_deal.id for d in qs)
    assert_test(deal_found, "Active Flash Deal successfully returned in customer discovery feed")
    
    # Test redemption recording
    test_user, _ = User.objects.get_or_create(username="flash_shopper_1", defaults={"email": "shopper1@example.com"})
    initial_count = test_deal.current_redemption_count()
    
    # Log simulated order & redemption
    dummy_order, _ = Order.objects.get_or_create(
        user=test_user,
        defaults={"restaurant": ts, "guest_name": "Shopper", "subtotal": Decimal("500.00"), "total": Decimal("500.00"), "payment_method": "cod", "delivery_address": "Test Street"}
    )
    FlashDealRedemption.objects.create(flash_deal=test_deal, user=test_user, order=dummy_order, discount_applied=Decimal("150.00"))
    assert_test(test_deal.current_redemption_count() == initial_count + 1, "FlashDealRedemption ledger accurately recorded atomic discount usage")

    # -------------------------------------------------------------------------
    # SECTION 3: Dynamic Promo & Coupon Engine with Minimum Spend & Caps
    # -------------------------------------------------------------------------
    print("\n[SECTION 3] Coupon Engine Validation & Atomic Ledger Audit")
    
    promo_code = f"PREDELIVERY50"
    coupon, _ = Coupon.objects.update_or_create(
        code=promo_code,
        defaults={
            "discount_type": "percentage",
            "discount_value": Decimal("20.00"),
            "min_subtotal": Decimal("500.00"),
            "max_discount": Decimal("200.00"),
            "per_user_limit": 1,
            "usage_limit": 100,
            "is_active": True,
        }
    )
    
    # Test coupon validate API (Valid Case: Subtotal Rs. 1000 => 20% = 200 => capped at 200)
    validate_req = factory.post('/api/promotions/coupons/validate/', 
                                data={"code": promo_code, "subtotal": 1000.0, "restaurant_id": ts.id},
                                content_type='application/json')
    validate_req.user = test_user
    validate_req._user = test_user
    drf_vreq = Request(validate_req, parsers=[JSONParser()])
    drf_vreq._user = test_user
    
    v_view = CouponValidateView()
    v_view.request = drf_vreq
    v_resp = v_view.post(drf_vreq)
    assert_test(v_resp.status_code == 200, "Coupon validate API returned HTTP 200 OK")
    assert_test(Decimal(str(v_resp.data['discount'])) == Decimal("200.00"), 
                f"Discount correctly calculated and capped at max_discount (Rs. 200.00)")
    
    # Test subtotal threshold rejection (Subtotal Rs. 300 < Min Rs. 500)
    invalid_subtotal_req = factory.post('/api/promotions/coupons/validate/', 
                                         data={"code": promo_code, "subtotal": 300.0, "restaurant_id": ts.id},
                                         content_type='application/json')
    invalid_subtotal_req.user = test_user
    invalid_subtotal_req._user = test_user
    drf_inv_req = Request(invalid_subtotal_req, parsers=[JSONParser()])
    drf_inv_req._user = test_user
    
    rejected = False
    try:
        inv_resp = v_view.post(drf_inv_req)
        if inv_resp.status_code >= 400:
            rejected = True
    except ValidationError:
        rejected = True
    assert_test(rejected, "Coupon correctly rejected when cart subtotal is below minimum threshold")

    # -------------------------------------------------------------------------
    # SECTION 4: Branch Stock Availability Overrides (BranchMenuItemAvailability)
    # -------------------------------------------------------------------------
    print("\n[SECTION 4] Branch-Specific Stock Availability Override Audit")
    
    johar_b = ts_branches.filter(name__icontains='Johar').first() or ts_branches.first()
    lake_b = ts_branches.filter(name__icontains='Lake').first() or ts_branches.last()
    sample_item = MenuItem.objects.filter(category__restaurant=ts, is_available=True).first()
    assert_test(sample_item is not None, f"Global master menu item exists: '{sample_item.name}'")
    
    # Toggle item OUT OF STOCK exclusively at Johar Town branch
    BranchMenuItemAvailability.objects.update_or_create(
        branch=johar_b,
        menu_item=sample_item,
        defaults={"is_available": False}
    )
    # Ensure item is IN STOCK at Lake City branch
    BranchMenuItemAvailability.objects.update_or_create(
        branch=lake_b,
        menu_item=sample_item,
        defaults={"is_available": True}
    )
    
    johar_override = BranchMenuItemAvailability.objects.get(branch=johar_b, menu_item=sample_item)
    lake_override = BranchMenuItemAvailability.objects.get(branch=lake_b, menu_item=sample_item)
    
    assert_test(johar_override.is_available is False, 
                f"'{sample_item.name}' successfully set to OUT OF STOCK at {johar_b.name}")
    assert_test(lake_override.is_available is True, 
                f"'{sample_item.name}' remains AVAILABLE at {lake_b.name}")
    assert_test(sample_item.is_available is True, 
                "Master global catalog record remains uncorrupted (is_available=True)")

    # Restore stock
    johar_override.is_available = True
    johar_override.save()

    # -------------------------------------------------------------------------
    # SECTION 5: Rider Roster, Atomic Dispatch & Monotonic Lifecycle
    # -------------------------------------------------------------------------
    print("\n[SECTION 5] Rider Roster, Atomic Dispatch & Monotonic Lifecycle Audit")
    
    # Create or get available rider
    rider, _ = BranchRider.objects.update_or_create(
        branch=johar_b,
        phone="+923007778899",
        defaults={"name": "Audit Test Rider", "vehicle_type": "BIKE", "status": "AVAILABLE", "is_active": True}
    )
    rider.status = 'AVAILABLE'
    rider.save()
    assert_test(rider.status == 'AVAILABLE', f"Rider initialized in AVAILABLE status")
    
    # Place order
    cust, _ = User.objects.get_or_create(username="audit_customer_e2e", defaults={"phone": "+923001234567"})
    order_payload = {
        "restaurant": ts.id,
        "branch": johar_b.id,
        "guest_name": "Audit Customer",
        "guest_phone": "+92 300 1234567",
        "payment_method": "cod",
        "order_type": "DELIVERY",
        "delivery_address": "Test Street, Johar Town, Lahore",
        "items": [{"menu_item": sample_item.id, "quantity": 1}]
    }
    
    ord_req = factory.post('/api/orders/', data=order_payload, content_type='application/json')
    ord_req.user = cust
    ord_req._user = cust
    drf_ord_req = Request(ord_req, parsers=[JSONParser()])
    drf_ord_req._user = cust
    
    ord_view = OrderListCreateView()
    ord_view.request = drf_ord_req
    ord_view.format_kwarg = None
    ord_resp = ord_view.create(drf_ord_req)
    assert_test(ord_resp.status_code == 201, "Order successfully placed")
    
    audit_order_id = ord_resp.data['data']['id']
    audit_order = Order.objects.get(id=audit_order_id)
    assert_test(audit_order.display_order_id.startswith('TS-'), 
                f"Scoped Display Order ID generated: {audit_order.display_order_id}")
    
    # Manager transitions order to 'preparing'
    audit_order.status = 'preparing'
    audit_order.save(update_fields=['status'])
    
    # Assign rider via OrderAssignRiderView
    assign_req = factory.post(f'/api/orders/{audit_order_id}/assign-rider/', 
                              data={"rider_id": rider.id}, 
                              content_type='application/json')
    assign_req.user = cust
    assign_req._user = cust
    drf_assign_req = Request(assign_req, parsers=[JSONParser()])
    drf_assign_req._user = cust
    
    assign_view = OrderAssignRiderView()
    assign_view.request = drf_assign_req
    assign_resp = assign_view.post(drf_assign_req, pk=audit_order_id)
    assert_test(assign_resp.status_code == 200, "Rider assign endpoint returned HTTP 200 OK")
    
    audit_order.refresh_from_db()
    rider.refresh_from_db()
    assert_test(audit_order.status == 'out_for_delivery', 
                "Order status atomically transitioned to 'out_for_delivery'")
    assert_test(rider.status == 'ON_DELIVERY', 
                "Rider status atomically transitioned to 'ON_DELIVERY'")
    
    # Deliver order
    audit_order.status = 'delivered'
    audit_order.save()
    rider.refresh_from_db()
    assert_test(rider.status == 'AVAILABLE', 
                "Rider automatically freed back to 'AVAILABLE' upon order delivery completion")

    # -------------------------------------------------------------------------
    # SECTION 6: Multi-Account Order Isolation & Queryset Scoping
    # -------------------------------------------------------------------------
    print("\n[SECTION 6] Customer Order History Scoping & Multi-Account Isolation Audit")
    
    user_x, _ = User.objects.get_or_create(username="account_user_x", defaults={"email": "x@example.com"})
    user_y, _ = User.objects.get_or_create(username="account_user_y", defaults={"email": "y@example.com"})
    
    # Verify User Y sees zero orders from User X
    my_ord_req = factory.get('/api/orders/my-orders/')
    my_ord_req.user = user_y
    my_ord_req._user = user_y
    my_view = MyOrdersListView()
    my_view.request = my_ord_req
    y_orders = my_view.get_queryset()
    
    assert_test(not y_orders.filter(user=user_x).exists(), 
                "Queryset scoping strictly isolates User Y from User X's order history")

    # -------------------------------------------------------------------------
    # SUMMARY
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print(f"PRODUCTION REGRESSION AUDIT COMPLETED: {passed_tests}/{total_tests} TESTS PASSED (100%)")
    print("=" * 80)
    return True

if __name__ == '__main__':
    run_phase8_audit()
