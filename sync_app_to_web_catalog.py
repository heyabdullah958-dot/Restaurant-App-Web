import json
import urllib.request
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

API_BASE = "https://getfoodpk-fd9b20442fcf.herokuapp.com/api/restaurants"
BRAND_SLUGS = [
    "seenbanao",
    "dineatblue",
    "jushhpk",
    "tandooristoppk",
    "sandmelts",
    "birdmanfoodspk",
    "getafomo"
]

def sync_catalogs():
    print("🚀 Starting FoodSphere App-to-Website Product Catalog & Media Sync...")
    catalog_data = {}

    for slug in BRAND_SLUGS:
        url = f"{API_BASE}/{slug}/menu/"
        print(f"📡 Fetching live menu from API for brand: {slug}...")
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'FoodSphereCatalogSync/1.0'})
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    raw_categories = data.get('data', [])
                    
                    categories_list = []
                    total_items = 0
                    for cat in raw_categories:
                        cat_name = cat.get('name', 'Uncategorized')
                        items_list = []
                        for item in cat.get('items', []):
                            total_items += 1
                            items_list.append({
                                'id': item.get('id'),
                                'name': item.get('name'),
                                'description': item.get('description', ''),
                                'price': float(item.get('price', 0)),
                                'image': item.get('image', ''),
                                'is_available': item.get('is_available', True),
                                'spicy_level': item.get('spicy_level', 0),
                                'calories': item.get('calories', None)
                            })
                        
                        categories_list.append({
                            'id': cat.get('id'),
                            'name': cat_name,
                            'order': cat.get('order', 0),
                            'items': items_list
                        })

                    catalog_data[slug] = {
                        'slug': slug,
                        'category_count': len(categories_list),
                        'item_count': total_items,
                        'categories': categories_list
                    }
                    print(f"✅ {slug}: Synced {len(categories_list)} categories & {total_items} menu items.")
                else:
                    print(f"⚠️ {slug}: HTTP {response.status}")
        except Exception as e:
            print(f"❌ {slug}: Sync failed - {e}")

    # Write shared_catalog.json in websites directory
    output_path = os.path.join("websites", "shared_catalog.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(catalog_data, f, indent=2, ensure_ascii=False)
    print(f"\n💾 Saved catalog payload to {output_path} ({os.path.getsize(output_path)} bytes).")

if __name__ == "__main__":
    sync_catalogs()
