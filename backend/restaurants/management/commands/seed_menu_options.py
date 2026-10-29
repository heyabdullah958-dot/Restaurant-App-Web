import logging
from django.core.management.base import BaseCommand
from restaurants.models import Restaurant, MenuItem

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Populates realistic add-on options for Jushh PK, Tandoori Stop, Blue, and Get A Fomo menu items'

    def handle(self, *args, **options):
        self.stdout.write('Seeding realistic menu item options & add-on modifiers...')

        # Brand-specific add-on modifier libraries
        JUSHH_BURGER_ADDONS = [
            {"name": "Extra Wagyu Smash Patty", "price_modifier": 350.0},
            {"name": "Smoked Cheddar Cheese Slice", "price_modifier": 90.0},
            {"name": "Crispy Turkey Bacon Strips", "price_modifier": 180.0},
            {"name": "Truffle Garlic Aioli Dip", "price_modifier": 80.0},
            {"name": "Caramelized Butter Onions", "price_modifier": 60.0},
            {"name": "Pickled Jalapeño Rings", "price_modifier": 50.0},
        ]

        JUSHH_FRIES_SHAKES_ADDONS = [
            {"name": "Melted Cheddar Cheese Drizzle", "price_modifier": 120.0},
            {"name": "Loaded Beef Chili Mince", "price_modifier": 180.0},
            {"name": "Smoky BBQ Sauce", "price_modifier": 60.0},
            {"name": "Extra Whipped Cream", "price_modifier": 70.0},
        ]

        TANDOORI_BBQ_ADDONS = [
            {"name": "Garlic Butter Naan", "price_modifier": 80.0},
            {"name": "Roghni Sesame Naan", "price_modifier": 90.0},
            {"name": "Fresh Mint & Coriander Raita", "price_modifier": 50.0},
            {"name": "Special Tangy Imli Plum Chutney", "price_modifier": 60.0},
            {"name": "Extra BBQ Chicken Seekh Kebab (1 pc)", "price_modifier": 220.0},
            {"name": "Pure Desi Ghee Tadka", "price_modifier": 150.0},
        ]

        BLUE_SEAFOOD_ADDONS = [
            {"name": "Garlic Herb Butter Glaze", "price_modifier": 120.0},
            {"name": "Extra Jumbo Grilled Prawn (1 pc)", "price_modifier": 380.0},
            {"name": "House Spicy Tartar Dip", "price_modifier": 70.0},
            {"name": "Lemon Caper Butter Cream Sauce", "price_modifier": 110.0},
            {"name": "Truffle Parmesan Fries Upgrade", "price_modifier": 160.0},
        ]

        FOMO_CAFE_ADDONS = [
            {"name": "Double Shot Espresso Boost", "price_modifier": 120.0},
            {"name": "Organic Oat Milk Alternative", "price_modifier": 150.0},
            {"name": "French Madagascar Vanilla Syrup", "price_modifier": 80.0},
            {"name": "Salted Caramel Drizzle & Whipped Cream", "price_modifier": 90.0},
            {"name": "Scoop of Artisanal Vanilla Gelato", "price_modifier": 180.0},
        ]

        updated_count = 0

        # 1. Jushh PK
        jushh = Restaurant.objects.filter(slug='jushhpk').first()
        if jushh:
            items = MenuItem.objects.filter(category__restaurant=jushh)
            for item in items:
                name_lower = item.name.lower()
                cat_lower = item.category.name.lower()
                if 'burger' in name_lower or 'sandwich' in name_lower or 'patty' in name_lower or 'burger' in cat_lower:
                    item.options = JUSHH_BURGER_ADDONS
                else:
                    item.options = JUSHH_FRIES_SHAKES_ADDONS
                item.save(update_fields=['options'])
                updated_count += 1
            self.stdout.write(self.style.SUCCESS(f'Updated {items.count()} items for Jushh PK.'))

        # 2. Tandoori Stop
        tandoori = Restaurant.objects.filter(slug='tandooristoppk').first()
        if tandoori:
            items = MenuItem.objects.filter(category__restaurant=tandoori)
            for item in items:
                item.options = TANDOORI_BBQ_ADDONS
                item.save(update_fields=['options'])
                updated_count += 1
            self.stdout.write(self.style.SUCCESS(f'Updated {items.count()} items for Tandoori Stop.'))

        # 3. Dine At Blue
        blue = Restaurant.objects.filter(slug='dineatblue').first()
        if blue:
            items = MenuItem.objects.filter(category__restaurant=blue)
            for item in items:
                item.options = BLUE_SEAFOOD_ADDONS
                item.save(update_fields=['options'])
                updated_count += 1
            self.stdout.write(self.style.SUCCESS(f'Updated {items.count()} items for Dine At Blue.'))

        # 4. Get A Fomo
        fomo = Restaurant.objects.filter(slug='getafomo').first()
        if fomo:
            items = MenuItem.objects.filter(category__restaurant=fomo)
            for item in items:
                item.options = FOMO_CAFE_ADDONS
                item.save(update_fields=['options'])
                updated_count += 1
            self.stdout.write(self.style.SUCCESS(f'Updated {items.count()} items for Get A Fomo.'))

        # Also fallback for any item across other active restaurants without options
        all_other_items = MenuItem.objects.filter(options=[])
        fallback_addons = [
            {"name": "Extra Sauce & Dip", "price_modifier": 60.0},
            {"name": "Cheese Slice Upgrade", "price_modifier": 80.0},
            {"name": "Extra Pickles & Jalapeños", "price_modifier": 50.0},
        ]
        for item in all_other_items:
            item.options = fallback_addons
            item.save(update_fields=['options'])
            updated_count += 1

        self.stdout.write(self.style.SUCCESS(f'Successfully populated add-on options for {updated_count} menu items.'))
