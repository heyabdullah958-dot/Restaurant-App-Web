import os
import sys
import django
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from promotions.models import Coupon, CouponUsage
from restaurants.models import Restaurant, Branch, MenuCategory, MenuItem
from orders.serializers import OrderCreateSerializer
from promotions.serializers import CouponValidateSerializer
from rest_framework.test import APIRequestFactory

def run_tests():
    print("=" * 60)
    print("[TEST] RUNNING PROMO CODE ENGINE INTEGRATION TESTS")
    print("=" * 60)

    now = timezone.now()
    valid_to = now + timedelta(days=30)

    # 1. Clear previous test coupons
    Coupon.objects.filter(code__in=["GLOBALTEST50", "RESTTEST20", "BRANCHTEST100"]).delete()

    # 2. Get active restaurant & branch
    restaurant = Restaurant.objects.filter(is_active=True).first()
    if not restaurant:
        restaurant = Restaurant.objects.create(name="Test Brand", slug="test-brand", is_active=True)
    
    branch = Branch.objects.filter(restaurant=restaurant, is_active=True).first()
    if not branch:
        branch = Branch.objects.create(restaurant=restaurant, name="Test Branch", code="TB", is_active=True)

    other_restaurant = Restaurant.objects.exclude(id=restaurant.id).first()
    if not other_restaurant:
        other_restaurant = Restaurant.objects.create(name="Other Brand", slug="other-brand", is_active=True)

    # Create menu category & item for order testing
    category = MenuCategory.objects.filter(restaurant=restaurant).first()
    if not category:
        category = MenuCategory.objects.create(restaurant=restaurant, name="Main Course")
    
    menu_item = MenuItem.objects.filter(category=category, is_available=True).first()
    if not menu_item:
        menu_item = MenuItem.objects.create(category=category, name="Special Burger", price=Decimal("500.00"), is_available=True)

    print(f"[OK] Test Environment Setup: Restaurant ID={restaurant.id} ({restaurant.name}), Branch ID={branch.id} ({branch.name})")

    # 3. Create Coupons across scopes
    global_coupon = Coupon.objects.create(
        code="GLOBALTEST50",
        discount_type="percentage",
        discount_value=Decimal("50.00"),
        min_subtotal=Decimal("200.00"),
        max_discount=Decimal("300.00"),
        valid_from=now,
        valid_to=valid_to,
        usage_limit=10,
        per_user_limit=2,
        is_active=True
    )
    print(f"[OK] Global Coupon Created: {global_coupon}")

    rest_coupon = Coupon.objects.create(
        code="RESTTEST20",
        discount_type="flat",
        discount_value=Decimal("200.00"),
        min_subtotal=Decimal("400.00"),
        restaurant=restaurant,
        valid_from=now,
        valid_to=valid_to,
        usage_limit=5,
        per_user_limit=1,
        is_active=True
    )
    print(f"[OK] Restaurant-Scoped Coupon Created: {rest_coupon} for {restaurant.name}")

    branch_coupon = Coupon.objects.create(
        code="BRANCHTEST100",
        discount_type="flat",
        discount_value=Decimal("100.00"),
        min_subtotal=Decimal("100.00"),
        restaurant=restaurant,
        branch=branch,
        valid_from=now,
        valid_to=valid_to,
        usage_limit=5,
        per_user_limit=1,
        is_active=True
    )
    print(f"[OK] Branch-Scoped Coupon Created: {branch_coupon} for {branch.name}")

    # 4. Test Validation Engine - Global Coupon
    serializer = CouponValidateSerializer(data={
        "code": "GLOBALTEST50",
        "subtotal": 1000,
        "restaurant_id": restaurant.id,
        "branch_id": branch.id
    })
    assert serializer.is_valid(), f"Global coupon validation failed: {serializer.errors}"
    print("[OK] TEST PASSED: Global coupon valid across any restaurant/branch.")

    # 5. Test Validation Engine - Restaurant Scope Match
    serializer = CouponValidateSerializer(data={
        "code": "RESTTEST20",
        "subtotal": 500,
        "restaurant_id": restaurant.id
    })
    assert serializer.is_valid(), f"Restaurant coupon validation failed: {serializer.errors}"
    print("[OK] TEST PASSED: Restaurant-scoped coupon valid for matching restaurant.")

    # 6. Test Validation Engine - Restaurant Scope Mismatch
    serializer = CouponValidateSerializer(data={
        "code": "RESTTEST20",
        "subtotal": 500,
        "restaurant_id": other_restaurant.id
    })
    assert not serializer.is_valid(), "Restaurant coupon should FAIL for wrong restaurant!"
    print(f"[OK] TEST PASSED: Correctly rejected for wrong restaurant -> {serializer.errors}")

    # 7. Test Validation Engine - Branch Scope Match
    serializer = CouponValidateSerializer(data={
        "code": "BRANCHTEST100",
        "subtotal": 200,
        "restaurant_id": restaurant.id,
        "branch_id": branch.id
    })
    assert serializer.is_valid(), f"Branch coupon validation failed: {serializer.errors}"
    print("[OK] TEST PASSED: Branch-scoped coupon valid for matching branch.")

    # 8. Test Validation Engine - Branch Scope Mismatch
    serializer = CouponValidateSerializer(data={
        "code": "BRANCHTEST100",
        "subtotal": 200,
        "restaurant_id": restaurant.id,
        "branch_id": 99999
    })
    assert not serializer.is_valid(), "Branch coupon should FAIL for wrong branch!"
    print(f"[OK] TEST PASSED: Correctly rejected for wrong branch -> {serializer.errors}")

    # 9. Test Order Creation with Coupon
    order_data = {
        "restaurant": restaurant.id,
        "branch": branch.id,
        "delivery_address": "123 Test Street",
        "customer_phone": "03001234567",
        "guest_name": "Test Customer",
        "guest_phone": "03001234567",
        "payment_method": "cod",
        "coupon_code": "BRANCHTEST100",
        "items": [
            {
                "menu_item": menu_item.id,
                "quantity": 1
            }
        ]
    }

    from django.contrib.auth.models import AnonymousUser
    factory = APIRequestFactory()
    wsgi_request = factory.post('/api/orders/', order_data, format='json')
    wsgi_request.user = AnonymousUser()

    serializer = OrderCreateSerializer(data=order_data, context={'request': wsgi_request})
    assert serializer.is_valid(), f"Order create serialization failed: {serializer.errors}"

    order = serializer.save()
    assert order.discount == Decimal("100.00"), f"Expected discount 100.00, got {order.discount}"
    print(f"[OK] TEST PASSED: Order #{order.id} placed successfully with coupon. Subtotal: {order.subtotal}, Discount: {order.discount}, Total: {order.total}")

    # 10. Verify Coupon usage counter & CouponUsage table entry
    branch_coupon.refresh_from_db()
    assert branch_coupon.times_used == 1, f"Expected times_used=1, got {branch_coupon.times_used}"
    usage_entry = CouponUsage.objects.filter(coupon=branch_coupon, order=order).first()
    assert usage_entry is not None, "CouponUsage record missing!"
    print(f"[OK] TEST PASSED: Coupon times_used updated to {branch_coupon.times_used} & CouponUsage record confirmed!")

    print("=" * 60)
    print("[SUCCESS] ALL PROMO CODE ENGINE INTEGRATION TESTS PASSED (100%)")
    print("=" * 60)

if __name__ == '__main__':
    run_tests()
