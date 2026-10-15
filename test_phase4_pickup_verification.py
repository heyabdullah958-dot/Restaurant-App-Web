import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from restaurants.models import Restaurant, Branch, MenuItem, MenuCategory
from orders.models import Order, OrderItem
from orders.serializers import OrderCreateSerializer
from rest_framework.test import APIRequestFactory

User = get_user_model()

def main():
    print("=== STARTING PHASE 4 BACKEND PICKUP VERIFICATION ===")

    # 1. Fetch or create test user
    user, _ = User.objects.get_or_create(
        username='test_pickup_user',
        defaults={'email': 'pickup@foodsphere.pk', 'phone': '03001234567'}
    )
    if not user.phone:
        user.phone = '03001234567'
        user.save()

    # 2. Fetch Dine At Blue or Tandoori Stop
    restaurant = Restaurant.objects.filter(is_active=True).first()
    assert restaurant is not None, "At least one active restaurant required"
    branch = restaurant.branches.filter(is_active=True).first()

    # Fetch active menu item
    menu_item = MenuItem.objects.filter(category__restaurant=restaurant, is_available=True).first()
    assert menu_item is not None, "At least one menu item required"

    print(f"  Testing with Restaurant: {restaurant.name} (Delivery Fee: Rs. {restaurant.delivery_fee})")
    print(f"  Testing with Item: {menu_item.name} (Price: Rs. {menu_item.price})")

    factory = APIRequestFactory()

    # TEST CASE A: Order with order_type='PICKUP'
    request = factory.post('/api/orders/')
    request.user = user

    pickup_data = {
        'restaurant': restaurant.id,
        'branch': branch.id if branch else None,
        'order_type': 'PICKUP',
        'payment_method': 'cod',
        'guest_name': 'Ali Tester',
        'guest_phone': '03001234567',
        'items': [
            {
                'menu_item': menu_item.id,
                'quantity': 1,
            }
        ]
    }

    serializer = OrderCreateSerializer(data=pickup_data, context={'request': request})
    assert serializer.is_valid(), f"Validation errors for PICKUP: {serializer.errors}"
    pickup_order = serializer.save()

    print(f"  [PICKUP Test] Order ID: {pickup_order.id} | Display ID: {pickup_order.display_order_id}")
    print(f"  [PICKUP Test] Order Type: {pickup_order.order_type}")
    print(f"  [PICKUP Test] Delivery Fee: Rs. {pickup_order.delivery_fee}")
    print(f"  [PICKUP Test] Address: {pickup_order.delivery_address}")

    assert pickup_order.order_type == 'PICKUP', f"Expected PICKUP, got {pickup_order.order_type}"
    assert Decimal(str(pickup_order.delivery_fee)) == Decimal('0.00'), f"Delivery fee must be 0 for PICKUP, got {pickup_order.delivery_fee}"
    assert "Pickup" in pickup_order.delivery_address or "Counter" in pickup_order.delivery_address, "Address should reflect counter pickup"

    # TEST CASE B: Order with order_type='DELIVERY'
    request = factory.post('/api/orders/')
    request.user = user

    delivery_data = {
        'restaurant': restaurant.id,
        'branch': branch.id if branch else None,
        'order_type': 'DELIVERY',
        'payment_method': 'cod',
        'guest_name': 'Ali Tester',
        'guest_phone': '03001234567',
        'delivery_address': 'House 12, Street 4, Sector H, DHA Phase 1, Lahore',
        'items': [
            {
                'menu_item': menu_item.id,
                'quantity': 1,
            }
        ]
    }

    serializer = OrderCreateSerializer(data=delivery_data, context={'request': request})
    assert serializer.is_valid(), f"Validation errors for DELIVERY: {serializer.errors}"
    delivery_order = serializer.save()

    print(f"  [DELIVERY Test] Order ID: {delivery_order.id} | Display ID: {delivery_order.display_order_id}")
    print(f"  [DELIVERY Test] Order Type: {delivery_order.order_type}")
    print(f"  [DELIVERY Test] Delivery Fee: Rs. {delivery_order.delivery_fee}")

    assert delivery_order.order_type == 'DELIVERY'
    assert Decimal(str(delivery_order.delivery_fee)) == Decimal(str(restaurant.delivery_fee))

    print("\n[SUCCESS] ALL PHASE 4 BACKEND PICKUP VERIFICATIONS PASSED 100%!")

if __name__ == '__main__':
    main()
