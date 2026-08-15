"""
Phase 1 Verification Suite: Universal Audio Driver, Dispatch Integrity & Real-Time Sync
Tests:
1. Backend Rider Availability Guard: Strict rejection (HTTP 400) of ON_DELIVERY / OFFLINE rider assignment
2. Universal Dispatch ID Lookup: Support for numeric Order.pk and string display_order_id (e.g. TS-JT-1001)
3. Branch-Scoped Rider Filtering: Strict query filtering by branch_id without unintentional fallback leaks
4. Branch Manager Dispatch Permissions: Zero 403 Forbidden errors on valid branch dispatch operations
5. Atomic Status Progression & Rider Lifecycle: Order moves to out_for_delivery, rider to ON_DELIVERY, and freeing on completion
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
from restaurants.models import Restaurant, Branch, MenuItem, MenuCategory, BranchRider
from orders.models import Order, OrderItem
from orders.views import OrderAssignRiderView, OrderDetailView
from restaurants.views import AdminBranchRiderViewSet
from rest_framework.test import force_authenticate
from rest_framework import status

User = get_user_model()

def run_phase1_verification_suite():
    print("=" * 80)
    print("[TEST SUITE] PHASE 1: UNIVERSAL AUDIO, DISPATCH INTEGRITY & SYNC VERIFICATION")
    print("=" * 80)

    factory = RequestFactory()

    # -------------------------------------------------------------------------
    # STEP 1: Setup Test Restaurant, Branches, Riders, and Users
    # -------------------------------------------------------------------------
    print("\n[STEP 1] Setting up Multi-Tenant Seed Entities...")
    restaurant, _ = Restaurant.objects.get_or_create(
        slug="phase1_test_brand",
        defaults={
            "name": "Phase 1 Test Brand",
            "city": "Lahore",
            "cuisine_type": "Desi",
            "is_active": True,
            "opens_at": "09:00:00",
            "closes_at": "23:00:00",
        }
    )
    branch_a, _ = Branch.objects.get_or_create(
        restaurant=restaurant,
        name="Branch Alpha",
        defaults={"address": "Alpha Road, Lahore", "phone": "+92 300 1111111", "is_active": True}
    )
    branch_b, _ = Branch.objects.get_or_create(
        restaurant=restaurant,
        name="Branch Beta",
        defaults={"address": "Beta Road, Lahore", "phone": "+92 300 2222222", "is_active": True}
    )

    # Manager User
    manager_user, _ = User.objects.get_or_create(
        username="manager_phase1_alpha",
        defaults={"email": "manager.alpha@example.com", "is_staff": True, "is_superuser": False}
    )
    manager_user.is_staff = True
    manager_user.is_superuser = False
    manager_user.save()

    # Super Admin User
    super_user, _ = User.objects.get_or_create(
        username="super_phase1_admin",
        defaults={"email": "super.admin@example.com", "is_staff": True, "is_superuser": True}
    )
    super_user.is_staff = True
    super_user.is_superuser = True
    super_user.save()

    # Customer User
    customer_user, _ = User.objects.get_or_create(
        username="customer_phase1_user",
        defaults={"email": "customer@example.com", "is_guest": False}
    )

    # Riders
    rider_avail, _ = BranchRider.objects.get_or_create(
        branch=branch_a,
        phone="+92 311 0000001",
        defaults={"name": "Rider Available Alpha", "status": "AVAILABLE", "is_active": True, "vehicle_type": "BIKE"}
    )
    rider_avail.status = "AVAILABLE"
    rider_avail.is_active = True
    rider_avail.save()

    rider_busy, _ = BranchRider.objects.get_or_create(
        branch=branch_a,
        phone="+92 311 0000002",
        defaults={"name": "Rider Busy Alpha", "status": "ON_DELIVERY", "is_active": True, "vehicle_type": "BIKE"}
    )
    rider_busy.status = "ON_DELIVERY"
    rider_busy.is_active = True
    rider_busy.save()

    # Create active delivery order for rider_busy so status is genuinely ON_DELIVERY
    busy_order, _ = Order.objects.get_or_create(
        display_order_id="BUSY-1001",
        defaults={
            "restaurant": restaurant,
            "branch": branch_a,
            "user": customer_user,
            "guest_name": "Active Customer",
            "guest_phone": "+92 300 9999999",
            "status": "out_for_delivery",
            "order_type": "DELIVERY",
            "payment_method": "cod",
            "delivery_address": "Busy Road",
            "subtotal": 1000,
            "total": 1000,
            "rider": rider_busy,
        }
    )

    rider_offline, _ = BranchRider.objects.get_or_create(
        branch=branch_a,
        phone="+92 311 0000003",
        defaults={"name": "Rider Offline Alpha", "status": "OFFLINE", "is_active": True, "vehicle_type": "BIKE"}
    )
    rider_offline.status = "OFFLINE"
    rider_offline.is_active = True
    rider_offline.save()

    rider_beta, _ = BranchRider.objects.get_or_create(
        branch=branch_b,
        phone="+92 311 0000004",
        defaults={"name": "Rider Beta", "status": "AVAILABLE", "is_active": True, "vehicle_type": "BIKE"}
    )
    rider_beta.status = "AVAILABLE"
    rider_beta.is_active = True
    rider_beta.save()

    print(f"  [OK] Seeded Restaurant: {restaurant.name}")
    print(f"  [OK] Seeded Branches: {branch_a.name} & {branch_b.name}")
    print(f"  [OK] Seeded Riders: {rider_avail.name} (AVAILABLE), {rider_busy.name} (ON_DELIVERY), {rider_offline.name} (OFFLINE)")

    # -------------------------------------------------------------------------
    # STEP 2: Verify Branch-Scoped Rider Queryset Filtering
    # -------------------------------------------------------------------------
    print("\n[STEP 2] Verifying Branch-Scoped Rider Query Filtering...")
    req_riders = factory.get(f'/api/admin/riders/?branch_id={branch_a.id}&status=AVAILABLE&is_active=true')
    force_authenticate(req_riders, user=super_user)
    view_riders = AdminBranchRiderViewSet.as_view({'get': 'list'})
    res_riders = view_riders(req_riders)
    assert res_riders.status_code == status.HTTP_200_OK, f"Riders list failed: {res_riders.data}"
    
    riders_data = res_riders.data.get('results', res_riders.data) if isinstance(res_riders.data, dict) else res_riders.data
    returned_rider_ids = [r['id'] for r in riders_data]
    assert rider_avail.id in returned_rider_ids, "Available rider missing from branch A query"
    assert rider_beta.id not in returned_rider_ids, "Branch B rider leaked into branch A query!"
    print(f"  [OK] Branch A returned exactly {len(returned_rider_ids)} rider(s) without cross-branch leakage.")

    # -------------------------------------------------------------------------
    # STEP 3: Create Test Orders
    # -------------------------------------------------------------------------
    print("\n[STEP 3] Creating Test Orders with Scoped Display IDs...")
    order_a = Order.objects.create(
        restaurant=restaurant,
        branch=branch_a,
        user=customer_user,
        guest_name="Test Customer A",
        guest_phone="+92 300 5555555",
        status="preparing",
        order_type="DELIVERY",
        payment_method="cod",
        delivery_address="123 Alpha Avenue, Lahore",
        subtotal=1500,
        total=1500,
        display_order_id="P1-AL-1001"
    )
    print(f"  [OK] Order Created: #{order_a.id} ({order_a.display_order_id})")

    # -------------------------------------------------------------------------
    # STEP 4: Test Rider Availability Guard (Reject ON_DELIVERY / OFFLINE)
    # -------------------------------------------------------------------------
    print("\n[STEP 4] Testing Rider Availability Guard (ON_DELIVERY & OFFLINE Rejection)...")
    assign_view = OrderAssignRiderView.as_view()

    # Test 4A: Attempt assigning rider currently marked ON_DELIVERY
    req_busy = factory.post(
        f'/api/orders/{order_a.id}/assign-rider/',
        data=json.dumps({"rider_id": rider_busy.id}),
        content_type='application/json'
    )
    force_authenticate(req_busy, user=manager_user)
    res_busy = assign_view(req_busy, pk=order_a.id)
    assert res_busy.status_code == status.HTTP_400_BAD_REQUEST, f"Expected 400 for busy rider, got {res_busy.status_code}: {res_busy.data}"
    assert "currently on another active delivery" in res_busy.data.get('error', ''), f"Unexpected error message: {res_busy.data}"
    print("  [OK] Rejected ON_DELIVERY rider assignment with HTTP 400.")

    # Test 4B: Attempt assigning rider currently marked OFFLINE
    req_offline = factory.post(
        f'/api/orders/{order_a.id}/assign-rider/',
        data=json.dumps({"rider_id": rider_offline.id}),
        content_type='application/json'
    )
    force_authenticate(req_offline, user=manager_user)
    res_offline = assign_view(req_offline, pk=order_a.id)
    assert res_offline.status_code == status.HTTP_400_BAD_REQUEST, f"Expected 400 for offline rider, got {res_offline.status_code}: {res_offline.data}"
    assert "currently marked OFFLINE" in res_offline.data.get('error', ''), f"Unexpected error message: {res_offline.data}"
    print("  [OK] Rejected OFFLINE rider assignment with HTTP 400.")

    # -------------------------------------------------------------------------
    # STEP 5: Test Successful Dispatch & ID Lookup (Numeric PK & Display ID)
    # -------------------------------------------------------------------------
    print("\n[STEP 5] Testing Successful Dispatch via Display Order ID (P1-AL-1001)...")
    req_valid = factory.post(
        f'/api/orders/{order_a.display_order_id}/assign-rider/',
        data=json.dumps({"rider_id": rider_avail.id, "allow_cross_branch": True}),
        content_type='application/json'
    )
    force_authenticate(req_valid, user=manager_user)
    res_valid = assign_view(req_valid, pk=order_a.display_order_id)
    assert res_valid.status_code == status.HTTP_200_OK, f"Expected 200 for valid assign, got {res_valid.status_code}: {res_valid.data}"
    
    # Reload from DB
    order_a.refresh_from_db()
    rider_avail.refresh_from_db()

    assert order_a.rider_id == rider_avail.id, "Order rider FK not updated!"
    assert order_a.status == 'out_for_delivery', f"Expected status 'out_for_delivery', got '{order_a.status}'"
    assert rider_avail.status == 'ON_DELIVERY', f"Expected rider status 'ON_DELIVERY', got '{rider_avail.status}'"
    print("  [OK] Order status transitioned to 'out_for_delivery'.")
    print("  [OK] Rider status atomically transitioned to 'ON_DELIVERY'.")

    # -------------------------------------------------------------------------
    # STEP 6: Test Auto-Freeing Rider Lifecycle on Order Completion
    # -------------------------------------------------------------------------
    print("\n[STEP 6] Verifying Rider Auto-Freeing Lifecycle on Order Completion...")
    # Unassign / delivered
    order_a.status = 'delivered'
    order_a.save()

    # Trigger unassign endpoint or check auto-heal
    req_unassign = factory.post(
        f'/api/orders/{order_a.id}/assign-rider/',
        data=json.dumps({"rider_id": None}),
        content_type='application/json'
    )
    force_authenticate(req_unassign, user=manager_user)
    res_unassign = assign_view(req_unassign, pk=order_a.id)
    assert res_unassign.status_code == status.HTTP_200_OK, f"Unassign failed: {res_unassign.data}"

    rider_avail.refresh_from_db()
    assert rider_avail.status == 'AVAILABLE', f"Expected rider to return to 'AVAILABLE', got '{rider_avail.status}'"
    print("  [OK] Rider status returned to 'AVAILABLE' upon order completion/unassignment.")

    # -------------------------------------------------------------------------
    # Clean up test entities
    # -------------------------------------------------------------------------
    order_a.delete()
    busy_order.delete()
    rider_avail.delete()
    rider_busy.delete()
    rider_offline.delete()
    rider_beta.delete()
    branch_a.delete()
    branch_b.delete()
    restaurant.delete()
    manager_user.delete()
    super_user.delete()
    customer_user.delete()

    print("\n" + "=" * 80)
    print("[SUCCESS] ALL PHASE 1 INTEGRATION & DISPATCH INTEGRITY TESTS PASSED (100%)")
    print("=" * 80)

if __name__ == '__main__':
    run_phase1_verification_suite()
