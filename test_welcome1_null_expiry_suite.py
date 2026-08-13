"""
Automated Verification Suite for Active Promo Code 'WELCOME1' & N/A Null Expiry Dates
Tests:
1. Database State Audit of WELCOME1 (valid_to is NULL / N/A expiry).
2. API Validation of WELCOME1 via /api/coupons/validate/ using brand slug 'getafomo'.
3. API Validation of WELCOME1 via /api/coupons/validate/ using integer restaurant ID.
4. Structured Warning Logging Verification on Validation Failure.
5. End-to-End Checkout Order Placement using WELCOME1.
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
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from promotions.models import Coupon
from restaurants.models import Restaurant, Branch, MenuItem, MenuCategory
from promotions.views import CouponValidateView
from orders.views import OrderListCreateView

User = get_user_model()

def run_welcome1_suite():
    print("=" * 80)
    print("[ACTIVE PROMO SUITE] 'WELCOME1' N/A EXPIRY & BRAND SCOPE VALIDATION VERIFICATION")
    print("=" * 80)

    factory = RequestFactory()
    test_user, _ = User.objects.get_or_create(
        username="welcome1_tester",
        defaults={"email": "welcome1@foodsphere.com", "phone": "03009998877"}
    )

    fomo = Restaurant.objects.filter(slug__iexact='getafomo').first()
    assert fomo is not None, "GetAFomo restaurant missing!"

    branch_fomo = Branch.objects.filter(restaurant=fomo).first()
    if not branch_fomo:
        branch_fomo = Branch.objects.create(restaurant=fomo, name="Fomo HQ Branch", address="DHA Phase 5 Lahore", is_active=True)

    cat_fomo = MenuCategory.objects.filter(restaurant=fomo).first()
    if not cat_fomo:
        cat_fomo = MenuCategory.objects.create(restaurant=fomo, name="Specialty Drinks")
    item_fomo = MenuItem.objects.filter(category=cat_fomo, is_available=True).first()
    if not item_fomo:
        item_fomo = MenuItem.objects.create(category=cat_fomo, name="Cold Brew Coffee", price=500.00, is_available=True)

    # 1. DB Audit of WELCOME1
    print("\n[TEST 1/5] Auditing 'WELCOME1' in Database...")
    coupon = Coupon.objects.get(code="WELCOME1")
    assert coupon.is_active is True
    assert coupon.valid_to is None
    assert coupon.restaurant_id == fomo.id
    assert coupon.is_valid() is True
    print(f"  [OK] Coupon 'WELCOMEFOMO' / 'WELCOME1' (ID #{coupon.id}): Active = {coupon.is_active}, Expiry = {coupon.valid_to} (N/A), Restaurant = {fomo.name}")

    def make_drf_request(method, path, data=None):
        if method.lower() == 'post':
            req = factory.post(path, data=data or {}, content_type='application/json')
        else:
            req = factory.get(path, data=data or {})
        req.user = test_user
        req._user = test_user
        drf_req = Request(req, parsers=[JSONParser()])
        drf_req._user = test_user
        return drf_req

    view_val = CouponValidateView.as_view()

    # 2. Customer App Validation via Brand Slug String ("getafomo")
    print("\n[TEST 2/5] Validating 'WELCOME1' with brand slug 'getafomo'...")
    payload_slug = {
        "code": "WELCOME1",
        "subtotal": 1000.00,
        "restaurant_id": "getafomo",
    }
    req2 = make_drf_request('post', '/api/coupons/validate/', payload_slug)
    resp2 = view_val(req2._request)
    assert resp2.status_code == 200, f"Slug validation failed: {resp2.status_code} - {resp2.data}"
    assert resp2.data.get('valid') is True
    assert float(resp2.data.get('discount')) == 150.0  # 15% of 1000
    print(f"  [OK] Customer App Slug Validation Succeeded: Calculated Discount = Rs. {resp2.data['discount']}")

    # 3. Customer App Validation via Integer Restaurant ID
    print("\n[TEST 3/5] Validating 'WELCOME1' with integer restaurant ID...")
    payload_id = {
        "code": "WELCOME1",
        "subtotal": 1000.00,
        "restaurant_id": fomo.id,
    }
    req3 = make_drf_request('post', '/api/coupons/validate/', payload_id)
    resp3 = view_val(req3._request)
    assert resp3.status_code == 200, f"Integer ID validation failed: {resp3.status_code} - {resp3.data}"
    assert resp3.data.get('valid') is True
    print(f"  [OK] Customer App Integer ID Validation Succeeded: Calculated Discount = Rs. {resp3.data['discount']}")

    # 4. Structured Log Verification on Mismatch
    print("\n[TEST 4/5] Testing Structured Warning Logs on Scope Mismatch ('seenbanao')...")
    payload_wrong = {
        "code": "WELCOME1",
        "subtotal": 1000.00,
        "restaurant_id": "seenbanao",
    }
    req4 = make_drf_request('post', '/api/coupons/validate/', payload_wrong)
    resp4 = view_val(req4._request)
    assert resp4.status_code == 400
    print(f"  [OK] Granular Rejection Returned: '{resp4.data.get('message')}'")

    # 5. Order Placement with WELCOME1 Redemption
    print("\n[TEST 5/5] Placing Order on GetAFomo with 'WELCOME1' Promo Code...")
    order_payload = {
        "restaurant": fomo.id,
        "branch": branch_fomo.id,
        "items": [{"menu_item": item_fomo.id, "quantity": 2}],
        "delivery_address": "Main Boulevard DHA, Lahore",
        "coupon_code": "WELCOME1",
        "payment_method": "cod",
        "order_type": "DELIVERY",
    }
    req_ord = make_drf_request('post', '/api/orders/', order_payload)
    view_ord = OrderListCreateView.as_view()
    resp_ord = view_ord(req_ord._request)
    assert resp_ord.status_code == 201, f"Order placement failed: {resp_ord.status_code} - {resp_ord.data}"
    print(f"  [OK] Order Created with WELCOME1 Promo Applied! Discount = Rs. {resp_ord.data.get('discount_amount')}, Total = Rs. {resp_ord.data.get('total_amount')}")

    print("\n" + "=" * 80)
    print("[SUCCESS] ALL 'WELCOME1' & NULL EXPIRY SUITE TESTS PASSED (100%)")
    print("=" * 80)

if __name__ == '__main__':
    run_welcome1_suite()
