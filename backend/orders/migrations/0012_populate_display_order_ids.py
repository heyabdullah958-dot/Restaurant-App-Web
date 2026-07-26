# Generated data migration to populate display_order_id for existing orders

from django.db import migrations

def populate_display_order_ids(apps, schema_editor):
    Order = apps.get_model('orders', 'Order')
    
    brand_map = {
        'seenbanao': 'SB',
        'dineatblue': 'DB',
        'jushhpk': 'JK',
        'tandooristoppk': 'TS',
        'sandmelts': 'SM',
        'birdmanfoodspk': 'BM',
        'getafomo': 'GF',
    }
    
    branch_map = {
        'johar town': 'JT',
        'lake city': 'LC',
        'dha phase 1': 'DHA1',
        'gt road baghbanpura': 'GTR',
        'gulberg iii': 'G3',
    }

    orders = Order.objects.filter(display_order_id__isnull=True) | Order.objects.filter(display_order_id='')
    orders = orders.select_related('restaurant', 'branch').order_by('id')

    branch_sequences = {}

    for order in orders:
        restaurant = order.restaurant
        branch = order.branch

        brand_code = 'FS'
        if restaurant:
            handle = (getattr(restaurant, 'handle', '') or '').lower().replace(' ', '')
            name = (getattr(restaurant, 'name', '') or '').lower().replace(' ', '')
            brand_code = brand_map.get(handle) or brand_map.get(name)
            if not brand_code:
                words = [w for w in (getattr(restaurant, 'name', '') or '').split() if w]
                brand_code = ''.join([w[0].upper() for w in words[:3]]) or 'FS'

        branch_code = 'MAIN'
        if branch:
            bname = (getattr(branch, 'name', '') or '').strip().lower()
            branch_code = branch_map.get(bname)
            if not branch_code:
                words = [w for w in (getattr(branch, 'name', '') or '').split() if w]
                branch_code = ''.join([w[0].upper() for w in words[:3]]) or 'MAIN'

        scope_key = f"{restaurant.id if restaurant else 0}_{branch.id if branch else 0}"
        if scope_key not in branch_sequences:
            branch_sequences[scope_key] = 1000

        branch_sequences[scope_key] += 1
        seq = branch_sequences[scope_key]

        order.display_order_id = f"{brand_code}-{branch_code}-{seq}"
        order.save(update_fields=['display_order_id'])

def reverse_display_order_ids(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0011_order_display_order_id_alter_order_status'),
    ]

    operations = [
        migrations.RunPython(populate_display_order_ids, reverse_code=reverse_display_order_ids),
    ]
