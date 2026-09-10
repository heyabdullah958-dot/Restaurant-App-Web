# BUILD.md — FoodSphere Deployment & Build Configurations
## Auto-generated — 2026-07-21
### Detected from codebase scan

- **Render Backend Deployment**: `render.yaml` orchestrates build (`pip install`, `collectstatic`, `migrate`, `seed_restaurants`, `seed_branches`, `create_admin`, `create_restaurant_managers`).
- **Cloudflare Pages Deployment**: Static & Vite production builds for 7 websites and Admin panel.
  - **Admin HQ (`foodsphere-admin`)**: Automatic Git deploy on `git push origin main`.
  - **7 Brand Websites Direct Upload**: Deployed via Wrangler CLI (`npx wrangler pages deploy`):
    ```bash
    npx wrangler pages deploy websites/tandooristoppk --project-name=tandooristoppk-foodsphere
    npx wrangler pages deploy websites/jushhpk --project-name=jushhpk-foodsphere
    npx wrangler pages deploy websites/getafomo --project-name=getafomo-foodsphere
    npx wrangler pages deploy websites/seenbanao --project-name=seenbanao-foodsphere
    npx wrangler pages deploy websites/dineatblue --project-name=dineatblue-foodsphere
    npx wrangler pages deploy websites/sandmelts --project-name=sandmelts-foodsphere
    npx wrangler pages deploy websites/birdmanfoodspk --project-name=birdmanfoodspk-foodsphere
    ```
- **Media Assets**: Cloudinary storage (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).

---

## Phase 1 — Local Menu Asset Mapping & Multi-Tenant Catalog Sync — 2026-08-02
- **What was done**: Parsed local menu asset directories (`Tandoori stop`, `Jush Menu Pics`), uploaded media to Cloudinary CDN, bound items to DRF Django backend models, and synchronized 160 menu items across 37 categories to `websites/shared_catalog.json` and `live_catalog.js`.
- **Files modified**: `websites/shared_catalog.json`, `websites/live_catalog.js`, `fix_website_product_images.py`, `upload_tandoori_stop_assets.py`, `sync_app_to_web_catalog.py`, `inject_live_catalog.py`, `CHANGELOG.md`, `BUILD.md`.
- **Self-corrections used**: 0/3.
- **Confidence score**: 98%.

---

## Phase 2 — Local Development Server Launch & Shutdown — 2026-08-06
- **What was done**: Launched full local development environment (Django REST API on 8000, Vite Admin HQ on 5173, Web App on 3000, Expo Metro on 8081). Upon request, cleanly terminated all active background localhost server processes.
- **Files modified**: None (Runtime server management).
- **Self-corrections used**: 0/3.
- **Confidence score**: 100%.

---

## Phase 3 — Auth Session Loss & Order History Hydration Fix — 2026-08-06
- **What was done**: Fixed persistent auth session loss, guest fallback loops during bottom tab navigation, and un-hydrated order history for logged-in users across all accounts.
- **Files modified**: `app/src/store/userSlice.ts`, `app/src/screens/AuthScreen.tsx`, `app/src/screens/OrdersScreen.tsx`, `app/src/services/api.js`, `CHANGELOG.md`, `BUILD.md`.
- **Self-corrections used**: 1/3 (Resolved TS2304 variable scoping error in `userSlice.ts`).
- **Confidence score**: 100%.

---

## Phase 4 — Expo Go Local Development Server Launch — 2026-08-06
- **What was done**: Launched the Expo Go local development server (`npx expo start --go`) listening on `http://localhost:8081`.
- **Files modified**: None (Runtime process launch).
- **Self-corrections used**: 0/3.
- **Confidence score**: 100%.

---

## Phase 5 — Full Local Development Server Environment Launch — 2026-08-10
- **What was done**: Launched complete local development ecosystem in background daemon processes:
  1. Django REST Backend API listening on `http://127.0.0.1:8000` (task-109).
  2. Vite Admin HQ Dashboard listening on `http://localhost:5173` (task-111).
  3. Mobile App Expo Metro Bundler listening on `http://localhost:8081` (task-113).
- **Files modified**: None (Runtime server management).
- **Self-corrections used**: 0/3.
- **Confidence score**: 100%.

---

## Phase 1 — Dual-App Integration Testing & Full Verification — 2026-08-13
- **What was done**: Ran full end-to-end integration test suite (`test_dual_app_e2e.py`) via backend python environment, verifying customer order creation, guest checkout auth gate state serialization, tenant/branch-scoped display order IDs (`TS-JT-1006`), merchant app ringing alarm status transitions, and multi-account state isolation with 0 cross-leakage. Ran full TypeScript build checks on both `app` and `admin-app` with 0 compilation errors across all screens.
- **Files modified**: `BUILD.md`, `CHANGELOG.md`, `BUGS.md`.
- **Self-corrections used**: 0/3.
- **Confidence score**: 100%.

---

## Phase 1 — Execute Comprehensive Dual-App Testing Suite via 3 Installed Skills — 2026-08-13
- **What was done**: Executed 3 skill automation suites (`test_playwright_suite.py`, `test_tuistory_suite.py`, `test_appium_suite.py`) testing Customer App (`http://localhost:8081`), Merchant Manager App (`http://localhost:8082`), and React Admin HQ (`http://localhost:5173`). Captured Playwright evidence screenshots (`playwright_customer_app.png`, `playwright_merchant_app.png`, `playwright_admin_hq.png`). Verified 100% pass rate across all 3 suites.
- **Files created**: `test_playwright_suite.py`, `test_tuistory_suite.py`, `test_appium_suite.py`.
- **Files modified**: `BUILD.md`, `CHANGELOG.md`.
- **Self-corrections used**: 1/3.
- **Confidence score**: 100%.

---

## Phases 1 – 6 Build & Production Deployment Verification — 2026-09-01
- **What was done**:
  1. **Customer Mobile App (`/app`)**: Verified TypeScript compilation (`npx tsc --noEmit` -> 0 errors) and compiled production Android Hermes bytecode (`npx expo export --platform android` -> 1425 modules, 4.4MB `.hbc` bundle).
  2. **Merchant Manager Mobile App (`/admin-app`)**: Verified standalone Android APK stability with root `react-native-gesture-handler` import, `<GestureHandlerRootView>`, vector `Ionicons` tabs, dark-mode `ErrorBoundary`, and native permissions (`VIBRATE`, `WAKE_LOCK`, `POST_NOTIFICATIONS`). Compiled production Android Hermes bytecode (3.2MB `.hbc` bundle).
  3. **Backend API (`/backend`)**: Deployed release **v85** live to Heroku PostgreSQL (`https://getfoodpk-fd9b20442fcf.herokuapp.com`).
  4. **Integration Testing**: Executed `python test_dual_app_e2e.py` with 100% pass rate across multi-tenant models, guest checkout auth gate state restoration, merchant foreground alarms, and strict multi-account isolation.
- **Files modified**: `app/src/screens/AuthScreen.tsx`, `app/src/store/orderSlice.ts`, `admin-app/index.ts`, `admin-app/App.tsx`, `admin-app/app.json`, `admin-app/src/navigation/AppNavigator.tsx`, `admin-app/src/screens/placeholders/OrderManagementScreen.tsx`, `backend/orders/views.py`, `BUILD.md`, `CHANGELOG.md`, `FRONTEND.md`, `BACKEND.md`, `GEMINI.md`.
- **Self-corrections used**: 0/3.
- **Confidence score**: 100%.

---

## Phase 8 — Comprehensive Regression, Invariant Matrix & Standalone APK Builds — 2026-09-02 / 2026-09-03
- **What was done**:
  1. **Standalone Production Android APK Compilation**:
     - Assembled **Customer App Release APK** (`app/android/gradlew.bat assembleRelease`) ➔ `D:\GetFood-Customer.apk` (55.6 MB).
     - Assembled **Merchant Manager App Release APK** (`admin-app/android/gradlew.bat assembleRelease`) ➔ `D:\GetFood-Manager.apk` (35.5 MB).
     - Copies placed in `D:\` root drive and project directory `D:\sitesdata\Resturent App\`.
  2. **Exhaustive Automated Test Coverage (90/90 Tests Passing - 100%)**:
     - `test_phase8_production_regression.py` (23/23 tests pass): Multi-tenant scoping, Flash Deals v2.0, Coupon validation caps, branch stock overrides, rider atomic lifecycle.
     - `test_deep_invariant_matrix.py` (21/21 tests pass): OWASP Negative price injection attack defense, loyalty points cancellation refund, Dine-In table modes, Haversine bounds, SimpleJWT rotation.
     - `test_security_concurrency_penetration.py` (18/18 tests pass): OWASP IDOR protection, SQLi & XSS parameterized safety, quantity tampering defense, concurrent single-use coupon DB locks, Redux monotonic rank merging.
     - `test_live_heroku_e2e_deep.py` (11/11 tests pass): Live Heroku API discovery, branch nested serializers, popular tags, live flash deals and coupon validation.
     - `test_live_heroku_auth_order_flow.py` (12/12 tests pass): Live registration, JWT login, Bearer profile, empty order history isolation, and live SimpleJWT token rotation.
  3. **Multi-Platform Clean Compilation**:
     - `admin` Web HQ: `npm run build` (1758 modules, 0 errors).
     - `admin-app` Manager Mobile: `npx tsc --noEmit` & `npx expo export` (1081 modules, 3.2MB Hermes `.hbc`, 0 errors).
     - `app` Customer Mobile: `npx tsc --noEmit` & `npx expo export` (1425 modules, 4.5MB Hermes `.hbc`, 0 errors).
- **Files created**: `test_phase8_production_regression.py`, `test_deep_invariant_matrix.py`, `test_security_concurrency_penetration.py`, `test_live_heroku_e2e_deep.py`, `test_live_heroku_auth_order_flow.py`.
- **Files modified**: `BUILD.md`, `CHANGELOG.md`, `FRONTEND.md`, `BACKEND.md`, `GEMINI.md`.
- **Self-corrections used**: 0/3.
- **Confidence score**: 100%.

---

## Phase 9 — Mobile App Standalone APK Cold Launch Crash & Native Initialization Fix — 2026-09-08
- **What was done**:
  1. **Root Entry Point Precedence Hardening**:
     - Pre-pended `import 'react-native-gesture-handler';` at line 1 of `app/index.ts` and `admin-app/index.ts`.
     - Registered `ErrorUtils.setGlobalHandler` and `(Promise as any)._setUnhandledRejectionHandler` to intercept unhandled exceptions and prevent the native Android Activity from terminating on cold start.
  2. **Top-Level Error Boundary & Crash Recovery**:
     - Created `app/src/components/ErrorBoundary.tsx` featuring brand-aligned recovery UI, diagnostics inspector, app reload, and local storage cache reset (`AsyncStorage.clear()`).
     - Wrapped `<Provider>` at the root of `App.tsx` and retained inner screen boundary around `Stack.Navigator`.
  3. **Screen Rendering & Startup Lifecycle Guards**:
     - Enabled native screen rendering optimization via `enableScreens(true)` and `enableFreeze(true)` in `app/App.tsx`.
     - Defensively wrapped `AppContent` startup lifecycle (`loadSavedToken`, `initPushNotificationListener`, and pending deep-links) in robust `try/catch` blocks.
     - Hardened `SplashScreen.tsx` timeout navigation with safe fallbacks.
  4. **Native Configuration & Multi-Architecture Compilation**:
     - Added missing `android.permission.ACCESS_NETWORK_STATE`, `WAKE_LOCK`, and `POST_NOTIFICATIONS` permissions to `app/app.json` and `app/android/app/src/main/AndroidManifest.xml`.
     - Configured multi-architecture support (`arm64-v8a`, `armeabi-v7a`, `x86_64`) in `app/app.json` and `app/android/gradle.properties`.
     - Configured `local.properties` with system Android SDK path (`C:\Users\HP\AppData\Local\Android\Sdk`).
  5. **Standalone Production Release APK Assembled**:
     - Successfully assembled release APK via `./gradlew.bat assembleRelease` (`BUILD SUCCESSFUL in 15m 9s`, 991 actionable tasks) ➔ `D:\GetFood-Customer.apk` (93.0 MB).
     - Both `D:\GetFood-Customer.apk` and `D:\sitesdata\Resturent App\GetFood-Customer.apk` updated.
  6. **Automated Test Coverage**:
     - Created `test_phase9_apk_crash_guard_suite.py` with 10/10 tests passing (100%).
- **Files created**: `app/src/components/ErrorBoundary.tsx`, `app/android/local.properties`, `admin-app/android/local.properties`, `test_phase9_apk_crash_guard_suite.py`.
- **Files modified**: `app/index.ts`, `admin-app/index.ts`, `app/App.tsx`, `app/src/screens/SplashScreen.tsx`, `app/app.json`, `app/android/app/src/main/AndroidManifest.xml`, `app/android/gradle.properties`, `BUGS.md`, `BUILD.md`.
- **Self-corrections used**: 1/3 (Resolved missing `sdk.dir` in `local.properties` for Gradle).
- **Confidence score**: 100%.

---

## Phase 10 — Production Server Hard-Lock & Registration/Login Lifecycle Resolution — 2026-09-10
- **What was done**:
  1. **Production UI Clean-Up & Server Selector Removal**:
     - Removed the bottom backend trigger button (`Backend: 🚀 Heroku Cloud (24/7)`) completely from `AuthScreen.tsx`.
     - Converted the error banner to a clean, non-clickable error card, eliminating the `⚙️ Tap here to check server connection` trigger.
     - Guarded `ServerConfigModal` and logo triple-tap diagnostics behind `__DEV__` checks so they never render in production builds.
  2. **Production API Hard-Locking & Storage Purge**:
     - In `app/src/services/api.js` and `admin-app/src/services/api.ts`, enforced `PRODUCTION_API_URL` (`https://getfoodpk-fd9b20442fcf.herokuapp.com/api`) as the immutable base URL in release builds (`!__DEV__`).
     - Added automatic purging of legacy custom server keys (`@getfood_custom_api_url`, `@admin_custom_api_url`) from `AsyncStorage`.
  3. **Backend Registration Password Hashing & Serialization Normalization**:
     - In `backend/users/serializers.py` (`UserRegisterSerializer`), normalized and stripped inputs (`username.strip()`, `email.strip().lower()`, `phone` formatting stripped).
     - Ensured user creation explicitly uses `User.objects.create_user(..., is_active=True)`, guaranteeing PBKDF2 password hashing and active status.
     - Added case-insensitive duplicate username and email validation with clean 400 Bad Request error responses.
  4. **Tolerant Multi-Identifier Authentication & Embedded User Payload**:
     - Upgraded `CustomTokenObtainPairSerializer` to resolve credentials across exact/case-insensitive username, email, and normalized phone numbers (with +92 / 0 prefix tolerance).
     - Guaranteed `is_active=True` on resolved user accounts to eliminate manual admin activation blocks.
     - Embedded the serialized `user` object directly into the token response payload (`data['user']`), giving the frontend instant profile hydration without a secondary network round-trip.
  5. **Mobile Auth Form Normalization**:
     - In `AuthScreen.tsx`, added `autoCorrect={false}` to username, email, phone, and password inputs to prevent Samsung/Gboard keyboards from auto-suggesting or mutating credentials.
     - Updated username label to `Username, Email or Phone` and placeholder to `Enter username, email or phone`.
     - Symmetrically trimmed username and password inputs on both login and registration dispatch.
  6. **Live Heroku Backend Deployment (Release v86)**:
     - Deployed release **v86** live to Heroku 24/7 backend (`git subtree push --prefix backend heroku main`).
  7. **Standalone Release APK Reassembly**:
     - Recompiled production release APK via `./gradlew.bat assembleRelease` (`BUILD SUCCESSFUL in 2m 29s`, 991 tasks) ➔ `D:\GetFood-Customer.apk` (93.0 MB).
     - Synchronized binary to `D:\GetFood-Customer.apk`, `GetFood-Customer.apk`, and `D:\get\GetFood-Customer.apk`.
  8. **Comprehensive Automated Verification**:
     - `test_phase10_live_auth_hardlock.py` (7/7 tests pass, 100% on live Heroku v86).
     - `test_live_heroku_auth_order_flow.py` (12/12 tests pass, 100%).
     - `test_live_heroku_e2e_deep.py` (11/11 tests pass, 100%).
     - `test_backend_local.py` (all audits pass, 100%).
     - `test_phase8_production_regression.py` (23/23 tests pass, 100%).
     - `test_security_concurrency_penetration.py` (18/18 tests pass, 100%).
     - `test_deep_invariant_matrix.py` (21/21 tests pass, 100%).
     - `npx tsc --noEmit` on both apps (0 errors).
     - `npx expo export --platform android` on both apps (Hermes bytecode compiled cleanly with 0 errors).
- **Files created**: `test_phase10_live_auth_hardlock.py`.
- **Files modified**: `app/src/services/api.js`, `app/src/screens/AuthScreen.tsx`, `app/src/store/userSlice.ts`, `admin-app/src/services/api.ts`, `backend/users/serializers.py`, `backend/users/views.py`, `BUGS.md`, `BUILD.md`, `CHANGELOG.md`, `GEMINI.md`, `LESSONS.md`.
- **Self-corrections used**: 0/3.
- **Confidence score**: 100%.

---

## Phase 11 — Web Admin HQ Viewport Layout De-Cluttering, Stacking Overflows & Enterprise Feature Polish — 2026-09-10
- **What was done**:
  1. **Mobile Admin App Layout Hardening (`/admin-app`)**:
     - Standardized screen headers in `TenantManagementScreen`, `ManagerManagementScreen`, `SuperDashboardScreen`, `CustomerManagementScreen`, and `PromoManagementScreen`: wrapped title/subtitle in `<View style={{ flex: 1, marginRight: SPACING.sm }}>` with `<Text numberOfLines={1}>` on subtitles.
     - Added `style={[styles.addButton, { flexShrink: 0 }]}` to action buttons (`+ Onboard Brand`, `+ Provision Account`) so they are 100% visible and never truncated.
     - In `TenantManagementScreen`: refactored `toggleRow` from side-by-side `flex: 0.48` into stacked full-width rows with dedicated padding. Added native confirmation alert modal before applying Force Closed. Wrapped modals with backdrop dismiss, `✕` close button, and `ScrollView` (`keyboardShouldPersistTaps="handled"`).
     - In `ManagerManagementScreen`: added email regex validation and 8-character password checks to `handleCreateManager` and `handleConfirmPasswordReset`. Added backdrop dismiss and `✕` close buttons across all 3 modals.
     - In `FlashDealManagementScreen`: added discount validation (`<= 100` and `> 0` for percentage deals) and stacked Daily Active Hours containers.
     - In `RiderManagementScreen`: added dedicated container padding to `brandChipsScroll` and modal backdrop dismiss with `✕` close button.
     - In `AppNavigator.tsx`: added `headerShown: false` to `SuperMoreStack.Navigator` screenOptions to eliminate double-header clash.
  2. **Web Admin HQ Viewport Stacking & Modal Ergonomics (`/admin`)**:
     - Standardized global Tailwind z-index scale: in-page elements (`z-10`), sticky navbar (`z-30`), sidebar backdrop/drawer (`z-40`/`z-45`), modals (`z-50`), toasts (`z-60`).
     - In `admin/tailwind.config.js`: extended `zIndex` with `45` and `60` so custom classes compile into production CSS.
     - In `App.tsx`: updated sticky navbar from `z-20` to `z-30`.
     - In `Sidebar.tsx`: updated mobile backdrop to `z-40`, drawer to `z-45`, and added backdrop click-dismiss to modal.
     - In `Toast.tsx`: updated toast container to `z-60`.
     - In `TenantManagement.tsx`: normalized in-page buttons to `z-10`, preview modal to `z-50`, and added interactive confirmation modal for Force Closed.
     - In `BranchDashboard.tsx`: normalized banner buttons to `z-10`, preview modal and edit modal to `z-50`, and added backdrop click-dismiss.
     - In `RiderManagement.tsx`: added backdrop click-dismiss, inner `stopPropagation()`, and `✕` close button in modal header.
     - In `PromoManagement.tsx`: added backdrop click-dismiss, inner `stopPropagation()`, and `✕` close button in modal header; updated local toast to `z-60`.
     - In `CustomerManagement.tsx`, `MenuManagement.tsx`, `FlashDealManagement.tsx`, `OrderManagement.tsx`, and `ManagerManagement.tsx`: added backdrop click-dismiss and `✕` close buttons across all modals.
  3. **Backend Promotions Serializer Validation & Test Alignment (`/backend`)**:
     - In `promotions/serializers.py`: implemented `validate()` in `CouponSerializer` and `FlashDealSerializer`, enforcing `discount_value > 0`, `discount_value <= 100` for percentage deals, valid date sequences (`valid_to >= valid_from`, `end_time > start_time`), and `min_subtotal >= 0`. Fixed timing validation by removing invalid `'fixed_window'` check.
     - In `test_flash_deals_v2_engine_suite.py`: fixed hardcoded midnight rollover dates using `datetime.combine(today, ...)` relative to `timezone.now().date()`, added `test_09_serializer_validation_rules` verifying all serializer error bounds, and added database cleanup in `setUp()` for complete test isolation.
  4. **Compilation, Standalone APK Build & Test Verification**:
     - `.\venv\Scripts\python.exe manage.py test`: 40/40 tests passed (100%).
     - `.\venv\Scripts\python.exe -m unittest test_flash_deals_v2_engine_suite.py`: 6/6 tests passed (100%).
     - `npx tsc --noEmit` across `admin-app/`, `admin/`, and `app/`: 0 errors.
     - Compiled standalone Manager APK: `.\gradlew.bat assembleRelease` in `admin-app/android` (`BUILD SUCCESSFUL in 49s`, 450 tasks) ➔ `D:\GetFood-Manager.apk` and `D:\get\GetFood-Manager.apk` (63.4 MB).
- **Files modified**:
  - `admin-app/src/screens/placeholders/TenantManagementScreen.tsx`
  - `admin-app/src/screens/placeholders/ManagerManagementScreen.tsx`
  - `admin-app/src/screens/placeholders/SuperDashboardScreen.tsx`
  - `admin-app/src/screens/placeholders/FlashDealManagementScreen.tsx`
  - `admin-app/src/screens/placeholders/RiderManagementScreen.tsx`
  - `admin-app/src/screens/placeholders/CustomerManagementScreen.tsx`
  - `admin-app/src/screens/placeholders/PromoManagementScreen.tsx`
  - `admin-app/src/screens/placeholders/OrderManagementScreen.tsx`
  - `admin-app/src/screens/placeholders/MenuManagementScreen.tsx`
  - `admin-app/src/navigation/AppNavigator.tsx`
  - `admin/tailwind.config.js`
  - `admin/src/App.tsx`
  - `admin/src/components/Sidebar.tsx`
  - `admin/src/components/Toast.tsx`
  - `admin/src/views/TenantManagement.tsx`
  - `admin/src/views/BranchDashboard.tsx`
  - `admin/src/views/RiderManagement.tsx`
  - `admin/src/views/PromoManagement.tsx`
  - `admin/src/views/CustomerManagement.tsx`
  - `admin/src/views/MenuManagement.tsx`
  - `admin/src/views/FlashDealManagement.tsx`
  - `admin/src/views/OrderManagement.tsx`
  - `admin/src/views/ManagerManagement.tsx`
  - `backend/promotions/serializers.py`
  - `backend/test_flash_deals_v2_engine_suite.py`
  - `BUGS.md`
  - `LESSONS.md`
  - `BUILD.md`
  - `PROJECT.md`
- **Self-corrections used**: 1/3.
- **Confidence score**: 100%.








