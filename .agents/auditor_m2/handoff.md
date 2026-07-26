# Forensic Audit Report — Milestone 2 (R2: Core Operations & Backend Wiring)

**Work Product**: Milestone 2 Backend Wiring & Operations  
**Profile**: General Project (Integrity Forensics)  
**Verdict**: **CLEAN**

---

## 1. Observation

### Codebase Inspection & Static Analysis
- **Backend Models (`backend/restaurants/models.py`, `backend/orders/models.py`)**:
  - `Branch` model contains `latitude` (Decimal 9,6), `longitude` (Decimal 9,6), and `delivery_radius_km` (Decimal 5,2, default 10.00).
  - `BranchRider` model defined with fields `branch`, `name`, `phone`, `vehicle_type`, `status` (`AVAILABLE`, `ON_DELIVERY`, `OFFLINE`), and `is_active`.
  - `Order` model links `rider` ForeignKey pointing to `BranchRider` (`on_delete=models.SET_NULL`).

- **DRF Serializers & Distance Enforcement (`backend/orders/serializers.py`, `backend/config/admin_utils.py`)**:
  - `haversine_distance()` in `backend/config/admin_utils.py` uses genuine mathematical spherical trigonometry (`math.sin`, `math.cos`, `math.atan2`, `math.radians`) with Earth radius `R = 6371.0 km`.
  - `OrderCreateSerializer.validate()` computes distance between customer (`delivery_lat`, `delivery_lng`) and branch coordinates (`b_lat`, `b_lng`) using `haversine_distance()`.
  - If `dist_km > max_radius`, it raises a genuine `rest_framework.exceptions.ValidationError` returning HTTP 400 Bad Request with message `"Delivery address is outside our service area for {branch.name} ({dist_km:.1f} km away, maximum radius is {max_radius:.1f} km)."`. No hardcoded boolean bypasses exist.

- **Atomic Counter Update & Coupon Validation (`backend/orders/serializers.py`)**:
  - `OrderCreateSerializer.create()` updates coupon usage atomically inside SQL:
    ```python
    updated = Coupon.objects.filter(
        pk=coupon.pk,
        is_active=True,
        times_used__lt=F('usage_limit')
    ).update(times_used=F('times_used') + 1)
    ```
  - Genuine Django ORM `F('times_used') + 1` expression is executed directly on the database engine, avoiding Python-level race conditions.
  - If `updated == 0` when `usage_limit > 0`, it raises `serializers.ValidationError("Coupon usage limit has been reached.")`.
  - Logged via `CouponUsage.objects.create(coupon=coupon, user=user, order=order)`.

- **Rider Fleet Assignment & Status API (`backend/orders/views.py`, `backend/restaurants/views.py`)**:
  - `OrderAssignRiderView` (`POST /api/orders/<id>/assign-rider/`) validates rider presence and `is_active` flag.
  - On assignment: sets `order.rider = rider`, progresses order status from `preparing` to `out_for_delivery`, and updates `rider.status = 'ON_DELIVERY'`. Supports unassigning rider when `rider_id` is null/0.
  - `AdminBranchRiderViewSet` provides full CRUD scoped per branch/restaurant manager via `get_managed_branch` and `get_managed_restaurant`.

- **Admin HQ UI (`admin/src/views/RiderManagement.tsx`, `admin/src/views/OrderManagement.tsx`)**:
  - `RiderManagement.tsx`: Full fleet CRUD interface, vehicle types, status badges (`AVAILABLE`, `ON_DELIVERY`, `OFFLINE`), and WhatsApp link (`https://wa.me/923...?text=...`).
  - `OrderManagement.tsx`: Order card rider selector wired to `assignRiderToOrder` API. `triggerRiderWhatsApp` normalizes phone numbers (`03xx` -> `923xx`) and URL-encodes order ID, customer name, phone, address, items, total, and Google Maps URL.

- **Expo Mobile App UI (`app/src/screens/RestaurantScreen.tsx`, `app/src/screens/CheckoutScreen.tsx`)**:
  - `RestaurantScreen.tsx`: `isRestaurantOpen()` evaluates `is_force_closed`, `is_active`, `is_currently_open`, and branch active states. Renders prominent "CLOSED NOW — STORE IS CURRENTLY CLOSED FOR ORDERS" red banner, displays "CLOSED" badges on item cards, and blocks `handleAddToCart` / `handleIncrement`.
  - `CheckoutScreen.tsx`: Auto-detects GPS coordinates (`customerCoords`), calculates client-side Haversine radius check, wires promo code box to `POST /api/coupons/validate/`, displays promo savings in order summary, and passes `coupon_code`, `delivery_lat`, `delivery_lng`, `branch` in `placeOrder`.

- **Test Suite Results**:
  - Command: `.\venv\Scripts\python.exe manage.py test` inside `d:\sitesdata\Resturent App\backend`
  - Output: `Ran 13 tests in 95.729s — OK` (All 13/13 unit tests passed).

---

## 2. Logic Chain

1. **Absence of Hardcoding & Facades**:
   - Haversine distance calculation evaluates actual trigonometric spherical distances without hardcoded distance checks.
   - Operating hours evaluation inspects `opens_at` and `closes_at` against server system time (`timezone.localtime().time()`), properly handling overnight shifts.
   - Rider status transitions (`AVAILABLE` -> `ON_DELIVERY`) alter actual database records on both `Order` and `BranchRider` models.

2. **Concurrency & Integrity Mechanics**:
   - Atomic SQL increment using Django `F('times_used') + 1` with filter clause `times_used__lt=F('usage_limit')` guarantees race-condition safety under high concurrency.
   - Price modifiers on menu items are re-verified against the database (`MenuItem.options`) inside `OrderCreateSerializer` to prevent client-side price tampering.

3. **Multi-Tenant & Security Scoping**:
   - `AdminBranchRiderViewSet` and `OrderAssignRiderView` restrict branch managers to their assigned branch/restaurant.

---

## 3. Caveats

- Store operating hours rely on server system timezone set to `Asia/Karachi`.
- Geolocation radius enforcement requires client devices to submit `delivery_lat` and `delivery_lng`. If coordinates are omitted by a legacy client, the backend falls back to area keyword branch resolution.

---

## 4. Conclusion

Milestone 2 (R2: Core Operations & Backend Wiring) has undergone an independent forensic integrity audit. No hardcoded test results, facade implementations, dummy rider assignments, or fake atomic counters were found. All claims are backed by genuine DRF serializers, Django ORM `F()` expressions, Haversine trigonometry, and active UI state locks.

**Final Verdict**: **CLEAN**

---

## 5. Verification Method

1. **Run Backend Test Suite**:
   ```powershell
   cd "d:\sitesdata\Resturent App\backend"
   .\venv\Scripts\python.exe manage.py test
   ```
   Verify `Ran 13 tests ... OK`.

2. **Verify Delivery Radius Enforcement**:
   - POST `/api/orders/` with `delivery_lat: 31.1179`, `delivery_lng: 74.4459` (Kasur, ~45km from Johar Town branch).
   - Observe HTTP 400 response with message `"Delivery address is outside our service area..."`.

3. **Verify Atomic Coupon Counter**:
   - POST `/api/orders/` with `coupon_code: "WELCOME10"`.
   - Verify `times_used` on `Coupon` model increments by 1 via SQL `F()` expression.

4. **Verify Rider Assignment**:
   - POST `/api/orders/<id>/assign-rider/` with `{"rider_id": <id>}`.
   - Verify `order.rider_id` updates, `order.status` transitions to `out_for_delivery`, and `rider.status` updates to `ON_DELIVERY`.
