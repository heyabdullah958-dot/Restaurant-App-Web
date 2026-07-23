import urllib.request
import json

def check_live_branches():
    url = "https://restaurant-app-web.onrender.com/api/branches/"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode('utf-8')
            data = json.loads(raw)
            results = data.get('results', data) if isinstance(data, dict) else data
            if isinstance(data, dict) and 'data' in data:
                results = data['data']
            print("Response:", type(results))
            if isinstance(results, list):
                print(f"Total branches on Render: {len(results)}")
                for b in results:
                    if isinstance(b, dict):
                        print(f"  ID: {b.get('id')} | Name: '{b.get('name')}' | Restaurant: {b.get('restaurant')}")
            else:
                print(results)
    except Exception as e:
        print("Failed to fetch branches:", e)

if __name__ == "__main__":
    check_live_branches()
