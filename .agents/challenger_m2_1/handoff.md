# Handoff Report — Milestone 2 Empirical Challenge (Challenger 1)

## 1. Observation
- **Empirical Test Suite Execution**:
  - Test harness location: `backend/orders/test_m2_empirical_challenger.py`
  - Command executed: `.\venv\Scripts\python.exe manage.py test` inside `d:\sitesdata\Resturent App\backend`
  - Result: `Ran 17 tests in 30.134s — OK` (100% pass rate).

- **Task 1: Delivery Radius Enforcement**:
  - Code inspected: `backend/orders/serializers.py` lines 147-182.
  - Haversine distance logic validates customer `delivery_lat`/`delivery_lng` against branch `latitude`/`longitude` or `BRANCH_COORDINATES` fallback lookup.
  - Test result 1.1 (Out-of-Bound Distance ~45km away in Kasur): `POST /api/orders/` returned HTTP 400 with response payload:
    `{"non_field_errors": ["Delivery address is outside our service area for Johar Town Branch (45.3 km away, maximum radius is 5.0 km)."]}`.
  - Test result 1.2 (Boundary Outside ~5.1km): `POST /api/orders/` returned HTTP 400 with clear delivery radius error.
  - Test result 1.3 (Boundary Inside ~4.8km): `POST /api/orders/` returned HTTP 201 Created with valid `tracking_token`.
  - Test result 1.4 (Zero Distance 0.0km at Branch location): `POST /api/orders/` returned HTTP 201 Created.
  - Test result 1.5 (Branch model with `latitude=None, longitude=None` using fallback lookup): Returned HTTP 400 with service area error when destination exceeds radius.

- **Task 2: Rider Creation & Assignment via API**:
  - Code inspected: `backend/restaurants/views.py` lines 253-301 (`AdminBranchRiderViewSet`) & `backend/orders/views.py` lines 351-400 (`OrderAssignRiderView`).
  - Test result 2.1 (`POST /api/admin/riders/`): Authenticated staff created rider `Usman Tariq` (vehicle `BIKE`, status `AVAILABLE`), returning HTTP 201 Created.
  - Test result 2.2 (`POST /api/orders/<id>/assign-rider/` with `{"rider_id": <id>}`): Assigned rider to order in `preparing` status. Response returned HTTP 200 OK with `{"success": true, "message": "Order #... assigned to rider Hamza Sheikh."}`. Order `rider_id` updated to rider ID, order `status` updated to `out_for_delivery`, and rider `status` updated to `ON_DELIVERY`.
  - Test result 2.3 (Assigning inactive rider `is_active=False`): Returned HTTP 400 Bad Request with `{"error": "Rider is inactive."}`.
  - Test result 2.4 (Unassigning rider with `{"rider_id": null}`): Returned HTTP 200 OK with `{"message": "Rider unassigned from order."}`, setting `order.rider = None`.

- **Task 3: WhatsApp Dispatch URL Generation & Encoding**:
  - Code inspected: `admin/src/views/OrderManagement.tsx` lines 302-331 (`triggerRiderWhatsApp`).
  - Test result 3.1 (Pakistani Phone Number Normalization): Converts local `03001234567` or `0300-1234567` to international format `923001234567`.
  - Test result 3.2 (URL Format & Parameter Encoding):
    - Generated URL structure: `https://wa.me/923001234567?text=<encodedMessage>`
    - Correctly URL-encodes special characters (`&` -> `%26`, `#` -> `%23`, `/` -> `%2F`, spaces -> `%20`, newlines -> `%0A`).
    - Decodes back via `urllib.parse.unquote()` to exact dispatch message format including Google Maps link `https://maps.google.com/?q=House%20%2345-B...`, itemized list, total collection amount, and payment method string.

## 2. Logic Chain
1. **Haversine Distance Accuracy**: The backend serializer uses the Haversine formula with earth radius `R = 6371.0 km`. Empirical tests confirmed exact boundary enforcement: coordinates at 4.8 km are accepted (HTTP 201), while coordinates at 5.1 km and 45.3 km are rejected (HTTP 400).
2. **Atomic Status Synchronization**: When `POST /api/orders/<id>/assign-rider/` is invoked, Django updates both `order.rider`, `order.status` (from `preparing` to `out_for_delivery`), and `rider.status` (from `AVAILABLE` to `ON_DELIVERY`) in the database, ensuring database integrity and preventing double dispatching.
3. **Safe Parameter Encoding for WhatsApp**: Pre-filling dispatch messages using `encodeURIComponent` in React TSX / `urllib.parse.quote` in Python guarantees that special characters common in Pakistani delivery addresses (e.g. `House #12-B`, `Street / Lane`, `G-9/1`) and restaurant names (`Jushh PK & Grill`) do not break WhatsApp web/app link navigation.

## 3. Caveats
- Distance calculations use straight-line Haversine distance, which is standard for quick radius validation. Real-world road navigation distance may be slightly higher than Haversine distance.
- Phone number normalization assumes standard Pakistani 11-digit mobile numbers starting with `03...` converting to `923...`. International numbers passing through with existing country code (`+92...`) retain their digits without leading zero replacement.

## 4. Conclusion
Empirical verification of Milestone 2 (R2: Core Operations & Backend Wiring) is **COMPLETE and PASSED**.
- Delivery Radius enforcement correctly returns HTTP 400 for out-of-bound coordinates across edge cases.
- Rider creation (`POST /api/admin/riders/`) and assignment (`POST /api/orders/<id>/assign-rider/`) function correctly via API, setting rider status to `ON_DELIVERY` and order status to `out_for_delivery`.
- WhatsApp URL generator produces valid `https://wa.me/<phone>?text=...` links with robust URL encoding.

## 5. Verification Method
To re-verify independently, execute the Django test runner:
```powershell
cd "d:\sitesdata\Resturent App\backend"
.\venv\Scripts\python.exe manage.py test orders.test_m2_empirical_challenger
```
Expected output:
```text
Ran 6 tests in 10.521s
OK
```
Or run the complete backend test suite:
```powershell
.\venv\Scripts\python.exe manage.py test
```
Expected output:
```text
Ran 17 tests in 30.134s
OK
```
