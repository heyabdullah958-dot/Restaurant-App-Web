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

    if all_passed:
        print("\n[SUCCESS] All local integration tests PASSED successfully!")
    else:
        print("\n[FAIL] Some tests failed.")

if __name__ == "__main__":
    main()
