import os
import sys
import uuid
import django

# Setup Django environment
sys.path.insert(0, r"d:\sitesdata\Resturent App\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient
from orders.models import Order
from restaurants.models import Restaurant, MenuCategory, MenuItem

User = get_user_model()

def run_empirical_security_tests():
    print("=" * 70)
    print("EMPIRICAL CHALLENGER SECURITY SUITE — ORDER API AUTHORIZATION")
    print("=" * 70)

    client = APIClient()

    # Create test fixtures in DB
    restaurant, _ = Restaurant.objects.get_or_create(
        slug="challenger_rest",
        defaults={
            "name": "Challenger Rest",
            "opens_at": "00:00:00",
            "closes_at": "23:59:59",
            "is_active": True
        }
    )

    owner_user, _ = User.objects.get_or_create(
        username="emp_owner",
        defaults={"email": "emp_owner@example.com"}
    )
    owner_user.set_password("password123")
    owner_user.save()

    attacker_user, _ = User.objects.get_or_create(
        username="emp_attacker",
        defaults={"email": "emp_attacker@example.com"}
    )
    attacker_user.set_password("password123")
    attacker_user.save()

    staff_user, _ = User.objects.get_or_create(
        username="emp_staff",
        defaults={"email": "emp_staff@example.com", "is_staff": True, "is_superuser": True}
    )
    staff_user.set_password("password123")
    staff_user.save()

    # Create test order owned by owner_user
    order = Order.objects.create(
        user=owner_user,
        restaurant=restaurant,
        guest_name="Owner User",
        guest_phone="03001112233",
        delivery_address="123 Owner St",
        subtotal=1000.00,
        total=1000.00,
        status="received"
    )

    results = []

    # Test Case 1: Unauthenticated GET /api/orders/{id}/ without tracking_token
    res1 = client.get(f"/api/orders/{order.id}/")
    pass1 = res1.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
    results.append(("1. GET /api/orders/{id}/ (No Auth, No Token)", res1.status_code, "403 or 404", pass1))
    print(f"Test 1: Status={res1.status_code} | Expected 403/404 | Result={'PASS' if pass1 else 'FAIL'}")

    # Test Case 2: Unauthenticated GET /api/orders/{id}/?tracking_token=invalid-uuid
    bogus_uuid = str(uuid.uuid4())
    res2 = client.get(f"/api/orders/{order.id}/?tracking_token={bogus_uuid}")
    pass2 = res2.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
    results.append(("2. GET /api/orders/{id}/?tracking_token=invalid-uuid", res2.status_code, "403 or 404", pass2))
    print(f"Test 2: Status={res2.status_code} | Expected 403/404 | Result={'PASS' if pass2 else 'FAIL'}")

    # Test Case 3: Unauthenticated GET /api/orders/my-orders/?phone=03001234567
    res3 = client.get("/api/orders/my-orders/?phone=03001234567")
    pass3 = res3.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]
    results.append(("3. GET /api/orders/my-orders/?phone=03001234567 (No Auth)", res3.status_code, "401 or 403", pass3))
    print(f"Test 3: Status={res3.status_code} | Expected 401/403 | Result={'PASS' if pass3 else 'FAIL'}")

    # Test Case 4 (Stress/Edge Case): Malformed tracking token string
    res4 = client.get(f"/api/orders/{order.id}/?tracking_token=not-a-uuid-string")
    pass4 = res4.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
    results.append(("4. GET /api/orders/{id}/?tracking_token=not-a-uuid-string", res4.status_code, "403 or 404", pass4))
    print(f"Test 4: Status={res4.status_code} | Expected 403/404 | Result={'PASS' if pass4 else 'FAIL'}")

    # Test Case 5 (Stress/Edge Case): Cross-user unauthorized access (Authenticated User B accessing User A's order)
    client.force_authenticate(user=attacker_user)
    res5 = client.get(f"/api/orders/{order.id}/")
    pass5 = res5.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
    results.append(("5. GET /api/orders/{id}/ (Cross-user, User B accessing User A)", res5.status_code, "403 or 404", pass5))
    print(f"Test 5: Status={res5.status_code} | Expected 403/404 | Result={'PASS' if pass5 else 'FAIL'}")
    client.force_authenticate(user=None)

    # Test Case 6 (Positive Control): Unauthenticated GET /api/orders/{id}/?tracking_token=VALID_TOKEN
    res6 = client.get(f"/api/orders/{order.id}/?tracking_token={order.tracking_token}")
    pass6 = res6.status_code == status.HTTP_200_OK and res6.data["id"] == order.id
    results.append(("6. GET /api/orders/{id}/?tracking_token=VALID_TOKEN", res6.status_code, "200 OK", pass6))
    print(f"Test 6: Status={res6.status_code} | Expected 200 OK | Result={'PASS' if pass6 else 'FAIL'}")

    # Test Case 7 (Positive Control): Authenticated Owner GET /api/orders/{id}/
    client.force_authenticate(user=owner_user)
    res7 = client.get(f"/api/orders/{order.id}/")
    pass7 = res7.status_code == status.HTTP_200_OK and res7.data["id"] == order.id
    results.append(("7. GET /api/orders/{id}/ (Authenticated Owner)", res7.status_code, "200 OK", pass7))
    print(f"Test 7: Status={res7.status_code} | Expected 200 OK | Result={'PASS' if pass7 else 'FAIL'}")

    # Test Case 8 (Positive Control): Authenticated Staff GET /api/orders/{id}/
    client.force_authenticate(user=staff_user)
    res8 = client.get(f"/api/orders/{order.id}/")
    pass8 = res8.status_code == status.HTTP_200_OK and res8.data["id"] == order.id
    results.append(("8. GET /api/orders/{id}/ (Authenticated Staff)", res8.status_code, "200 OK", pass8))
    print(f"Test 8: Status={res8.status_code} | Expected 200 OK | Result={'PASS' if pass8 else 'FAIL'}")

    # Clean up test order
    order.delete()

    print("=" * 70)
    all_passed = all(item[3] for item in results)
    print(f"OVERALL EMPIRICAL VERIFICATION RESULT: {'ALL PASSED' if all_passed else 'FAILURE DETECTED'}")
    print("=" * 70)
    return results, all_passed

if __name__ == "__main__":
    run_empirical_security_tests()
