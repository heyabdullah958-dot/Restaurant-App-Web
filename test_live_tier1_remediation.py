import requests
import uuid
import time

BASE_URL = "https://getfoodpk-fd9b20442fcf.herokuapp.com/api"

def run_live_tests():
    print("Testing Live Heroku Tier-1 Remediation Invariants with Real Order...")
    
    # 1. Register User A (owner)
    ts = int(time.time())
    user_a_name = f"remed_a_{ts}"
    res_a = requests.post(
        f"{BASE_URL}/auth/register/",
        json={
            "username": user_a_name,
            "email": f"{user_a_name}@foodsphere.com",
            "password": "Password123!",
            "phone": f"+92300{ts % 10000000:07d}",
            "first_name": "Remed",
            "last_name": "UserA"
        },
        timeout=15
    )
    assert res_a.status_code in [200, 201], f"Failed to register User A: {res_a.text}"
    log_a = requests.post(f"{BASE_URL}/auth/login/", json={"username": user_a_name, "password": "Password123!"}).json()
    token_a = log_a.get("access") or log_a.get("tokens", {}).get("access")
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # 2. Register User B (stranger / attacker)
    user_b_name = f"remed_b_{ts}"
    res_b = requests.post(
        f"{BASE_URL}/auth/register/",
        json={
            "username": user_b_name,
            "email": f"{user_b_name}@foodsphere.com",
            "password": "Password123!",
            "phone": f"+92301{ts % 10000000:07d}",
            "first_name": "Remed",
            "last_name": "UserB"
        },
        timeout=15
    )
    assert res_b.status_code in [200, 201], f"Failed to register User B: {res_b.text}"
    log_b = requests.post(f"{BASE_URL}/auth/login/", json={"username": user_b_name, "password": "Password123!"}).json()
    token_b = log_b.get("access") or log_b.get("tokens", {}).get("access")
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. Create Order for User A
    rests = requests.get(f"{BASE_URL}/restaurants/").json()
    restaurant = None
    branch = None
    menu_item = None
    for r in rests:
        if r.get("branches"):
            restaurant = r
            branch = r["branches"][0]
            break
    
    menu_res = requests.get(f"{BASE_URL}/restaurants/{restaurant['id']}/menu/").json()
    categories = menu_res.get("data", menu_res) if isinstance(menu_res, dict) else menu_res
    for cat in categories:
        if isinstance(cat, dict) and cat.get("items"):
            menu_item = cat["items"][0]
            break

    assert menu_item is not None, "Could not find a menu item"

    order_payload = {
        "restaurant": restaurant["id"],
        "branch": branch["id"],
        "order_type": "DELIVERY",
        "delivery_address": "Street 10, Gulberg, Lahore",
        "items": [
            {
                "menu_item": menu_item["id"],
                "quantity": 2
            }
        ]
    }
    create_res = requests.post(f"{BASE_URL}/orders/", json=order_payload, headers=headers_a)
    assert create_res.status_code == 201, f"Failed to create order: {create_res.text}"
    order_data = create_res.json()
    if "data" in order_data:
        order_data = order_data["data"]
    order_id = order_data["id"]
    display_order_id = order_data.get("display_order_id", f"ORD-{order_id}")
    tracking_token = order_data.get("tracking_token")
    print(f"Created live test order #{order_id} ({display_order_id}) with tracking_token={tracking_token}")

    # 4. User B (stranger) attempts to confirm User A's COD payment -> Expect HTTP 403 Forbidden
    b_cod = requests.post(
        f"{BASE_URL}/payments/cod/confirm/",
        json={"order_id": order_id},
        headers=headers_b
    )
    print(f"User B confirming User A's COD payment -> HTTP {b_cod.status_code}: {b_cod.text}")
    assert b_cod.status_code == 403, f"Expected 403, got {b_cod.status_code}"

    # 5. Attacker attempts to spoof tracking_token="None" on COD confirm -> Expect HTTP 401/403 Forbidden
    spoof_cod = requests.post(
        f"{BASE_URL}/payments/cod/confirm/",
        json={"order_id": order_id, "tracking_token": "None"}
    )
    print(f"Attacker spoofing tracking_token='None' on COD confirm -> HTTP {spoof_cod.status_code}: {spoof_cod.text}")
    assert spoof_cod.status_code in [401, 403], f"Expected 401/403, got {spoof_cod.status_code}"

    # 6. User A (legitimate owner) confirms COD payment using alphanumeric display_order_id -> Expect HTTP 200 OK
    a_cod = requests.post(
        f"{BASE_URL}/payments/cod/confirm/",
        json={"order_id": display_order_id},
        headers=headers_a
    )
    print(f"User A confirming COD payment with display_order_id '{display_order_id}' -> HTTP {a_cod.status_code}: {a_cod.text}")
    assert a_cod.status_code == 200, f"Expected 200, got {a_cod.status_code}"

    # 7. Unauthenticated Live Tracking with correct token vs invalid/spoofed token "None"
    if tracking_token:
        valid_track = requests.get(f"{BASE_URL}/v1/orders/{order_id}/track/", params={"token": tracking_token})
        print(f"Valid token live tracking -> HTTP {valid_track.status_code}")
        assert valid_track.status_code == 200
        valid_data = valid_track.json()["data"]
        assert valid_data["delivery_address"] != "[Protected]", "Expected full delivery address with valid token"
        print(f"  Delivery address exposed to token holder: {valid_data['delivery_address']}")

        spoof_track = requests.get(f"{BASE_URL}/v1/orders/{order_id}/track/", params={"token": "None"})
        print(f"Spoofed 'None' token live tracking -> HTTP {spoof_track.status_code}")
        assert spoof_track.status_code == 200
        spoof_data = spoof_track.json()["data"]
        assert spoof_data["delivery_address"] == "[Protected]", "Expected protected delivery address when spoofing None"
        print(f"  Delivery address properly redacted: {spoof_data['delivery_address']}")

    # 8. OrderDetailView access control:
    # Unauthenticated with spoofed token "None" -> HTTP 403
    spoof_detail = requests.get(f"{BASE_URL}/orders/{order_id}/", params={"tracking_token": "None"})
    print(f"OrderDetailView with spoofed token 'None' -> HTTP {spoof_detail.status_code}")
    assert spoof_detail.status_code == 403, f"Expected 403, got {spoof_detail.status_code}"

    # Unauthenticated with valid tracking_token -> HTTP 200
    valid_detail = requests.get(f"{BASE_URL}/orders/{order_id}/", params={"tracking_token": tracking_token})
    print(f"OrderDetailView with valid tracking_token -> HTTP {valid_detail.status_code}")
    assert valid_detail.status_code == 200, f"Expected 200, got {valid_detail.status_code}"

    # User B (stranger) -> HTTP 403
    stranger_detail = requests.get(f"{BASE_URL}/orders/{order_id}/", headers=headers_b)
    print(f"OrderDetailView for stranger User B -> HTTP {stranger_detail.status_code}")
    assert stranger_detail.status_code == 403, f"Expected 403, got {stranger_detail.status_code}"

    # User A (owner) -> HTTP 200
    owner_detail = requests.get(f"{BASE_URL}/orders/{order_id}/", headers=headers_a)
    print(f"OrderDetailView for owner User A -> HTTP {owner_detail.status_code}")
    assert owner_detail.status_code == 200, f"Expected 200, got {owner_detail.status_code}"

    print("\n================================================================================")
    print("ALL LIVE PRODUCTION TIER-1 REMEDIATION CHECKS PASSED ON HEROKU (100%)!")
    print("================================================================================")

if __name__ == "__main__":
    run_live_tests()
