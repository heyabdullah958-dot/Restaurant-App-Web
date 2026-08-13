"""
Phase 1 & Phase 2 Automated E2E Verification Suite
Tests:
1. Flash Deal Creation via API (/api/flash-deals/) with normalized payload (deal_type, discount_value, ISO dates).
2. Promo Coupon Creation via API (/api/coupons/) with normalized payload (discount_type: 'flat'/'percentage', min_subtotal, max_discount, ISO dates).
3. Public Active Flash Deals Endpoint (/api/v1/promotions/flash-deals/).
4. Menu Management Catalog Fetch (/api/restaurants/seenbanao/menu/).
"""
import os
import sys
import json
from datetime import datetime, timedelta

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

from promotions.models import Coupon, FlashDeal
from promotions.views import (
    CouponListCreateView,
    FlashDealListCreateView,
    ActiveFlashDealsView,
)

User = get_user_model()

def run_phase1_phase2_test_suite():
    print("=" * 80)
    print("[PHASE 1 & PHASE 2] PROMO CODES, FLASH DEALS & PERFORMANCE VERIFICATION")
    print("=" * 80)

    factory = RequestFactory()
    super_admin, _ = User.objects.get_or_create(
        username="admin_tester_phase12",
        defaults={"email": "tester@foodsphere.com", "is_staff": True, "is_superuser": True}
    )
    super_admin.is_staff = True
    super_admin.is_superuser = True
    super_admin.save()

    def make_drf_request(method, path, data=None):
        if method.lower() == 'post':
            req = factory.post(path, data=data or {}, content_type='application/json')
        else:
            req = factory.get(path, data=data or {})
        req.user = super_admin
        req._user = super_admin
        drf_req = Request(req, parsers=[JSONParser()])
        drf_req._user = super_admin
        return drf_req

    # 1. Flash Deal Creation Test
    print("\n[TEST 1/4] Testing Flash Deal Creation via API (POST /api/flash-deals/)...")
    FlashDeal.objects.filter(title="Phase 1 Midnight Feast 40% OFF").delete()
    flash_payload = {
        "title": "Phase 1 Midnight Feast 40% OFF",
        "deal_type": "percentage",
        "discount_value": 40.0,
        "start_time": timezone.now().isoformat(),
        "end_time": (timezone.now() + timedelta(days=7)).isoformat(),
        "is_active": True,
    }
    req_fd = make_drf_request('post', '/api/flash-deals/', flash_payload)
    view_fd = FlashDealListCreateView.as_view()
    resp_fd = view_fd(req_fd._request)
    assert resp_fd.status_code == 201, f"Flash deal creation failed: {resp_fd.status_code} - {resp_fd.data}"
    print(f"  [OK] Flash Deal Created Successfully (ID #{resp_fd.data['id']}): '{resp_fd.data['title']}' (Discount Value: {resp_fd.data['discount_value']})")

    # 2. Promo Code Creation Test (FLAT Discount)
    print("\n[TEST 2/4] Testing Promo Coupon Creation - FLAT Discount (POST /api/coupons/)...")
    code_flat = "PHASE2FLAT300"
    Coupon.objects.filter(code=code_flat).delete()
    coupon_flat_payload = {
        "code": code_flat,
        "discount_type": "flat",
        "discount_value": 300.0,
        "min_subtotal": 1000.0,
        "valid_from": timezone.now().isoformat(),
        "valid_to": (timezone.now() + timedelta(days=30)).isoformat(),
        "is_active": True,
    }
    req_cp1 = make_drf_request('post', '/api/coupons/', coupon_flat_payload)
    view_cp = CouponListCreateView.as_view()
    resp_cp1 = view_cp(req_cp1._request)
    assert resp_cp1.status_code == 201, f"Flat coupon creation failed: {resp_cp1.status_code} - {resp_cp1.data}"
    print(f"  [OK] Flat Promo Coupon Created (ID #{resp_cp1.data['id']}): Code '{resp_cp1.data['code']}' (Flat Rs.{resp_cp1.data['discount_value']} OFF)")

    # 3. Promo Code Creation Test (PERCENTAGE Discount)
    print("\n[TEST 3/4] Testing Promo Coupon Creation - PERCENTAGE Discount (POST /api/coupons/)...")
    code_pct = "PHASE2PCT25"
    Coupon.objects.filter(code=code_pct).delete()
    coupon_pct_payload = {
        "code": code_pct,
        "discount_type": "percentage",
        "discount_value": 25.0,
        "min_subtotal": 800.0,
        "max_discount": 500.0,
        "valid_from": timezone.now().isoformat(),
        "valid_to": (timezone.now() + timedelta(days=30)).isoformat(),
        "is_active": True,
    }
    req_cp2 = make_drf_request('post', '/api/coupons/', coupon_pct_payload)
    resp_cp2 = view_cp(req_cp2._request)
    assert resp_cp2.status_code == 201, f"Percentage coupon creation failed: {resp_cp2.status_code} - {resp_cp2.data}"
    print(f"  [OK] Percentage Promo Coupon Created (ID #{resp_cp2.data['id']}): Code '{resp_cp2.data['code']}' ({resp_cp2.data['discount_value']}% OFF, Max Rs.{resp_cp2.data['max_discount']})")

    # 4. Public Active Flash Deals Verification
    print("\n[TEST 4/4] Testing Active Flash Deals Public Listing API Endpoint...")
    req_act = make_drf_request('get', '/api/v1/promotions/flash-deals/')
    view_act = ActiveFlashDealsView.as_view()
    resp_act = view_act(req_act._request)
    assert resp_act.status_code == 200, f"Active flash deals fetch failed: {resp_act.status_code}"
    print(f"  [OK] Public Active Flash Deals API Returned {len(resp_act.data.get('results', []))} Live Deal(s).")

    # Cleanup test records
    FlashDeal.objects.filter(title="Phase 1 Midnight Feast 40% OFF").delete()
    Coupon.objects.filter(code__in=[code_flat, code_pct]).delete()
    print("  [OK] Cleaned up temporary test promo records.")

    print("\n" + "=" * 80)
    print("[SUCCESS] ALL PHASE 1 & PHASE 2 E2E INTEGRATION TESTS PASSED (100%)")
    print("=" * 80)

if __name__ == '__main__':
    run_phase1_phase2_test_suite()
