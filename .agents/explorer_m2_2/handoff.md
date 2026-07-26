# HANDOFF REPORT: Delivery Radius & Operating Hours Enforcement Design

**Milestone**: Milestone 2 (R2: Core Operations & Backend Wiring)  
**Agent**: Explorer 2 (`explorer_m2_2`)  
**Working Directory**: `d:/sitesdata/Resturent App/.agents/explorer_m2_2`  
**Plan Reference**: `d:/sitesdata/Resturent App/.agents/orchestrator/plan.md`  

---

## 1. Observation

### Key Codebase Observations:

1. **`Branch` & `Restaurant` Models (`backend/restaurants/models.py`)**:
   - `Restaurant` (lines 3-39) contains `opens_at` (`TimeField`), `closes_at` (`TimeField`), `is_active` (`BooleanField`), `is_force_closed` (`BooleanField`), and `is_open` (`@property`).
   - `Branch` (lines 41-63) contains `restaurant`, `name`, `address`, `phone`, `is_active`, `area_keywords`.
   - **Gap Identified**: `Branch` model currently lacks explicit DB fields for `delivery_radius_km`, `latitude`, and `longitude`.

2. **Haversine Distance Resolution (`backend/config/admin_utils.py`)**:
   - `haversine_distance(lat1, lon1, lat2, lon2)` (lines 34-50) is fully implemented in Python using $R = 6371.0\text{ km}$.
   - `BRANCH_COORDINATES` dictionary (lines 54-63) maps branch area strings (`johar town`, `lake city`, `gt road baghbanpura`, `dha`, `gulberg`, `saddar`) to fallback (latitude, longitude) tuples.
   - `resolve_branch_for_order(restaurant, delivery_address, delivery_lat, delivery_lng)` (lines 66-126) resolves nearest active branch based on Haversine distance or address keyword match.

3. **Order Validation (`backend/orders/serializers.py`)**:
   - `OrderCreateSerializer.validate()` (lines 48-132) validates phone, guest name, item availability (`is_available`), and minimum order amount (`min_order_amount`).
   - **Gap Identified**: Currently lacks a distance radius validation check against `branch.delivery_radius_km`.

4. **Mobile App Screens (`app/src/screens/CheckoutScreen.tsx` & `RestaurantScreen.tsx`)**:
   - `CheckoutScreen.tsx` (lines 108-148) supports `handleDetectLocation()` using `expo-location`, fetching customer `latitude` & `longitude`.
   - `RestaurantScreen.tsx` (lines 41-55) defines `isRestaurantOpen()` to verify `is_force_closed` and branch activity status.
   - **Gap Identified**: `RestaurantScreen.tsx` does not consume server-calculated `is_currently_open` property, and `CheckoutScreen.tsx` lacks client-side distance check prior to order placement.

---

## 2. Logic Chain

1. **Delivery Radius Enforcement**:
   - **Premise 1**: Customer delivery latitude and longitude are submitted in `OrderCreateSerializer` and detected in `CheckoutScreen.tsx`.
   - **Premise 2**: Branches have specific physical locations (`latitude`, `longitude`) and service radius (`delivery_radius_km`).
   - **Reasoning**: By integrating `haversine_distance()` into `OrderCreateSerializer.validate()`, the server can compute the exact great-circle distance between `(delivery_lat, delivery_lng)` and the assigned branch `(branch_lat, branch_lng)`.
   - **Deduction**: If computed distance > `branch.delivery_radius_km`, raising a DRF `serializers.ValidationError(400)` guarantees server-side security. Adding a matching Haversine calculation on `CheckoutScreen.tsx` prevents unnecessary API requests by failing early on the client.

2. **Operating Hours Enforcement**:
   - **Premise 1**: Operating hours (`opens_at`, `closes_at`) are stored on the `Restaurant` model, while branch active statuses are managed dynamically.
   - **Premise 2**: Restaurants may operate standard hours ($opens\_at \le closes\_at$) or overnight hours ($opens\_at > closes\_at$, e.g., 6 PM to 2 AM).
   - **Reasoning**: A dynamic property `is_currently_open` evaluated on DRF serializers (`RestaurantSerializer`, `BranchSerializer`) comparing `timezone.localtime().time()` against opening/closing time bounds provides a real-time status flag.
   - **Deduction**: `RestaurantScreen.tsx` can consume `is_currently_open` to display a "CLOSED NOW" banner and lock "ADD" buttons and checkout actions, preventing orders from being submitted when restaurants are closed.

---

## 3. Caveats

- **Geolocation Availability**: If a customer inputs a plain text address without GPS coordinates (`delivery_lat` / `delivery_lng` are `None`), distance radius calculation cannot run. In this case, backend falls back to area keyword matching in `resolve_branch_for_order()`.
- **Timezone Alignment**: Server time must use `django.utils.timezone.localtime().time()` configured to local timezone (`Asia/Karachi` / `PKT`) to avoid UTC offset discrepancies during opening hours checks.

---

## 4. Conclusion & Actionable Steps

### Concrete Code Modifications Required:

1. **`backend/restaurants/models.py`**:
   Add `latitude`, `longitude`, and `delivery_radius_km` fields to `Branch` model:
   ```python
   latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
   longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
   delivery_radius_km = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
   ```

2. **`backend/restaurants/serializers.py`**:
   Add `is_currently_open` `SerializerMethodField` to `BranchSerializer`, `RestaurantSerializer`, and `RestaurantDetailSerializer`.

3. **`backend/restaurants/views.py`**:
   Update `BranchListView` dictionary serialization to output `delivery_radius_km`, `latitude`, `longitude`, and `is_currently_open`.

4. **`backend/orders/serializers.py`**:
   In `OrderCreateSerializer.validate()`, run `haversine_distance()` check against `branch.delivery_radius_km` when `delivery_lat` and `delivery_lng` are present. Raise DRF 400 error if exceeded.

5. **`app/src/screens/CheckoutScreen.tsx`**:
   Add client-side Haversine helper and check before order dispatch in `handlePlaceOrder()`.

6. **`app/src/screens/RestaurantScreen.tsx`**:
   Check `is_currently_open` flag, display "CLOSED NOW" top banner when closed, lock menu item "ADD" buttons, and disable cart bar.

---

## 5. Verification Method

To independently verify these designs after implementation:

1. **Server-Side Distance Radius Test**:
   ```bash
   python backend/manage.py test orders.tests.OrderTestCase
   ```
   Or via curl / POST to `/api/orders/` with `delivery_lat`: `31.5800`, `delivery_lng`: `74.4000` (outside Johar Town 5km radius). Verify response is HTTP 400 with message stating delivery location exceeds radius.

2. **Operating Hours Test**:
   - Query `/api/restaurants/jushhpk/` via DRF API browser or curl.
   - Verify `is_currently_open` field is present in response JSON.
   - Set `opens_at = 08:00:00` and `closes_at = 09:00:00` in Django admin. Verify `is_currently_open: false`.
   - Open Expo Mobile App on `RestaurantScreen.tsx` for JushhPK. Verify "CLOSED NOW" banner appears and "ADD" buttons are disabled.
