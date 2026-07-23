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

    # Cleanup test order
    test_order.delete()

    if all_passed:
        print("\n[SUCCESS] All local integration tests PASSED successfully!")
    else:
        print("\n[FAIL] Some tests failed.")

if __name__ == "__main__":
    main()
