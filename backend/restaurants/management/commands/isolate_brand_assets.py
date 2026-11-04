from django.core.management.base import BaseCommand
from restaurants.models import Restaurant, MenuItem

class Command(BaseCommand):
    help = "Enforces 100% strict brand isolation on Dine At Blue menu items by replacing foreign/Jushh assets with Blue assets."

    def handle(self, *args, **options):
        blue = Restaurant.objects.filter(slug='dineatblue').first()
        if not blue:
            self.stdout.write(self.style.ERROR("Dine At Blue not found."))
            return

        blue_logo = "https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/logo.png"
        blue_fish_and_chips = "https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/fish_and_chips.png"

        foreign_keywords = [
            'jushh', 'tandoori', 'ts_', 'fomo', 'seenbanao',
            'chicken_doner_fries', 'soft_drink', 'water_bottle',
            'green_apple_mojito', 'lemon_mojito', 'peach_mojito',
            'blueberry_mojito', 'strawberry_mojito', 'rice.jpg'
        ]

        count = 0
        items = MenuItem.objects.filter(category__restaurant=blue)
        for item in items:
            img = str(item.image or '').lower()
            needs_fix = any(kw in img for kw in foreign_keywords)
            if needs_fix or not item.image:
                if 'steak fries' in item.name.lower() or 'french fries' in item.name.lower():
                    item.image = blue_fish_and_chips
                else:
                    item.image = blue_logo
                item.save(update_fields=['image'])
                count += 1
                self.stdout.write(f"Sanitized: {item.name} -> {item.image}")

        self.stdout.write(self.style.SUCCESS(f"Successfully sanitized {count} Dine At Blue menu items in database."))
