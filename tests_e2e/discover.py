import requests
import json

base_url = "https://restaurant-app-web.onrender.com"

def discover():
    print(f"Connecting to live API at: {base_url}")
    try:
        response = requests.get(f"{base_url}/api/restaurants/")
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print("Successfully retrieved restaurants list:")
            print(json.dumps(data, indent=2))
        else:
            print(f"Error response: {response.text}")
    except Exception as e:
        print(f"Exception occurred: {e}")

if __name__ == "__main__":
    discover()
