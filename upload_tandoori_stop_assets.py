import os
import sys
import django

# 1. Setup Django environment
sys.path.append(os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.files import File
from restaurants.models import Restaurant, MenuItem, MenuCategory

def main():
    print("==================================================")
    print("  Uploading Tandoori Stop Assets to Cloudinary    ")
    print("==================================================")

    rest = Restaurant.objects.get(slug='tandooristoppk')
    base_dir = r'd:\sitesdata\Resturent App\Tandoori stop'

    # 1. Update Restaurant Logo & Cover Banner
    logo_path = os.path.join(base_dir, 'tandoori_stop_logo.png')
    cover_path = os.path.join(base_dir, 'IMG_7589.JPG.jpeg')
    banner_path = os.path.join(base_dir, 'IMG_7585.JPG.jpeg')

    if os.path.exists(logo_path):
        with open(logo_path, 'rb') as f:
            rest.logo.save('tandoori_stop_logo.png', File(f), save=True)
        print(f"[OK] Logo updated: {rest.logo.url}")

    if os.path.exists(cover_path):
        with open(cover_path, 'rb') as f:
            rest.cover_image.save('tandoori_stop_cover.jpg', File(f), save=True)
        print(f"[OK] Cover image updated: {rest.cover_image.url}")

    if os.path.exists(banner_path):
        with open(banner_path, 'rb') as f:
            rest.banner_image.save('tandoori_stop_banner.jpg', File(f), save=True)
        print(f"[OK] Banner image updated: {rest.banner_image.url}")

    # 2. Map Image Files to Menu Item Names
    item_image_map = {
        # Cheese Naans & Bread
        'Cheese Naan': 'IMG_7581.JPG.jpeg',
        'Roghni Naan': 'IMG_7582.JPG.jpeg',
        'Butter Naan': 'IMG_7582.JPG.jpeg',
        'Plain Roti': 'IMG_7582.JPG.jpeg',
        'Puri Paratha': 'IMG_7580.JPG.jpeg',
        'Rice': 'IMG_7579.JPG.jpeg',

        # Tandoori Chicken & Combos
        'Tandoori Chicken Bone (Cheese Naan Single)': 'IMG_7585.JPG.jpeg',
        'Tandoori Chicken Boneless (Cheese Naan Single)': 'IMG_7585.JPG.jpeg',
        'Tandoori Chicken Bone (Cheese Naan Double)': 'IMG_7589.JPG.jpeg',
        'Tandoori Chicken Boneless (Cheese Naan Double)': 'IMG_7589.JPG.jpeg',
        'Tandoori Chicken Bone (With Rice)': 'IMG_7586.JPG.jpeg',
        'Tandoori Chicken Boneless (With Rice)': 'IMG_7586.JPG.jpeg',
        'Tandoori Chicken Bone (Plain)': 'IMG_7590.JPG.jpeg',
        'Tandoori Chicken Boneless (Plain)': 'IMG_7590.JPG.jpeg',

        # BBQ & Kababs
        'Seekh Kabab (Per Seekh)': 'IMG_7578.JPG.jpeg',
        'Tikka Boti (Per Seekh)': 'IMG_7583.JPG.jpeg',
        'Malai Boti (Per Seekh)': 'IMG_7584.JPG.jpeg',

        # Sajji
        'Quarter Sajji': 'IMG_7587.JPG.jpeg',
        'Half Sajji': 'IMG_7587.JPG.jpeg',
        'Full Sajji': 'IMG_7587.JPG.jpeg',

        # Paratha Rolls
        'Chicken Paratha Roll': 'IMG_7588.JPG.jpeg',
        'Full Stop Roll': 'IMG_7591.JPG.jpeg',
        'Tandoori Chicken Roll': 'IMG_7591.JPG.jpeg',
        'Malai Boti Roll': 'IMG_7592.JPG.jpeg',

        # Drinks & Mojitos
        'Blueberry Mojito': 'IMG_7576.JPG.jpeg',
        'Strawberry Mojito': 'IMG_7576.JPG.jpeg',
        'Peach Mojito': 'IMG_7576.JPG.jpeg',
        'Apple Mojito': 'IMG_7576.JPG.jpeg',
        'Mint Margaritas': 'IMG_7577.JPG.jpeg',
    }

    uploaded_count = 0
    for item_name, file_name in item_image_map.items():
        img_path = os.path.join(base_dir, file_name)
        if not os.path.exists(img_path):
            continue

        items = MenuItem.objects.filter(category__restaurant=rest, name__icontains=item_name)
        for item in items:
            with open(img_path, 'rb') as f:
                item.image.save(f"ts_{item.id}_{file_name}", File(f), save=True)
            uploaded_count += 1
            print(f"  - Updated MenuItem #{item.id} '{item.name}' -> {item.image.url}")

    print(f"\n[OK] Completed! Uploaded images for Logo, Cover, Banner, and {uploaded_count} MenuItems.")

if __name__ == "__main__":
    main()
