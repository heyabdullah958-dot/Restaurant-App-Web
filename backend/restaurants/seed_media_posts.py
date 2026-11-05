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

        post1, _ = RestaurantMediaPost.objects.get_or_create(
            restaurant=dab,
            title="Luxury Coastal Steam Seafood Platter",
            defaults={
                'caption': "Fresh Atlantic catch, jumbo prawns & calamari steamed to perfection. Live table-side presentation.",
                'media_type': 'VIDEO',
                'media_url': 'https://res.cloudinary.com/qodsfm34/video/upload/v1793799315/foodsphere/reels/reel_1.mp4',
                'thumbnail_url': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/blue_seafood_platter.png',
                'linked_menu_item': platter_item,
                'is_active': True,
            }
        )
        post1.media_url = 'https://res.cloudinary.com/qodsfm34/video/upload/v1793799315/foodsphere/reels/reel_1.mp4'
        post1.thumbnail_url = 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/blue_seafood_platter.png'
        post1.save()

        post2, _ = RestaurantMediaPost.objects.get_or_create(
            restaurant=dab,
            title="Golden Kunafa Prawns Sizzle",
            defaults={
                'caption': "Crispy shredded pastry wrapped around succulent king prawns with house spicy emulsion.",
                'media_type': 'VIDEO',
                'media_url': 'https://res.cloudinary.com/qodsfm34/video/upload/v1793799316/foodsphere/reels/reel_2.mp4',
                'thumbnail_url': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/kunafa_prawns.png',
                'linked_menu_item': prawns_item,
                'is_active': True,
            }
        )
        post2.media_url = 'https://res.cloudinary.com/qodsfm34/video/upload/v1793799316/foodsphere/reels/reel_2.mp4'
        post2.thumbnail_url = 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/kunafa_prawns.png'
        post2.save()
        print("[OK] Dine At Blue posts seeded")
    except Restaurant.DoesNotExist:
        print("[FAIL] Dine At Blue restaurant not found")

    # 2. Tandoori Stop
    try:
        ts = Restaurant.objects.get(slug='tandooristoppk')
        naan_item = MenuItem.objects.filter(category__restaurant=ts, name__icontains='Cheese Naan').first()
        bbq_item = MenuItem.objects.filter(category__restaurant=ts, name__icontains='Chicken').first()

        post3, _ = RestaurantMediaPost.objects.get_or_create(
            restaurant=ts,
            title="Clay Oven Melting Cheese Naan Pull",
            defaults={
                'caption': "Direct from our Johar Town live clay ovens! Stuffed with 100% mozzarella and grilled tikka boti.",
                'media_type': 'VIDEO',
                'media_url': 'https://res.cloudinary.com/qodsfm34/video/upload/v1793799317/foodsphere/reels/reel_3.mp4',
                'thumbnail_url': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/tandooristop/cheese_naan.jpg',
                'linked_menu_item': naan_item,
                'is_active': True,
            }
        )
        post3.media_url = 'https://res.cloudinary.com/qodsfm34/video/upload/v1793799317/foodsphere/reels/reel_3.mp4'
        post3.thumbnail_url = 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/tandooristop/cheese_naan.jpg'
        post3.save()

        post4, _ = RestaurantMediaPost.objects.get_or_create(
            restaurant=ts,
            title="Smoky Charcoal BBQ Platter",
            defaults={
                'caption': "Charcoal-kissed Malai Tikka & Seekh Kebabs served sizzling on iron platters.",
                'media_type': 'VIDEO',
                'media_url': 'https://res.cloudinary.com/qodsfm34/video/upload/v1793799319/foodsphere/reels/reel_4.mp4',
                'thumbnail_url': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/tandooristop/tandoori_chicken_single.jpg',
                'linked_menu_item': bbq_item,
                'is_active': True,
            }
        )
        post4.media_url = 'https://res.cloudinary.com/qodsfm34/video/upload/v1793799319/foodsphere/reels/reel_4.mp4'
        post4.thumbnail_url = 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/tandooristop/tandoori_chicken_single.jpg'
        post4.save()
        print("[OK] Tandoori Stop posts seeded")
    except Restaurant.DoesNotExist:
        print("[FAIL] Tandoori Stop restaurant not found")

    # 3. Jushh PK
    try:
        jushh = Restaurant.objects.get(slug='jushhpk')
        doner_item = MenuItem.objects.filter(category__restaurant=jushh, name__icontains='Doner').first()
        shawaya_item = MenuItem.objects.filter(category__restaurant=jushh, name__icontains='Shawaya').first()

        post5, _ = RestaurantMediaPost.objects.get_or_create(
            restaurant=jushh,
            title="Loaded Chicken Doner Feast Box",
            defaults={
                'caption': "Thinly shaved spiced chicken doner piled high over golden fries and garlic mayo.",
                'media_type': 'VIDEO',
                'media_url': 'https://res.cloudinary.com/qodsfm34/video/upload/v1793799321/foodsphere/reels/reel_5.mp4',
                'thumbnail_url': 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/jushhpk/chicken_doner_fries.jpg',
                'linked_menu_item': doner_item,
                'is_active': True,
            }
        )
        post5.media_url = 'https://res.cloudinary.com/qodsfm34/video/upload/v1793799321/foodsphere/reels/reel_5.mp4'
        post5.thumbnail_url = 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/jushhpk/chicken_doner_fries.jpg'
        post5.save()

        post6, _ = RestaurantMediaPost.objects.get_or_create(
            restaurant=jushh,
            title="Full Dubai Shawaya with Fragrant Rice",
            defaults={
                'caption': "Slow rotisserie grilled whole chicken basted with authentic Gulf spices over spiced Mandi rice.",
                'media_type': 'VIDEO',
                'media_url': 'https://res.cloudinary.com/qodsfm34/video/upload/v1793799324/foodsphere/reels/reel_6.mp4',
                'thumbnail_url': 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/full_dubai_shawaya.jpg',
                'linked_menu_item': shawaya_item,
                'is_active': True,
            }
        )
        post6.media_url = 'https://res.cloudinary.com/qodsfm34/video/upload/v1793799324/foodsphere/reels/reel_6.mp4'
        post6.thumbnail_url = 'https://res.cloudinary.com/qodsfm34/image/upload/menu_items/full_dubai_shawaya.jpg'
        post6.save()
        print("[OK] Jushh PK posts seeded")
    except Restaurant.DoesNotExist:
        print("[FAIL] Jushh PK restaurant not found")

    total = RestaurantMediaPost.objects.count()
    print(f"Total Dine-In Media Posts in DB: {total}")

if __name__ == '__main__':
    seed()
