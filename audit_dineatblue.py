import json

with open('websites/shared_catalog.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

blue = data.get('dineatblue', {})
print('Dine At Blue brand name:', blue.get('brand_name'))
cats = blue.get('categories', [])
print('Categories count:', len(cats))
total_items = 0
for c in cats:
    items = c.get('items', [])
    total_items += len(items)
    print(f"\n[Category: {c.get('name')}] ({len(items)} items)")
    for item in items:
        img = item.get('image', '')
        print(f"  * {item.get('name')} (Rs. {item.get('price')}): {img}")
print(f"\nTotal dishes across Dine At Blue: {total_items}")
