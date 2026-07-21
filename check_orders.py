import os
import sys

sys.path.insert(0, 'backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from orders.models import Order

orders = Order.objects.all().order_by('-created_at')[:10]
print(f'=== TOTAL ORDERS IN DB: {Order.objects.count()} ===')
print()
for o in orders:
    branch_name = getattr(o.branch, 'name', 'None')
    print(f"Order #{o.id}")
    print(f"  Restaurant : {o.restaurant.name}")
    print(f"  Branch     : {branch_name}")
    print(f"  Customer   : {o.guest_name}")
    print(f"  Phone      : {o.guest_phone}")
    print(f"  Address    : {o.delivery_address}")
    print(f"  Total      : Rs. {o.total}")
    print(f"  Status     : {o.status}")
    print(f"  Payment    : {o.payment_method}")
    print(f"  Created    : {o.created_at.strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print()
