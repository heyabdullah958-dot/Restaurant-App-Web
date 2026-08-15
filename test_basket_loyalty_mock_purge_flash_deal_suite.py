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
from promotions.models import Coupon, CouponUsage, FlashDeal
from promotions.views import CouponValidateView, FlashDealListCreateView
from orders.views import OrderListCreateView

User = get_user_model()
rf = RequestFactory()

def run_suite():
    print("================================================================================")
    print("  PHASE 1: BASKET LOYALTY RELOCATION, MOCK PURGE & FLASH DEAL ENGINE SUITE")
    print("================================================================================")

    # 1. Setup multi-tenant customer with loyalty points balance
    customer, _ = User.objects.get_or_create(
        username='basket_loyalty_user_1',
        defaults={'email': 'basket_loyalty@foodsphere.com', 'phone': '03009991122'}
    )
    customer.set_password('Password123!')
    customer.loyalty_points = 500 # 500 points available
    customer.save()
    print(f"[OK] Initialized Customer: {customer.username} with {customer.loyalty_points} loyalty points.")

    restaurant, _ = Restaurant.objects.get_or_create(
        slug='basket_test_brand',
        defaults={
            'name': 'Basket Test Brand',
            'is_active': True,
            'opens_at': '00:00:00',
            'closes_at': '23:59:59',
            'address': 'Main Boulevard, Gulberg',
            'phone': '03001239999',
            'delivery_fee': Decimal('150.00'),
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
        defaults={'is_active': True, 'phone': '03001239998'}
    )

    category, _ = MenuCategory.objects.get_or_create(
        restaurant=restaurant,
        name='Main Course',
        defaults={'order': 1}
    )

    item1, _ = MenuItem.objects.get_or_create(
        category=category,
        name='Handi Special Large',
        defaults={'price': Decimal('1200.00'), 'is_available': True}
    )

    # 2. Setup Threshold Promo Coupon (Min Rs. 1000, Rs. 200 Flat Off)
    Coupon.objects.filter(code='BASKET200').delete()
    coupon = Coupon.objects.create(
        code='BASKET200',
        discount_type='flat',
        discount_value=Decimal('200.00'),
        min_subtotal=Decimal('1000.00'),
        restaurant=restaurant,
        is_active=True,
        valid_from=timezone.now() - timedelta(days=1),
        valid_to=timezone.now() + timedelta(days=30),
        usage_limit=100,
        per_user_limit=5
    )
    print(f"[OK] Seeded Threshold Coupon: BASKET200 (Min subtotal: Rs. 1,000, Discount: Rs. 200)")

    # 3. Test Basket Order Placement Combining Promo Discount AND Loyalty Points Redemption
    order_view = OrderListCreateView.as_view()

    # Subtotal: Rs. 1200, Promo: -Rs. 200, Rem Subtotal: Rs. 1000, Redeem Points: 300 pts (-Rs. 300), Delivery: Rs. 150
    # Final Total: 1200 - 200 - 300 + 150 = Rs. 850
    req_order = rf.post('/api/orders/', {
        'restaurant': restaurant.id,
        'branch': branch.id,
        'order_type': 'DELIVERY',
        'delivery_address': 'House 12, Gulberg III, Lahore',
        'delivery_lat': 31.5204,
        'delivery_lng': 74.3587,
        'coupon_code': 'BASKET200',
        'use_loyalty_points': True,
        'points_to_redeem': 300,
        'guest_phone': '03009991122',
        'items': [
            {'menu_item': item1.id, 'quantity': 1} # Rs. 1200
        ]
    }, content_type='application/json')
    force_authenticate(req_order, user=customer)
    res_order = order_view(req_order)
    assert res_order.status_code == 201, f"Expected 201 Created, got {res_order.status_code}: {res_order.data}"
    order_id = res_order.data.get('data', {}).get('id') or res_order.data.get('id')
    created_order = Order.objects.get(id=order_id)
    assert created_order.discount == Decimal('500.00'), f"Expected total discount Rs. 500 (200 promo + 300 loyalty), got {created_order.discount}"
    assert created_order.total == Decimal('850.00'), f"Expected total Rs. 850.00, got {created_order.total}"
    print(f"[OK] Basket Order #{created_order.id} verified with Total Combined Discount Rs. 500 (Promo Rs. 200 + Loyalty Rs. 300) -> Total Rs. {created_order.total}")

    # 4. Verify Customer Loyalty Points Balance Debited Correctly
    customer.refresh_from_db()
    # 500 initial - 300 used + 12 earned (1200 subtotal / 100 = 12 pts) = 212 pts
    assert customer.loyalty_points == 212, f"Expected customer points 212, got {customer.loyalty_points}"
    print(f"[OK] Customer Loyalty Points Balance updated correctly: {customer.loyalty_points} pts (500 - 300 + 12)")

    # 5. Test Flash Deal Creation & Active Endpoint
    admin_user, _ = User.objects.get_or_create(
        username='admin_deal_tester',
        defaults={'email': 'admin_deals@foodsphere.com', 'is_staff': True, 'is_superuser': True}
    )
    admin_user.is_staff = True
    admin_user.is_superuser = True
    admin_user.save()

    FlashDeal.objects.filter(title='Midsummer Feast 40% Off').delete()

    flash_deal_view = FlashDealListCreateView.as_view()
    now_dt = timezone.now()
    req_deal = rf.post('/api/promotions/flash-deals/', {
        'title': 'Midsummer Feast 40% Off',
        'description': '40% discount on all platters this weekend only!',
        'deal_type': 'percentage',
        'discount_value': 40.0,
        'restaurant': restaurant.id,
        'start_time': now_dt.isoformat(),
        'end_time': (now_dt + timedelta(days=3)).isoformat(),
        'is_active': True,
        'is_dine_in_only': False
    }, content_type='application/json')
    force_authenticate(req_deal, user=admin_user)
    res_deal = flash_deal_view(req_deal)
    assert res_deal.status_code == 201, f"Expected 201 Created for flash deal, got {res_deal.status_code}: {res_deal.data}"
    print(f"[OK] Flash Deal '{res_deal.data['title']}' created successfully (ID: {res_deal.data['id']})")

    # 6. Test Active Flash Deals Query
    req_active = rf.get('/api/promotions/flash-deals/')
    res_active = flash_deal_view(req_active)
    assert res_active.status_code == 200
    active_deals = res_active.data if isinstance(res_active.data, list) else res_active.data.get('results', [])
    deal_titles = [d['title'] for d in active_deals]
    assert 'Midsummer Feast 40% Off' in deal_titles, f"Flash deal not found in active list: {deal_titles}"
    print(f"[OK] Active Flash Deals Endpoint verified: {len(active_deals)} active deals surfaced to mobile carousels.")

    print("\n================================================================================")
    print("  ALL BASKET LOYALTY & FLASH DEAL VERIFICATION TESTS PASSED (100% OK)")
    print("================================================================================")

if __name__ == '__main__':
    run_suite()
