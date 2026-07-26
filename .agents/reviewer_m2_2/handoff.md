# Handoff Report — Reviewer 2 (Milestone 2: R2 Core Operations & Backend Wiring)

## 1. Observation
- **Delivery Radius Enforcement (Task 1)**:
  - `haversine_distance(lat1, lon1, lat2, lon2)` in `backend/config/admin_utils.py` computes Earth great circle distance using $R = 6371.0$ km and standard trigonometric Haversine formula.
  - `OrderCreateSerializer.validate()` in `backend/orders/serializers.py` verifies delivery distance between submitted `delivery_lat`/`delivery_lng` and `branch` location (`latitude`/`longitude`). Falls back to `BRANCH_COORDINATES` lookup table if branch coordinates are empty in DB. Rejects orders exceeding `branch.delivery_radius_km` (default 10.0 km) with HTTP 400 (`"Delivery address is outside our service area..."`).
  - `app/src/screens/CheckoutScreen.tsx` implements client-side `calculateHaversineDistance` with $R = 6371$ km. Checks customer location coordinates against selected branch radius before API dispatch and presents user alert.
  - Unit tests in `orders/test_m2_empirical_challenger.py` verify 5 radius cases: >5.0 km far out (Kasur ~45 km), 5.1 km just outside, 4.8 km just inside, 0.0 km exact branch location, and fallback branch coordinates.

- **Operating Hours & Dynamic Status Enforcement (Task 2)**:
  - `BranchSerializer`, `RestaurantSerializer`, and `RestaurantDetailSerializer` in `backend/restaurants/serializers.py` expose `is_currently_open = SerializerMethodField()`.
  - Open hours calculation handles daytime operating windows (`opens_at <= now_time <= closes_at`) and overnight operating windows (`now_time >= opens_at or now_time <= closes_at`) using `django.utils.timezone.localtime().time()` under `Asia/Karachi` timezone. Incorporates `is_force_closed` and `is_active` flags.
  - `OrderCreateSerializer.validate()` in `backend/orders/serializers.py` blocks order creation on closed restaurants/branches with HTTP 400 (`"...is currently closed and not accepting orders."`).
  - `app/src/screens/RestaurantScreen.tsx` helper `isRestaurantOpen()` evaluates restaurant/branch status. Displays top red banner `"CLOSED NOW — STORE IS CURRENTLY CLOSED FOR ORDERS"`, locks menu item `ADD` buttons with grayed-out `"CLOSED"` badges, and blocks `handleAddToCart` / `handleIncrement` actions.
  - Unit tests in `orders/test_challenger2.py` verify open store order creation, force-closed store blocking, inactive store blocking, and outside operating hours window blocking.

- **Server-Side Atomic Coupon Validation & Increment (Task 3)**:
  - `OrderCreateSerializer.validate()` in `backend/orders/serializers.py` checks promo code validity (`is_valid()`), date range, total usage limit (`times_used < usage_limit`), restaurant matching, minimum subtotal requirements, and per-user limits via `CouponUsage` records.
  - `OrderCreateSerializer.create()` inside `transaction.atomic()` updates coupon usage atomically using SQL F-expression:
    `Coupon.objects.filter(pk=coupon.pk, is_active=True, times_used__lt=F('usage_limit')).update(times_used=F('times_used') + 1)`
    Raises `ValidationError` if update returns 0 and `usage_limit > 0`. Creates a `CouponUsage` entry linking coupon, user, and order.
  - `POST /api/coupons/validate/` endpoint in `promotions/views.py` allows pre-validation during mobile checkout in `CheckoutScreen.tsx`.
  - Unit tests in `orders/tests.py` and `orders/test_challenger2.py` verify valid coupon discount calculations, expired code rejection, usage limit exhaustion rejection, minimum subtotal check, per-user limit check, and atomic counter incrementation.

- **Backend Test Suite Execution (Task 4)**:
  - Executed command: `.\venv\Scripts\python.exe manage.py test` inside `backend/`.
  - Execution Result: `Ran 20 tests in 22.955s — OK` (100% pass rate across 20 test cases).

## 2. Logic Chain
1. **Mathematical Consistency**: Python `haversine_distance` and TypeScript `calculateHaversineDistance` use identical radius ($R = 6371$ km) and trigonometric logic, ensuring client-side predictions align perfectly with server-side validation.
2. **Race-Condition Safety**: Incrementing `times_used` using `F('times_used') + 1` inside an atomic transaction pushes the row update down to the database engine, avoiding race conditions where concurrent requests could bypass usage limits.
3. **Dual-Layer Protection**: Operating hours and delivery radius checks are implemented on both mobile UI (UX protection preventing invalid submissions) and DRF serializers (hard security enforcement preventing API tampering).
4. **No Integrity Violations**: No hardcoded test stubs, facade implementations, or bypasses were found in the codebase. All logic executes real calculation and database state changes.

## 3. Caveats
- Time calculations depend on the server system clock configured with Django's `TIME_ZONE = 'Asia/Karachi'`.
- Client-side radius detection requires GPS permissions enabled on the user's mobile device; if GPS is unavailable, user manually inputs address and backend performs fallback geocoding/keyword resolution.

## 4. Conclusion
**VERDICT: PASS (APPROVE)**

Milestone 2 (R2) implementation for Delivery Radius, Operating Hours, and Server-Side Atomic Coupons meets all design specifications, passes all 20 backend unit tests, and exhibits high code quality without facade implementations or security flaws.

## 5. Verification Method
1. Run Django backend unit test suite:
   ```powershell
   cd "d:\sitesdata\Resturent App\backend"
   .\venv\Scripts\python.exe manage.py test
   ```
   Confirm all 20 tests pass with `OK`.

2. Test Delivery Radius API Validation:
   ```http
   POST /api/orders/
   {
     "restaurant": 1,
     "delivery_address": "Kasur City",
     "delivery_lat": 31.1179,
     "delivery_lng": 74.4459,
     "items": [{"menu_item": 1, "quantity": 1}],
     "guest_name": "Test",
     "guest_phone": "03001234567"
   }
   ```
   Verify HTTP 400 with message `"Delivery address is outside our service area..."`.

3. Test Operating Hours API Validation:
   Set `is_force_closed = True` on Restaurant model and attempt `POST /api/orders/`. Verify HTTP 400 `"is currently closed"`.

4. Test Atomic Coupon Counter:
   Place order with `coupon_code: "WELCOME10"`. Inspect DB to verify `times_used` on `Coupon` model increments by 1.
