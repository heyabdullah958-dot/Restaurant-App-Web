from django.db import migrations
from decimal import Decimal

def seed_tandoori_stop_branches(apps, schema_editor):
    Restaurant = apps.get_model('restaurants', 'Restaurant')
    Branch = apps.get_model('restaurants', 'Branch')
    MenuItem = apps.get_model('restaurants', 'MenuItem')
    BranchMenuItemAvailability = apps.get_model('restaurants', 'BranchMenuItemAvailability')

    restaurant = Restaurant.objects.filter(slug='tandooristoppk').first()
    if not restaurant:
        restaurant = Restaurant.objects.filter(name__icontains='tandoori').first()
    
    if not restaurant:
        return

    LAKE_CITY_KEYWORDS = [
        'lake city', 'lake', 'lc', 'sector m7', 'sector m7 lake city', 'lake city mall',
        'khayaban-e-amin', 'khayaban e amin', 'bahria town', 'bahria', 'raiwind', 'raiwind road',
        'addah plot', 'adda plot', 'safari garden', 'chinar bagh', 'halloki', 'pine avenue'
    ]

    MOZANG_KEYWORDS = [
        'mozang', 'mozang chungi', 'temple road', 'shoukat plaza', 'safanwala chowk',
        'shadman', 'jail road', 'queen road', 'mall road', 'anarkali', 'lahore hotel',
        'chauburji', 'civil lines', 'nabha road', 'fane road', 'fatima jinnah medical university',
        'ganga ram', 'litton road', 'mazang', 'mozing'
    ]

    BAGHBANPURA_KEYWORDS = [
        'gt road', 'baghbanpura', 'gt', 'bagbanpura', 'ghass mandi', 'ghass mandi stop',
        'shalimar', 'shalimar garden', 'shalimar gardens', 'singhpura', 'daroghawala',
        'mughalpura', 'harbanspura', 'manawan', 'salamatpura', 'bhatta chowk',
        'press club colony', 'mehmood booti', 'gari shahu', 'garhi shahu'
    ]

    branches_data = [
        {
            'name': 'Lake City',
            'address': 'Sector M7 Lake City, Lahore',
            'phone': '0324-4441735',
            'latitude': Decimal('31.3521664'),
            'longitude': Decimal('74.2529319'),
            'delivery_radius_km': Decimal('10.00'),
            'area_keywords': LAKE_CITY_KEYWORDS,
            'is_active': True,
            'is_dine_in_enabled': True,
        },
        {
            'name': 'Mozang Chungi',
            'address': '16-B Temple Road, Shoukat Plaza, Mozang Chungi, Lahore',
            'phone': '0327-4945947',
            'latitude': Decimal('31.5577696'),
            'longitude': Decimal('74.3173073'),
            'delivery_radius_km': Decimal('10.00'),
            'area_keywords': MOZANG_KEYWORDS,
            'is_active': True,
            'is_dine_in_enabled': True,
        },
        {
            'name': 'Baghbanpura',
            'address': 'Ghass Mandi Stop, Baghbanpura, Lahore, 54000',
            'phone': '0326-6811177',
            'latitude': Decimal('31.5808224'),
            'longitude': Decimal('74.3732920'),
            'delivery_radius_km': Decimal('10.00'),
            'area_keywords': BAGHBANPURA_KEYWORDS,
            'is_active': True,
            'is_dine_in_enabled': True,
        },
    ]

    legacy_bg = Branch.objects.filter(restaurant=restaurant, name='GT Road Baghbanpura').first()
    if legacy_bg:
        legacy_bg.name = 'Baghbanpura'
        legacy_bg.address = 'Ghass Mandi Stop, Baghbanpura, Lahore, 54000'
        legacy_bg.latitude = Decimal('31.5808224')
        legacy_bg.longitude = Decimal('74.3732920')
        legacy_bg.area_keywords = BAGHBANPURA_KEYWORDS
        legacy_bg.save()

    created_or_updated_branches = []
    for b_info in branches_data:
        branch, _ = Branch.objects.get_or_create(
            restaurant=restaurant,
            name=b_info['name'],
            defaults=b_info
        )
        branch.address = b_info['address']
        branch.phone = b_info['phone']
        branch.latitude = b_info['latitude']
        branch.longitude = b_info['longitude']
        branch.delivery_radius_km = b_info['delivery_radius_km']
        branch.area_keywords = b_info['area_keywords']
        branch.is_active = b_info['is_active']
        branch.is_dine_in_enabled = b_info['is_dine_in_enabled']
        branch.save()
        created_or_updated_branches.append(branch)

    menu_items = MenuItem.objects.filter(category__restaurant=restaurant)
    for branch in created_or_updated_branches:
        for item in menu_items:
            BranchMenuItemAvailability.objects.get_or_create(
                branch=branch,
                menu_item=item,
                defaults={'is_available': True}
            )

def reverse_noop(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('restaurants', '0014_branch_is_dine_in_enabled_and_more'),
    ]

    operations = [
        migrations.RunPython(seed_tandoori_stop_branches, reverse_noop),
    ]
