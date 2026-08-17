import os, sys, unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django; django.setup()
from promotions.models import FlashDeal, FlashDealRedemption

class TestFlashDealSchema(unittest.TestCase):
    def test_schema_fields_exist(self):
        fields = [f.name for f in FlashDeal._meta.get_fields()]
        self.assertIn('order_mode', fields)
        self.assertIn('item_scope_type', fields)
        self.assertIn('categories', fields)
        self.assertIn('daily_start_time', fields)
        self.assertIn('daily_end_time', fields)
        self.assertIn('active_days', fields)
        self.assertIn('timezone', fields)
        self.assertIn('redemption_reset_frequency', fields)
        self.assertIn('priority', fields)
        self.assertTrue(hasattr(FlashDealRedemption, 'flash_deal'))
        self.assertTrue(hasattr(FlashDealRedemption, 'order'))
        print("PASS: Schema and models confirmed.")

if __name__ == '__main__':
    unittest.main()
