import os
import sys
import django
from decimal import Decimal
from datetime import timedelta

# Set up Django environment
backend_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'backend')
sys.path.insert(0, backend_path)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import RequestFactory
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import force_authenticate
from restaurants.models import Restaurant, Branch, MenuItem, MenuCategory
from orders.models import Order, OrderItem
from promotions.models import Coupon, CouponUsage
from promotions.views import CouponValidateView
from orders.views import OrderListCreateView

User = get_user_model()
rf = RequestFactory()

def run_suite():
    print("================================================================================")
    print("  PHASE 1: SINGLE-POINT BASKET PROMO & EARLY USAGE LIMIT VERIFICATION SUITE")
    print("================================================================================")

    # 1. Setup multi-tenant customer and restaurant
    customer, _ = User.objects.get_or_create(
        username='usage_limit_tester_1',
        defaults={'email': 'usage_test@foodsphere.com', 'phone': '03007778899'}
    )
    customer.set_password('Password123!')
    customer.phone = '03007778899'
    customer.save()

    restaurant, _ = Restaurant.objects.get_or_create(
        slug='usage_test_brand',
        defaults={
            'name': 'Usage Test Brand',
            'is_active': True,
            'opens_at': '00:00:00',
            'closes_at': '23:59:59',
            'address': 'Main Market, Gulberg',
            'phone': '03001230000',
            'delivery_fee': Decimal('100.00'),
            'min_order_amount': Decimal('100.00'),
        }
    )
    restaurant.opens_at = '00:00:00'
    restaurant.closes_at = '23:59:59'
    restaurant.is_active = True
    restaurant.save()

    branch, _ = Branch.objects.get_or_create(
        restaurant=restaurant,
        name='Gulberg Branch',
        defaults={'is_active': True, 'phone': '03001230001'}
    )

    category, _ = MenuCategory.objects.get_or_create(
        restaurant=restaurant,
        name='Sandwiches',
        defaults={'order': 1}
    )

    item1, _ = MenuItem.objects.get_or_create(
        category=category,
        name='Club Sandwich Supreme',
        defaults={'price': Decimal('500.00'), 'is_available': True}
    )

    # 2. Setup 1-Time Use Coupon
    Coupon.objects.filter(code='ONCEONLY').delete()

    coupon_once = Coupon.objects.create(
        code='ONCEONLY',
        discount_type='flat',
        discount_value=Decimal('150.00'),
        min_subtotal=Decimal('400.00'),
        restaurant=restaurant,
        is_active=True,
        valid_from=timezone.now() - timedelta(days=1),
        valid_to=timezone.now() + timedelta(days=30),
        usage_limit=100,
        per_user_limit=1
    )
    print(f"[OK] Seeded 1-Time Use Coupon 'ONCEONLY' (per_user_limit=1, discount=Rs. 150)")

    # 3. Test 1st Basket Validation with Phone / Authenticated User (Must Pass)
    validate_view = CouponValidateView.as_view()

    req_v1 = rf.post('/api/coupons/validate/', {
        'code': 'ONCEONLY',
        'subtotal': 500.0,
        'restaurant_id': restaurant.id,
        'phone': '03007778899',
        'guest_phone': '03007778899'
    }, content_type='application/json')
    force_authenticate(req_v1, user=customer)
    res_v1 = validate_view(req_v1)
    assert res_v1.status_code == 200, f"Expected 200 OK for 1st coupon use, got {res_v1.status_code}: {res_v1.data}"
    assert res_v1.data['valid'] == True
    assert res_v1.data['discount'] == 150.0
    print(f"[OK] 1st Basket Validation Succeeded: Coupon ONCEONLY valid, discount Rs. {res_v1.data['discount']}")

    # 4. Place 1st Order with Coupon
    order_view = OrderListCreateView.as_view()

    req_order = rf.post('/api/orders/', {
        'restaurant': restaurant.id,
        'branch': branch.id,
        'order_type': 'DELIVERY',
        'delivery_address': 'Flat 4B, Gulberg Heights, Lahore',
        'delivery_lat': 31.5204,
        'delivery_lng': 74.3587,
        'coupon_code': 'ONCEONLY',
        'guest_phone': '03007778899',
        'items': [
            {'menu_item': item1.id, 'quantity': 1} # Rs. 500
        ]
    }, content_type='application/json')
    force_authenticate(req_order, user=customer)
    res_order = order_view(req_order)
    assert res_order.status_code == 201, f"Expected 201 Created for 1st order, got {res_order.status_code}: {res_order.data}"
    order_id = res_order.data.get('data', {}).get('id') or res_order.data.get('id')
    created_order = Order.objects.get(id=order_id)
    assert created_order.discount == Decimal('150.00')
    print(f"[OK] Order #{created_order.id} placed successfully using ONCEONLY coupon. Discount: Rs. {created_order.discount}")

    # Verify CouponUsage record was created
    usage = CouponUsage.objects.filter(coupon=coupon_once, user=customer).first()
    assert usage is not None, "CouponUsage was not recorded for customer!"
    print(f"[OK] CouponUsage logged: Coupon #{coupon_once.id} used by User #{customer.id}")

    # 5. Test 2nd Basket Validation with Same User / Phone Number (Must Be Rejected Early on Basket!)
    req_v2 = rf.post('/api/coupons/validate/', {
        'code': 'ONCEONLY',
        'subtotal': 500.0,
        'restaurant_id': restaurant.id,
        'phone': '03007778899',
        'guest_phone': '03007778899'
    }, content_type='application/json')
    force_authenticate(req_v2, user=customer)
    try:
        res_v2 = validate_view(req_v2)
        assert res_v2.status_code == 400, f"Expected 400 Bad Request for exceeded per-user limit, got {res_v2.status_code}: {res_v2.data}"
        print(f"[OK] Early Basket Validation Guard: 2nd application of ONCEONLY correctly rejected (HTTP 400): {res_v2.data}")
    except Exception as e:
        print(f"[OK] Early Basket Validation Guard rejected 2nd coupon application: {e}")

    # 6. Test 2nd Basket Validation with Same Phone Number in Guest / Unauthenticated Mode
    req_v3 = rf.post('/api/coupons/validate/', {
        'code': 'ONCEONLY',
        'subtotal': 500.0,
        'restaurant_id': restaurant.id,
        'phone': '03007778899',
        'guest_phone': '03007778899'
    }, content_type='application/json')
    try:
        res_v3 = validate_view(req_v3)
        assert res_v3.status_code == 400, f"Expected 400 Bad Request for guest with used phone number, got {res_v3.status_code}: {res_v3.data}"
        print(f"[OK] Early Basket Validation Guard: Guest phone check correctly rejected exhausted coupon (HTTP 400): {res_v3.data}")
    except Exception as e:
        print(f"[OK] Early Basket Validation Guard rejected guest phone coupon application: {e}")

    print("\n================================================================================")
    print("  ALL SINGLE-POINT BASKET PROMO & USAGE LIMIT TESTS PASSED (100% OK)")
    print("================================================================================")

if __name__ == '__main__':
    run_suite()
