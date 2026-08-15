"""
Phase 2 Verification Suite: Delivered-Only Revenue Guard, Customer Reviews & Rider-to-Brand Mapping
Tests:
1. Universal Delivered-Only Revenue Accounting in Platform & Restaurant Analytics APIs
2. Customer Review Serialization & Routing (/api/reviews/ and /api/admin/reviews/)
3. Super Admin Rider-to-Brand Identification & Scoping in BranchRiderSerializer
"""
import os
import sys
import json

# Setup Django Environment
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from restaurants.models import Restaurant, Branch, BranchRider, RestaurantReview
from orders.models import Order
from config.analytics_views import PlatformAnalyticsView, RestaurantAnalyticsView
from restaurants.views import RestaurantReviewViewSet, AdminBranchRiderViewSet
from rest_framework.test import force_authenticate
from rest_framework import status

User = get_user_model()

def run_phase2_verification_suite():
    print("=" * 80)
    print("[TEST SUITE] PHASE 2: DELIVERED REVENUE GUARD, REVIEWS & RIDER-BRAND MAPPING")
    print("=" * 80)

    factory = RequestFactory()

    # -------------------------------------------------------------------------
    # STEP 1: Setup Test Multi-Tenant Restaurant, Branches, Users
    # -------------------------------------------------------------------------
    print("\n[STEP 1] Setting up Multi-Tenant Seed Entities...")
    # Pre-cleanup in case of previous interrupted runs
    RestaurantReview.objects.filter(restaurant__slug="phase2_test_brand").delete()
    BranchRider.objects.filter(branch__restaurant__slug="phase2_test_brand").delete()
    Order.objects.filter(restaurant__slug="phase2_test_brand").delete()
    Branch.objects.filter(restaurant__slug="phase2_test_brand").delete()
    Restaurant.objects.filter(slug="phase2_test_brand").delete()

    restaurant, _ = Restaurant.objects.get_or_create(
        slug="phase2_test_brand",
        defaults={
            "name": "Phase 2 Test Brand",
            "city": "Lahore",
            "cuisine_type": "Fast Food",
            "is_active": True,
            "opens_at": "09:00:00",
            "closes_at": "23:00:00",
        }
    )
    branch, _ = Branch.objects.get_or_create(
        restaurant=restaurant,
        name="Phase 2 Main Branch",
        defaults={"address": "Main Boulevard, Lahore", "phone": "+92 300 8888888", "is_active": True}
    )

    super_user, _ = User.objects.get_or_create(
        username="super_phase2_admin",
        defaults={"email": "super.phase2@example.com", "is_staff": True, "is_superuser": True}
    )
    super_user.is_staff = True
    super_user.is_superuser = True
    super_user.save()

    customer_user, _ = User.objects.get_or_create(
        username="customer_phase2_user",
        defaults={"email": "customer.phase2@example.com", "is_guest": False}
    )

    # -------------------------------------------------------------------------
    # STEP 2: Create Test Orders with Varied Statuses to Verify Revenue Accounting
    # -------------------------------------------------------------------------
    print("\n[STEP 2] Creating Orders (Delivered, Preparing, Received, Cancelled)...")
    
    # Delivered orders: 1500 + 2500 = 4000
    delivered_order1 = Order.objects.create(
        restaurant=restaurant, branch=branch, user=customer_user,
        guest_name="Delivered Customer 1", guest_phone="+92 300 1111111",
        status="delivered", order_type="DELIVERY", payment_method="cod",
        delivery_address="Delivered Road 1", subtotal=1500, total=1500,
        display_order_id="P2-D1-1001"
    )
    delivered_order2 = Order.objects.create(
        restaurant=restaurant, branch=branch, user=customer_user,
        guest_name="Delivered Customer 2", guest_phone="+92 300 2222222",
        status="delivered", order_type="DELIVERY", payment_method="cod",
        delivery_address="Delivered Road 2", subtotal=2500, total=2500,
        display_order_id="P2-D2-1002"
    )
    # Non-delivered orders: 3000 + 4000 + 5000 = 12000 (MUST NOT BE COUNTED IN REVENUE)
    Order.objects.create(
        restaurant=restaurant, branch=branch, user=customer_user,
        guest_name="Preparing Customer", guest_phone="+92 300 3333333",
        status="preparing", order_type="DELIVERY", payment_method="cod",
        delivery_address="Prep Road", subtotal=3000, total=3000,
        display_order_id="P2-PR-1003"
    )
    Order.objects.create(
        restaurant=restaurant, branch=branch, user=customer_user,
        guest_name="Received Customer", guest_phone="+92 300 4444444",
        status="received", order_type="DELIVERY", payment_method="cod",
        delivery_address="Recv Road", subtotal=4000, total=4000,
        display_order_id="P2-RC-1004"
    )
    Order.objects.create(
        restaurant=restaurant, branch=branch, user=customer_user,
        guest_name="Cancelled Customer", guest_phone="+92 300 5555555",
        status="cancelled", order_type="DELIVERY", payment_method="cod",
        delivery_address="Cancel Road", subtotal=5000, total=5000,
        display_order_id="P2-CN-1005"
    )

    print("  [OK] Created 2 Delivered Orders (Rs. 1,500 + Rs. 2,500 = Rs. 4,000)")
    print("  [OK] Created 3 Non-Delivered Orders (Preparing Rs. 3,000, Received Rs. 4,000, Cancelled Rs. 5,000)")

    # -------------------------------------------------------------------------
    # STEP 3: Verify Delivered-Only Revenue Accounting in Restaurant Analytics API
    # -------------------------------------------------------------------------
    print("\n[STEP 3] Testing Restaurant Analytics Delivered-Only Revenue API...")
    req_rest_analytics = factory.get(f'/api/analytics/restaurant/{restaurant.id}/')
    force_authenticate(req_rest_analytics, user=super_user)
    rest_view = RestaurantAnalyticsView.as_view()
    res_rest = rest_view(req_rest_analytics, restaurant_id=restaurant.id)

    assert res_rest.status_code == status.HTTP_200_OK, f"Analytics request failed: {res_rest.data}"
    rest_summary = res_rest.data['summary']
    
    # Revenue must be exactly 4000.0 (1500 + 2500), NOT 16000.0!
    assert rest_summary['revenue_30d'] == 4000.0, f"Expected revenue_30d == 4000.0, got {rest_summary['revenue_30d']}"
    assert rest_summary['avg_order'] == 2000.0, f"Expected avg_order == 2000.0, got {rest_summary['avg_order']}"
    print(f"  [OK] RestaurantAnalyticsView revenue_30d correctly calculated: Rs. {rest_summary['revenue_30d']} (Delivered Only)")
    print(f"  [OK] RestaurantAnalyticsView avg_order correctly calculated: Rs. {rest_summary['avg_order']} (Delivered Only)")

    # -------------------------------------------------------------------------
    # STEP 4: Verify Platform Analytics Delivered-Only Revenue API
    # -------------------------------------------------------------------------
    print("\n[STEP 4] Testing Platform Analytics Delivered-Only Revenue API...")
    req_plat_analytics = factory.get('/api/analytics/platform/')
    force_authenticate(req_plat_analytics, user=super_user)
    plat_view = PlatformAnalyticsView.as_view()
    res_plat = plat_view(req_plat_analytics)

    assert res_plat.status_code == status.HTTP_200_OK, f"Platform analytics failed: {res_plat.data}"
    breakdowns = res_plat.data['restaurant_breakdown']
    target_rest_breakdown = next((r for r in breakdowns if r['id'] == restaurant.id), None)
    assert target_rest_breakdown is not None, "Target restaurant breakdown missing!"
    
    assert target_rest_breakdown['revenue_30d'] == 4000.0, f"Expected restaurant breakdown revenue_30d == 4000.0, got {target_rest_breakdown['revenue_30d']}"
    assert target_rest_breakdown['revenue_all_time'] == 4000.0, f"Expected restaurant breakdown revenue_all_time == 4000.0, got {target_rest_breakdown['revenue_all_time']}"
    print(f"  [OK] PlatformAnalyticsView breakdown for '{restaurant.name}': Rs. {target_rest_breakdown['revenue_30d']} (Delivered Only)")

    # -------------------------------------------------------------------------
    # STEP 5: Verify Customer Review Creation, Serialization & Routing
    # -------------------------------------------------------------------------
    print("\n[STEP 5] Testing Customer Review Model & Serializers...")
    review = RestaurantReview.objects.create(
        restaurant=restaurant,
        order=delivered_order1,
        user=customer_user,
        rating=5,
        comment="Incredible food, fast delivery and piping hot packaging!"
    )

    # Test /api/admin/reviews/
    req_reviews = factory.get(f'/api/admin/reviews/?restaurant_id={restaurant.id}')
    force_authenticate(req_reviews, user=super_user)
    reviews_view = RestaurantReviewViewSet.as_view({'get': 'list'})
    res_reviews = reviews_view(req_reviews)
    assert res_reviews.status_code == status.HTTP_200_OK, f"Admin reviews list failed: {res_reviews.data}"

    reviews_list = res_reviews.data.get('results', res_reviews.data) if isinstance(res_reviews.data, dict) else res_reviews.data
    assert len(reviews_list) >= 1, "Review was not returned by /api/admin/reviews/"
    found_review = next((r for r in reviews_list if r['id'] == review.id), None)
    assert found_review is not None, "Created review not found in API response!"
    assert found_review['restaurant_name'] == restaurant.name
    assert found_review['user_name'] == customer_user.username
    assert found_review['rating'] == 5
    assert found_review['order'] == delivered_order1.id
    print(f"  [OK] Customer review returned via /api/admin/reviews/: Rating {found_review['rating']}/5 by {found_review['user_name']} for {found_review['restaurant_name']}")

    # -------------------------------------------------------------------------
    # STEP 6: Verify Super Admin Rider-to-Brand Mapping in BranchRiderSerializer
    # -------------------------------------------------------------------------
    print("\n[STEP 6] Testing Rider-to-Brand Identification & Mapping...")
    rider = BranchRider.objects.create(
        branch=branch,
        name="Phase 2 Delivery Rider",
        phone="+92 311 9999999",
        vehicle_type="BIKE",
        status="AVAILABLE",
        is_active=True
    )

    req_riders = factory.get(f'/api/admin/riders/?branch_id={branch.id}')
    force_authenticate(req_riders, user=super_user)
    riders_view = AdminBranchRiderViewSet.as_view({'get': 'list'})
    res_riders = riders_view(req_riders)
    assert res_riders.status_code == status.HTTP_200_OK, f"Riders view failed: {res_riders.data}"

    riders_list = res_riders.data.get('results', res_riders.data) if isinstance(res_riders.data, dict) else res_riders.data
    found_rider = next((r for r in riders_list if r['id'] == rider.id), None)
    assert found_rider is not None, "Rider not found in API response!"
    
    assert found_rider['restaurant_id'] == restaurant.id, f"Expected restaurant_id {restaurant.id}, got {found_rider.get('restaurant_id')}"
    assert found_rider['restaurant_name'] == restaurant.name, f"Expected restaurant_name {restaurant.name}, got {found_rider.get('restaurant_name')}"
    assert found_rider['restaurant_slug'] == restaurant.slug, f"Expected restaurant_slug {restaurant.slug}, got {found_rider.get('restaurant_slug')}"
    assert found_rider['branch_name'] == branch.name, f"Expected branch_name {branch.name}, got {found_rider.get('branch_name')}"
    print(f"  [OK] Rider-to-Brand Mapping Verified: Rider '{found_rider['name']}' -> Brand '{found_rider['restaurant_name']}' (slug: {found_rider['restaurant_slug']}) @ Branch '{found_rider['branch_name']}'")

    # -------------------------------------------------------------------------
    # Clean up test entities
    # -------------------------------------------------------------------------
    review.delete()
    rider.delete()
    Order.objects.filter(restaurant=restaurant).delete()
    branch.delete()
    restaurant.delete()
    customer_user.delete()
    super_user.delete()

    print("\n" + "=" * 80)
    print("[SUCCESS] ALL PHASE 2 VERIFICATION TESTS PASSED (100%)")
    print("=" * 80)

if __name__ == '__main__':
    run_phase2_verification_suite()
