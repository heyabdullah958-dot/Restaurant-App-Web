import requests
import json

base_url = "https://restaurant-app-web.onrender.com"

def test_login(username, password):
    url = f"{base_url}/api/auth/login/"
    payload = {"username": username, "password": password}
    print(f"Attempting login for {username}...")
    try:
        response = requests.post(url, json=payload)
        print(f"Status Code: {response.status_code}")
        data = response.json()
        print("Response data keys:", list(data.keys()))
        print("Response data:", json.dumps(data, indent=2))
        return data
    except Exception as e:
        print(f"Exception: {e}")
    return None

if __name__ == "__main__":
    test_login("manager_seenbanao", "seenbanao@2025")
