import os
import sys
import django

sys.path.insert(0, r"d:\sitesdata\Resturent App\backend")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.core.management.base import BaseCommand
from restaurants.models import Restaurant, MenuCategory, MenuItem

class Command(BaseCommand):
    help = 'Consolidate duplicate size/variant menu items into single parent items with options'

    def handle(self, *args, **options):
        self.stdout.write("=== Consolidating Menu Variants across TandooriStop, JushhPK, GET A FOMO ===")
        
        # 1. TandooriStop Sajji Consolidation
        ts = Restaurant.objects.filter(slug='tandooristoppk').first()
        if ts:
            sajji_cat = MenuCategory.objects.filter(restaurant=ts, name__icontains='Sajji').first()
            if not sajji_cat:
                sajji_cat = MenuCategory.objects.filter(restaurant=ts, name__icontains='TANDOORI').first()
            
            if sajji_cat:
                # Merge Sajji items
                sajji_parent, created = MenuItem.objects.get_or_create(
                    category=sajji_cat,
                    name='Traditional Chicken Sajji',
                    defaults={
                        'description': 'Slow-roasted traditional chicken sajji seasoned with secret tandoori spices.',
                        'price': 799.00,
                        'is_available': True,
                        'options': [
                            {'name': 'Quarter Sajji', 'price_modifier': 0, 'price': 799},
                            {'name': 'Half Sajji', 'price_modifier': 601, 'price': 1400},
                            {'name': 'Full Sajji', 'price_modifier': 1701, 'price': 2500}
                        ]
                    }
                )
                if not created:
                    sajji_parent.options = [
                        {'name': 'Quarter Sajji', 'price_modifier': 0, 'price': 799},
                        {'name': 'Half Sajji', 'price_modifier': 601, 'price': 1400},
                        {'name': 'Full Sajji', 'price_modifier': 1701, 'price': 2500}
                    ]
                    sajji_parent.save()

                # Peri Peri Sajji
                peri_sajji, created = MenuItem.objects.get_or_create(
                    category=sajji_cat,
                    name='Peri Peri Chicken Sajji',
                    defaults={
                        'description': 'Flame-grilled spicy peri peri chicken sajji.',
                        'price': 900.00,
                        'is_available': True,
                        'options': [
                            {'name': 'Quarter Sajji', 'price_modifier': 0, 'price': 900},
                            {'name': 'Half Sajji', 'price_modifier': 700, 'price': 1600},
                            {'name': 'Full Sajji', 'price_modifier': 2000, 'price': 2900}
                        ]
                    }
                )
                if not created:
                    peri_sajji.options = [
                        {'name': 'Quarter Sajji', 'price_modifier': 0, 'price': 900},
                        {'name': 'Half Sajji', 'price_modifier': 700, 'price': 1600},
                        {'name': 'Full Sajji', 'price_modifier': 2000, 'price': 2900}
                    ]
                    peri_sajji.save()

        # 2. JushhPK Shawaya & Doner Consolidation
        jush = Restaurant.objects.filter(slug='jushhpk').first()
        if jush:
            turkish_cat = MenuCategory.objects.filter(restaurant=jush, name__icontains='TURKISH').first()
            if turkish_cat:
                shawaya, _ = MenuItem.objects.get_or_create(
                    category=turkish_cat,
                    name='Dubai Shawaya',
                    defaults={
                        'description': 'Rotisserie flame-roasted Dubai style chicken shawaya served with garlic dip & rice.',
                        'price': 1400.00,
                        'is_available': True,
                        'options': [
                            {'name': 'Half Dubai Shawaya', 'price_modifier': 0, 'price': 1400},
                            {'name': 'Full Dubai Shawaya', 'price_modifier': 1100, 'price': 2500}
                        ]
                    }
                )
                doner, _ = MenuItem.objects.get_or_create(
                    category=turkish_cat,
                    name='Turkish Doner',
                    defaults={
                        'description': 'Authentic Turkish doner kebab served with salad & signature sauce.',
                        'price': 850.00,
                        'is_available': True,
                        'options': [
                            {'name': 'Chicken', 'price_modifier': 0, 'price': 850},
                            {'name': 'Beef', 'price_modifier': 250, 'price': 1100}
                        ]
                    }
                )

        self.stdout.write("Menu consolidation complete!")
