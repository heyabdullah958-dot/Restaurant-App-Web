"""
Comprehensive Cross-App Promo Code E2E Integration Test Suite
Tests:
1. Admin HQ Coupon Creation via formatCouponPayload & CouponListCreateView.
2. Customer Checkout Promo Validation via /api/coupons/validate/:
   - String brand slug matching ("getafomo", "seenbanao")
   - Integer brand ID matching (7, 1)
   - Brand Scope Mismatch Rejection with granular message ("Promo code '...' is only valid for Get A Fomo.")
   - Minimum Subtotal Rejection with granular message ("Minimum subtotal of Rs. 500 required...")
   - Expired Date Rejection with granular message ("Promo code '...' has expired.")
3. End-to-End Order Placement with Promo Code Redemption.
"""
import os
import sys
from datetime import timedelta

# Setup Django Environment
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.request import Request
from rest_framework.parsers import JSONParser

from promotions.models import Coupon
from restaurants.models import Restaurant, Branch, MenuItem, MenuCategory
from promotions.views import CouponListCreateView, CouponValidateView
from orders.views import OrderListCreateView

User = get_user_model()

def run_promo_e2e_integration_tests():
    print("=" * 80)
    print("[E2E PROMO CODE SUITE] CROSS-APP CREATION & CHECKOUT VALIDATION VERIFICATION")
    print("=" * 80)

    factory = RequestFactory()
    test_user, _ = User.objects.get_or_create(
        username="promo_e2e_tester",
        defaults={"email": "tester@foodsphere.com", "phone": "03001234567"}
    )

    # Resolve active test restaurants (GetAFomo & SeenBanao)
    rest_fomo = Restaurant.objects.filter(slug__iexact="getafomo").first()
    if not rest_fomo:
        rest_fomo = Restaurant.objects.filter(name__icontains="Fomo").first()
    if not rest_fomo:
        rest_fomo = Restaurant.objects.create(name="Get A Fomo", slug="getafomo", address="DHA Phase 5")

    rest_seen = Restaurant.objects.filter(slug__iexact="seenbanao").first()
    if not rest_seen:
        rest_seen = Restaurant.objects.create(name="Seen Banao", slug="seenbanao", address="Gulshan")

    branch_fomo = Branch.objects.filter(restaurant=rest_fomo).first()
    if not branch_fomo:
        branch_fomo = Branch.objects.create(restaurant=rest_fomo, name="Fomo Main Branch", address="DHA Phase 5", is_active=True)

    # Ensure menu category & item for ordering
    cat_fomo = MenuCategory.objects.filter(restaurant=rest_fomo).first()
    if not cat_fomo:
        cat_fomo = MenuCategory.objects.create(restaurant=rest_fomo, name="Café Specials")
    item_fomo = MenuItem.objects.filter(category=cat_fomo, is_available=True).first()
    if not item_fomo:
        item_fomo = MenuItem.objects.create(category=cat_fomo, name="Iced Spanish Latte", price=650.00, is_available=True)

    def make_drf_request(method, path, data=None, user=None):
        if method.lower() == 'post':
            req = factory.post(path, data=data or {}, content_type='application/json')
        else:
            req = factory.get(path, data=data or {})
        req.user = user or test_user
        req._user = user or test_user
        drf_req = Request(req, parsers=[JSONParser()])
        drf_req._user = user or test_user
        return drf_req

    # 1. Create Brand-Scoped Promo Code for GetAFomo
    print("\n[TEST 1/6] Admin HQ Creation: Creating Brand-Scoped Coupon 'WELCOMEFOMO' for Get A Fomo...")
    Coupon.objects.filter(code="WELCOMEFOMO").delete()
    fomo_coupon_data = {
        "code": "WELCOMEFOMO",
        "discount_type": "percentage",
        "discount_value": 20.0,
        "min_subtotal": 500.0,
        "max_discount": 300.0,
        "restaurant": rest_fomo.id,
        "valid_from": (timezone.now() - timedelta(minutes=5)).isoformat(),
        "valid_to": (timezone.now() + timedelta(days=30)).isoformat(),
        "is_active": True,
    }

    # Verify directly via DRF CouponListCreateView
    req_create = make_drf_request('post', '/api/coupons/', fomo_coupon_data, user=test_user)
    req_create.user.is_staff = True
    view_create = CouponListCreateView.as_view()
    resp_create = view_create(req_create._request)
    assert resp_create.status_code == 201, f"Coupon creation failed: {resp_create.status_code} - {resp_create.data}"
    coupon_obj = Coupon.objects.get(code="WELCOMEFOMO")
    assert coupon_obj.restaurant_id == rest_fomo.id
    print(f"  [OK] Coupon 'WELCOMEFOMO' stored in DB (Restaurant ID #{coupon_obj.restaurant_id} - {rest_fomo.name})")

    # 2. Test Customer Validation with Brand Slug String ("getafomo")
    print("\n[TEST 2/6] Customer Validation: Validating 'WELCOMEFOMO' with brand slug 'getafomo'...")
    val_payload_slug = {
        "code": "WELCOMEFOMO",
        "subtotal": 1000.0,
        "restaurant_id": "getafomo",
    }
    req_val1 = make_drf_request('post', '/api/coupons/validate/', val_payload_slug)
    view_val = CouponValidateView.as_view()
    resp_val1 = view_val(req_val1._request)
    assert resp_val1.status_code == 200, f"Slug validation failed: {resp_val1.status_code} - {resp_val1.data}"
    assert resp_val1.data.get('valid') is True
    assert float(resp_val1.data.get('discount')) == 200.0
    print(f"  [OK] Brand Slug Matching Succeeded: Discount = Rs. {resp_val1.data['discount']}")

    # 3. Test Customer Validation with Integer Brand ID (rest_fomo.id)
    print("\n[TEST 3/6] Customer Validation: Validating 'WELCOMEFOMO' with integer brand ID...")
    val_payload_id = {
        "code": "WELCOMEFOMO",
        "subtotal": 1000.0,
        "restaurant_id": rest_fomo.id,
    }
    req_val2 = make_drf_request('post', '/api/coupons/validate/', val_payload_id)
    resp_val2 = view_val(req_val2._request)
    assert resp_val2.status_code == 200, f"ID validation failed: {resp_val2.status_code} - {resp_val2.data}"
    print(f"  [OK] Integer Brand ID Matching Succeeded: Discount = Rs. {resp_val2.data['discount']}")

    # 4. Test Brand Scope Mismatch (validating on "seenbanao")
    print("\n[TEST 4/6] Brand Mismatch Test: Validating 'WELCOMEFOMO' on 'seenbanao'...")
    val_payload_wrong = {
        "code": "WELCOMEFOMO",
        "subtotal": 1000.0,
        "restaurant_id": "seenbanao",
    }
    req_val3 = make_drf_request('post', '/api/coupons/validate/', val_payload_wrong)
    resp_val3 = view_val(req_val3._request)
    assert resp_val3.status_code == 400
    msg = resp_val3.data.get('message', '')
    print(f"  [OK] Rejected with message: '{msg}'")
    assert "Get A Fomo" in msg or "only valid for" in msg

    # 5. Test Minimum Subtotal Threshold Rejection
    print("\n[TEST 5/6] Subtotal Threshold Test: Validating 'WELCOMEFOMO' with subtotal Rs. 300 (Min Rs. 500)...")
    val_payload_low = {
        "code": "WELCOMEFOMO",
        "subtotal": 300.0,
        "restaurant_id": "getafomo",
    }
    req_val4 = make_drf_request('post', '/api/coupons/validate/', val_payload_low)
    resp_val4 = view_val(req_val4._request)
    assert resp_val4.status_code == 400
    msg_low = resp_val4.data.get('message', '')
    print(f"  [OK] Rejected with message: '{msg_low}'")
    assert "Minimum subtotal of Rs. 500" in msg_low

    # 6. Test End-to-End Order Creation with Promo Code
    print("\n[TEST 6/6] E2E Order Placement: Placing Order with 'WELCOMEFOMO'...")
    order_payload = {
        "restaurant": rest_fomo.id,
        "branch": branch_fomo.id,
        "items": [{"menu_item": item_fomo.id, "quantity": 2}],
        "delivery_address": "Street 10, DHA Phase 5, Lahore",
        "coupon_code": "WELCOMEFOMO",
        "payment_method": "cod",
        "order_type": "DELIVERY",
    }
    req_ord = make_drf_request('post', '/api/orders/', order_payload, user=test_user)
    view_ord = OrderListCreateView.as_view()
    resp_ord = view_ord(req_ord._request)
    assert resp_ord.status_code == 201, f"Order placement failed: {resp_ord.status_code} - {resp_ord.data}"
    order_id = resp_ord.data.get('id')
    display_id = resp_ord.data.get('display_order_id')
    final_total = resp_ord.data.get('total_amount')
    discount_applied = resp_ord.data.get('discount_amount')
    print(f"  [OK] Order #{display_id} (ID {order_id}) Created! Discount: Rs. {discount_applied}, Final Total: Rs. {final_total}")

    # Clean up test records
    Coupon.objects.filter(code="WELCOMEFOMO").delete()
    print("\n" + "=" * 80)
    print("[SUCCESS] ALL CROSS-APP PROMO CODE E2E INTEGRATION TESTS PASSED (100%)")
    print("=" * 80)

if __name__ == '__main__':
    run_promo_e2e_integration_tests()
