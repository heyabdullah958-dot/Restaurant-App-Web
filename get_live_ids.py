import urllib.request
import json

def get_all_live_ids():
    base_url = "https://restaurant-app-web.onrender.com/api"
    req = urllib.request.Request(f"{base_url}/restaurants/", headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=20) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        results = data.get('results', data) if isinstance(data, dict) else data
        print("=== LIVE RESTAURANTS ON RENDER ===")
        for r in results:
            slug = r.get('slug')
            r_id = r.get('id')
            name = r.get('name')
            print(f"Slug: '{slug}' | ID: {r_id} | Name: '{name}'")
            
            # Fetch detail for first item IDs
            det_url = f"{base_url}/restaurants/{slug}/"
            det_req = urllib.request.Request(det_url, headers={'User-Agent': 'Mozilla/5.0'})
            try:
                with urllib.request.urlopen(det_req, timeout=15) as det_resp:
                    det_data = json.loads(det_resp.read().decode('utf-8'))
                    cats = det_data.get('categories', [])
                    if cats and len(cats) > 0 and 'items' in cats[0] and len(cats[0]['items']) > 0:
                        first_item = cats[0]['items'][0]
                        print(f"   -> Sample Category ID: {cats[0].get('id')}, Sample Item ID: {first_item.get('id')} ({first_item.get('name')})")
            except Exception as e:
                print(f"   -> Could not fetch detail: {e}")

if __name__ == "__main__":
    get_all_live_ids()
