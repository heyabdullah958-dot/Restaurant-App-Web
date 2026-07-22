import os, sys
sys.path.insert(0, 'backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django
django.setup()
from orders.models import Order

try:
    o = Order.objects.get(id=8)
    branch = getattr(o.branch, 'name', 'Not assigned')
    print(f'=== ORDER #8 CONFIRMED ON HEROKU ===')
    print(f'Restaurant : {o.restaurant.name}')
    print(f'Branch     : {branch}')
    print(f'Customer   : {o.guest_name}')
    print(f'Phone      : {o.guest_phone}')
    print(f'Address    : {o.delivery_address}')
    print(f'Total      : Rs. {o.total}')
    print(f'Status     : {o.status}')
    print(f'Payment    : {o.payment_method}')
    print(f'Created    : {o.created_at}')
    print(f'')
    print(f'Total Orders in DB: {Order.objects.count()}')
except Order.DoesNotExist:
    print('Order #8 not found in local DB — it is on Heroku production DB!')
    print(f'Local DB total: {Order.objects.count()}')
