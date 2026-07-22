import os
import sys

sys.path.insert(0, 'backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from orders.models import Order
from payments.models import Payment

deleted_payments, _ = Payment.objects.all().delete()
deleted_orders, _ = Order.objects.all().delete()

print(f"Cleared local database:")
print(f"  - Deleted {deleted_payments} payment(s)")
print(f"  - Deleted {deleted_orders} order(s)")
print(f"Remaining local orders: {Order.objects.count()}")
