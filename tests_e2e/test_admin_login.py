import requests

base_url = "https://restaurant-app-web.onrender.com"

def check_admin_login():
    url = f"{base_url}/api/auth/login/"
    payload = {"username": "admin", "password": "admin123"}
    print("Testing admin/admin123 login...")
    try:
        res = requests.post(url, json=payload)
        print(f"Status Code: {res.status_code}")
        if res.status_code == 200:
            print("SUCCESS: Logged in as Admin!")
            print("Response:", res.json())
        else:
            print("FAILED:", res.text)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check_admin_login()
