
# Changelog

## 2026-07-26 System Audit, Security Hardening & Edge-Case Bug Fixes (Release v26)
- **Price Modifier Tampering Protection**: Re-validated option price modifiers in `OrderCreateSerializer` strictly against `MenuItem.options` stored in DB, ignoring negative client payloads (`-1000`).
- **Loyalty Points Atomic Balance Check & Double-Spend Safeguard**: Enforced atomic deduction with `User.objects.filter(pk=user.pk, loyalty_points__gte=actual_pts_redeemed).update(...)`.
- **Order Cancellation Loyalty Reversals**: Automatically refunded redeemed points to user balance (`F('loyalty_points') + points`) and reverted earned points on order cancellation in `OrderDetailView`.
- **Branch-Specific Out-of-Stock Override System**: Created `BranchMenuItemAvailability` model and `BranchItemAvailabilityView` endpoint (`POST /api/restaurants/branch-item-availability/`), updating `MenuItemSerializer` to check branch overrides.
- **Order Status State Machine Matrix**: Implemented strict transition matrix validation in `OrderDetailView.update()` preventing invalid state jumps (e.g. `delivered` -> `preparing`).
- **Guest Order Auto-Linkage on Registration**: Automatically linked past guest orders matching phone number on new user account creation in `UserRegisterView`.
- **Real-Time Web Audio Chime in Admin Panel**: Integrated Web Audio API synthesized dual-tone bell chime (`880Hz` + `1760Hz`) triggered on new incoming orders (`pending`/`received`) during 5s polling loop in `AdminContext.tsx`.
- **Mobile App Render Hotfix**: Resolved `Property 'availablePoints' doesn't exist` crash on `CheckoutScreen.tsx`.
- **Production Heroku Release v26**: Successfully deployed to production Heroku (`https://getfoodpk-fd9b20442fcf.herokuapp.com`) applying migrations `orders.0008`, `promotions.0001`, `restaurants.0009`, and `users.0004`.
- **Automated Verification**: Expanded `test_backend_local.py` to 11 test suites with 100% pass rate.

## 2026-07-26 Phase 1 Gap & Phase 2 Business Logic Implementation
- **Phase 1 Gap — Assigned Rider Contact**: Added interactive Delivery Rider Contact Card to `TrackingScreen.tsx` with one-tap `tel:` call and `wa.me` WhatsApp messaging for assigned riders.
- **P2-A — Platform Settings Super-Admin Control**: Created `PlatformSettingsView` DRF endpoint (`GET` & `PATCH /api/restaurants/platform-settings/`) and built dark-themed Global Platform Settings management UI in `SuperDashboard.tsx` for real-time control over loyalty earn rates, redemption values, and welcome bonuses.
- **P2-B — Customer Ratings & Reviews Integration**: Connected backend `RestaurantReviewViewSet` to mobile app `RestaurantScreen.tsx` (displaying customer ratings and comments) and added post-delivery rating prompt card in `TrackingScreen.tsx` (persisted per order via `AsyncStorage`).
- **P2-C — Registration Welcome Bonus Exposing**: Configured registration welcome bonus notification toast on `AuthScreen.tsx` and verified point transaction logs on `RewardsScreen.tsx`.

## 2026-07-24 Out-of-Stock Item Propagation Fix
- Updated `MenuCategorySerializer` in Django REST Framework to return all menu items (including `is_available = False`).
- Updated Mobile App (`RestaurantScreen.tsx`) to render out-of-stock items with a red **"OUT OF STOCK"** badge, reduced card opacity, and a disabled button.
- Added guard logic in `handleAddToCart()` to prevent ordering out-of-stock items.
- Configured Heroku monorepo deployment pipeline using `git subtree push --prefix backend heroku main`.

## 2026-07-17 Updates
- Fixed MapScreen crash caused by hooks conditionality.
- Fixed Guest Customer bug on AuthScreen after real logins.
- Implemented FALLBACK_RESTAURANTS in HomeScreen to handle offline category filtering.
- Cleaned up POPULAR_SEARCHES in SearchScreen to match active phase 1 brands.

## 2026-07-21 Updates
- Multi-tenant Branch Manager feature deployed to production on Render & Cloudflare.
- Updated `create_restaurant_managers` command to dynamically seed branch-specific staff users & profiles.
- Integrated Cloudinary storage (`depa8gfnk`) for persistent media uploads.
- Processed Tandoori Stop brand guideline PDF & photos: uploaded primary logo, cover/banner, and 17 high-res food photos to Cloudinary, linking 41 MenuItems.
- Created `seed_tandoori_images` management command and integrated it into `render.yaml` build pipeline.
- Added interactive **Branch Settings** modal in Admin Panel (`BranchDashboard.tsx` & `AdminContext.tsx`) allowing managers to update WhatsApp numbers, locations, and active status in real time.
- Enhanced Mobile App (`CheckoutScreen`, `OrderConfirmationScreen`, `TrackingScreen`) with assigned branch indicators.
- Upgraded Instagram feed integration for GetAFomo website (`websites/getafomo/index.html`).
- Ran automated integration test suite `test_backend_local.py` (100% pass rate across all 3 active launch brands).

## 2026-07-22 Production Backend Readiness Updates
- Implemented 3-tier multi-tenant manager hierarchy (Super Admin -> Restaurant Manager -> Branch Manager).
- Seeded real branch data for Tandoori Stop (Johar Town, Lake City, GT Road Baghbanpura) and dummy branch structures for Jush & GetAFomo via `seed_branches`.
- Integrated dual email notifications on order creation (Detailed HTML/Text email to Branch Manager + Summary email to Restaurant Manager).
- Implemented area-based keyword matching in `resolve_branch_for_order` for customer delivery address auto-assignment.
- Created public/manager `GET /api/branches/` endpoint and `/api/managers/` endpoint routing.
- Built and passed 100% automated end-to-end integration test suite `test_order_flow_e2e.py`.
## 2026-07-22 Minified React Error #310 Resolution & Phase 1 Launch Scope Filtering
- Fixed React Hook ordering rule violations across Admin Panel views (`BranchDashboard.tsx`, `OrderManagement.tsx`, `MenuManagement.tsx`).
- Resolved production dashboard crash ("Dashboard Encountered an Issue / Minified React error #310") by ensuring `useState` and `useMemo` hooks execute unconditionally before early returns.
- Restricted Super Admin Console (`AdminContext.tsx`, `Sidebar.tsx`, `SuperDashboard.tsx`, `TenantManagement.tsx`) to strictly display Phase 1 launch brands: **Tandoori Stop**, **Jush**, and **Get A Fomo**. All non-launch brands (*SeenBanao*, *DineAtBlue*, *SandMelts*, *BirdmanFoodsPK*) are hidden across all Super Admin selectors, metrics cards, and registries.
- Expanded `MOCK_MANAGERS` in `ManagerManagement.tsx` to list all 10 branch manager accounts across all branches of Tandoori Stop, Jush, and Get A Fomo.
- Built and verified production bundle (`npm run build` -> `dist/assets/index-DW_z81fs.js`).

## 2026-07-26 Manager & Super Admin Security & Accountability Governance Updates
- **Purge Orders Endpoint Lockdown**: Secured `POST /api/orders/purge-all/` behind `IsSuperUser` permission. Branch managers attempting to purge orders now receive HTTP 403 Forbidden.
- **API Audit Logging Middleware**: Created `APIAuditMiddleware` (`backend/config/audit_middleware.py`) to automatically record staff API mutations (POST, PUT, PATCH, DELETE) in `AdminAuditLog` with client IP, user, endpoint, and sanitized request body.
- **Daily EOD Cash Register**: Created `BranchCashRegister` model and `BranchCashRegisterView` / `VerifyCashRegisterView` endpoints (`/api/orders/cash-register/`) allowing Branch Managers to log end-of-day COD cash collected vs turned over, with Super Admin confirmation.
- **Order Cancellation Safeguards**: Implemented mandatory `cancellation_reason` validation and `cancelled_by` user recording on order cancellation. Blocked non-superusers from cancelling `delivered` orders.
- **Auth & Session Security**: Added `must_change_password` and `password_changed_at` fields to `User` model, updated JWT token payload, and created `/api/users/change-password/` endpoint for mandatory first-login password updates.
- **React Admin UI Upgrades**: Integrated Cancellation Reason Modal in `OrderManagement.tsx` and updated `AdminContext.tsx` status handlers.
- **Automated Verification**: Ran expanded integration test suite in `test_backend_local.py` with 100% pass rate.



