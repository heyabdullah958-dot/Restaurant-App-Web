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
from restaurants.models import Restaurant, Branch, BranchRider, MenuItem, MenuCategory
from orders.models import Order, OrderItem
from promotions.models import FlashDeal, Coupon
from users.admin_views import AdminCustomerListView
from restaurants.views import AdminBranchRiderViewSet
from promotions.views import FlashDealListCreateView, CouponListCreateView

User = get_user_model()
rf = RequestFactory()

def run_suite():
    print("======================================================================")
    print("  PHASE 2: Super Admin Rider Creation, CRM Metrics & DatePickers Suite")
    print("======================================================================")

    # 1. Setup / Get Super Admin
    super_admin, _ = User.objects.get_or_create(
        username='test_super_phase2',
        defaults={'email': 'super_phase2@foodsphere.com', 'is_superuser': True, 'is_staff': True}
    )
    super_admin.is_superuser = True
    super_admin.is_staff = True
    super_admin.set_password('Admin1234!')
    super_admin.save()
    print("[OK] Super Admin user initialized.")

    # 2. Setup Restaurants & Branches
    rest_a, _ = Restaurant.objects.get_or_create(
        slug='test_crm_brand_a',
        defaults={
            'name': 'CRM Test Brand A',
            'is_active': True,
            'opens_at': '09:00:00',
            'closes_at': '23:59:59',
            'address': 'Main Boulevard, Lahore',
            'phone': '03001111111'
        }
    )
    branch_a, _ = Branch.objects.get_or_create(
        restaurant=rest_a,
        name='Gulberg Branch A',
        defaults={'is_active': True, 'phone': '03001111111'}
    )

    rest_b, _ = Restaurant.objects.get_or_create(
        slug='test_crm_brand_b',
        defaults={
            'name': 'CRM Test Brand B',
            'is_active': True,
            'opens_at': '09:00:00',
            'closes_at': '23:59:59',
            'address': 'DHA Phase 5, Lahore',
            'phone': '03002222222'
        }
    )
    branch_b, _ = Branch.objects.get_or_create(
        restaurant=rest_b,
        name='DHA Branch B',
        defaults={'is_active': True, 'phone': '03002222222'}
    )
    print(f"[OK] Tenants: Brand A (Branch ID {branch_a.id}), Brand B (Branch ID {branch_b.id})")

    # Clean up test riders if they already exist
    BranchRider.objects.filter(phone__in=['03001234501', '03001234502']).delete()

    # 3. Test Super Admin Rider Creation under target branches
    rider_view = AdminBranchRiderViewSet.as_view({'post': 'create', 'get': 'list'})
    
    # Rider for Branch A
    req_r1 = rf.post('/api/admin/riders/', {
        'name': 'Ali SuperRider A',
        'phone': '03001234501',
        'vehicle_type': 'BIKE',
        'status': 'AVAILABLE',
        'is_active': True,
        'branch': branch_a.id
    }, content_type='application/json')
    force_authenticate(req_r1, user=super_admin)
    res_r1 = rider_view(req_r1)
    assert res_r1.status_code == 201, f"Failed to create rider for Branch A: {res_r1.data}"
    rider_a_id = res_r1.data['id']
    assert res_r1.data['branch'] == branch_a.id
    assert res_r1.data['restaurant_name'] == 'CRM Test Brand A'
    print(f"[OK] Rider A created by Super Admin for Branch A (ID: {rider_a_id}, Brand: {res_r1.data['restaurant_name']})")

    # Rider for Branch B
    req_r2 = rf.post('/api/admin/riders/', {
        'name': 'Usman SuperRider B',
        'phone': '03001234502',
        'vehicle_type': 'CAR',
        'status': 'AVAILABLE',
        'is_active': True,
        'branch': branch_b.id
    }, content_type='application/json')
    force_authenticate(req_r2, user=super_admin)
    res_r2 = rider_view(req_r2)
    assert res_r2.status_code == 201, f"Failed to create rider for Branch B: {res_r2.data}"
    rider_b_id = res_r2.data['id']
    assert res_r2.data['branch'] == branch_b.id
    assert res_r2.data['restaurant_name'] == 'CRM Test Brand B'
    print(f"[OK] Rider B created by Super Admin for Branch B (ID: {rider_b_id}, Brand: {res_r2.data['restaurant_name']})")

    # 4. Test Customer CRM Metrics Aggregation (Delivered Orders Only)
    customer_user, _ = User.objects.get_or_create(
        username='crm_test_customer_1',
        defaults={'email': 'crm_cust1@gmail.com', 'phone': '03119998877', 'loyalty_points': 350}
    )

    # Clean up existing test orders for this user
    Order.objects.filter(user=customer_user).delete()

    # Create 2 Delivered Orders (Rs. 1,500 and Rs. 2,500 -> Total Rs. 4,000)
    o1 = Order.objects.create(
        user=customer_user,
        restaurant=rest_a,
        branch=branch_a,
        total=Decimal('1500.00'),
        subtotal=Decimal('1500.00'),
        delivery_address='Test Address 1',
        status='delivered',
        payment_method='cod'
    )
    o2 = Order.objects.create(
        user=customer_user,
        restaurant=rest_b,
        branch=branch_b,
        total=Decimal('2500.00'),
        subtotal=Decimal('2500.00'),
        delivery_address='Test Address 2',
        status='delivered',
        payment_method='cod'
    )
    # Create 1 Cancelled Order (Rs. 9,999) - should NOT count toward delivered total spent
    o3 = Order.objects.create(
        user=customer_user,
        restaurant=rest_a,
        branch=branch_a,
        total=Decimal('9999.00'),
        subtotal=Decimal('9999.00'),
        delivery_address='Test Address 3',
        status='cancelled',
        payment_method='cod'
    )
    # Create 1 In-Progress Order (Rs. 1,200) - should NOT count toward delivered total spent
    o4 = Order.objects.create(
        user=customer_user,
        restaurant=rest_a,
        branch=branch_a,
        total=Decimal('1200.00'),
        subtotal=Decimal('1200.00'),
        delivery_address='Test Address 4',
        status='preparing',
        payment_method='cod'
    )

    customer_list_view = AdminCustomerListView.as_view()
    req_crm = rf.get('/api/admin/customers/?search=crm_test_customer_1')
    force_authenticate(req_crm, user=super_admin)
    res_crm = customer_list_view(req_crm)
    assert res_crm.status_code == 200, f"CRM List failed: {res_crm.data}"

    cust_row = next((c for c in res_crm.data['results'] if c['username'] == 'crm_test_customer_1'), None)
    assert cust_row is not None, "Customer not found in CRM list results"
    print(f"[OK] Customer CRM Row: {cust_row}")
    assert cust_row['orders_count'] == 2, f"Expected 2 delivered orders, got {cust_row['orders_count']}"
    assert cust_row['total_spent'] == 4000.0, f"Expected Rs. 4000 total spent, got {cust_row['total_spent']}"
    print(f"[OK] Customer CRM Delivered Aggregation Verified: {cust_row['orders_count']} delivered orders, Rs. {cust_row['total_spent']:,.2f} spent (excluding cancelled/preparing orders).")

    # 5. Test Flash Deal & Promo Creation with ISO Date Strings (as produced by DateTimePickerModal)
    FlashDeal.objects.filter(title='Test Midsummer Night Deal').delete()
    Coupon.objects.filter(code='CRMTEST50').delete()

    deal_view = FlashDealListCreateView.as_view()
    now = timezone.now()
    start_iso = now.isoformat()
    end_iso = (now + timedelta(days=7)).isoformat()

    req_deal = rf.post('/api/deals/', {
        'title': 'Test Midsummer Night Deal',
        'deal_type': 'percentage',
        'discount_value': Decimal('30.00'),
        'discount_percentage': 30,
        'start_time': start_iso,
        'end_time': end_iso,
        'is_active': True,
        'restaurant': rest_a.id
    }, content_type='application/json')
    force_authenticate(req_deal, user=super_admin)
    res_deal = deal_view(req_deal)
    assert res_deal.status_code == 201, f"Failed to create Flash Deal: {res_deal.data}"
    print(f"[OK] Flash Deal Created with ISO DateTime: '{res_deal.data['title']}' (ID: {res_deal.data['id']})")

    # 6. Test Promo Coupon Creation with Expiry Date
    coupon_view = CouponListCreateView.as_view()
    coupon_expiry = (now + timedelta(days=30)).date().isoformat()
    req_coupon = rf.post('/api/coupons/', {
        'code': 'CRMTEST50',
        'discount_type': 'FLAT',
        'discount_value': Decimal('150.00'),
        'min_order_amount': Decimal('600.00'),
        'valid_to': coupon_expiry,
        'is_active': True,
        'restaurant': rest_b.id
    }, content_type='application/json')
    force_authenticate(req_coupon, user=super_admin)
    res_coupon = coupon_view(req_coupon)
    assert res_coupon.status_code == 201, f"Failed to create Coupon: {res_coupon.data}"
    print(f"[OK] Promo Coupon Created with Expiry Date '{coupon_expiry}': {res_coupon.data['code']} (ID: {res_coupon.data['id']})")

    print("======================================================================")
    print("  ALL PHASE 2 VERIFICATION TESTS PASSED SUCCESSFULLY! (100% OK)")
    print("======================================================================")

if __name__ == '__main__':
    run_suite()
