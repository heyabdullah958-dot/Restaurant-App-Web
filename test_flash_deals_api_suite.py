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

from rest_framework.test import APIClient
from promotions.models import FlashDeal, FlashDealRedemption
from restaurants.models import Restaurant, MenuItem, MenuCategory, Branch
from orders.models import Order
from django.contrib.auth import get_user_model

User = get_user_model()


class TestFlashDealsApiSuite(unittest.TestCase):
    def setUp(self):
        self.client = APIClient()
        self.tz = ZoneInfo('Asia/Karachi')
        self.restaurant = Restaurant.objects.filter(slug='jushhpk').first()
        if not self.restaurant:
            self.restaurant = Restaurant.objects.create(name='Jush PK', slug='jushhpk')
        self.branch = Branch.objects.filter(restaurant=self.restaurant).first()
        if not self.branch:
            self.branch = Branch.objects.create(restaurant=self.restaurant, name='DHA Phase 1', address='Lahore')
        self.cat = MenuCategory.objects.create(restaurant=self.restaurant, name='API Burgers')
        self.item = MenuItem.objects.create(category=self.cat, name='API Mighty Burger', price=Decimal('800.00'))

    def tearDown(self):
        FlashDeal.objects.filter(title__startswith='TEST_API_').delete()
        self.item.delete()
        self.cat.delete()

    def test_01_active_deals_endpoint(self):
        deal = FlashDeal.objects.create(
            title='TEST_API_ActiveDeal',
            deal_type='percentage',
            discount_value=Decimal('25.00'),
            restaurant=self.restaurant,
            timing_type='ONE_TIME',
            start_time=datetime(2026, 8, 1, 0, 0, tzinfo=self.tz),
            end_time=datetime(2026, 8, 30, 0, 0, tzinfo=self.tz),
            max_orders=10,
            priority=5
        )
        deal.menu_items.add(self.item)

        res = self.client.get('/api/promotions/flash-deals/')
        self.assertEqual(res.status_code, 200)
        data = res.data.get('results', res.data) if isinstance(res.data, dict) else res.data
        deal_match = next((d for d in data if d.get('title') == deal.title), None)
        self.assertIsNotNone(deal_match)
        self.assertEqual(deal_match['discount_display_text'], '25% OFF')
        self.assertEqual(deal_match['redemptions_left'], 10)
        print("PASS: Active deals endpoint verified")

    def test_02_menu_serialization_badging(self):
        deal = FlashDeal.objects.create(
            title='TEST_API_ItemDeal',
            deal_type='percentage',
            discount_value=Decimal('30.00'),
            restaurant=self.restaurant,
            item_scope_type='SPECIFIC_ITEMS',
            timing_type='ONE_TIME',
            start_time=datetime(2026, 8, 1, 0, 0, tzinfo=self.tz),
            end_time=datetime(2026, 8, 30, 0, 0, tzinfo=self.tz),
            priority=10
        )
        deal.menu_items.add(self.item)

        res = self.client.get(f'/api/restaurants/{self.restaurant.slug}/menu/')
        self.assertEqual(res.status_code, 200)
        categories = res.data.get('data', []) if isinstance(res.data, dict) else res.data
        target_cat = next((c for c in categories if c.get('id') == self.cat.id), None)
        self.assertIsNotNone(target_cat)
        items = target_cat.get('items', [])
        target_item = next((i for i in items if i.get('id') == self.item.id), None)
        self.assertIsNotNone(target_item)
        self.assertIn('active_flash_deal', target_item)
        self.assertIsNotNone(target_item['active_flash_deal'])
        self.assertEqual(target_item['active_flash_deal']['discounted_price'], 560.00)
        self.assertEqual(target_item['active_flash_deal']['badge'], "⚡ 30% OFF")
        print("PASS: Menu serialization item flash deal badging verified")


if __name__ == '__main__':
    unittest.main()
