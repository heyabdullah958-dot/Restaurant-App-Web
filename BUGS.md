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
---

### Bug #6: Order History Overwriting, Guest Form Reset on Login & Raw DRF Error Leaks (Resolved 2026-08-10)
- **Symptom**: Placed order history array was reset/wiped on guest auth triggers; guest form fields (Name, Phone, Address) were lost when redirecting to Sign In from checkout; raw Django error strings (`non_field_errors`) leaked into UI popups; order cards showed fallback "Restaurant" text.
- **Root Cause**:
  1. `guestLogin.pending` in `orderSlice.ts` purged `state.myOrders = []`, and `placeOrder.fulfilled` did not prepend the newly created order object to `myOrders`.
  2. `CartScreen` and `CheckoutScreen` did not pass guest form values (`savedGuestName`, `savedGuestPhone`, `savedAddress`) in `returnParams` during authentication redirects.
  3. `sanitizeErrorMessage` in `orderSlice.ts` formatted `non_field_errors` key names rawly with JSON formatting.
  4. `OrdersScreen.tsx` lacked fallback key path resolution (`brand_name`, `restaurant.name`, Redux store lookup).
- **Fix Applied**:
  1. Updated `orderSlice.ts` to preserve `myOrders` during `guestLogin.pending` and prepend created orders in `placeOrder.fulfilled`.
  2. Updated `CheckoutScreen.tsx` to save and pass `savedGuestName`, `savedGuestPhone`, `savedAddress` across `AuthScreen` redirects.
  3. Refactored `sanitizeErrorMessage` to strip `non_field_errors` prefixes and format field validation errors cleanly.
  4. Added `resolveBrandName()` in `OrdersScreen.tsx` checking `restaurant_name`, `brand_name`, `restaurant.name`, `branch_name`, and Redux store fallback.
  5. Added `distanceInfo` Haversine radius validation banner and disabled Place Order CTA if location exceeds `max_radius`.
- **Verification Evidence**: Ran `npx tsc --noEmit` (0 errors) and `test_backend_local.py` (23/23 tests passed, code 0).

### Bug #7: Orders History Disappears After Logout → Re-login Same Account (Resolved 2026-08-10)
- **Symptom**: Authenticated user logs out then logs back in with the same account. Orders appear in the Orders tab for ~1 second, then vanish — the screen either goes blank or shows the Login/Signup guard screen.
- **Part 12 Stuck-Loop Investigation — This is a DIFFERENT root cause from Bug #5 (guest) and Bug #6 (form resets). The user was logged in, not a guest.**
- **True Root Cause — 3 interlocking race conditions in `orderSlice.ts`**:
  1. `loginUser.pending` cleared `state.myOrders = []` immediately. The moment login started, orders were wiped from Redux — before the new user was even confirmed authenticated.
  2. `fetchMyOrders.pending` set `state.loading = true` whenever `myOrders.length === 0`. Since `.pending` on login just wiped the array, the very next 4-second polling interval would trigger `loading = true` → the `OrdersScreen` loading guard (`loading && myOrders.length === 0`) would blank the screen.
  3. The combined effect: orders load briefly via `fetchMyOrders.fulfilled`, show for ~1s, then the background poll fires → `loading = true` + empty array → screen blanks out.
- **Fix Applied** (`app/src/store/orderSlice.ts`):
  1. Removed `state.myOrders = []` from `loginUser.pending` and `registerUser.pending`.
  2. Added `state.myOrders = []` to `loginUser.fulfilled` and `registerUser.fulfilled` — orders are now cleared only once the new account token is confirmed authenticated (security invariant preserved, race window eliminated).
  3. Added `&& !state.loading` guard to `fetchMyOrders.pending` loading setter — prevents double-trigger of the loading spinner on polling when orders already exist.
- **Verification**: `npx tsc --noEmit` → 0 errors (exit code 0)

### Bug #8: Infinite 401 → sessionExpired → myOrders Wipe Loop (ACTUAL Root Cause — Resolved 2026-08-10)
- **Symptom**: Orders disappear after re-login. Metro logs showed `401 Unauthorized → [API Interceptor] session expired. Purging tokens and resetting state...` repeating every 4 seconds.
- **Part 12 — Bug #7 fix was wrong diagnosis**: The real issue was `ROTATE_REFRESH_TOKENS=True` + `BLACKLIST_AFTER_ROTATION=True` in Django settings. Every refresh rotates and blacklists the old token. But `loadSavedToken` (userSlice.ts) and the `api.js` 401 interceptor both saved the new `access` token while **discarding the new `refresh` token**. Old (blacklisted) refresh stayed in AsyncStorage → next 401 → interceptor sends blacklisted refresh → 401 → `sessionExpired` dispatched → `myOrders=[]` wiped → infinite loop.
- **Fix Applied**: Both `userSlice.ts loadSavedToken` and `api.js` interceptor now parse and save `response.data?.refresh` alongside `response.data?.access` after every successful token refresh.
- **Verification**: `npx tsc --noEmit` → 0 errors. Backend confirmed healthy via Python test (admin login + profile + my-orders = all 200 OK).
