import logging
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from promotions.models import FlashDeal
from restaurants.models import Restaurant

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Seeds active live flash deals for the 3 active launch brands (Jush PK, Tandoori Stop, Get A Fomo)'

    def handle(self, *args, **options):
        now = timezone.now()
        start = now - timedelta(hours=1)
        end = now + timedelta(days=7)

        # 1. Jush PK Smash Burger Deal
        jush = Restaurant.objects.filter(slug='jushhpk').first()
        if jush:
            deal1, created = FlashDeal.objects.update_or_create(
                title='30% OFF All Smash Burgers',
                defaults={
                    'description': 'Enjoy a flat 30% discount on all gourmet smash beef and crispy chicken burgers!',
                    'deal_type': 'percentage',
                    'discount_value': 30,
                    'restaurant': jush,
                    'is_dine_in_only': False,
                    'start_time': start,
                    'end_time': end,
                    'is_active': True,
                }
            )
            self.stdout.write(self.style.SUCCESS(f"Seeded Flash Deal: {deal1.title} ({'Created' if created else 'Updated'})"))

        # 2. Tandoori Stop Feast Deal
        ts = Restaurant.objects.filter(slug='tandooristoppk').first()
        if ts:
            deal2, created = FlashDeal.objects.update_or_create(
                title='Flat Rs. 250 OFF Naan & Boti',
                defaults={
                    'description': 'Hot & fresh clay-oven special naans, seekh kababs, and tikka platters with flat discount!',
                    'deal_type': 'flat',
                    'discount_value': 250,
                    'restaurant': ts,
                    'is_dine_in_only': False,
                    'start_time': start,
                    'end_time': end,
                    'is_active': True,
                }
            )
            self.stdout.write(self.style.SUCCESS(f"Seeded Flash Deal: {deal2.title} ({'Created' if created else 'Updated'})"))

        # 3. Get A Fomo Dine-In Exclusive Deal
        fomo = Restaurant.objects.filter(slug='getafomo').first()
        if fomo:
            deal3, created = FlashDeal.objects.update_or_create(
                title='20% OFF Coffee & Artisanal Desserts',
                defaults={
                    'description': 'Dine-in exclusive: Specialty roasted coffees, iced lattes, and fresh French pastries.',
                    'deal_type': 'percentage',
                    'discount_value': 20,
                    'restaurant': fomo,
                    'is_dine_in_only': True,
                    'start_time': start,
                    'end_time': end,
                    'is_active': True,
                }
            )
            self.stdout.write(self.style.SUCCESS(f"Seeded Flash Deal: {deal3.title} ({'Created' if created else 'Updated'})"))

        self.stdout.write(self.style.SUCCESS("All 3 active launch brand Flash Deals seeded successfully!"))
