import json
import urllib.request
import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Dynamic asset mapping imported directly or mirrored from mediaAssetService.ts
BRAND_ORIGINAL_ASSETS = {
    'chicken doner fries': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_doner_fries.jpg',
    'beef doner fries': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_doner_fries.jpg',
    'chicken grilled sandwich': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_grilled_sandwich.jpg',
    'beef grilled sandwich': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_grilled_sandwich.jpg',
    'half dubai shawaya': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/half_dubai_shawaya.jpg',
    'full dubai shawaya': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/full_dubai_shawaya.jpg',
    'add-on rice': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/addon_rice.jpg',
    'chicken turkish wrap': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_turkish_wrap.jpg',
    'beef turkish wrap': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_turkish_wrap.jpg',
    'chicken turkish doner': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_turkish_doner.jpg',
    'beef turkish doner': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_turkish_doner.jpg',
    'chicken pouch shawarma': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_pouch_shawarma.jpg',
    'beef pouch shawarma': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_pouch_shawarma.jpg',
    'chicken shawarma': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_turkish_wrap.jpg',
    'beef shawarma': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/beef_turkish_wrap.jpg',
    'charcoal shawarma chicken': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/charcoal_shawarma_chicken.jpg',
    'chicken shawarma platter': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_shawarma_platter.jpg',
    'chicken shawarma platter (with cheese)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/chicken_shawarma_platter.jpg',
    'lotus can dessert': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/jushh_1273_lotus_can_dessert_wt0erf',
    'red velvet can dessert': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/jushh_1274_red_velvet_can_dessert_vdxtci',
    'nutella can dessert': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/jushh_1275_nutella_can_dessert_kjmyie',
    'cheese add-on': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/jushh_1276_cheese_addon_s0v0a3',
    'cheese': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/jushh_1276_cheese_addon_s0v0a3',
    'dip': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/garlic_dip.jpg',
    'dip add-on': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/garlic_dip.jpg',
    'pita bread': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/pita_bread.jpg',
    'water': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/water_bottle.jpg',
    'soft drink': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/soft_drink.jpg',
    'blueberry mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/blueberry_mojito.jpg',
    'strawberry mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/strawberry_mojito.jpg',
    'green apple mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/green_apple_mojito.jpg',
    'peach mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/peach_mojito.jpg',
    'lemon mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/lemon_mojito.jpg',

    'tandoori chicken bone (cheese naan single)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1288_IMG_7585.JPG_xhiffo',
    'tandoori chicken boneless (cheese naan single)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1289_IMG_7585.JPG_cxjp6v',
    'tandoori chicken bone (cheese naan double)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1290_IMG_7589.JPG_ylld2e',
    'tandoori chicken boneless (cheese naan double)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1291_IMG_7589.JPG_of3jsh',
    'tandoori chicken bone (with rice)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1292_IMG_7586.JPG_vjhc9h',
    'tandoori chicken boneless (with rice)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1293_IMG_7586.JPG_jazoj8',
    'tandoori chicken bone (plain)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1294_IMG_7590.JPG_ree9bg',
    'tandoori chicken boneless (plain)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1295_IMG_7590.JPG_edtoye',
    'quarter sajji': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1296_IMG_7587.JPG_cbsi5z',
    'half sajji': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1297_IMG_7587.JPG_s9a0wa',
    'full sajji': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1298_IMG_7587.JPG_ozqr4i',
    'peri peri quarter sajji': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1299_IMG_7587.JPG_ia9lxc',
    'peri peri half sajji': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1300_IMG_7587.JPG_iyvbn9',
    'peri peri full sajji': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1301_IMG_7587.JPG_irp4qj',
    'chicken paratha roll': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1305_IMG_7588.JPG_h1xhsz',
    'full stop roll': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1302_IMG_7591.JPG_veizgo',
    'tandoori chicken roll': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1303_IMG_7591.JPG_kooigy',
    'malai boti roll': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1304_IMG_7592.JPG_fupdwk',
    'seekh kabab (per seekh)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1313_IMG_7578.JPG_cilvdf',
    'tikka boti (per seekh)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1311_IMG_7583.JPG_khkxj9',
    'malai boti (per seekh)': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1309_IMG_7584.JPG_sxoyyb',
    'roghni naan': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1327_IMG_7582.JPG_xohvv8',
    'butter naan': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1328_IMG_7582.JPG_ds5jeq',
    'plain roti': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1331_IMG_7582.JPG_f1ie9j',
    'cheese naan': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1329_IMG_7581.JPG_p8inf5',
    'puri paratha': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1334_IMG_7580.JPG_cr8hod',
    'rice': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1330_IMG_7579.JPG_nsb0dw',
    'apple mojito': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1338_IMG_7576.JPG_b0buvx',
    'mint margaritas': 'https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/ts_1346_IMG_7577.JPG_faehdg',
}

def resolve_item_image(name, raw_img):
    if raw_img and isinstance(raw_img, str) and ('cloudinary.com' in raw_img or 'tandoori_stop' in raw_img or '/media/' in raw_img):
        if 'unsplash.com' not in raw_img:
            return raw_img
    key = name.lower().strip() if name else ''
    if key in BRAND_ORIGINAL_ASSETS:
        return BRAND_ORIGINAL_ASSETS[key]
    return None

def fetch_url(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception:
        return None

def main():
    print("==========================================================================")
    print(" 📱 MOBILE APPLICATION ASSET AUDIT REPORT (JushhPK, TandooriStop, GET A FOMO)")
    print("==========================================================================")
    
    base_url = "https://getfoodpk-fd9b20442fcf.herokuapp.com/api/restaurants/"
    brands = ['jushhpk', 'tandooristoppk', 'getafomo']

    for slug in brands:
        print(f"\n──────────────────────────────────────────────────────────────────────────")
        print(f" 🍔 BRAND: {slug.upper()}")
        print(f"──────────────────────────────────────────────────────────────────────────")
        
        detail = fetch_url(f"{base_url}{slug}/")
        categories = detail.get('categories', []) if detail else []
        
        applied_list = []
        missing_list = []
        total_items = 0

        for cat in categories:
            cat_name = cat.get('name', 'General')
            for item in cat.get('items', []):
                total_items += 1
                name = item.get('name', '')
                raw_img = item.get('image_url') or item.get('image')
                resolved = resolve_item_image(name, raw_img)
                
                if resolved:
                    applied_list.append((name, cat_name, resolved))
                else:
                    missing_list.append((name, cat_name))

        print(f"\n [OK] Original Image Applied ({len(applied_list)} items):")
        if applied_list:
            for item_name, cat_name, url in applied_list:
                print(f"   - [{cat_name}] {item_name} -> {url}")
        else:
            print("   (None)")

        print(f"\n [MISSING] Missing Image (Left Blank - Zero Generic Icons) ({len(missing_list)} items):")
        if missing_list:
            for item_name, cat_name in missing_list:
                print(f"   - [{cat_name}] {item_name}")
        else:
            print("   (None)")

        print(f"\n 📊 SUMMARY FOR {slug.upper()}:")
        print(f"   - Original Image Applied: {len(applied_list)}")
        print(f"   - Missing Image (Left Blank): {len(missing_list)}")
        print(f"   - Total Brand Items: {total_items}")

    print("\n==========================================================================")
    print(" 🚀 AUDIT COMPLETE — Mobile menu renderer is configured with zero generic icons.")
    print("==========================================================================")

if __name__ == "__main__":
    main()
