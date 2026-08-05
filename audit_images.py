import json
import urllib.request
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

def fetch_url(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        print(f"Error fetching {url}:", e)
        return None

def main():
    print("=== HEROKU DETAILED RESTAURANTS & MENU AUDIT ===")
    base_url = "https://getfoodpk-fd9b20442fcf.herokuapp.com/api/restaurants/"
    
    for slug in ['jushhpk', 'tandooristoppk', 'getafomo']:
        print(f"\n==========================================")
        print(f"  BRAND AUDIT: {slug}")
        print(f"==========================================")
        detail = fetch_url(f"{base_url}{slug}/")
        if not detail:
            print("  Failed to fetch detail.")
            continue
        
        categories = detail.get('categories', [])
        total_items = 0
        has_real_image = 0
        missing_image = 0
        
        applied_items = []
        missing_items = []
        
        for cat in categories:
            cat_name = cat.get('name')
            items = cat.get('items', [])
            for item in items:
                total_items += 1
                img = item.get('image_url') or item.get('image')
                item_name = item.get('name')
                
                # Check if img is a valid photo (not unsplash, not empty)
                if img and ('cloudinary.com' in img or 'res.cloudinary' in img or 'tandoori_stop' in img or '/media/' in img or 'http' in img):
                    if 'unsplash.com' not in img:
                        has_real_image += 1
                        applied_items.append((item_name, cat_name, img))
                    else:
                        missing_image += 1
                        missing_items.append((item_name, cat_name, "Unsplash placeholder"))
                else:
                    missing_image += 1
                    missing_items.append((item_name, cat_name, "No image path"))
        
        print(f"\n  [OK] Original Image Applied ({len(applied_items)}):")
        for item_name, cat_name, img in applied_items:
            print(f"    - [{cat_name}] {item_name} -> {img}")
            
        print(f"\n  [MISSING] Missing Image (Left Blank) ({len(missing_items)}):")
        for item_name, cat_name, reason in missing_items:
            print(f"    - [{cat_name}] {item_name} ({reason})")
            
        print(f"\n  SUMMARY FOR {slug.upper()}:")
        print(f"  - Original Image Applied: {has_real_image}")
        print(f"  - Missing Image (Left Blank): {missing_image}")
        print(f"  - Total Items: {total_items}")

if __name__ == "__main__":
    main()
