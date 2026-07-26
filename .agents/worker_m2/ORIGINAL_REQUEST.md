## 2026-07-26T19:15:59Z
You are Worker 2 for Milestone 2 (R2: Core Operations & Backend Wiring).
Your working directory is: d:/sitesdata/Resturent App/.agents/worker_m2
Project plan: d:/sitesdata/Resturent App/.agents/orchestrator/plan.md

Explorer handoffs to review:
- d:/sitesdata/Resturent App/.agents/explorer_m2_1/handoff.md (Rider System & WhatsApp dispatch)
- d:/sitesdata/Resturent App/.agents/explorer_m2_2/handoff.md (Delivery radius & operating hours)
- d:/sitesdata/Resturent App/.agents/explorer_m2_3/handoff.md (Coupons & atomic counter increments)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks for Milestone 2:
1. Rider Management System:
   - Create `BranchRider` model (`branch`, `name`, `phone`, `vehicle_type`, `status`, `is_active`, `created_at`) and add `rider` FK to `Order` model in Django backend.
   - Create DRF serializers & ViewSets for `BranchRider` CRUD and order rider assignment endpoint `POST /api/orders/<id>/assign-rider/`.
   - Build Admin HQ Riders management view (`admin/src/views/RiderManagement.tsx`), add Riders tab to `Sidebar.tsx` and `AdminContext.tsx`, and add rider assignment modal to `BranchDashboard.tsx` / `OrderManagement.tsx`.
   - Implement pre-filled WhatsApp dispatch URL generator (`https://wa.me/<phone>?text=...`) for riders with full order details, delivery address, and total amount.
2. Delivery Radius Enforcement:
   - Ensure `latitude`, `longitude`, `delivery_radius_km` on `Branch` model.
   - Implement Haversine distance formula validation in `OrderCreateSerializer.validate()`: return HTTP 400 if customer distance exceeds `branch.delivery_radius_km`.
   - Add client-side radius check in `app/src/screens/CheckoutScreen.tsx`.
3. Operating Hours Enforcement:
   - Implement dynamic property `is_currently_open` (boolean) on `RestaurantSerializer` and `BranchSerializer` based on current server time vs `opening_time` and `closing_time`.
   - Update `app/src/screens/RestaurantScreen.tsx` to show a top "CLOSED NOW" banner when `is_currently_open` is False, and disable/lock item "ADD" and "Checkout" buttons.
4. Coupon Validation & Atomic Counter Increments:
   - Ensure `Coupon` model has `times_used` field (default=0) and `usage_limit`.
   - Enforce server-side coupon validation in `OrderCreateSerializer.validate()` (active status, date window, minimum order amount, usage limit).
   - Implement atomic counter increment in `OrderCreateSerializer.create()` using `F('times_used') + 1`.
   - Wire promo code input card in `app/src/screens/CheckoutScreen.tsx`.
5. Testing & Handoff:
   - Run backend tests (`python manage.py test` or backend integration test suite).
   - Document all changes, test commands, and execution results in `d:/sitesdata/Resturent App/.agents/worker_m2/handoff.md` and communicate completion to parent.
