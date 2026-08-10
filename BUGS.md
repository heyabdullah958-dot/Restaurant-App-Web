# 🐛 BUGS.md — GetFood Platform Bug Log

## Resolved Bugs Log

### Bug #1: HTTP 404 Error on Save Coupon in Admin Panel (Resolved 2026-07-27)
- **Symptom**: Clicking 'Save Coupon' in the Super Admin Promo Code modal triggered a browser alert popup: HTTP 404.
- **Root Cause**: admin/src/services/api.ts called POST /api/coupons/, but backend/promotions/urls.py only contained /api/coupons/validate/ and /api/coupons/active/ without any list/create/update/delete CRUD views registered.
- **Fix Applied**:
  - Implemented CouponListCreateView and CouponDetailView in backend/promotions/views.py.
  - Registered path('coupons/', ...) and path('coupons/<int:pk>/', ...) in backend/promotions/urls.py.
  - Updated admin/src/services/api.ts to call /api/coupons/ with optional scope filtering.
  - Verified with test_promo_engine.py (100% Pass Rate).

---

### Bug #2: Missing Branch Scoping on Promo Code Model & Validation (Resolved 2026-07-27)
- **Symptom**: Promos could only be global or scoped to a restaurant, preventing individual branches from running localized promo campaigns.
- **Root Cause**: Coupon model in backend/promotions/models.py only had a restaurant ForeignKey, missing a branch ForeignKey.
- **Fix Applied**:
  - Added branch ForeignKey to Coupon model and generated migration promotions.0003_coupon_branch.
  - Updated CouponValidateSerializer and OrderCreateSerializer to enforce branch-specific validation.
  - Added Scope Selector UI in admin/src/views/PromoManagement.tsx allowing Global, Specific Restaurant, or Specific Branch configuration.

---

### Bug #3: Unauthenticated Mutation Risk on Coupons & Flash Deals (Resolved 2026-08-10)
- **Symptom**: `CouponListCreateView`, `CouponDetailView`, `FlashDealListCreateView`, and `FlashDealDetailView` endpoints permitted unauthenticated write operations (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Root Cause**: `permission_classes = [permissions.AllowAny]` was specified without method-level overrides.
- **Fix Applied**: Updated `get_permissions()` across all promotion management views to strictly require `permissions.IsAdminUser` for mutation methods.

---

### Bug #5: Orders Tab Shows Login/Signup Guard Screen After Successful Guest Order (Resolved 2026-08-10)
- **Symptom**: User places an order successfully (confirmation screen displays order ID), but navigating to track the order via the "Orders" tab shows a "Sign in to see your order history" / Login-Signup prompt instead of order tracking details.
- **Part 12 Stuck-Loop Investigation & Root Causes**:
  - **Step 1-3 Deploy Chain Root Cause**: `app/app.json` has `updates.enabled: false` (OTA updates via `eas update` are disabled). Code fixes committed to git previously were never published into a new release APK or pushed to the device via active Expo Metro development server, leaving test devices running older pre-built bundles.
  - **Step 4 Application Logic Root Cause**: `OrdersScreen.tsx` unconditionally rendered the Login/Signup fallback UI whenever `!isAuthenticated || !user || user.is_guest` evaluated to true. It completely ignored active guest order tracking tokens stored in `AsyncStorage` (`@getfood_active_guest_order`, `guest_tracking_token`).
- **Fix Applied**:
  - Refactored `OrdersScreen.tsx` to asynchronously fetch active guest order credentials from `AsyncStorage` (`@getfood_active_guest_order`, `guest_tracking_token`, `foodsphere_guest_active_order_id`) when unauthenticated or in guest mode.
  - Added live guest order card rendering directly inside `OrdersScreen.tsx` with 1-tap "Track" and "Details" navigation.
  - Added a fallback "🔍 Track Order by ID / Code" input bar for guest users without an active local token.
- **Verification Evidence**: Compiled `app/` via `npx tsc --noEmit` (0 TypeScript errors, code 0) and verified backend `/api/orders/track/` endpoint via `test_backend_local.py` (23/23 tests passed, code 0).



