import urllib.request
import json

BASE = "https://getfoodpk-fd9b20442fcf.herokuapp.com/api"

# Step 1: Login as admin
login_data = json.dumps({"username": "admin", "password": "admin123"}).encode()
req = urllib.request.Request(
    f"{BASE}/auth/login/",
    data=login_data,
    headers={"Content-Type": "application/json"},
    method="POST"
)

with urllib.request.urlopen(req) as resp:
    login_resp = json.loads(resp.read())

token = login_resp.get("access") or login_resp.get("token")
print(f"Logged in as admin. Token: {token[:25]}...")

# Step 2: Trigger Purge Orders API
purge_req = urllib.request.Request(
    f"{BASE}/orders/purge-all/",
    data=b"{}",
    headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    },
    method="POST"
)

try:
    with urllib.request.urlopen(purge_req) as purge_resp:
        result = json.loads(purge_resp.read())
        print("\n=== PURGE PRODUCTION ORDERS RESULT ===")
        print(json.dumps(result, indent=2))
except Exception as e:
    print(f"\nPurge request failed: {e}")
