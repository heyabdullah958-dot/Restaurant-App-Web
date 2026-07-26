## 2026-07-26T14:14:50Z
<USER_REQUEST>
You are Explorer 2 for Milestone 2 (R2: Core Operations & Backend Wiring).
Your working directory is: d:/sitesdata/Resturent App/.agents/explorer_m2_2
Project plan: d:/sitesdata/Resturent App/.agents/orchestrator/plan.md

Objective:
Investigate and design Delivery Radius Enforcement and Operating Hours Enforcement.

Tasks:
1. Examine `Branch` model, `Restaurant` model, `OrderCreateSerializer` (`backend/orders/serializers.py`), and mobile app `CheckoutScreen.tsx` & `RestaurantScreen.tsx`.
2. Delivery Radius Enforcement:
   - Verify `delivery_radius_km` field on `Branch` model (default e.g. 5.0 or 10.0 km).
   - Implement Haversine distance formula in Python to calculate distance between customer delivery lat/lng and branch lat/lng.
   - Enforce server-side check in `OrderCreateSerializer.validate()`: return HTTP 400 validation error if distance > `branch.delivery_radius_km`.
   - Add client-side distance check in `CheckoutScreen.tsx`.
3. Operating Hours Enforcement:
   - Add dynamic serializer property `is_currently_open` to `RestaurantSerializer` and `BranchSerializer` by comparing current server time against `opening_time` and `closing_time`.
   - In `RestaurantScreen.tsx`: display "CLOSED NOW" banner when `is_currently_open` is False, and disable/lock "Add to Cart" and "Checkout" buttons.
4. Document exact calculations, code routes, and step-by-step changes in `d:/sitesdata/Resturent App/.agents/explorer_m2_2/analysis.md` and `handoff.md`. Communicate completion to parent.
</USER_REQUEST>
