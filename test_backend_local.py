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

    # 6. Audit Loyalty Points Redemption Flow
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
        if order_discount == 100.0 and redeemed_tx and redeemed_tx.points == 100:
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
        if resp_cancel.status_code == 200 and test_user_loyalty.loyalty_points == 218 and refund_tx:
            print(f"  [PASSED] Cancellation Reversal: Refunded 100 pts on cancellation. Restored Balance: {test_user_loyalty.loyalty_points}")
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

    reg_payload = {
        "username": "linked_user_test",
        "email": "linker@test.com",
        "password": "Password123!",
        "phone": guest_phone,
        "name": "Linked User Test"
    }
    req_reg = factory.post("/api/users/register/", reg_payload, format="json")
    resp_reg = UserRegisterView.as_view()(req_reg)

    guest_ord.refresh_from_db()
    if resp_reg.status_code == 201 and guest_ord.user is not None and guest_ord.user.username == "linked_user_test":
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

    if all_passed:
        print("\n[SUCCESS] All local integration & security governance tests PASSED successfully!")
    else:
        print("\n[FAIL] Some tests failed.")

if __name__ == "__main__":
    main()
