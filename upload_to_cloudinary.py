import os
import cloudinary
import cloudinary.uploader
import json

# Configure Cloudinary
cloudinary.config(
    cloud_name="qodsfm34",
    api_key="257245694152878",
    api_secret="mplgXz5lD_EZokm_yEiAg3d3Xs0"
)

results = {
    'dineatblue': {},
    'tandooristop': {},
    'jushhpk': {}
}

# 1. Dine At Blue Assets
print("=== Uploading Dine At Blue Assets to Cloudinary ===")
blue_assets = {
    'logo': 'websites/dineatblue/images/logo.png',
    'logo_webp': 'websites/dineatblue/images/logo.webp',
    'blue_seafood_platter': 'New Data/Luxurious Seafood Platter with Lobster and Crab.png',
    'chicken_platter_2person': 'websites/dineatblue/images/chicken_platter_2person.png',
    'kunafa_prawns': 'New Data/Crispy Kataifi-Wrapped Prawns with Pistachio Garnish.png',
    'dynamite_prawns': 'New Data/Crispy Spicy Prawns with Slaw.png',
    'seared_dumplings': 'New Data/Golden Seared Dumplings with Soy Dip.png',
    'chicken_dumplings': 'New Data/Steamed Dumplings with Chili Soy Sauce.png',
    'honey_wings': 'New Data/Glazed Sesame Chicken Wings with Salad.png',
    'fish_and_chips': 'New Data/Golden Fish and Chips on Black Plate.png',
    'chicken_corn_soup': 'New Data/Black Bowl Chicken Corn Soup.png',
    'soup_19b': 'New Data/Golden Chicken Mushroom Soup Bowl.png',
    'bbq_prawn_salad': 'New Data/Glazed Shrimp Salad in a Black Bowl.png',
    'spicy_soup': 'New Data/Spicy Shredded Soup in Black Bowl.png'
}

for name, path in blue_assets.items():
    if os.path.exists(path):
        try:
            res = cloudinary.uploader.upload(
                path,
                folder="foodsphere/dineatblue",
                public_id=name,
                overwrite=True,
                resource_type="image"
            )
            secure_url = res.get('secure_url', '')
            optimized_url = secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_800/')
            results['dineatblue'][name] = optimized_url
            print(f"  [OK] dineatblue/{name} -> {optimized_url}")
        except Exception as e:
            print(f"  [ERROR] dineatblue/{name}: {e}")

# Also copy high-res New Data images directly into websites/dineatblue/images for local parity
local_copies = {
    'websites/dineatblue/images/blue_seafood_platter.png': 'New Data/Luxurious Seafood Platter with Lobster and Crab.png',
    'websites/dineatblue/images/kunafa_prawns.png': 'New Data/Crispy Kataifi-Wrapped Prawns with Pistachio Garnish.png',
    'websites/dineatblue/images/dynamite_prawns.png': 'New Data/Crispy Spicy Prawns with Slaw.png',
    'websites/dineatblue/images/seared_dumplings.png': 'New Data/Golden Seared Dumplings with Soy Dip.png',
    'websites/dineatblue/images/chicken_dumplings.png': 'New Data/Steamed Dumplings with Chili Soy Sauce.png',
    'websites/dineatblue/images/honey_wings.png': 'New Data/Glazed Sesame Chicken Wings with Salad.png',
    'websites/dineatblue/images/fish_and_chips.png': 'New Data/Golden Fish and Chips on Black Plate.png',
    'websites/dineatblue/images/chicken_corn_soup.png': 'New Data/Black Bowl Chicken Corn Soup.png',
    'websites/dineatblue/images/soup_19b.png': 'New Data/Golden Chicken Mushroom Soup Bowl.png',
    'websites/dineatblue/images/bbq_prawn_salad.png': 'New Data/Glazed Shrimp Salad in a Black Bowl.png',
    'websites/dineatblue/images/spicy_soup.png': 'New Data/Spicy Shredded Soup in Black Bowl.png'
}

from PIL import Image
for dest, src in local_copies.items():
    if os.path.exists(src):
        try:
            im = Image.open(src)
            im.save(dest)
            print(f"  [LOCAL SYNC] Synced high-res {src} -> {dest}")
        except Exception as e:
            print(f"  [WARN] Failed local copy {dest}: {e}")

# 2. Tandoori Stop Assets
print("\n=== Uploading Tandoori Stop Assets to Cloudinary ===")
ts_assets = {
    'logo': 'websites/tandooristoppk/images/tandoori_stop_logo.png',
    'logo_horizontal': 'websites/tandooristoppk/images/tandoori_stop_logo_horizontal.png',
    'tandoori_chicken_single': 'websites/tandooristoppk/images/IMG_7585.JPG.jpeg',
    'tandoori_chicken_double': 'websites/tandooristoppk/images/IMG_7589.JPG.jpeg',
    'tandoori_chicken_rice': 'websites/tandooristoppk/images/IMG_7586.JPG.jpeg',
    'tandoori_chicken_plain': 'websites/tandooristoppk/images/IMG_7590.JPG.jpeg',
    'chicken_sajji': 'websites/tandooristoppk/images/IMG_7587.JPG.jpeg',
    'seekh_kabab': 'websites/tandooristoppk/images/IMG_7578.JPG.jpeg',
    'tikka_boti': 'websites/tandooristoppk/images/IMG_7583.JPG.jpeg',
    'malai_boti': 'websites/tandooristoppk/images/IMG_7584.JPG.jpeg',
    'full_stop_roll': 'websites/tandooristoppk/images/IMG_7591.JPG.jpeg',
    'malai_boti_roll': 'websites/tandooristoppk/images/IMG_7592.JPG.jpeg',
    'chicken_paratha_roll': 'websites/tandooristoppk/images/IMG_7588.JPG.jpeg',
    'cheese_naan': 'websites/tandooristoppk/images/IMG_7581.JPG.jpeg',
    'roghni_naan': 'websites/tandooristoppk/images/IMG_7582.JPG.jpeg',
    'puri_paratha': 'websites/tandooristoppk/images/IMG_7580.JPG.jpeg',
    'rice': 'websites/tandooristoppk/images/IMG_7579.JPG.jpeg',
    'mojitos': 'websites/tandooristoppk/images/IMG_7576.JPG.jpeg',
    'mint_margaritas': 'websites/tandooristoppk/images/IMG_7577.JPG.jpeg'
}

for name, path in ts_assets.items():
    if os.path.exists(path):
        try:
            res = cloudinary.uploader.upload(
                path,
                folder="foodsphere/tandooristop",
                public_id=name,
                overwrite=True,
                resource_type="image"
            )
            secure_url = res.get('secure_url', '')
            optimized_url = secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_800/')
            results['tandooristop'][name] = optimized_url
            print(f"  [OK] tandooristop/{name} -> {optimized_url}")
        except Exception as e:
            print(f"  [ERROR] tandooristop/{name}: {e}")

# 3. Jushh PK Assets
print("\n=== Uploading Jushh PK Assets to Cloudinary ===")
jushh_assets = {
    'logo': 'websites/jushhpk/images/jushh_logo.jpg',
    'chicken_turkish_doner': 'websites/jushhpk/images/chicken_turkish_doner.jpg',
    'beef_turkish_doner': 'websites/jushhpk/images/beef_turkish_doner.jpg',
    'chicken_turkish_wrap': 'websites/jushhpk/images/chicken_turkish_wrap.jpg',
    'beef_turkish_wrap': 'websites/jushhpk/images/beef_turkish_wrap.jpg',
    'chicken_shawarma_platter': 'websites/jushhpk/images/chicken_shawarma_platter.jpg',
    'half_dubai_shawaya': 'websites/jushhpk/images/half_dubai_shawaya.jpg',
    'full_dubai_shawaya': 'websites/jushhpk/images/full_dubai_shawaya.jpg',
    'chicken_doner_fries': 'websites/jushhpk/images/chicken_doner_fries.jpg',
    'beef_doner_fries': 'websites/jushhpk/images/beef_doner_fries.jpg',
    'chicken_pouch_shawarma': 'websites/jushhpk/images/chicken_pouch_shawarma.jpg',
    'beef_pouch_shawarma': 'websites/jushhpk/images/beef_pouch_shawarma.jpg',
    'chicken_grilled_sandwich': 'websites/jushhpk/images/chicken_grilled_sandwich.jpg',
    'beef_grilled_sandwich': 'websites/jushhpk/images/beef_grilled_sandwich.jpg',
    'lotus_can_dessert': 'websites/jushhpk/images/lotus_can_dessert.jpg',
    'red_velvet_can_dessert': 'websites/jushhpk/images/red_velvet_can_dessert.jpg',
    'nutella_can_dessert': 'websites/jushhpk/images/nutella_can_dessert.jpg',
    'cheese_addon': 'websites/jushhpk/images/cheese_addon.jpg',
    'garlic_dip': 'websites/jushhpk/images/garlic_dip.jpg',
    'pita_bread': 'websites/jushhpk/images/pita_bread.jpg',
    'addon_rice': 'websites/jushhpk/images/addon_rice.jpg'
}

for name, path in jushh_assets.items():
    if os.path.exists(path):
        try:
            res = cloudinary.uploader.upload(
                path,
                folder="foodsphere/jushhpk",
                public_id=name,
                overwrite=True,
                resource_type="image"
            )
            secure_url = res.get('secure_url', '')
            optimized_url = secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_800/')
            results['jushhpk'][name] = optimized_url
            print(f"  [OK] jushhpk/{name} -> {optimized_url}")
        except Exception as e:
            print(f"  [ERROR] jushhpk/{name}: {e}")

# Save manifest of uploaded URLs
with open('websites/cloudinary_urls.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=2)

print("\n=== Cloudinary Upload Completed! Manifest saved to websites/cloudinary_urls.json ===")
