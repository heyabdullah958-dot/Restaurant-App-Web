import urllib.request
import json

def test_restaurant_detail(slug):
    url = f"https://restaurant-app-web.onrender.com/api/restaurants/{slug}/"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            print(f"=== Restaurant {slug} (ID: {data.get('id')}) ===")
            print("Name:", data.get('name'))
            print("Branches count:", len(data.get('branches', [])))
            categories = data.get('categories', [])
            print("Categories count:", len(categories))
            for cat in categories[:3]:
                print(f"  Category #{cat.get('id')} '{cat.get('name')}': {len(cat.get('items', []))} items")
                for item in cat.get('items', [])[:2]:
                    print(f"    Item #{item.get('id')}: '{item.get('name')}' (Rs {item.get('price')})")
    except Exception as e:
        print(f"Failed for {slug}:", e)

if __name__ == "__main__":
    test_restaurant_detail('tandooristoppk')
    print()
    test_restaurant_detail('jushhpk')
