# Progress Log — Milestone 2 (Worker 2)
Last visited: 2026-07-26T19:23:00Z

- [x] Task 1: Rider Management System & WhatsApp Dispatch
  - Django models `BranchRider` & `Order.rider` created and migrated.
  - DRF endpoints `/api/admin/riders/` and `/api/orders/<id>/assign-rider/` implemented.
  - Admin UI `RiderManagement.tsx` created, registered in `App.tsx` and `Sidebar.tsx`.
  - Order cards in `OrderManagement.tsx` updated with rider assignment dropdown and WhatsApp dispatch pre-filled link generator (`https://wa.me/<phone>?text=...`).
- [x] Task 2: Delivery Radius Enforcement
  - Added `latitude`, `longitude`, `delivery_radius_km` to `Branch` model.
  - Updated `resolve_branch_for_order` in `admin_utils.py`.
  - Implemented Haversine distance validation in `OrderCreateSerializer.validate()` returning HTTP 400 if outside radius.
  - Added client-side location detection and Haversine distance check in `app/src/screens/CheckoutScreen.tsx`.
- [x] Task 3: Store Operating Hours Enforcement
  - Added dynamic `is_currently_open` property to `RestaurantSerializer`, `RestaurantDetailSerializer`, `BranchSerializer`, `BranchListView`.
  - Enforced store operating hours in `OrderCreateSerializer.validate()`.
  - Updated `app/src/screens/RestaurantScreen.tsx` with top red "CLOSED NOW" banner and locked menu item ADD buttons & cart actions when closed.
- [x] Task 4: Coupon Validation & Atomic Counter Increments
  - Added `times_used` field to `Coupon` model and migrated database.
  - Enforced active window, subtotal minimum, total usage limit (`times_used < usage_limit`), and per-user limit in `CouponValidateSerializer` & `OrderCreateSerializer`.
  - Implemented atomic increment `F('times_used') + 1` and `CouponUsage` record logging in `OrderCreateSerializer.create()`.
  - Built promo code input card in `app/src/screens/CheckoutScreen.tsx` wired to `POST /api/coupons/validate/`.
- [x] Task 5: Testing & Handoff
  - Ran backend unit test suite (`.\venv\Scripts\python.exe manage.py test`) — 13/13 tests passed.
  - Written self-contained handoff report in `d:/sitesdata/Resturent App/.agents/worker_m2/handoff.md`.
