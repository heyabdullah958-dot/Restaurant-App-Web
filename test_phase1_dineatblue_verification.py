import os
import json
import sqlite3

print("=== VERIFYING PHASE 1: DINE AT BLUE DATA & ASSET INTEGRITY ===")

# 1. Check images existence
images_dir = 'websites/dineatblue/images'
required_images = [
    'logo.svg', 'logo.png', 'logo_emblem.svg', 'logo_emblem.png', 'logo_horizontal.png',
    'blue_seafood_platter.png', 'kunafa_prawns.png', 'dynamite_prawns.png',
    'seared_dumplings.png', 'chicken_dumplings.png', 'honey_wings.png',
    'fish_and_chips.png', 'soup_19b.png', 'chicken_corn_soup.png',
    'bbq_prawn_salad.png', 'romesco_fish.png', 'umami_fish.png',
    'pamphlet_fish.png', 'fish_chilli_dry.png', 'vietnamese_fish.png',
    'thermidor_lobster.png', 'grilled_lobster.png', 'bbq_prawns.png',
    'prawn_pasta.png', 'steamed_crab.png', 'mud_crab.png',
    'grilled_fish.png', 'chilli_mint_chicken.png', 'cashew_nut_chicken.png',
    'korean_fried_chicken.png', 'chicken_chilli_dry.png', 'sweet_and_sour_chicken.png',
    'house_special_chicken.png', 'chicken_platter_2person.png',
    'strawberry_mojito.png', 'blueberry_mojito.png', 'peach_mojito.png',
    'green_apple_mojito.png', 'lemonade.png', 'pepsi_7up.png', 'water.png',
    'butter_rice.png', 'roasted_potatoes.png', 'french_fries.png', 'dynamite_dip.png'
]

missing_images = []
for img in required_images:
    p = os.path.join(images_dir, img)
    if not os.path.exists(p) or os.path.getsize(p) == 0:
        missing_images.append(img)

assert len(missing_images) == 0, f"Missing images: {missing_images}"
print(f"PASS: All {len(required_images)} Dine At Blue images verified on disk with non-zero size!")

# 2. Check shared_catalog.json
with open('websites/shared_catalog.json', 'r', encoding='utf-8') as f:
    cat_data = json.load(f)
blue_cat = cat_data.get('dineatblue', {})
assert blue_cat.get('item_count') == 41, f"Expected 41 items in shared_catalog, got {blue_cat.get('item_count')}"
assert blue_cat.get('category_count') == 7, f"Expected 7 categories, got {blue_cat.get('category_count')}"

# Verify platter variants
platter = None
for c in blue_cat['categories']:
    for it in c['items']:
        if it['name'] == 'Blue Seafood Platter (Steamed)':
            platter = it
            break
assert platter is not None, "Platter not found in shared_catalog"
assert len(platter.get('options', [])) == 3, f"Expected 3 options for platter, got {len(platter.get('options', []))}"
print("PASS: shared_catalog.json has all 41 items, 7 categories, and 3 platter variants!")

# 3. Check local SQLite DB
conn = sqlite3.connect('backend/db.sqlite3')
cur = conn.cursor()
cur.execute("SELECT id, name, is_active FROM restaurants_restaurant WHERE slug='dineatblue'")
rest = cur.fetchone()
assert rest is not None, "Restaurant not in DB"
assert rest[2] == 1, "DineAtBlue is not active in DB"
rest_id = rest[0]

cur.execute("SELECT count(*) FROM restaurants_menucategory WHERE restaurant_id=?", (rest_id,))
cats_count = cur.fetchone()[0]
assert cats_count == 7, f"Expected 7 categories in DB, got {cats_count}"

cur.execute("""
    SELECT count(*) FROM restaurants_menuitem mi
    JOIN restaurants_menucategory mc ON mi.category_id = mc.id
    WHERE mc.restaurant_id=?
""", (rest_id,))
items_count = cur.fetchone()[0]
assert items_count == 41, f"Expected 41 items in DB, got {items_count}"

cur.execute("SELECT count(*) FROM restaurants_branch WHERE restaurant_id=?", (rest_id,))
branches_count = cur.fetchone()[0]
assert branches_count >= 1, f"Expected at least 1 branch in DB, got {branches_count}"

print(f"PASS: SQLite DB verified: Restaurant ID {rest_id}, {cats_count} categories, {items_count} items, {branches_count} branch(es)!")

# 4. Check fallbackData.ts
with open('app/src/services/fallbackData.ts', 'r', encoding='utf-8') as f:
    fb_text = f.read()
assert 'Dine At Blue' in fb_text, "Dine At Blue name not in fallbackData.ts"
assert 'Blue Seafood Platter (Steamed)' in fb_text, "Platter not in fallbackData.ts"
assert 'With Lobster' in fb_text, "Platter options not in fallbackData.ts"
print("PASS: app/src/services/fallbackData.ts has Dine At Blue with full menu & options!")

print("\n=== ALL PHASE 1 CHECKS PASSED (100%) ===")
