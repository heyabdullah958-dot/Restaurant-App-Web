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






