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

### Feature / Architecture Upgrade #9: Restrict Guest Order Placement & Checkout Form Preservation (Completed 2026-08-10)
- **Objective**: Eliminate guest order creation pathways across mobile app and backend while maintaining frictionless guest browsing and form state preservation.
- **Frontend Changes**:
  - `CartScreen.tsx`: Direct navigation to `CheckoutScreen` without intrusive upfront auth popups.
  - `CheckoutScreen.tsx`: Intercepted `Place Order` button execution for `!isAuthenticated` or `user.is_guest` with a user-friendly modal ("Sign In Required to Complete Order").
  - Form State Preservation: Saved all checkout input fields (`savedGuestName`, `savedGuestPhone`, `savedAddress`, `savedInstructions`, `savedBranchId`, `savedFulfillmentMode`, `savedTableNumber`, `savedPaymentMethod`, `savedIsScheduled`, `savedSchedDate`, `savedSchedTime`, `savedUseLoyaltyPoints`, `savedPromoCode`) to `AsyncStorage` (`@getfood_checkout_saved_form`) and passed as `returnParams` to `AuthScreen`.
  - Form State Auto-Population: Added post-auth hydration effect restoring all saved form fields automatically upon returning to `CheckoutScreen`.
- **Backend Changes**:
  - `backend/orders/views.py`: Enforced `permissions.IsAuthenticated()` on POST `/api/orders/`.
  - `backend/orders/serializers.py`: `OrderCreateSerializer.validate()` rejects anonymous or guest user order creation with `401 / 400` validation error ("Account registration is required to place an order. Please sign in or register.").
- **Verification**: `npx tsc --noEmit` → 0 errors (exit code 0).

### Bug #10: HTTP 500 Internal Server Error & Raw Toast Output on Order Submission (Resolved 2026-08-10)
- **Symptom**: Submitting an order post-login with auto-restored guest details triggered an alert: "Checkout Error: An internal server error occurred" and bottom toast: `[placeOrder] Error (500): {"success":false,...}` with Expo RedBox popup.
- **Root Cause**:
  1. `backend/orders/serializers.py`: `Order.objects.create(user=user, subtotal=..., **validated_data)` passed `user=user` explicitly while `validated_data` ALREADY contained `'user': user`. In Python, passing duplicate kwargs raises `TypeError: Order.objects.create() got multiple values for keyword argument 'user'`, triggering an unhandled HTTP 500 Exception on Django REST Framework.
  2. `app/src/store/orderSlice.ts`: Line 37 called `console.error` with raw `JSON.stringify(error.response.data)`, which Expo RedBox caught as an unhandled console error frame.
- **Fix Applied**:
  1. Removed duplicate `user=user` keyword parameter from `Order.objects.create` in `backend/orders/serializers.py`.
  2. Refactored `orderSlice.ts` error handling to log DEV warnings via `console.warn` (suppressing RedBox) and sanitize HTTP 500 responses into clean user-friendly alerts.
- **Verification**: `npx tsc --noEmit` → 0 errors. Python API test confirmed order placement succeeds with HTTP 201/200 OK.

---

### Bug #11: Mobile Admin App TypeScript Build Verification Errors (Resolved 2026-08-13)
- **Symptom**: `npx tsc --noEmit` flagged missing `fetchBranches` exported function in `api.ts`, implicit `any` parameter `list` in `ManagerManagementScreen.tsx`, and unimported `Platform` symbol in `PromoManagementScreen.tsx`.
- **Root Cause**: Strict React Native TypeScript compilation rules (`noImplicitAny`) and missing `Platform` import from `react-native`.
- **Fix Applied**:
  1. Added `fetchBranches(restaurantId?: number)` helper to `admin-app/src/services/api.ts`.
  2. Added `: any` type annotation to `fetchBranches(selectedRestId).then((list: any) => ...)` in `ManagerManagementScreen.tsx`.
  3. Imported `Platform` from `react-native` in `PromoManagementScreen.tsx`.
- **Verification**: `npx tsc --noEmit` → Exit code 0 (0 compilation errors across all 12 views in `admin-app`).

---

### Bug #12: Price Tampering Test Authentication Failure in Integration Test Suite (Resolved 2026-08-13)
- **Symptom**: `test_backend_local.py` reported `Testing Price Modifier Tampering Protection... [FAILED] Price Tampering Test request failed: 401`.
- **Root Cause**: In invariant 25 (`GEMINI.md`), POST `/api/orders/` requires authentication (`IsAuthenticated`). In `test_backend_local.py`, the price tampering test request did not call `force_authenticate(req_tamper, user=admin_user)`, causing DRF to correctly reject the unauthenticated request with HTTP 401 Unauthorized.
- **Fix Applied**: Added `force_authenticate(req_tamper, user=admin_user)` to `test_backend_local.py` before invoking `OrderListCreateView`.
- **Verification Evidence**: `python test_backend_local.py` → `[PASSED] Price Tampering Protection: Negative modifier -1000 ignored | Computed Subtotal: Rs. 1150.0` (All integration & security tests PASSED with exit code 0).

---

### Bug #13: Unhandled Date Parsing Exception & Missing Submit Loading Feedback in Promo Coupon Modal (Resolved 2026-08-13)
- **Symptom**: Clicking 'Save Coupon' in `PromoManagement.tsx` could fail silently or throw `RangeError: Invalid time value` if datetime-local inputs were partially entered or unparsed, and lacked visual submit feedback or toast popups.
- **Root Cause**:
  1. `valid_from` / `valid_to` used raw `new Date(formData.valid_from).toISOString()` without checking if `formData.valid_from` was invalid or empty.
  2. Form submission lacked `submitting` boolean state, leaving the submit button active without loading indicators during network requests.
  3. Pre-flight field scope validation was missing for non-global target scopes.
- **Fix Applied**:
  1. Added `safeISODate` helper to gracefully parse datetime strings or default to valid ISO timestamps.
  2. Added pre-flight field validation checking brand and branch selection for non-global campaign scopes.
  3. Added `submitting` loading state with spinner animation and disabled button handler.
  4. Formatted DRF backend error payloads into human-readable error messages and rendered animated Toast notification banners.
- **Verification Evidence**: `npm run build` in `admin/` → 0 errors (Exit code 0). `python test_promo_engine.py` → `[SUCCESS] ALL PROMO CODE ENGINE INTEGRATION TESTS PASSED (100%)`.

---

### Bug #14: Local Mobile App API Host Desync & Metro Cache Desynchronization (Resolved 2026-08-13)
- **Symptom**: User reported promo coupon fixes worked on production/web but failed on local app runs ("abi bhi wahi ho rha local run pa").
- **Part 12 Stuck-Loop Diagnosis — Root Cause**:
  1. `app/src/services/api.js`, `admin-app/src/services/api.ts`, and `admin/src/services/api.ts` defaulted API base URLs to Heroku Production (`https://getfoodpk-fd9b20442fcf.herokuapp.com`). When running local dev servers (`http://127.0.0.1:8000`), local promo codes created in the local database did not exist on Heroku production, causing validation failures on the local app.
  2. Local `.env` files in `app/` and `admin/` specified Heroku production targets or empty strings.
  3. Metro bundler held cached JavaScript bundles in `.expo` / `node_modules/.cache`.
- **Fix Applied**:
  1. Implemented `getLocalOrProductionBaseUrl()` across `app/src/services/api.js`, `admin-app/src/services/api.ts`, and `admin/src/services/api.ts` automatically detecting `localhost` / `127.0.0.1` browser hostnames and routing requests to `http://127.0.0.1:8000`.
  2. Updated `app/.env` (`EXPO_PUBLIC_API_URL=http://127.0.0.1:8000/api`) and `admin/.env.local` (`VITE_API_URL=http://127.0.0.1:8000`).
  3. Stopped active Expo processes and restarted both Customer App and Merchant App Metro bundlers with `--clear` cache flags (`npx expo start -c --web`).
- **Verification Evidence**: `python test_promo_engine.py` → 100% Pass Rate. `python test_dual_app_e2e.py` → 100% Pass Rate. Both Metro bundlers active on ports 8081 & 8082.

---

### Bug #15: Merchant App Localhost CORS Block & Host Mismatch (Resolved 2026-08-13)
- **Symptom**: Opening `http://localhost:8082` (Merchant Manager App) displayed `⚠️ Network Error` `Retry Fetch` on the HQ Command Center screen.
- **Root Cause**:
  1. Django backend `CORS_ALLOWED_ORIGINS` in `backend/config/settings.py` lacked `http://localhost:8082` and `http://localhost:5173`. Cross-origin XHR preflight requests from browser tabs at `localhost:8082` were blocked by Django CORS middleware.
  2. Hardcoding `127.0.0.1:8000` created cross-host domain mismatches when browser tabs loaded on `localhost:8082`.
  3. Unauthenticated or non-superuser API requests returned `401`/`403` which displayed generic `Network Error` text rather than explicit authentication prompts.
- **Fix Applied**:
  1. Updated `CORS_ALLOWED_ORIGINS` and `CORS_ALLOWED_ORIGIN_REGEXES` in `backend/config/settings.py` to allow `http://localhost:8082`, `http://localhost:5173`, `http://127.0.0.1:8082`, `http://127.0.0.1:5173`, and any `http://localhost:*` port in local development.
  2. Refactored `getLocalOrProductionBaseUrl()` in `admin-app/src/services/api.ts`, `app/src/services/api.js`, and `admin/src/services/api.ts` to use `http://${window.location.hostname}:8000`, matching `localhost` / `127.0.0.1` dynamically.
  3. Upgraded `analyticsSlice.ts` error formatting to report explicit authentication guidance on `401`/`403` status responses.
### Audit #16: Backend Endpoints, Redux Reducer Roster & Field Mapping Audit (Verified 2026-08-13)
- **Symptom**: Verification pass requesting line-by-line audit of Analytics, Customer CRM, Push Notifications, and Manager Provisioning backend endpoints against `admin-app` service layer, alongside Redux reducer registration verification and field-level payload matching.
- **Audit Findings**:
  1. Analytics endpoint `/api/analytics/platform/` verified in `backend/users/urls.py#L39` & `backend/config/analytics_views.py#L18` — matches `admin-app/src/services/api.ts#L475`.
  2. Customer CRM endpoints `/api/admin/customers/` & `/api/admin/customers/<int:pk>/loyalty/` verified in `backend/users/urls.py#L26-28` & `backend/users/admin_views.py#L22,L77` — matches `admin-app/src/services/api.ts#L559,L568`.
  3. Push Notification endpoint `/api/admin/notifications/send/` verified in `backend/users/urls.py#L43` & `backend/config/notification_views.py#L165` — matches `admin-app/src/services/api.ts#L618`.
  4. Manager Provisioning endpoint `/api/admin/managers/create/` (POST) & `/api/admin/managers/` (GET) verified in `backend/users/urls.py#L32-33` & `backend/users/admin_views.py#L167,L274` — matches `admin-app/src/services/api.ts#L494,L504`.
  5. Redux Reducer Roster in `admin-app/src/store/index.ts`: All 8 slice files (`auth`, `orders`, `menu`, `riders`, `analytics`, `tenant`, `customer`, `promo`) are 100% registered with 0 duplicates, 0 typos, and 0 unregistered slices.
  6. Field-level tracing: Manager account creation payload (`restaurant_id`, `branch_id`, `notification_email`, `password`) and Customer loyalty adjustment payload (`loyalty_points`, `reason`) match DRF backend serializer expectations 100%.
- **Verification Evidence**: `npx tsc --noEmit` in `admin-app/` → 0 errors. All endpoints, reducers, and serializer fields verified against actual backend Python source code.

### Bug #17: Missing get_user_model Import in AdminManagerCreateView (Resolved 2026-08-13)
- **Symptom**: Calling `POST /api/admin/managers/create/` returned `HTTP 500 Internal Server Error` with `NameError: name 'get_user_model' is not defined`.
- **Root Cause**: `backend/users/admin_views.py` line 210 called `User = get_user_model()` inside `AdminManagerCreateView.post()` without importing `get_user_model` from `django.contrib.auth`.
- **Fix Applied**: Added `from django.contrib.auth import get_user_model` at top of `backend/users/admin_views.py`.
- **Verification Evidence**: Executed 6-feature HQ suite (`test_hq_features_suite.py`) — `POST /api/admin/managers/create/` succeeded with `HTTP 201 Created` returning provisioned manager credentials.

### Bug #18: Localhost Staff Login Network Error (Resolved 2026-08-13)
- **Symptom**: Clicking "Sign In" on `http://localhost:8082` with username `admin` and password `admin123` displayed a red `Network Error` banner.
- **Root Cause**: `admin-app/src/services/api.ts` resolves `BASE_URL` to `http://localhost:8000/api` when `window.location.hostname` is `localhost`. The local Django REST API server on port 8000 was not running on the local host machine.
- **Fix Applied**: Launched local Django API server on `http://localhost:8000/api` as a daemon background task (`python backend/manage.py runserver 0.0.0.0:8000`).
- **Verification Evidence**:
  1. `Invoke-WebRequest http://localhost:8000/api/health/` ➔ HTTP 200 OK (`{"status":"OK","database":"ok"}`).
  2. `POST http://localhost:8000/api/auth/login/` ➔ HTTP 200 OK returning JWT `access` and `refresh` tokens for `admin`.
  3. Playwright automated test `test_login_flow.py` filled credentials and submitted login form on `http://localhost:8082` with 100% clean authentication success.

### Bug #19: Mobile Localhost API Base URL & Android Emulator 10.0.2.2 / LAN IP CORS Desync (Resolved 2026-08-13)
- **Symptom**: Mobile clients (`app` and `admin-app`) failed to reach local Django API when running inside Android emulators (`10.0.2.2`), physical devices over Wi-Fi, or when `typeof window === 'undefined'`.
- **Root Cause**:
  1. Mobile app `getLocalOrProductionBaseUrl()` in `app/src/services/api.js` and `admin-app/src/services/api.ts` checked `typeof window !== 'undefined'`. Native mobile engines bypass this check and fell back to production Heroku or failed loopback calls. Native Android emulators require `10.0.2.2:8000`, while physical devices require host packager LAN IP (`Constants.expoConfig.hostUri`).
  2. `CORS_ALLOWED_ORIGINS` and `CORS_ALLOWED_ORIGIN_REGEXES` in `backend/config/settings.py` lacked explicit permissions for `http://10.0.2.2:8000`, `http://10.0.2.2:8081`, `http://10.0.2.2:8082`, and LAN IP regex ranges (`192.168.*`, `10.*`, `172.16-31.*`).
- **Fix Applied**:
  1. Enhanced `getLocalOrProductionBaseUrl()` in `app/src/services/api.js` and `admin-app/src/services/api.ts` to dynamically resolve host LAN IP via `Constants.expoConfig.hostUri`, Android emulator loopback via `Platform.OS === 'android'` (`http://10.0.2.2:8000/api`), and browser hostname via `window.location.hostname`.
  2. Installed `expo-constants` in both `app` and `admin-app` projects.
  3. Added Android emulator `10.0.2.2` and LAN IP regex ranges (`r"^http://10\.0\.2\.2(:\d+)?$"`, `r"^http://192\.168\.\d+\.\d+(:\d+)?$"`, `r"^http://10\.\d+\.\d+\.\d+(:\d+)?$"`, `r"^http://172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+(:\d+)?$"`) to `backend/config/settings.py`.
- **Verification Evidence**: `test_mobile_api_connectivity.py` passed 100% — OPTIONS preflight checks from `10.0.2.2:8081` and `192.168.1.100:8081` returned HTTP 200 with proper `Access-Control-Allow-Origin` headers, and staff bearer authentication succeeded cleanly. `npx tsc --noEmit` in `admin-app` passed with 0 errors.

### Bug #20: ExponentAV Native Module Resolution Crash in Mobile Runtime (Resolved 2026-08-13)
- **Symptom**: App crashed immediately on mobile devices with red error screen: `[runtime not ready]: Error: Cannot find native module 'ExponentAV'`.
- **Root Cause**: `admin-app/src/components/NewOrderAlertOverlay.tsx` used static top-level `import { Audio } from 'expo-av'`. In Expo Go or custom dev client binaries where native C++ module `ExponentAV` is unlinked or deprecated, module load time execution of `require('expo-av')` threw an uncaught native module error before React mounted.
- **Fix Applied**:
  1. Removed static top-level `import { Audio } from 'expo-av'` in `NewOrderAlertOverlay.tsx`.
  2. Built safe dynamic module loaders `getExpoAudio()` and `getExpoKeepAwake()` wrapped in `try/catch` to attempt loading `expo-av` dynamically at runtime.
  3. Added HTML5 Web Audio (`new window.Audio(...)`) fallback when running on browser tabs.
  4. Gracefully degrades to visual takeover modal without crashing if `ExponentAV` native module is unlinked in the mobile runtime environment.
- **Verification Evidence**: `test_exponent_av_guard.py` ran via Playwright and verified **0 uncaught ExponentAV runtime errors**. `npx tsc --noEmit` in `admin-app` passed with 0 errors.

### Bug #21: Native AsyncStorage Module Resolution & Auth Token Persistence (Resolved 2026-08-13)
- **Symptom**: App logged `AsyncStorageError: Native module is null, cannot access legacy storage` in `admin-app/src/services/api.ts` during token store/clear operations, leading to "Session expired" redirects. Console also output warnings for `setLayoutAnimationEnabledExperimental` and un-memoized Redux selectors.
- **Root Cause**:
  1. `admin-app/src/services/api.ts` called `@react-native-async-storage/async-storage` directly. In dev runtimes without linked native storage bindings, `AsyncStorage.getItem/setItem/removeItem` threw `AsyncStorageError: Native module is null`.
  2. `OrderManagementScreen.tsx` called `UIManager.setLayoutAnimationEnabledExperimental` on Android without guarding for React Native New Architecture (Fabric).
  3. `useOrderPolling.ts` returned an inline un-memoized object literal `{ orders, isAuthenticated }` inside `useAppSelector`, creating new object references on every store update and triggering Redux re-render warnings.
- **Fix Applied**:
  1. Built multi-tier `SafeStorage` adapter in `admin-app/src/services/api.ts` using `window.localStorage` (web), `AsyncStorage` (native mobile), and an in-memory `Map<string, string>` fallback to catch native null module errors silently.
  2. Guarded `setLayoutAnimationEnabledExperimental` in `OrderManagementScreen.tsx` with `!(globalThis as any).nativeFabricUIManager`.
  3. Separated primitive/reference Redux selectors in `useOrderPolling.ts` (`state.orders.orders` and `state.auth.isAuthenticated`).
- **Verification Evidence**: `test_asyncstorage_and_warnings_fix.py` verified **0 AsyncStorage errors**, **0 LayoutAnimation warnings**, and **0 Redux selector warnings**. `npx tsc --noEmit` passed with 0 errors.

### Bug #22: Flash Deal & Promo Code Creation HTTP 400 Payload Schema Mismatch (Resolved 2026-08-13)
- **Symptom**: Creating Flash Deals or Promo Coupons in `admin-app` failed with `HTTP 400 Bad Request` API rejections.
- **Root Cause**:
  1. `FlashDeal` payloads sent `discount_percentage` instead of `deal_type: 'percentage'` and `discount_value: number`.
  2. `PromoCoupon` payloads sent uppercase `discount_type: 'FLAT'`/`'PERCENTAGE'` (Django expects lowercase `'flat'`/`'percentage'`), `min_order_amount` (Django expects `min_subtotal`), `max_discount_amount` (Django expects `max_discount`), and raw date strings (Django expects ISO datetime format).
- **Fix Applied**:
  1. Built payload normalizers (`formatFlashDealPayload` and `formatCouponPayload`) in `admin-app/src/services/api.ts` to map field names, lowercase enum values, and generate valid ISO datetime strings.
- **Verification Evidence**: Executed `test_phase1_phase2_suite.py` — Flash Deals, Flat Promo Coupons, and Percentage Promo Coupons were created cleanly returning `HTTP 201 Created`.

### Bug #23: Menu Management UI Sluggishness & Un-memoized List Cards (Resolved 2026-08-13)
- **Symptom**: Scrolling large menu catalogs across 7 brands caused UI frame drops and sluggish tab switching.
- **Root Cause**: `MenuManagementScreen.tsx` rendered categories and item cards inside a top-level plain `<ScrollView>` using nested un-memoized `.map()` calls, forcing simultaneous JS thread layout for all catalog items.
- **Fix Applied**:
  1. Extracted item card rendering into a memoized `MenuItemCard` component wrapped in `React.memo`.
  2. Refactored `MenuManagementScreen.tsx` to use an optimized `<FlatList>` with `initialNumToRender={6}`, `maxToRenderPerBatch={8}`, `windowSize={5}`, and `removeClippedSubviews={Platform.OS === 'android'}`.
- **Verification Evidence**: `npx tsc --noEmit` passed with 0 errors and `test_phase1_phase2_suite.py` verified catalog fetching.

### Bug #24: Cross-App Promo Code Brand Scope & Granular Error Message Desynchronization (Resolved 2026-08-13)
- **Symptom**: Valid promo codes created in Admin HQ (e.g. `WELCOME1` for `GetAFomo`) failed at Customer App checkout with generic "Invalid or expired promo code" error banners, hiding specific rejection reasons.
- **Root Cause**:
  1. `CouponValidateSerializer` expected `restaurant_id` as an integer. When Customer App passed string brand slugs (e.g., `"getafomo"`), DRF field validation threw a type error prior to `validate()` execution.
  2. `custom_exception_handler` formatted DRF validation errors with `non_field_errors:` prefixes. Customer App screens (`CartScreen.tsx`, `CheckoutScreen.tsx`) did not inspect `data.message` and fell back to generic "Invalid or expired promo code" text.
  3. Default `valid_from` timestamp without safety margin caused microsecond race conditions on instant customer redemption.
- **Fix Applied**:
  1. Refactored `CouponValidateSerializer` in `backend/promotions/serializers.py` to accept integers, string digits, or brand slug strings (`"getafomo"`, `"seenbanao"`) and resolve them to restaurant IDs.
  2. Added granular validation error messages for inactive, not-yet-active, expired, usage limit reached, subtotal threshold, and brand/branch scope mismatches.
  3. Cleaned `custom_exception_handler` in `backend/config/exceptions.py` to strip `non_field_errors:` prefixes.
  4. Updated `CartScreen.tsx` and `CheckoutScreen.tsx` to display `err?.response?.data?.message` directly to customers.
  5. Added a 60-second safety margin to `valid_from` in `formatCouponPayload` (`admin-app/src/services/api.ts`).
- **Verification Evidence**: Executed `test_promo_e2e_integration.py` — verified Admin HQ creation, string brand slug validation (`"getafomo"`), integer brand ID validation (`63`), brand scope mismatch rejection with granular feedback, subtotal threshold rejection, and real order placement with promo redemption.

### Bug #25: WELCOME1 Active Promo Code Missing DB Record & NULL Expiry Comparison TypeError (Resolved 2026-08-13)
- **Symptom**: Promo code `WELCOME1` returned "Invalid or expired promo code" when applied on GetAFomo checkout.
- **Root Cause**:
  1. `WELCOME1` record was missing in the Django database.
  2. `Coupon.valid_from` and `Coupon.valid_to` model fields were non-nullable (`null=False`). When a coupon had no expiration date (`valid_to = None` / N/A), `now > coupon.valid_to` threw `TypeError: '>' not supported between instances of 'datetime.datetime' and 'NoneType'`, generating an unhandled HTTP 500 error that Customer App displayed as generic "Invalid or expired promo code".
  3. Structured backend logging was missing for promo validation failure diagnostics.
- **Fix Applied**:
  1. Updated `Coupon` model fields in `backend/promotions/models.py` to `null=True, blank=True` and ran Django migration `promotions.0005_alter_coupon_valid_from_alter_coupon_valid_to`.
  2. Updated `Coupon.is_valid()`, `CouponValidateSerializer`, and `OrderCreateSerializer` to safely guard `valid_from` and `valid_to` against `None` values (`if coupon.valid_to and now > coupon.valid_to:`).
  3. Added structured `logger.warning(...)` outputs for all promo validation failures (`[PROMO VALIDATION FAILED]`).
  4. Seeded active `WELCOME1` coupon in DB (15% OFF, GetAFomo brand, N/A expiry).
- **Verification Evidence**: Executed `test_welcome1_null_expiry_suite.py` — verified DB audit of `WELCOME1` (N/A expiry), brand slug validation (`"getafomo"`), integer ID validation, structured warning logging, and order placement with `WELCOME1` redemption.

---

### Bug #26: Repeat WELCOME1 Active Promo Code Failure — Heroku Un-Deployed Git Tree & Unseeded Production DB (Resolved 2026-08-13)
- **Symptom**: Customer App checkout returned "Invalid or expired promo code" when applying `WELCOME1` on GetAFomo orders on production Heroku backend.
- **Root Cause & Stuck-Loop Deploy Chain Audit**:
  1. Local git working tree contained uncommitted changes (`backend/promotions/serializers.py`, migration `promotions.0005...`). The updated code allowing string brand slugs (`"getafomo"`) and NULL expiry dates was NEVER pushed to `origin/main` or deployed to Heroku (`git subtree push --prefix backend heroku main`), causing live Heroku API to return HTTP 400 (`"restaurant_id: A valid integer is required."`).
  2. Production PostgreSQL database on Heroku was missing the `WELCOME1` coupon record, returning HTTP 400 (`"non_field_errors: Invalid coupon code."`).
- **Fix Applied**:
  1. Updated `CouponValidateSerializer` and `Coupon` model NULL expiry guards locally.
  2. Updated `seed_heroku_coupons.py` and executed `seed_welcome1_on_heroku` to seed active `WELCOME1` coupon (15% OFF, GetAFomo, N/A expiry date `valid_to=None`).
  3. Committed changes to git `main` (`f387999`) and executed `git push origin main`.
  4. Deployed backend subtree to Heroku (`git subtree push --prefix backend heroku main`). Migration `promotions.0005` applied cleanly on Heroku.
### Bug #27: GetFood Manager App "Network Error" on Sign In & Missing Resilience Layer (Resolved 2026-08-15)
- **Symptom**: Signing into the GetFood Manager mobile app on a physical Android device via Expo Go fails with a red "Network Error" alert.
- **Root Cause**:
  1. `admin-app/src/services/api.ts` used `hostUri` from `Constants.expoConfig` (`192.168.100.202:8081`) and unconditionally computed `http://192.168.100.202:8000/api` when `__DEV__` was true, assuming a local Django server was running on port 8000 on the host PC. Because Django was only running on Heroku production (`https://getfoodpk-fd9b20442fcf.herokuapp.com/api`), device requests failed with `ECONNREFUSED`.
  2. The mobile app lacked dynamic endpoint switching and live server connection probing.
  3. Raw Axios errors (`ERR_NETWORK`, `ECONNABORTED`) were passed directly to UI states without human-friendly messaging or automatic idempotent retries.
  4. `admin-app/app.json` lacked explicit Android internet permissions and `usesCleartextTraffic` config.
- **Fix Applied**:
  1. Updated `admin-app/src/services/api.ts` to default to `PRODUCTION_API_URL` (`https://getfoodpk-fd9b20442fcf.herokuapp.com/api`), allow persistent custom endpoints via `AsyncStorage` (`@admin_custom_api_url`), and provide `testApiConnectivity` for real-time latency probing.
  2. Added centralized error sanitizer (`sanitizeErrorMessage`) transforming raw network/timeout/502/503/504 errors into clear, actionable advice.
  3. Added single-retry mechanism on transient network drops for idempotent GET requests.
  4. Built `ServerConfigModal.tsx` and integrated a top-right Settings Gear Icon and active server indicator in `LoginScreen.tsx`.
  5. Configured `usesCleartextTraffic: true` and internet permissions in `admin-app/app.json`.
- **Verification Evidence**:
  - `npx tsc --noEmit` passed with 0 errors.
  - Metro Bundler built Android bundle with HTTP 200 OK.
  - Executed `test_api_resilience_suite.py` — verified Heroku production 200 OK (1302ms), auth validation 401/400 handling, and valid super-admin JWT token receipt.

---

### Bug #28: Expo Remote OTA Update Fatal Startup Crash "java.io.IOException: Failed to download remote update" (Resolved 2026-08-15)
- **Symptom**: Expo Go / Android runtime crashes at launch with a blue error screen: `Uncaught Error: java.io.IOException: Failed to download remote update`.
- **Root Cause**:
  1. `admin-app/app.json` had `"plugins": [["expo-build-properties", ...]]` declared, but `expo-build-properties` was NOT installed in `admin-app/node_modules` (`admin-app/package.json`). Whenever the phone requested the project manifest from Metro, Expo Config CLI threw `PluginError: Failed to resolve plugin for module "expo-build-properties"`, returning a 500 error to Expo Go. Expo Go interpreted the failed manifest download as a remote update failure and crashed with `java.io.IOException: Failed to download remote update`.
  2. `app/app.json` had `"updates": { "enabled": true, "url": "https://u.expo.dev/c148418c-3d1b-4d90-ba37-5c942dbd2ca9" }` pointing to an outdated EAS project ID with no fallback timeout configured.
- **Fix Applied**:
  1. Ran `npm install expo-build-properties` in `admin-app`, resolving the `PluginError` and allowing Metro to serve the manifest cleanly.
  2. Updated `app/app.json`, `admin-app/app.json`, and root `app.json` with `"updates": { "enabled": false, "fallbackToCacheTimeout": 0, "checkAutomatically": "NEVER" }`.
  3. Restarted Metro bundler with `--clear`.
- **Verification Evidence**:
  - `admin-app/node_modules/expo-build-properties` verified installed.
  - Manifest probe `HTTP GET http://127.0.0.1:8081/` with header `expo-platform: android` returns 200 OK without any `PluginError`.
  - Android JS bundle downloaded via `http://127.0.0.1:8081/index.bundle?platform=android&dev=true` in 14.7s (1062 modules) with status 200 OK.

---

### Bug #29: Branch Manager UX Inconsistencies & Missing Design System Tokens (Resolved 2026-08-15)
- **Symptom**:
  1. Overdue order cards displayed raw minutes for old orders (e.g. `7060m OVERDUE`).
  2. The Orders tab showed an ambiguous, unlabeled red circular badge next to `Active (21)`.
  3. "Start Preparing" action button was rendered in orphan blue/indigo (`#6366F1`) instead of warm branch brand orange.
  4. Header had a bare persistent red "Logout" text link with zero confirmation step, risking accidental logout during busy shifts.
  5. Login screen showed developer-facing "Server" button and raw API URL text.
  6. Rider dispatch flow lacked rider selection enforcement and takeaway/dine-in order type branching.
- **Root Cause**:
  1. SLA calculation did not convert raw minutes into human-readable hours/days.
  2. Tab badge rendered raw integer count without label.
  3. Action buttons used hardcoded inline colors rather than semantic tokens.
  4. Header logout button directly called thunk on single tap without `Alert.alert` confirmation.
  5. Debug QA tools were rendered unconditionally in production login layout.
  6. Status handler attempted rider dispatch modal on non-delivery orders and allowed submitting without selected rider.
- **Fix Applied**:
  1. Expanded `src/theme.ts` with comprehensive semantic color tokens, typography scale, shadows, and radii.
  2. Created shared UI system in `src/components/ui/` (`Card`, `StatusBadge`, `SlaBadge`, `Button`, `ConfirmModal`).
  3. Implemented `formatHumanElapsedTime` (`<60m` -> `${m}m`, `60m-24h` -> `${h}h ${m}m`, `>=24h` -> `${d}d ${h}h`) in `SlaBadge`.
  4. Formatted active tab pill with `🔥 ${newOrderCount} NEW` tag (only when `> 0`).
  5. Aligned primary branch action buttons to warm orange (`COLORS.branchManager.primary`) and semantic success/danger states.
  6. Replaced bare red logout link with a styled header profile button wired to a confirmation dialog.
  7. Gated Login screen server modal behind a hidden 3-tap gesture on the GF brand logo.
  8. Enforced rider selection for delivery orders and branched takeaway/dine-in orders straight to "Mark Ready / Served".
  9. Polished `NewOrderAlertOverlay.tsx` into a high-contrast, ride-hailing style alert.
- **Verification Evidence**:
  - `npx tsc --noEmit` passed with 0 errors across `admin-app`.
  - Metro bundler compiled and served Android JS bundle with HTTP 200 OK.

---

### Bug #30: Super Admin HQ Visual Uniformity & Display Inconsistencies (Resolved 2026-08-15)
- **Symptom**:
  1. "More" navigation screen displayed internal technical permission/route keys (`tenant_management`, `customer_management`) as subtext.
  2. Promo codes rendered broken blank text (`Min Order: Rs.`) when fields were null or 0.
  3. "Reset Password" button on manager accounts was styled in red/destructive, implying an emergency action rather than routine management.
  4. Password security status read ambiguously as `"Must Change Password: NO ✅"`.
  5. Long manager usernames broke awkwardly mid-word without truncation.
  6. Super Admin screens looked interchangeable without distinguishing visual identity per functional section.
  7. Timestamps and promotion expiry dates were rendered in raw computer formats (`2026-08-01 08:49`).
  8. 7-Day Revenue Trend chart looked broken and empty when revenue was sparse or only on one day.
  9. Super Admin More screen logout button lacked a confirmation modal.
- **Root Cause**:
  1. Technical string array rendered `item.key` instead of human-friendly descriptions.
  2. Missing ternary fallback expressions for nullable numeric/date fields.
  3. Hardcoded destructive color styling on routine action button.
  4. Conflation of Boolean state with negative assertion text.
  5. Missing `numberOfLines={1}` and `ellipsizeMode="tail"` with monospace formatting.
  6. Lack of section-specific accent color treatments across Super Admin views.
  7. Direct `.substring()` formatting instead of structured human date parsing.
  8. Missing baseline axis grid and sparse data zero-pips on the bar chart.
  9. Single-tap unconfirmed dispatch of `logoutStaffThunk`.
- **Fix Applied**:
  1. Replaced technical keys in `AppNavigator.tsx` with human descriptions (`"Manage restaurant brands, branches & menus"`, `"User accounts, loyalty points & order history"`, etc.) and distinct section icons.
  2. Implemented fallback expressions across Promo Codes (`"No minimum order"`, `"No expiry date"`, `"No max cap"`).
  3. Recolored "Reset Password" to neutral/accent outline button (`#60A5FA` / `rgba(59, 130, 246, 0.12)`), reserving red exclusively for destructive deletions.
  4. Replaced ambiguous password check with clear security status badges (`"⚠️ Password Reset Pending"` vs `"🔒 Password Active & Set"`).
  5. Added `numberOfLines={1}`, `ellipsizeMode="tail"`, and tap-to-inspect modal for long manager usernames.
  6. Applied distinctive color accents per section: Cyan (Tenants), Purple (CRM), Amber (Managers), Pink (Promos), Red (Flash Deals), Blue (FCM Notifications & Dashboard).
  7. Created `dateUtils.ts` (`formatHumanDateTime`, `formatHumanDate`, `formatHumanTime`) and applied across all timestamp displays.
  8. Enhanced 7-Day Revenue Trend chart with intentional baseline grid, zero-pips, total summary pill, and active rolling window subtitle.
  9. Wrapped Super Admin logout button in an `Alert.alert` confirmation dialog.
- **Verification Evidence**:
  - `npx tsc --noEmit` passed with 0 errors across `admin-app`.
  - Metro bundler compiled and served Android JS bundle (`index.ts`) with HTTP 200 OK.

---

### Bug #31: Network Resilience & Empty State Inconsistencies (Resolved 2026-08-15)
- **Symptom**:
  1. Failed network requests on open screens left users with blank lists or unhandled error text rather than clear, actionable error cards with a "Try Again" retry action.
  2. Initial data fetches on several screens lacked standardized loading states or rendered raw unstyled spinners.
  3. Legitimate empty data states (no orders, no riders, no customers, no promo codes, zero search results) were indistinguishable from broken network states.
  4. If a manager's session expired while the `NewOrderAlertOverlay` was ringing, the audio could continue looping indefinitely.
  5. Attempting to accept a stale or already-accepted order could leave the alert overlay in an unhandled state.
- **Root Cause**:
  1. Screens lacked centralized `LoadingState`, `ErrorState`, and `EmptyState` UI components.
  2. Missing error state catch-blocks in local screen `loadData` functions.
  3. `NewOrderAlertOverlay` lacked a defensive session-termination watcher and stale order ejection.
- **Fix Applied**:
  1. Created theme-aware (`themeMode="super" | "branch"`) reusable components in `src/components/ui/`: `LoadingState.tsx`, `ErrorState.tsx`, and `EmptyState.tsx`.
  2. Integrated `ErrorState` with "Try Again" retry actions across all screens (`OrderManagement`, `BranchDashboard`, `MenuManagement`, `RiderManagement`, `SuperDashboard`, `TenantManagement`, `ManagerManagement`, `CustomerManagement`, `PromoManagement`, `FlashDealManagement`, `NotificationCenter`).
  3. Replaced raw empty lists with context-specific `EmptyState` components (`📦`, `🛵`, `🍳`, `👥`, `🏢`, `🎟️`, `⚡`, `📣`).
  4. Added defensive session-expiry cleanup in `NewOrderAlertOverlay.tsx` to immediately stop audio ringing and keep-awake if `!isAuthenticated`.
  5. Handled stale concurrent order acceptance by auto-ejecting outdated orders from the pending queue.
- **Verification Evidence**:
  - `npx tsc --noEmit` passed with 0 errors across `admin-app`.
  - Metro bundler compiled and served Android JS bundle (`index.ts`, 1066 modules) with HTTP 200 OK.















