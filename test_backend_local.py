import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from restaurants.models import Restaurant, Branch
from users.models import User, ManagerProfile
from config.admin_utils import resolve_branch_for_order

def main():
    print("=============================================")
    print("      FoodSphere Local System Audit          ")
    print("=============================================")

    # 1. Audit Restaurants & Branches
    restaurants = Restaurant.objects.all()
    print(f"Total Restaurants: {restaurants.count()}")
    for r in restaurants:
        b_count = r.branches.count()
        print(f"  * {r.name} ({r.slug}): {b_count} branches")
        for b in r.branches.all():
            print(f"      - Branch: {b.name} | Address: {b.address}")

    # 2. Audit ManagerProfiles
    profiles = ManagerProfile.objects.select_related('user', 'restaurant', 'branch').all()
    print(f"\nTotal Manager Profiles: {profiles.count()}")
    for p in profiles:
        print(f"  * User: {p.user.username} -> {p.restaurant.name} / {p.branch.name} ({p.notification_email})")

    # 3. Audit Branch Auto-Assignment Logic
    print("\nTesting Branch Auto-Assignment Resolution...")
    test_cases = [
        ("tandooristoppk", "House 12, PIA Road, Johar Town, Lahore", None, None, "Johar Town"),
        ("tandooristoppk", "Wafaqi Colony, Johar Town, Lahore", None, None, "Johar Town"),
        ("tandooristoppk", "Wafaqi Colony", None, None, "Johar Town"),
        ("tandooristoppk", "Near UMT, Wafaqi Colony", 31.4691, 74.2917, "Johar Town"),
        ("tandooristoppk", "Flat 4, Opposite Lake City Mall", None, None, "Lake City"),
        ("tandooristoppk", "Shop 5, GT Road Baghbanpura", None, None, "GT Road Baghbanpura"),
    ]

    all_passed = True
    for slug, addr, lat, lng, expected_branch in test_cases:
        rest = Restaurant.objects.get(slug=slug)
        assigned = resolve_branch_for_order(rest, addr, lat, lng)
        actual_name = assigned.name if assigned else "None"
        status = "PASSED" if actual_name == expected_branch else "FAILED"
        if status == "FAILED":
            all_passed = False
        print(f"  [{status}] Addr: '{addr}' -> Assigned: '{actual_name}' (Expected: '{expected_branch}')")

    # 4. Audit Order Status Manager Update Scoping
    print("\nTesting Order Status Manager Scoping & DRF PATCH...")
    from orders.models import Order
    from rest_framework.test import APIRequestFactory, force_authenticate
    from orders.views import OrderDetailView

    tandoori = Restaurant.objects.get(slug="tandooristoppk")
    jt_branch = Branch.objects.get(restaurant=tandoori, name="Johar Town")
    mgr_user = User.objects.get(username="manager_tandooristoppk_johar_town")

    # Create dummy order for testing status update
    test_order = Order.objects.create(
        restaurant=tandoori,
        branch=jt_branch,
        guest_name="Test Status Customer",
        guest_phone="03001234567",
        delivery_address="Test Address, Johar Town",
        subtotal=500.00,
        total=500.00,
        status="received"
    )

    factory = APIRequestFactory()
    request = factory.patch(f"/api/orders/{test_order.id}/", {"status": "preparing"}, format="json")
    force_authenticate(request, user=mgr_user)
    view = OrderDetailView.as_view()
    response = view(request, pk=test_order.id)

    test_order.refresh_from_db()
    if response.status_code == 200 and test_order.status == "preparing":
        print(f"  [PASSED] Manager updated Order #{test_order.id} status from 'received' -> '{test_order.status}' (HTTP {response.status_code})")
    else:
        print(f"  [FAILED] Response code {response.status_code}, status '{test_order.status}'")
        all_passed = False

    # 5. Audit Security: Purge Lockdown & Cancellation Safeguards & EOD Cash Register
    print("\nTesting Security & Accountability Governance...")
    from orders.views import PurgeOrdersView, OrderDetailView
    from orders.cash_register_views import BranchCashRegisterView, VerifyCashRegisterView
    from rest_framework.test import APIRequestFactory, force_authenticate
    from orders.models import BranchCashRegister

    admin_user = User.objects.filter(is_superuser=True).first()
    if not admin_user:
        admin_user = User.objects.create_superuser('test_admin', 'admin@test.com', 'admin123')

    # Test 5A: PurgeOrdersView Lockdown
    factory = APIRequestFactory()
    req_mgr = factory.post("/api/orders/purge-all/")
    force_authenticate(req_mgr, user=mgr_user)
    resp_mgr = PurgeOrdersView.as_view()(req_mgr)

    req_admin = factory.post("/api/orders/purge-all/")
    force_authenticate(req_admin, user=admin_user)
    resp_admin = PurgeOrdersView.as_view()(req_admin)

    if resp_mgr.status_code == 403 and resp_admin.status_code == 200:
        print("  [PASSED] Purge Lockdown: Branch Manager = HTTP 403 Forbidden | Super Admin = HTTP 200 OK")
    else:
        print(f"  [FAILED] Purge Lockdown: Manager {resp_mgr.status_code}, Admin {resp_admin.status_code}")
        all_passed = False

    # Test 5B: Cancellation Reason Safeguard
    test_ord = Order.objects.create(
        restaurant=tandoori,
        branch=jt_branch,
        guest_name="Cancel Test",
        guest_phone="03000000000",
        delivery_address="PIA Road",
        subtotal=100.00,
        total=100.00,
        status="delivered"
    )

    # Branch Manager attempting to cancel delivered order
    req_cancel_del = factory.patch(f"/api/orders/{test_ord.id}/", {"status": "cancelled", "cancellation_reason": "Rider mistake"}, format="json")
    force_authenticate(req_cancel_del, user=mgr_user)
    resp_cancel_del = OrderDetailView.as_view()(req_cancel_del, pk=test_ord.id)

    # Missing cancellation reason
    req_no_reason = factory.patch(f"/api/orders/{test_ord.id}/", {"status": "cancelled"}, format="json")
    force_authenticate(req_no_reason, user=admin_user)
    resp_no_reason = OrderDetailView.as_view()(req_no_reason, pk=test_ord.id)

    if resp_cancel_del.status_code == 403 and resp_no_reason.status_code == 400:
        print("  [PASSED] Cancellation Safeguards: Delivered Order Cancel by Manager = 403 Forbidden | Missing Reason = 400 Bad Request")
    else:
        print(f"  [FAILED] Cancellation Safeguards: Delivered Cancel {resp_cancel_del.status_code}, Missing Reason {resp_no_reason.status_code}")
        all_passed = False

    test_ord.delete()

    # Test 5C: Daily EOD Cash Register Submission & Verification
    req_cr_post = factory.post("/api/orders/cash-register/", {"branch_id": jt_branch.id, "date": "2026-07-26", "total_cod_handed_over": 12500.00, "notes": "Handover to HQ"}, format="json")
    force_authenticate(req_cr_post, user=mgr_user)
    resp_cr_post = BranchCashRegisterView.as_view()(req_cr_post)

    cr_entry = BranchCashRegister.objects.filter(branch=jt_branch, date="2026-07-26").first()
    if resp_cr_post.status_code == 200 and cr_entry:
        req_verify = factory.post(f"/api/orders/cash-register/{cr_entry.id}/verify/")
        force_authenticate(req_verify, user=admin_user)
        resp_verify = VerifyCashRegisterView.as_view()(req_verify, pk=cr_entry.id)
        cr_entry.refresh_from_db()
        if resp_verify.status_code == 200 and cr_entry.is_verified_by_admin:
            print("  [PASSED] Daily EOD Cash Register: Manager Submission = 200 OK | Super Admin Verification = 200 OK")
        else:
            print(f"  [FAILED] Cash Register Verification: {resp_verify.status_code}")
            all_passed = False
    else:
        print(f"  [FAILED] Cash Register Post: {resp_cr_post.status_code}")
        all_passed = False

    if cr_entry:
        cr_entry.delete()

    # Test 5D: User Isolation & Cross-Account Order History Safeguard
    from orders.views import MyOrdersListView
    user_a, _ = User.objects.get_or_create(username="test_user_a", defaults={"email": "usera@test.com"})
    user_b, _ = User.objects.get_or_create(username="test_user_b", defaults={"email": "userb@test.com"})
    
    ord_a = Order.objects.create(
        user=user_a, restaurant=rest, branch=jt_branch,
        delivery_address="Address A", subtotal=500.00, total=500.00, status="received"
    )

    req_my_b = factory.get("/api/orders/my-orders/")
    force_authenticate(req_my_b, user=user_b)
    resp_my_b = MyOrdersListView.as_view()(req_my_b)

    req_my_a = factory.get("/api/orders/my-orders/")
    force_authenticate(req_my_a, user=user_a)
    resp_my_a = MyOrdersListView.as_view()(req_my_a)

    user_b_orders_count = len(resp_my_b.data if isinstance(resp_my_b.data, list) else resp_my_b.data.get('results', []))
    user_a_orders_count = len(resp_my_a.data if isinstance(resp_my_a.data, list) else resp_my_a.data.get('results', []))

    if user_b_orders_count == 0 and user_a_orders_count >= 1:
        print("  [PASSED] Cross-Account Isolation: User B receives 0 orders | User A receives own order history (HTTP 200)")
    else:
        print(f"  [FAILED] Cross-Account Isolation: User B got {user_b_orders_count} orders, User A got {user_a_orders_count}")
        all_passed = False

    ord_a.delete()
    user_a.delete()
    user_b.delete()

    # Test 5E: Multi-Tenant RBAC Branch Scoping Safeguard
    from restaurants.views import AdminBranchRiderViewSet, AdminBranchViewSet
    from restaurants.models import BranchRider

    # Create dummy branch for another restaurant
    other_branch = Branch.objects.exclude(restaurant=tandoori).first()

    req_rider_list = factory.get("/api/admin/riders/")
    force_authenticate(req_rider_list, user=mgr_user)
    resp_rider_list = AdminBranchRiderViewSet.as_view({'get': 'list'})(req_rider_list)

    # Manager attempts to create rider for another branch
    req_cross_post = factory.post("/api/admin/riders/", {
        "name": "Intruder Rider",
        "phone": "03999999999",
        "vehicle_type": "BIKE",
        "branch": other_branch.id if other_branch else 9999,
        "status": "AVAILABLE",
        "is_active": True
    }, format="json")
    force_authenticate(req_cross_post, user=mgr_user)
    resp_cross_post = AdminBranchRiderViewSet.as_view({'post': 'create'})(req_cross_post)

    # Manager lists branches
    req_br_list = factory.get("/api/admin/branches/")
    force_authenticate(req_br_list, user=mgr_user)
    resp_br_list = AdminBranchViewSet.as_view({'get': 'list'})(req_br_list)

    br_count = len(resp_br_list.data) if hasattr(resp_br_list, 'data') and isinstance(resp_br_list.data, list) else 0

    if resp_cross_post.status_code == 403 and br_count <= 1:
        print("  [PASSED] Multi-Tenant RBAC Scoping: Cross-Branch Rider Create = 403 Forbidden | Manager Branch List Scoped = 1 Branch")
    else:
        print(f"  [FAILED] Multi-Tenant RBAC Scoping: Cross Post {resp_cross_post.status_code}, Branch Count {br_count}")
        all_passed = False

    # Test 5F: Duplicate Rider Phone Validation (Race Condition Defense)
    # Create first rider
    req_r1 = factory.post("/api/admin/riders/", {
        "name": "Rider One",
        "phone": "03009876543",
        "vehicle_type": "BIKE",
        "branch": jt_branch.id,
        "status": "AVAILABLE",
        "is_active": True
    }, format="json")
    force_authenticate(req_r1, user=mgr_user)
    resp_r1 = AdminBranchRiderViewSet.as_view({'post': 'create'})(req_r1)

    # Attempt duplicate rider creation with exact same phone number
    req_r2 = factory.post("/api/admin/riders/", {
        "name": "Rider Duplicate",
        "phone": "03009876543",
        "vehicle_type": "BIKE",
        "branch": jt_branch.id,
        "status": "AVAILABLE",
        "is_active": True
    }, format="json")
    force_authenticate(req_r2, user=mgr_user)
    resp_r2 = AdminBranchRiderViewSet.as_view({'post': 'create'})(req_r2)

    if resp_r1.status_code in (200, 201) and resp_r2.status_code == 400:
        print("  [PASSED] Duplicate Rider Defense: Primary creation = 201 Created | Duplicate phone submission = 400 Bad Request")
    else:
        print(f"  [FAILED] Duplicate Rider Defense: R1 Code {resp_r1.status_code}, R2 Code {resp_r2.status_code}")
        all_passed = False

    # Clean up test rider
    if resp_r1.status_code in (200, 201) and hasattr(resp_r1, 'data') and 'id' in resp_r1.data:
        BranchRider.objects.filter(id=resp_r1.data['id']).delete()

    # Test 5G: Checkout Branch Scoping & Multi-Tenant Isolation
    from restaurants.views import BranchListView
    req_unscoped = factory.get("/api/branches/")
    resp_unscoped = BranchListView.as_view()(req_unscoped)
    unscoped_data = resp_unscoped.data.get('data', []) if hasattr(resp_unscoped, 'data') else []

    jushh_rest = Restaurant.objects.get(slug="jushhpk")
    tandoori_rest = Restaurant.objects.get(slug="tandooristoppk")

    req_jushh = factory.get(f"/api/branches/?restaurant_id={jushh_rest.id}")
    resp_jushh = BranchListView.as_view()(req_jushh)
    jushh_branches = resp_jushh.data.get('data', []) if hasattr(resp_jushh, 'data') else []

    req_tandoori = factory.get(f"/api/branches/?restaurant_id={tandoori_rest.id}")
    resp_tandoori = BranchListView.as_view()(req_tandoori)
    tandoori_branches = resp_tandoori.data.get('data', []) if hasattr(resp_tandoori, 'data') else []

    jushh_valid = len(jushh_branches) > 0 and all(b.get('id') in [br.id for br in jushh_rest.branches.all()] for b in jushh_branches)
    tandoori_valid = len(tandoori_branches) > 0 and all(b.get('id') in [br.id for br in tandoori_rest.branches.all()] for b in tandoori_branches)

    if len(unscoped_data) == 0 and jushh_valid and tandoori_valid:
        print("  [PASSED] Checkout Branch Scoping: Un-scoped request = 0 branches | JushhPK scoped = JushhPK only | TandooriStoppk scoped = TandooriStoppk only")
    else:
        print(f"  [FAILED] Checkout Branch Scoping: Unscoped={len(unscoped_data)}, JushhValid={jushh_valid}, TandooriValid={tandoori_valid}")
        all_passed = False
    print("\nTesting Loyalty Points Redemption Flow...")
    from orders.views import OrderListCreateView
    from users.models import LoyaltyTransaction
    from restaurants.models import MenuItem

    menu_item = MenuItem.objects.filter(category__restaurant=tandoori, is_available=True).first()
    test_user_loyalty, _ = User.objects.get_or_create(username="loyalty_tester", defaults={"email": "loyalty@test.com", "loyalty_points": 218})
    test_user_loyalty.loyalty_points = 218
    test_user_loyalty.save()

    payload_redemption = {
        "restaurant": tandoori.id,
        "branch": jt_branch.id,
        "guest_name": "Loyalty Tester",
        "guest_phone": "03001234567",
        "payment_method": "cod",
        "delivery_address": "Test Street, Johar Town",
        "use_loyalty_points": True,
        "points_to_redeem": 100,
        "items": [
            {
                "menu_item": menu_item.id,
                "quantity": 2,
                "special_notes": "Extra spicy"
            }
        ]
    }

    req_order_pts = factory.post("/api/orders/", payload_redemption, format="json")
    force_authenticate(req_order_pts, user=test_user_loyalty)
    resp_order_pts = OrderListCreateView.as_view()(req_order_pts)

    test_user_loyalty.refresh_from_db()
    
    if resp_order_pts.status_code == 201:
        created_ord_data = resp_order_pts.data.get('data', resp_order_pts.data)
        order_discount = float(created_ord_data.get('discount', 0))
        redeemed_tx = LoyaltyTransaction.objects.filter(user=test_user_loyalty, transaction_type='redeemed').first()
        if order_discount == 100.0 and redeemed_tx:
            print(f"  [PASSED] Loyalty Redemption: Order discount Rs. {order_discount} applied | Points deducted. New Balance: {test_user_loyalty.loyalty_points}")
        else:
            print(f"  [FAILED] Discount={order_discount}, Redeemed Tx={redeemed_tx}")
            all_passed = False

        # Test 7: Cancellation Loyalty Point Refund & Reversal
        created_ord_id = created_ord_data.get('id')
        from orders.views import OrderDetailView
        req_cancel = factory.patch(f"/api/orders/{created_ord_id}/", {"status": "cancelled", "cancellation_reason": "Customer changed mind"}, format="json")
        force_authenticate(req_cancel, user=admin_user)
        resp_cancel = OrderDetailView.as_view()(req_cancel, pk=created_ord_id)

        test_user_loyalty.refresh_from_db()
        refund_tx = LoyaltyTransaction.objects.filter(user=test_user_loyalty, order_id=created_ord_id, transaction_type='earned', description__icontains='Refunded').first()
        if resp_cancel.status_code == 200 and refund_tx:
            print(f"  [PASSED] Cancellation Reversal: Refunded pts on cancellation. Restored Balance: {test_user_loyalty.loyalty_points}")
        else:
            print(f"  [FAILED] Cancellation Reversal: Balance={test_user_loyalty.loyalty_points}, Refund Tx={refund_tx}")
            all_passed = False
    else:
        print(f"  [FAILED] Order creation failed with status {resp_order_pts.status_code}: {resp_order_pts.data}")
        all_passed = False

    test_user_loyalty.delete()

    # 8. Test Branch Out-of-Stock Override API
    print("\nTesting Branch Out-of-Stock Override...")
    from restaurants.views import BranchItemAvailabilityView
    from restaurants.models import MenuItem, BranchMenuItemAvailability
    test_item = MenuItem.objects.filter(is_available=True).first()
    
    req_override = factory.post("/api/restaurants/branch-item-availability/", {
        "branch_id": jt_branch.id,
        "menu_item_id": test_item.id,
        "is_available": False
    }, format="json")
    force_authenticate(req_override, user=admin_user)
    resp_override = BranchItemAvailabilityView.as_view()(req_override)

    override_record = BranchMenuItemAvailability.objects.filter(branch=jt_branch, menu_item=test_item).first()
    if resp_override.status_code == 200 and override_record and override_record.is_available is False:
        print(f"  [PASSED] Branch Out-of-Stock Override: Item #{test_item.id} set to OUT OF STOCK for Branch #{jt_branch.id}")
    else:
        print(f"  [FAILED] Branch Out-of-Stock Override status {resp_override.status_code}")
        all_passed = False

    if override_record:
        override_record.delete()

    # 9. Test Guest Order Auto-Linkage on Registration
    print("\nTesting Guest Order Linkage on User Registration...")
    from users.views import UserRegisterView
    guest_phone = "03998887766"
    guest_ord = Order.objects.create(
        user=None, restaurant=tandoori, branch=jt_branch,
        guest_name="Guest Linker", guest_phone=guest_phone,
        delivery_address="Guest Street", subtotal=300.0, total=300.0, status="received"
    )

    import time
    test_user_name = f"linked_user_{int(time.time())}"
    reg_payload = {
        "username": test_user_name,
        "email": f"{test_user_name}@test.com",
        "password": "Password123!",
        "phone": guest_phone
    }
    req_reg = factory.post("/api/users/register/", reg_payload, format="json")
    resp_reg = UserRegisterView.as_view()(req_reg)

    guest_ord.refresh_from_db()
    if resp_reg.status_code == 201 and guest_ord.user is not None and guest_ord.user.username == test_user_name:
        print(f"  [PASSED] Guest Order Auto-Linkage: Guest order #{guest_ord.id} linked to new user '{guest_ord.user.username}'")
    else:
        print(f"  [FAILED] Guest Order Linkage status {resp_reg.status_code}, Order user={guest_ord.user}")
        all_passed = False

    if guest_ord.user:
        guest_ord.user.delete()
    guest_ord.delete()

    # 10. Test Price Modifier Tampering Protection
    print("\nTesting Price Modifier Tampering Protection...")
    menu_item_tamper = MenuItem.objects.filter(category__restaurant=tandoori, is_available=True).first()
    original_item_price = float(menu_item_tamper.price)
    tamper_payload = {
        "restaurant": tandoori.id,
        "branch": jt_branch.id,
        "guest_name": "Tamper Tester",
        "guest_phone": "03001112233",
        "payment_method": "cod",
        "delivery_address": "Tamper Street, Johar Town",
        "items": [
            {
                "menu_item": menu_item_tamper.id,
                "quantity": 1,
                "selected_options": [{"name": "Fake Discount", "price_modifier": -1000.0}]
            }
        ]
    }
    req_tamper = factory.post("/api/orders/", tamper_payload, format="json")
    force_authenticate(req_tamper, user=admin_user)
    resp_tamper = OrderListCreateView.as_view()(req_tamper)
    if resp_tamper.status_code == 201:
        tamper_ord_data = resp_tamper.data.get('data', resp_tamper.data)
        tamper_subtotal = float(tamper_ord_data.get('subtotal', 0))
        if tamper_subtotal >= original_item_price:
            print(f"  [PASSED] Price Tampering Protection: Negative modifier -1000 ignored | Computed Subtotal: Rs. {tamper_subtotal}")
        else:
            print(f"  [FAILED] Subtotal tampered to Rs. {tamper_subtotal}")
            all_passed = False
    else:
        print(f"  [FAILED] Price Tampering Test request failed: {resp_tamper.status_code}")
        all_passed = False

    # 11. Test Order Status State Machine Transition Validation
    print("\nTesting Order Status State Machine Transition Matrix...")
    state_ord = Order.objects.create(
        user=None, restaurant=tandoori, branch=jt_branch,
        delivery_address="State Street", subtotal=500.0, total=500.0, status="delivered"
    )
    req_invalid_transition = factory.patch(f"/api/orders/{state_ord.id}/", {"status": "preparing"}, format="json")
    force_authenticate(req_invalid_transition, user=mgr_user)
    resp_invalid_transition = OrderDetailView.as_view()(req_invalid_transition, pk=state_ord.id)

    if resp_invalid_transition.status_code == 400:
        print("  [PASSED] Order Status State Machine: Delivered -> Preparing blocked with HTTP 400 Bad Request")
    else:
        print(f"  [FAILED] Disallowed state transition returned status {resp_invalid_transition.status_code}")
        all_passed = False

    state_ord.delete()

    # 12. Test High-Precision Coordinate Auto-Rounding (lat/lng > 6 decimal places)
    print("\nTesting High-Precision Coordinate Auto-Rounding...")
    payload_coords = {
        "restaurant": tandoori.id,
        "branch": jt_branch.id,
        "guest_name": "Coords Tester",
        "guest_phone": "03001239999",
        "payment_method": "cod",
        "delivery_address": "High Precision Street, Johar Town",
        "delivery_lat": 31.47039572619421,
        "delivery_lng": 74.278912384756,
        "items": [
            {
                "menu_item": menu_item.id,
                "quantity": 1
            }
        ]
    }
    req_coords = factory.post("/api/orders/", payload_coords, format="json")
    resp_coords = OrderListCreateView.as_view()(req_coords)
    if resp_coords.status_code == 201:
        coords_data = resp_coords.data.get('data', resp_coords.data)
        saved_lat = float(coords_data.get('delivery_lat', 0))
        saved_lng = float(coords_data.get('delivery_lng', 0))
        if saved_lat == 31.470396 and saved_lng == 74.278912:
            print(f"  [PASSED] Coordinate Auto-Rounding: Input (31.47039572619421, 74.278912384756) -> Rounded ({saved_lat}, {saved_lng})")
    # 13. Test Review Submission Auto-Population (restaurant inferred from order)
    print("\nTesting Review Submission Auto-Population...")
    from restaurants.views import RestaurantReviewViewSet
    review_ord = Order.objects.create(
        user=admin_user, restaurant=tandoori, branch=jt_branch,
        delivery_address="Review Test Street", subtotal=400.0, total=400.0, status="delivered"
    )
    req_rev = factory.post("/api/restaurants/reviews/", {
        "order": review_ord.id,
        "rating": 5,
        "comment": "Auto Inferred Restaurant Test"
    }, format="json")
    force_authenticate(req_rev, user=admin_user)
    resp_rev = RestaurantReviewViewSet.as_view({'post': 'create'})(req_rev)

    if resp_rev.status_code == 201 and resp_rev.data.get('restaurant') == tandoori.id:
        print(f"  [PASSED] Review Auto-Population: Order #{review_ord.id} -> Inferred Restaurant #{tandoori.id} ({tandoori.name})")
    else:
        print(f"  [FAILED] Review submission returned status {resp_rev.status_code}: {resp_rev.data}")
        all_passed = False

    review_ord.delete()

    # 14. Test Rider Details Sanitization in Order Tracking (Omitted during Received/Preparing, visible on Out For Delivery)
    print("\nTesting Rider Contact Sanitization on Order Tracking...")
    from restaurants.models import BranchRider
    test_rider = BranchRider.objects.create(branch=jt_branch, name="Test Sanitized Rider", phone="03009998877", vehicle_type="bike", status="AVAILABLE")
    prep_order = Order.objects.create(
        user=admin_user, restaurant=tandoori, branch=jt_branch, rider=test_rider,
        delivery_address="Rider Sanitization Street", subtotal=500.0, total=500.0, status="preparing"
    )
    from orders.serializers import OrderDetailSerializer
    prep_data = OrderDetailSerializer(prep_order).data
    
    prep_rider_hidden = (prep_data.get('rider') is None)
    
    prep_order.status = "out_for_delivery"
    prep_order.save()
    out_data = OrderDetailSerializer(prep_order).data
    out_rider_visible = (out_data.get('rider') is not None and out_data['rider'].get('name') == "Test Sanitized Rider")

    if prep_rider_hidden and out_rider_visible:
        print(f"  [PASSED] Rider Sanitization: Preparing status -> rider is NULL | Out For Delivery status -> rider visible ({test_rider.name})")
    else:
        print(f"  [FAILED] Rider Sanitization: Prep hidden={prep_rider_hidden}, Out visible={out_rider_visible}")
        all_passed = False

    prep_order.delete()
    test_rider.delete()

    # 15. Test Auto-Release Rider Status on Order Completion & Cancellation
    print("\nTesting Automated Rider Release on Order Completion & Cancellation...")
    auto_rider = BranchRider.objects.create(branch=jt_branch, name="Auto Release Rider", phone="03001112233", vehicle_type="BIKE", status="AVAILABLE")
    auto_ord = Order.objects.create(
        user=admin_user, restaurant=tandoori, branch=jt_branch, rider=auto_rider,
        delivery_address="Auto Release Street", subtotal=600.0, total=600.0, status="out_for_delivery"
    )
    # Refetched rider status should be ON_DELIVERY due to Order.save()
    auto_rider.refresh_from_db()
    st_on_del = auto_rider.status == "ON_DELIVERY"

    # Transition order to delivered
    auto_ord.status = "delivered"
    auto_ord.save()
    auto_rider.refresh_from_db()
    st_delivered_rel = auto_rider.status == "AVAILABLE"

    # Reset for cancellation test
    auto_ord.status = "out_for_delivery"
    auto_ord.save()
    auto_rider.refresh_from_db()

    auto_ord.status = "cancelled"
    auto_ord.cancellation_reason = "Customer cancelled order"
    auto_ord.save()
    auto_rider.refresh_from_db()
    st_cancelled_rel = auto_rider.status == "AVAILABLE"

    if st_on_del and st_delivered_rel and st_cancelled_rel:
        print("  [PASSED] Automated Rider Release: ON_DELIVERY when out for delivery -> AVAILABLE when delivered -> AVAILABLE when cancelled")
    else:
        print(f"  [FAILED] Automated Rider Release: On Delivery={st_on_del}, Delivered Rel={st_delivered_rel}, Cancelled Rel={st_cancelled_rel}")
        all_passed = False

    auto_ord.delete()
    auto_rider.delete()

    # 16. Test Automated Post-Delivery Feedback Push Notification Trigger
    print("\nTesting Automated Post-Delivery Feedback Push Notification Trigger...")
    from config.models import AdminAuditLog
    push_ord = Order.objects.create(
        user=admin_user, restaurant=tandoori, branch=jt_branch,
        delivery_address="Push Notification Street", subtotal=800.0, total=800.0, status="out_for_delivery"
    )
    # Transition status to delivered -> should trigger send_post_delivery_push_notification
    push_ord.status = "delivered"
    push_ord.save()

    # Check if notification was recorded in AdminAuditLog
    notif_log = AdminAuditLog.objects.filter(
        model_name="Notification",
        object_repr__contains=f"Post-Delivery Push: Order #{push_ord.id}"
    ).first()

    if notif_log and "Bon" in notif_log.changes.get("title", ""):
        print(f"  [PASSED] Automated Post-Delivery Push Triggered for Order #{push_ord.id}")
        title_safe = notif_log.changes.get('title', '').encode('ascii', 'replace').decode('ascii')
        body_safe = notif_log.changes.get('body', '').encode('ascii', 'replace').decode('ascii')
        print(f"           Title: '{title_safe}'")
        print(f"           Body: '{body_safe}'")
        print(f"           Payload: {notif_log.changes.get('payload')}")
    else:
        print(f"  [FAILED] Post-delivery push audit log not found for Order #{push_ord.id}")
        all_passed = False


    push_ord.delete()

    # 17. Test Public Search & Dynamic Popular Tags (AllowAny Permission Check)
    print("\nTesting Public Search & Dynamic Popular Tags Endpoints...")
    from restaurants.views import PopularTagsView, PublicSearchView
    from rest_framework.test import APIRequestFactory

    factory = APIRequestFactory()

    # Unauthenticated GET request to popular-tags
    pop_req = factory.get("/api/v1/search/popular-tags/")
    pop_view = PopularTagsView.as_view()
    pop_resp = pop_view(pop_req)

    # Unauthenticated GET request to search
    srch_req = factory.get("/api/v1/search/?q=Naan")
    srch_view = PublicSearchView.as_view()
    srch_resp = srch_view(srch_req)

    pop_passed = pop_resp.status_code == 200 and pop_resp.data.get("success") is True and len(pop_resp.data.get("tags", [])) > 0
    srch_passed = srch_resp.status_code == 200 and srch_resp.data.get("success") is True

    if pop_passed and srch_passed:
        print(f"  [PASSED] Popular Tags: HTTP {pop_resp.status_code} | Dynamic Tags Returned: {pop_resp.data.get('tags')[:4]}...")
        print(f"  [PASSED] Public Search: HTTP {srch_resp.status_code} | Matching Dishes: {len(srch_resp.data.get('dishes', []))}")
    else:
        print(f"  [FAILED] Popular Tags HTTP {pop_resp.status_code}, Public Search HTTP {srch_resp.status_code}")
        all_passed = False

    # 18. Test Automated Out For Delivery Push Notification Trigger
    print("\nTesting Automated Out For Delivery Push Notification Trigger...")
    out_push_rider = BranchRider.objects.create(branch=jt_branch, name="Out Push Rider", phone="03007776655", vehicle_type="BIKE", status="AVAILABLE")
    out_push_ord = Order.objects.create(
        user=admin_user, restaurant=tandoori, branch=jt_branch, rider=out_push_rider,
        delivery_address="Out Push Street", subtotal=900.0, total=900.0, status="preparing"
    )
    # Transition status to out_for_delivery -> should trigger send_out_for_delivery_push_notification
    out_push_ord.status = "out_for_delivery"
    out_push_ord.save()

    # Check if notification was recorded in AdminAuditLog
    out_notif_log = AdminAuditLog.objects.filter(
        model_name="Notification",
        object_repr__contains=f"Out For Delivery Push: Order #{out_push_ord.id}"
    ).first()

    if out_notif_log and "Way" in out_notif_log.changes.get("title", ""):
        print(f"  [PASSED] Automated Out For Delivery Push Triggered for Order #{out_push_ord.id}")
        title_safe = out_notif_log.changes.get('title', '').encode('ascii', 'replace').decode('ascii')
        body_safe = out_notif_log.changes.get('body', '').encode('ascii', 'replace').decode('ascii')
        print(f"           Title: '{title_safe}'")
        print(f"           Body: '{body_safe}'")
        print(f"           Payload: {out_notif_log.changes.get('payload')}")
    else:
        print(f"  [FAILED] Out for delivery push audit log not found for Order #{out_push_ord.id}")
        all_passed = False

    out_push_ord.delete()
    out_push_rider.delete()

    # 19. Test Universal Live Order Status Tracking Endpoint & Sync
    print("\nTesting Universal Live Order Status Tracking Endpoint & Sync...")
    from orders.views import OrderTrackView
    track_ord = Order.objects.create(
        user=admin_user, restaurant=tandoori, branch=jt_branch,
        delivery_address="Live Track Street", subtotal=1100.0, total=1100.0, status="received"
    )

    track_req = factory.get(f"/api/orders/{track_ord.id}/track/")
    track_view = OrderTrackView.as_view()
    track_resp = track_view(track_req, pk=track_ord.id)

    track_passed = (
        track_resp.status_code == 200 and 
        track_resp.data.get("success") is True and 
        track_resp.data.get("data", {}).get("status") == "received"
    )

    # Transition order status to preparing and verify track endpoint returns updated status immediately
    track_ord.status = "preparing"
    track_ord.save()

    track_resp2 = track_view(track_req, pk=track_ord.id)
    track_passed2 = (
        track_resp2.status_code == 200 and 
        track_resp2.data.get("data", {}).get("status") == "preparing"
    )

    if track_passed and track_passed2:
        print(f"  [PASSED] Live Order Track Endpoint: HTTP {track_resp.status_code} | Initial: {track_resp.data['data']['status']} -> Updated: {track_resp2.data['data']['status']}")
    else:
        print(f"  [FAILED] Live Track HTTP {track_resp.status_code}, Status 1: {track_resp.data.get('data', {}).get('status')}, Status 2: {track_resp2.data.get('data', {}).get('status')}")
        all_passed = False

    track_ord.delete()

    # 20. Test Batch Availability Serialization & Instant Stock UI Guards
    print("\nTesting Batch Availability Serialization & Instant Stock UI Guards...")
    from restaurants.views import RestaurantMenuView
    from restaurants.models import BranchMenuItemAvailability
    
    tandoori_menu_item = MenuItem.objects.filter(category__restaurant=tandoori, is_available=True).first()
    
    jt_override, _ = BranchMenuItemAvailability.objects.update_or_create(
        branch=jt_branch,
        menu_item=tandoori_menu_item,
        defaults={'is_available': False}
    )
    
    lc_branch = tandoori.branches.exclude(id=jt_branch.id).filter(is_active=True).first()
    if lc_branch:
        BranchMenuItemAvailability.objects.update_or_create(
            branch=lc_branch,
            menu_item=tandoori_menu_item,
            defaults={'is_available': True}
        )

    req_menu = factory.get(f"/api/restaurants/{tandoori.slug}/menu/?branch_id={jt_branch.id}")
    resp_menu = RestaurantMenuView.as_view()(req_menu, slug=tandoori.slug)
    
    passed_stock_guards = False
    if resp_menu.status_code == 200:
        data = resp_menu.data.get('data', [])
        found_item = None
        for cat in data:
            for item in cat.get('items', []):
                if item['id'] == tandoori_menu_item.id:
                    found_item = item
                    break
            if found_item:
                break
        
        if found_item:
            avail_map = found_item.get('branch_availability_map', {})
            other_branches = found_item.get('other_available_branches', [])
            
            if avail_map.get(str(jt_branch.id)) is False and lc_branch and avail_map.get(str(lc_branch.id)) is True:
                if any(b['id'] == lc_branch.id for b in other_branches) and not any(b['id'] == jt_branch.id for b in other_branches):
                    passed_stock_guards = True
                    print(f"  [PASSED] Menu Serialization returned accurate availability maps and fallback branches.")
                else:
                    print(f"  [FAILED] other_branches incorrect: {other_branches}")
            else:
                print(f"  [FAILED] branch_availability_map incorrect: {avail_map}")
        else:
            print(f"  [FAILED] Item not found in menu response.")
    else:
        print(f"  [FAILED] Menu view returned HTTP {resp_menu.status_code}")
        
    if not passed_stock_guards:
        all_passed = False

    if all_passed:
        print("\n[SUCCESS] All local integration & security governance tests PASSED successfully!")
    else:
        print("\n[FAIL] Some tests failed.")

if __name__ == "__main__":
    main()



