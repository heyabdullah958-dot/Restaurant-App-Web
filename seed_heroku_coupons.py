import os
import sys
import django
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Use production Heroku DATABASE_URL if available or django setup
django.setup()

from promotions.models import Coupon

now = timezone.now()
valid_to = now + timedelta(days=90)

c1, created1 = Coupon.objects.get_or_create(
    code='WELCOME10',
    defaults={
        'discount_type': 'percentage',
        'discount_value': Decimal('10.00'),
        'min_subtotal': Decimal('100.00'),
        'max_discount': Decimal('150.00'),
        'valid_from': now,
        'valid_to': valid_to,
        'usage_limit': 500,
        'per_user_limit': 2,
        'is_active': True
    }
)

c2, created2 = Coupon.objects.get_or_create(
    code='GETFOOD50',
    defaults={
        'discount_type': 'flat',
        'discount_value': Decimal('50.00'),
        'min_subtotal': Decimal('200.00'),
        'valid_from': now,
        'valid_to': valid_to,
        'usage_limit': 200,
        'per_user_limit': 1,
        'is_active': True
    }
)

print(f"Coupons Ready: WELCOME10 (Created: {created1}), GETFOOD50 (Created: {created2})")
