import os
import json
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# High quality CDN fallback images per dish category / keyword
CATEGORY_CDN_FALLBACKS = {
    'fries': 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&h=400&q=80',
    'doner': 'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=600&h=400&q=80',
    'wrap': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=600&h=400&q=80',
    'shawarma': 'https://images.unsplash.com/photo-1561651823-34feb02250e4?auto=format&fit=crop&w=600&h=400&q=80',
    'sandwich': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&h=400&q=80',
    'burger': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&h=400&q=80',
    'tandoori': 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=600&h=400&q=80',
    'kabab': 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=600&h=400&q=80',
    'sajji': 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&h=400&q=80',
    'naan': 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=600&h=400&q=80',
    'roti': 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=600&h=400&q=80',
    'fish': 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&h=400&q=80',
    'seafood': 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&h=400&q=80',
    'prawn': 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&h=400&q=80',
    'mojito': 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&h=400&q=80',
    'drink': 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&h=400&q=80',
    'dessert': 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&h=400&q=80',
    'sundae': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&h=400&q=80',
    'rice': 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&h=400&q=80',
    'default': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&h=400&q=80'
}

# Specific mapping for JushhPK items to Cloudinary CDN URLs
JUSHHPK_CLOUDINARY_MAP = {
    'Chicken Doner Fries': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_doner_fries.jpg',
    'Beef Doner Fries': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_doner_fries.jpg',
    'Chicken Grilled Sandwich': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_grilled_sandwich.jpg',
    'Beef Grilled Sandwich': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_grilled_sandwich.jpg',
    'Half Dubai Shawaya': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/half_dubai_shawaya.jpg',
    'Full Dubai Shawaya': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/full_dubai_shawaya.jpg',
    'Add-on Rice': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/addon_rice.jpg',
    'Chicken Turkish Wrap': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_turkish_wrap.jpg',
    'Beef Turkish Wrap': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_turkish_wrap.jpg',
    'Chicken Turkish Doner': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_turkish_doner.jpg',
    'Beef Turkish Doner': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_turkish_doner.jpg',
    'Chicken Pouch Shawarma': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_pouch_shawarma.jpg',
    'Beef Pouch Shawarma': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_pouch_shawarma.jpg',
    'Chicken Shawarma': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_turkish_wrap.jpg',
    'Beef Shawarma': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_turkish_wrap.jpg',
    'Charcoal Shawarma Chicken': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/charcoal_shawarma_chicken.jpg',
    'Chicken Shawarma Platter': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_shawarma_platter.jpg',
    'Chicken Shawarma Platter (with cheese)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_shawarma_platter.jpg',
    'Dip': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/garlic_dip.jpg',
    'Pita Bread': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/pita_bread.jpg',
    'Water': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/water_bottle.jpg',
    'Soft Drink': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/soft_drink.jpg',
    'Blueberry Mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/blueberry_mojito.jpg',
    'Strawberry Mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/strawberry_mojito.jpg',
    'Green Apple Mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/green_apple_mojito.jpg',
    'Peach Mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/peach_mojito.jpg',
    'Lemon Mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/lemon_mojito.jpg',
    'Lotus Can Dessert': 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=600&h=400&q=80',
    'Red Velvet Can Dessert': 'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?auto=format&fit=crop&w=600&h=400&q=80',
    'Nutella Can Dessert': 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&h=400&q=80',
    'Cheese Add-on': 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=600&h=400&q=80',
    'Tortilla Bread': 'https://images.unsplash.com/photo-1601050690597-df056fb4ce78?auto=format&fit=crop&w=600&h=400&q=80',
    'Plain Fries': 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&h=400&q=80'
}

def get_fallback_image(item_name):
    name_lower = item_name.lower()
    for kw, url in CATEGORY_CDN_FALLBACKS.items():
        if kw in name_lower:
            return url
    return CATEGORY_CDN_FALLBACKS['default']

def fix_website_images():
    print("🚀 Fixing product image paths and CDNs across all brand websites...")

    # 1. Fix jushhpk index.html relative image paths
    jushh_html = os.path.join("websites", "jushhpk", "index.html")
    if os.path.exists(jushh_html):
        with open(jushh_html, "r", encoding="utf-8") as f:
            content = f.read()

        # Replace all ./images/ relative paths with Cloudinary or CDN URLs
        for name, cdn_url in JUSHHPK_CLOUDINARY_MAP.items():
            pattern = rf'name:\s*"{re.escape(name)}"[^}},]*image:\s*"[^"]*"'
            replacement_image = f'image: "{cdn_url}"'
            
            # Replace relative ./images/ filename
            filename = cdn_url.split('/')[-1]
            content = content.replace(f'./images/{filename}', cdn_url)

        # For any remaining ./images/ references or items without image key
        def replace_item_img(match):
            full = match.group(0)
            for name, cdn_url in JUSHHPK_CLOUDINARY_MAP.items():
                if f'"{name}"' in full:
                    if 'image:' not in full:
                        return full[:-1] + f', image: "{cdn_url}"}}'
                    else:
                        return re.sub(r'image:\s*"[^"]*"', f'image: "{cdn_url}"', full)
            return full

        with open(jushh_html, "w", encoding="utf-8") as f:
            f.write(content)
        print("✅ Fixed jushhpk/index.html image URLs.")

    # 2. Update websites/shared_catalog.json
    shared_json_path = os.path.join("websites", "shared_catalog.json")
    if os.path.exists(shared_json_path):
        with open(shared_json_path, "r", encoding="utf-8") as f:
            catalog = json.load(f)

        for slug, brand_data in catalog.items():
            for cat in brand_data.get('categories', []):
                for item in cat.get('items', []):
                    item_name = item.get('name', '')
                    current_img = item.get('image')

                    if not current_img or current_img.startswith('./images'):
                        if item_name in JUSHHPK_CLOUDINARY_MAP:
                            item['image'] = JUSHHPK_CLOUDINARY_MAP[item_name]
                        else:
                            item['image'] = get_fallback_image(item_name)

        with open(shared_json_path, "w", encoding="utf-8") as f:
            json.dump(catalog, f, indent=2, ensure_ascii=False)
        print("✅ Fixed shared_catalog.json image URLs with CDN links.")

    print("\n🎉 Website product image CDN resolution complete!")

if __name__ == "__main__":
    fix_website_images()
