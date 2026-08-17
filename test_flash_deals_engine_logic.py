import os, sys, unittest
from datetime import datetime, time, date, timedelta
from decimal import Decimal
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from django.utils.timezone import get_current_timezone as ZoneInfo

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django; django.setup()

from promotions.models import FlashDeal
from promotions.deal_engine import resolve_active_deal_for_item, compute_window_ends_at
from restaurants.models import Restaurant, MenuItem, MenuCategory


class TestFlashDealsEngineLogic(unittest.TestCase):
    def setUp(self):
        self.tz = ZoneInfo('Asia/Karachi')
        self.restaurant = Restaurant.objects.filter(slug='jushhpk').first()
        if not self.restaurant:
            self.restaurant = Restaurant.objects.create(name='Jush PK', slug='jushhpk')
        self.cat = MenuCategory.objects.create(restaurant=self.restaurant, name='Burgers')
        self.item = MenuItem.objects.create(category=self.cat, name='Mighty Burger', price=Decimal('850.00'))

    def tearDown(self):
        FlashDeal.objects.filter(title__startswith='TEST_').delete()
        self.item.delete()
        self.cat.delete()

    def test_01_standard_window_active(self):
        deal = FlashDeal.objects.create(
            title='TEST_Standard',
            deal_type='percentage',
            discount_value=Decimal('20.00'),
            timing_type='RECURRING_DAILY',
            daily_start_time=time(14, 0),
            daily_end_time=time(18, 0),
            active_days=['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
            timezone='Asia/Karachi'
        )
        test_dt = datetime(2026, 8, 17, 15, 30, tzinfo=self.tz) # 3:30 PM (Monday)
        self.assertTrue(deal.is_currently_active(test_dt))
        
        test_dt_out = datetime(2026, 8, 17, 19, 0, tzinfo=self.tz) # 7:00 PM
        self.assertFalse(deal.is_currently_active(test_dt_out))
        print("PASS: Standard window active check")

    def test_02_midnight_rollover_window(self):
        # 10:00 PM to 02:00 AM deal on Monday, ending valid_until on Aug 17
        deal = FlashDeal.objects.create(
            title='TEST_Midnight',
            deal_type='percentage',
            discount_value=Decimal('30.00'),
            timing_type='RECURRING_DAILY',
            daily_start_time=time(22, 0),
            daily_end_time=time(2, 0),
            active_days=['MON'],
            valid_until=date(2026, 8, 17),
            timezone='Asia/Karachi'
        )
        # 11:30 PM on Monday night (Aug 17) -> First half -> Active
        dt_mon_night = datetime(2026, 8, 17, 23, 30, tzinfo=self.tz)
        self.assertTrue(deal.is_currently_active(dt_mon_night))

        # 1:30 AM on Tuesday morning (Aug 18) -> Second half belonging to Mon deal -> Active & Valid
        dt_tue_early = datetime(2026, 8, 18, 1, 30, tzinfo=self.tz)
        self.assertTrue(deal.is_currently_active(dt_tue_early))

        # 2:30 AM on Tuesday morning (Aug 18) -> After window -> Inactive
        dt_tue_late = datetime(2026, 8, 18, 2, 30, tzinfo=self.tz)
        self.assertFalse(deal.is_currently_active(dt_tue_late))
        print("PASS: Midnight rollover and effective date boundary check")

    def test_03_priority_overlap_resolution(self):
        deal_menu = FlashDeal.objects.create(
            title='TEST_MenuWide',
            deal_type='percentage',
            discount_value=Decimal('10.00'),
            item_scope_type='ENTIRE_MENU',
            restaurant=self.restaurant,
            timing_type='ONE_TIME',
            start_time=datetime(2026, 8, 1, 0, 0, tzinfo=self.tz),
            end_time=datetime(2026, 8, 30, 0, 0, tzinfo=self.tz),
            priority=0
        )
        deal_item = FlashDeal.objects.create(
            title='TEST_ItemSpecific',
            deal_type='percentage',
            discount_value=Decimal('30.00'),
            item_scope_type='SPECIFIC_ITEMS',
            restaurant=self.restaurant,
            timing_type='ONE_TIME',
            start_time=datetime(2026, 8, 1, 0, 0, tzinfo=self.tz),
            end_time=datetime(2026, 8, 30, 0, 0, tzinfo=self.tz),
            priority=10
        )
        deal_item.menu_items.add(self.item)

        best_deal = resolve_active_deal_for_item(self.item, order_mode='ALL', current_dt=datetime(2026, 8, 17, 12, 0, tzinfo=self.tz))
        self.assertIsNotNone(best_deal)
        self.assertEqual(best_deal['deal_id'], deal_item.id)
        self.assertEqual(best_deal['discount_value'], Decimal('30.00'))
        self.assertEqual(best_deal['discounted_price'], 595.00)
        self.assertEqual(best_deal['badge'], "⚡ 30% OFF")
        print("PASS: Priority overlap resolution and strike-through calculation")


if __name__ == '__main__':
    unittest.main()
