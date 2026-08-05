import os
import sys
import django

sys.path.append(os.path.abspath('backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.core.files import File
from restaurants.models import Restaurant, MenuItem

def main():
    print("==================================================")
    print("  Uploading JushhPK Desserts & Addons to Cloudinary")
    print("==================================================")

    rest = Restaurant.objects.get(slug='jushhpk')
    base_dir = os.path.abspath(r'websites\jushhpk\images')

    item_map = {
        'Lotus Can Dessert': 'lotus_can_dessert.jpg',
        'Red Velvet Can Dessert': 'red_velvet_can_dessert.jpg',
        'Nutella Can Dessert': 'nutella_can_dessert.jpg',
        'Cheese Add-on': 'cheese_addon.jpg',
        'Cheese': 'cheese_addon.jpg',
    }

    uploaded = 0
    for item_name, file_name in item_map.items():
        img_path = os.path.join(base_dir, file_name)
        if not os.path.exists(img_path):
            print(f"[MISSING FILE] {img_path}")
            continue

        items = MenuItem.objects.filter(category__restaurant=rest, name__icontains=item_name)
        for item in items:
            with open(img_path, 'rb') as f:
                item.image.save(f"jushh_{item.id}_{file_name}", File(f), save=True)
            uploaded += 1
            print(f"  [OK] MenuItem #{item.id} '{item.name}' -> {item.image.url}")

    print(f"\nCompleted! Uploaded {uploaded} dessert & addon images to Cloudinary.")

if __name__ == "__main__":
    main()
