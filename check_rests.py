import urllib.request
import json

def check_restaurants():
    url = "https://restaurant-app-web.onrender.com/api/restaurants/"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        results = data.get('results', data) if isinstance(data, dict) else data
        print(f"Total restaurants on Render: {len(results)}")
        for r in results:
            print(f"  ID: {r.get('id')} | Name: {r.get('name')} | Slug: {r.get('slug')}")

if __name__ == "__main__":
    check_restaurants()
