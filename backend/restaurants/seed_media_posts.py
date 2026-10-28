import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from restaurants.models import Restaurant, MenuItem, RestaurantMediaPost

def seed():
    print("Seeding Dine-In Media Posts...")
    
    # 1. Dine At Blue
    try:
        dab = Restaurant.objects.get(slug='dineatblue')
        platter_item = MenuItem.objects.filter(category__restaurant=dab, name__icontains='Platter').first()
        prawns_item = MenuItem.objects.filter(category__restaurant=dab, name__icontains='Prawn').first()

        RestaurantMediaPost.objects.get_or_create(
            restaurant=dab,
            title="Luxury Coastal Steam Seafood Platter",
            defaults={
                'caption': "Fresh Atlantic catch, jumbo prawns & calamari steamed to perfection. Live table-side presentation.",
                'media_type': 'VIDEO',
                'media_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                'thumbnail_url': 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=80',
                'linked_menu_item': platter_item,
                'is_active': True,
            }
        )

        RestaurantMediaPost.objects.get_or_create(
            restaurant=dab,
            title="Golden Kunafa Prawns Sizzle",
            defaults={
                'caption': "Crispy shredded pastry wrapped around succulent king prawns with house spicy emulsion.",
                'media_type': 'VIDEO',
                'media_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                'thumbnail_url': 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&q=80',
                'linked_menu_item': prawns_item,
                'is_active': True,
            }
        )
        print("[OK] Dine At Blue posts seeded")
    except Restaurant.DoesNotExist:
        print("[FAIL] Dine At Blue restaurant not found")

    # 2. Tandoori Stop
    try:
        ts = Restaurant.objects.get(slug='tandooristoppk')
        naan_item = MenuItem.objects.filter(category__restaurant=ts, name__icontains='Cheese Naan').first()
        bbq_item = MenuItem.objects.filter(category__restaurant=ts, name__icontains='Chicken').first()

        RestaurantMediaPost.objects.get_or_create(
            restaurant=ts,
            title="Clay Oven Melting Cheese Naan Pull",
            defaults={
                'caption': "Direct from our Johar Town live clay ovens! Stuffed with 100% mozzarella and grilled tikka boti.",
                'media_type': 'VIDEO',
                'media_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                'thumbnail_url': 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&q=80',
                'linked_menu_item': naan_item,
                'is_active': True,
            }
        )

        RestaurantMediaPost.objects.get_or_create(
            restaurant=ts,
            title="Smoky Charcoal BBQ Platter",
            defaults={
                'caption': "Charcoal-kissed Malai Tikka & Seekh Kebabs served sizzling on iron platters.",
                'media_type': 'VIDEO',
                'media_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4',
                'thumbnail_url': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
                'linked_menu_item': bbq_item,
                'is_active': True,
            }
        )
        print("[OK] Tandoori Stop posts seeded")
    except Restaurant.DoesNotExist:
        print("[FAIL] Tandoori Stop restaurant not found")

    # 3. Jushh PK
    try:
        jushh = Restaurant.objects.get(slug='jushhpk')
        doner_item = MenuItem.objects.filter(category__restaurant=jushh, name__icontains='Doner').first()
        shawaya_item = MenuItem.objects.filter(category__restaurant=jushh, name__icontains='Shawaya').first()

        RestaurantMediaPost.objects.get_or_create(
            restaurant=jushh,
            title="Loaded Chicken Doner Feast Box",
            defaults={
                'caption': "Thinly shaved spiced chicken doner piled high over golden fries and garlic mayo.",
                'media_type': 'VIDEO',
                'media_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
                'thumbnail_url': 'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=800&q=80',
                'linked_menu_item': doner_item,
                'is_active': True,
            }
        )

        RestaurantMediaPost.objects.get_or_create(
            restaurant=jushh,
            title="Full Dubai Shawaya with Fragrant Rice",
            defaults={
                'caption': "Slow rotisserie grilled whole chicken basted with authentic Gulf spices over spiced Mandi rice.",
                'media_type': 'VIDEO',
                'media_url': 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WhatCarCanYouGetForAGrand.mp4',
                'thumbnail_url': 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=800&q=80',
                'linked_menu_item': shawaya_item,
                'is_active': True,
            }
        )
        print("[OK] Jushh PK posts seeded")
    except Restaurant.DoesNotExist:
        print("[FAIL] Jushh PK restaurant not found")

    total = RestaurantMediaPost.objects.count()
    print(f"Total Dine-In Media Posts in DB: {total}")

if __name__ == '__main__':
    seed()
