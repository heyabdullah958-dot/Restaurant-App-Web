import os
import django
from datetime import time, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import TestCase
from django.utils import timezone
from restaurants.models import Restaurant, Branch, MenuCategory, MenuItem
from promotions.models import FlashDeal, FlashDealRedemption, Coupon
from promotions.serializers import CouponSerializer, FlashDealSerializer
from promotions.deal_engine import resolve_active_deal_for_item
from orders.models import Order, OrderItem
from users.models import User

class FlashDealsV2EngineComprehensiveSuite(TestCase):
    def setUp(self):
        self.tz = ZoneInfo('Asia/Karachi')
        FlashDeal.objects.all().delete()
        
        # 1. Create Unique Test Brands & Branches
        self.jush = Restaurant.objects.create(
            name='Jush PK Test Suite', slug='jush-test-suite', opens_at=time(0, 0), closes_at=time(23, 59), is_active=True
        )
        self.tandoori = Restaurant.objects.create(
            name='Tandoori Stop Test Suite', slug='tandoori-test-suite', opens_at=time(0, 0), closes_at=time(23, 59), is_active=True
        )
        
        self.jush_dha = Branch.objects.create(
            restaurant=self.jush, name='DHA Phase 1 Test', address='DHA Sector H', phone='03257217221', is_active=True
        )
        self.jush_jt = Branch.objects.create(
            restaurant=self.jush, name='Johar Town Test', address='Johar Town Block R2', phone='03269946142', is_active=True
        )
        
        # 2. Create Categories & Menu Items
        self.cat_burgers = MenuCategory.objects.create(restaurant=self.jush, name='Smash Burgers Test', order=1, is_active=True)
        self.cat_drinks = MenuCategory.objects.create(restaurant=self.jush, name='Beverages Test', order=2, is_active=True)
        self.cat_bbq = MenuCategory.objects.create(restaurant=self.tandoori, name='Desi BBQ Test', order=1, is_active=True)

        self.item_mighty = MenuItem.objects.create(
            category=self.cat_burgers, name='Mighty Burger Test', price=Decimal('850.00'), is_available=True
        )
        self.item_cheesy = MenuItem.objects.create(
            category=self.cat_burgers, name='Cheesy Burger Test', price=Decimal('650.00'), is_available=True
        )
        self.item_coke = MenuItem.objects.create(
            category=self.cat_drinks, name='Cold Cola Test', price=Decimal('150.00'), is_available=True
        )
        self.item_boti = MenuItem.objects.create(
            category=self.cat_bbq, name='Chicken Boti Test', price=Decimal('500.00'), is_available=True
        )
        
        self.user, _ = User.objects.get_or_create(username='tester_deal_v2', defaults={'email': 'tester@deals.com'})

    def tearDown(self):
        self.item_mighty.delete()
        self.item_cheesy.delete()
        self.item_coke.delete()
        self.item_boti.delete()
        self.cat_burgers.delete()
        self.cat_drinks.delete()
        self.cat_bbq.delete()
        self.jush_dha.delete()
        self.jush_jt.delete()
        self.jush.delete()
        self.tandoori.delete()

    def test_01_item_scope_hierarchy_and_specificity(self):
        """Test that SPECIFIC_ITEMS beats CATEGORY, and CATEGORY beats ENTIRE_MENU."""
        # Deal A: Brand-wide 10% OFF Entire Menu (Priority 0)
        deal_menu = FlashDeal.objects.create(
            title='10% Off Everything',
            restaurant=self.jush,
            item_scope_type='ENTIRE_MENU',
            deal_type='percentage',
            discount_value=Decimal('10.00'),
            timing_type='ONE_TIME',
            start_time=timezone.now() - timedelta(hours=1),
            end_time=timezone.now() + timedelta(hours=2),
            priority=0,
            is_active=True
        )

        # Deal B: Category 20% OFF Smash Burgers (Priority 0)
        deal_cat = FlashDeal.objects.create(
            title='20% Off Burgers Category',
            restaurant=self.jush,
            item_scope_type='CATEGORY',
            deal_type='percentage',
            discount_value=Decimal('20.00'),
            timing_type='ONE_TIME',
            start_time=timezone.now() - timedelta(hours=1),
            end_time=timezone.now() + timedelta(hours=2),
            priority=0,
            is_active=True
        )
        deal_cat.categories.add(self.cat_burgers)

        # Deal C: Specific Item 30% OFF Mighty Burger (Priority 0)
        deal_item = FlashDeal.objects.create(
            title='30% Off Mighty Burger',
            restaurant=self.jush,
            item_scope_type='SPECIFIC_ITEMS',
            deal_type='percentage',
            discount_value=Decimal('30.00'),
            timing_type='ONE_TIME',
            start_time=timezone.now() - timedelta(hours=1),
            end_time=timezone.now() + timedelta(hours=2),
            priority=0,
            is_active=True
        )
        deal_item.menu_items.add(self.item_mighty)

        # 1. Mighty Burger matches all 3 -> Specific item (30%) wins!
        res_mighty = resolve_active_deal_for_item(self.item_mighty, branch_id=self.jush_dha.id, order_mode='ALL')
        self.assertIsNotNone(res_mighty)
        self.assertEqual(res_mighty['deal_id'], deal_item.id)
        self.assertEqual(res_mighty['discount_amount'], Decimal('255.00')) # 30% of 850
        self.assertEqual(res_mighty['discounted_price'], Decimal('595.00'))

        # 2. Cheesy Burger matches Deal A & Deal B -> Category (20%) wins!
        res_cheesy = resolve_active_deal_for_item(self.item_cheesy, branch_id=self.jush_dha.id, order_mode='ALL')
        self.assertIsNotNone(res_cheesy)
        self.assertEqual(res_cheesy['deal_id'], deal_cat.id)
        self.assertEqual(res_cheesy['discount_amount'], Decimal('130.00')) # 20% of 650
        self.assertEqual(res_cheesy['discounted_price'], Decimal('520.00'))

        # 3. Coke matches only Deal A (Entire Menu) -> 10%
        res_coke = resolve_active_deal_for_item(self.item_coke, branch_id=self.jush_dha.id, order_mode='ALL')
        self.assertIsNotNone(res_coke)
        self.assertEqual(res_coke['deal_id'], deal_menu.id)
        self.assertEqual(res_coke['discount_amount'], Decimal('15.00')) # 10% of 150
        self.assertEqual(res_coke['discounted_price'], Decimal('135.00'))

    def test_02_midnight_rollover_and_active_days(self):
        """Test midnight window (e.g. 23:00 to 03:00) at 23:30 (today) and 01:30 (next day)."""
        deal_midnight = FlashDeal.objects.create(
            title='Midnight Feast (11 PM - 3 AM)',
            restaurant=self.jush,
            item_scope_type='ENTIRE_MENU',
            deal_type='percentage',
            discount_value=Decimal('25.00'),
            timing_type='RECURRING_DAILY',
            daily_start_time=time(23, 0),
            daily_end_time=time(3, 0),
            active_days=['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
            valid_from=timezone.now().date() - timedelta(days=1),
            valid_until=timezone.now().date() + timedelta(days=5),
            is_active=True
        )

        today = timezone.now().date()
        # 1. At 23:30 (Day 1) -> active
        t_2330 = datetime.combine(today, time(23, 30)).replace(tzinfo=self.tz)
        self.assertTrue(deal_midnight.is_currently_active(current_dt=t_2330))

        # 2. At 01:30 (Day 2 early morning) -> active (belongs to previous night session)
        t_0130 = datetime.combine(today + timedelta(days=1), time(1, 30)).replace(tzinfo=self.tz)
        self.assertTrue(deal_midnight.is_currently_active(current_dt=t_0130))

        # 3. At 14:00 (afternoon) -> NOT active
        t_1400 = datetime.combine(today, time(14, 0)).replace(tzinfo=self.tz)
        self.assertFalse(deal_midnight.is_currently_active(current_dt=t_1400))

    def test_03_multi_tenant_brand_and_branch_isolation(self):
        """Test that Jush deals do not leak to Tandoori Stop, and branch deals stay scoped."""
        deal_dha_only = FlashDeal.objects.create(
            title='DHA Phase 1 Exclusive 40% Off',
            restaurant=self.jush,
            branch=self.jush_dha,
            item_scope_type='ENTIRE_MENU',
            deal_type='percentage',
            discount_value=Decimal('40.00'),
            timing_type='ONE_TIME',
            start_time=timezone.now() - timedelta(hours=1),
            end_time=timezone.now() + timedelta(hours=2),
            is_active=True
        )

        # 1. When querying for DHA Branch -> deal applies
        res_dha = resolve_active_deal_for_item(self.item_mighty, branch_id=self.jush_dha.id, order_mode='ALL')
        self.assertIsNotNone(res_dha)
        self.assertEqual(res_dha['deal_id'], deal_dha_only.id)

        # 2. When querying for Johar Town Branch -> deal does NOT apply
        res_jt = resolve_active_deal_for_item(self.item_mighty, branch_id=self.jush_jt.id, order_mode='ALL')
        self.assertIsNone(res_jt)

        # 3. When querying for Tandoori Stop item -> deal does NOT apply
        res_tandoori = resolve_active_deal_for_item(self.item_boti, branch_id=None, order_mode='ALL')
        self.assertIsNone(res_tandoori)

    def test_04_order_mode_filtering(self):
        """Test Dine-In vs Delivery mode restrictions."""
        deal_dine_in = FlashDeal.objects.create(
            title='Dine-In 50% Off Special',
            restaurant=self.jush,
            order_mode='DINE_IN',
            item_scope_type='ENTIRE_MENU',
            deal_type='percentage',
            discount_value=Decimal('50.00'),
            timing_type='ONE_TIME',
            start_time=timezone.now() - timedelta(hours=1),
            end_time=timezone.now() + timedelta(hours=2),
            is_active=True
        )

        # In DINE_IN order mode -> deal is resolved
        res_dine = resolve_active_deal_for_item(self.item_mighty, branch_id=self.jush_dha.id, order_mode='DINE_IN')
        self.assertIsNotNone(res_dine)
        self.assertEqual(res_dine['deal_id'], deal_dine_in.id)

        # In DELIVERY order mode -> deal is skipped
        res_deliv = resolve_active_deal_for_item(self.item_mighty, branch_id=self.jush_dha.id, order_mode='DELIVERY')
        self.assertIsNone(res_deliv)

    def test_05_redemptions_cap_and_ledger_audit(self):
        """Test max orders cap and FlashDealRedemption creation."""
        deal_limited = FlashDeal.objects.create(
            title='First 2 Orders 50% Off',
            restaurant=self.jush,
            item_scope_type='ENTIRE_MENU',
            deal_type='percentage',
            discount_value=Decimal('50.00'),
            max_orders=2,
            redemption_reset_frequency='LIFETIME',
            timing_type='ONE_TIME',
            start_time=timezone.now() - timedelta(hours=1),
            end_time=timezone.now() + timedelta(hours=2),
            is_active=True
        )

        # Initial redemptions = 0 -> active
        self.assertEqual(deal_limited.current_redemption_count(), 0)
        self.assertTrue(deal_limited.is_currently_active())

        # Simulate Order 1
        order1 = Order.objects.create(
            user=self.user, restaurant=self.jush, branch=self.jush_dha,
            order_type='DELIVERY', delivery_address='Test St 1', subtotal=Decimal('500.00'), total=Decimal('500.00')
        )
        FlashDealRedemption.objects.create(
            flash_deal=deal_limited, order=order1, user=self.user, discount_applied=Decimal('250.00')
        )
        self.assertEqual(deal_limited.current_redemption_count(), 1)
        self.assertTrue(deal_limited.is_currently_active())

        # Simulate Order 2 (Exhausts cap)
        order2 = Order.objects.create(
            user=self.user, restaurant=self.jush, branch=self.jush_dha,
            order_type='DELIVERY', delivery_address='Test St 2', subtotal=Decimal('500.00'), total=Decimal('500.00')
        )
        FlashDealRedemption.objects.create(
            flash_deal=deal_limited, order=order2, user=self.user, discount_applied=Decimal('250.00')
        )
        self.assertEqual(deal_limited.current_redemption_count(), 2)
        
        # Now cap is reached -> deal should deactivate automatically
        self.assertFalse(deal_limited.is_currently_active())
        res_after_exhaustion = resolve_active_deal_for_item(self.item_mighty, branch_id=self.jush_dha.id, order_mode='ALL')
        self.assertIsNone(res_after_exhaustion)

    def test_09_serializer_validation_rules(self):
        """Test validation rules for CouponSerializer and FlashDealSerializer."""
        # 1. CouponSerializer validations
        # Negative / Zero discount_value
        c_bad_disc = CouponSerializer(data={
            'code': 'TESTZERO',
            'discount_type': 'percentage',
            'discount_value': 0,
            'restaurant': self.jush.id,
            'branch': self.jush_dha.id,
        })
        self.assertFalse(c_bad_disc.is_valid())
        self.assertIn('discount_value', c_bad_disc.errors)

        # Percentage > 100
        c_over_100 = CouponSerializer(data={
            'code': 'TEST120',
            'discount_type': 'percentage',
            'discount_value': 120,
            'restaurant': self.jush.id,
            'branch': self.jush_dha.id,
        })
        self.assertFalse(c_over_100.is_valid())
        self.assertIn('discount_value', c_over_100.errors)

        # Negative min_subtotal
        c_neg_sub = CouponSerializer(data={
            'code': 'TESTNEGSUB',
            'discount_type': 'flat',
            'discount_value': 50,
            'min_subtotal': -100,
            'restaurant': self.jush.id,
            'branch': self.jush_dha.id,
        })
        self.assertFalse(c_neg_sub.is_valid())
        self.assertIn('min_subtotal', c_neg_sub.errors)

        # valid_to < valid_from
        now = timezone.now()
        c_bad_dates = CouponSerializer(data={
            'code': 'TESTBADDATE',
            'discount_type': 'flat',
            'discount_value': 50,
            'valid_from': (now + timedelta(days=5)).isoformat(),
            'valid_to': (now + timedelta(days=1)).isoformat(),
            'restaurant': self.jush.id,
            'branch': self.jush_dha.id,
        })
        self.assertFalse(c_bad_dates.is_valid())
        self.assertIn('valid_to', c_bad_dates.errors)

        # Valid coupon passes
        c_valid = CouponSerializer(data={
            'code': 'TESTVALID10',
            'discount_type': 'percentage',
            'discount_value': 10,
            'min_subtotal': 500,
            'valid_from': now.isoformat(),
            'valid_to': (now + timedelta(days=10)).isoformat(),
            'restaurant': self.jush.id,
            'branch': self.jush_dha.id,
        })
        self.assertTrue(c_valid.is_valid(), c_valid.errors)

        # 2. FlashDealSerializer validations
        # Percentage > 100
        fd_over_100 = FlashDealSerializer(data={
            'title': 'Over 100 Deal',
            'restaurant': self.jush.id,
            'branch': self.jush_dha.id,
            'deal_type': 'percentage',
            'discount_value': 150,
        })
        self.assertFalse(fd_over_100.is_valid())
        self.assertIn('discount_value', fd_over_100.errors)

        # End time before start time (ONE_TIME fixed window)
        fd_bad_time = FlashDealSerializer(data={
            'title': 'Inverted Time Deal',
            'restaurant': self.jush.id,
            'branch': self.jush_dha.id,
            'deal_type': 'flat',
            'discount_value': 50,
            'timing_type': 'ONE_TIME',
            'start_time': (now + timedelta(hours=3)).isoformat(),
            'end_time': (now + timedelta(hours=1)).isoformat(),
        })
        self.assertFalse(fd_bad_time.is_valid())
        self.assertIn('end_time', fd_bad_time.errors)

        # valid_until before valid_from
        fd_bad_dates = FlashDealSerializer(data={
            'title': 'Inverted Dates Deal',
            'restaurant': self.jush.id,
            'branch': self.jush_dha.id,
            'deal_type': 'flat',
            'discount_value': 50,
            'valid_from': (now.date() + timedelta(days=5)).isoformat(),
            'valid_until': (now.date() + timedelta(days=1)).isoformat(),
        })
        self.assertFalse(fd_bad_dates.is_valid())
        self.assertIn('valid_until', fd_bad_dates.errors)

        # Valid flash deal passes
        fd_valid = FlashDealSerializer(data={
            'title': 'Valid Test Deal',
            'restaurant': self.jush.id,
            'branch': self.jush_dha.id,
            'deal_type': 'percentage',
            'discount_value': 20,
            'min_subtotal': 300,
            'timing_type': 'ONE_TIME',
            'start_time': now.isoformat(),
            'end_time': (now + timedelta(hours=4)).isoformat(),
        })
        self.assertTrue(fd_valid.is_valid(), fd_valid.errors)

if __name__ == '__main__':
    import unittest
    unittest.main()

