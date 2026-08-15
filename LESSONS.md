# 🧠 LESSONS.md — FoodSphere Architectural Lessons & Past Patterns

> Generalized engineering takeaways, multi-tenant patterns, and invariants learned from debugging across backend, admin, mobile, and web applications.

---

## Lesson 1 — Multi-Tenant Order Sequence Scoping — 2026-07-25
- **Pattern**: Generating branch/tenant scoped display IDs (e.g. `TS-LC-1001`).
- **Wrong assumption made**: Using global auto-incrementing integer IDs (`Order.id`) for customer receipt display and dispatcher modals.
- **What actually mattered**: Customers and branch managers expect tenant/branch isolated readable sequences (`display_order_id`). Scoping must be handled atomically in Django backend models on order save.
- **Applies to**: `backend/orders/models.py`, `backend/orders/serializers.py`, `admin/src/views/OrderManagement.tsx`.

---

## Lesson 2 — Monotonic Order Status Transitions — 2026-07-26
- **Pattern**: Real-time polling/refetching order statuses in mobile app & web trackers.
- **Wrong assumption made**: Incoming API responses during race conditions or background sync can be blindly written to Redux state.
- **What actually mattered**: Order state transitions must be strictly monotonic (`getStatusRank`). State should NEVER roll back to a previous stage (e.g. from `DISPATCHED` back to `PREPARING`) due to delayed HTTP responses.
- **Applies to**: `app/src/store/orderSlice.ts`, `app/src/screens/TrackingScreen.tsx`.

---

---

## Lesson 4 — Deployment Chain Verification & Guest Order State Hydration — 2026-08-10
- **Pattern**: Debugging repeat-reported mobile app bugs across Expo builds & guest navigation screens.
- **Wrong assumption made**: Assuming a git commit alone reaches a test device, and assuming Redux `user.is_guest` state guards are sufficient for guest tracking screens.
- **What actually mattered**: 
  1. For this project, always confirm EAS publish (`eas update`), channel match, and `app.json` `updates.enabled` status before re-diagnosing application code on a repeat-reported mobile bug. (When `updates.enabled` is `false`, fresh APK builds or local Metro dev server runs are required).
  2. Guest navigation screens (`OrdersScreen`, `TrackingScreen`) MUST hydrate active guest order credentials from `AsyncStorage` (`@getfood_active_guest_order` / `guest_tracking_token`) rather than blocking guest users with a static login guard.
---

## Lesson 5 — Redux State Preservation & DRF Error Sanitization — 2026-08-10
- **Pattern**: Handling state array mutations and error alert formatting across authentication boundaries.
- **Wrong assumption made**: Assuming `guestLogin.pending` should clear `myOrders`, and assuming raw stringification of DRF error objects is user-friendly.
- **What actually mattered**: 
  1. `guestLogin.pending` must NOT clear existing order history arrays in Redux state, and `placeOrder.fulfilled` MUST prepend newly created orders to `myOrders` to prevent UI array wipes.
  2. Django REST Framework error objects containing `non_field_errors` MUST have raw key prefixes stripped and field keys formatted nicely (`Guest phone: ...`) before passing to alert UI dialogs.
  3. Form inputs on checkout MUST be preserved in navigation params (`returnParams`) when sending users to AuthScreen so form data auto-restores post-login.
- **Applies to**: `app/src/store/orderSlice.ts`, `app/src/screens/CheckoutScreen.tsx`, `app/src/screens/AuthScreen.tsx`, `app/src/screens/OrdersScreen.tsx`.

---

## Lesson 6 — Redux Auth Lifecycle Race Conditions on Re-Login — 2026-08-10
- **Pattern**: Any screen that reads Redux state populated by polling (fetchMyOrders, fetchGuestOrderStatus) and also reacts to login/logout lifecycle transitions.
- **Wrong assumption made**: Clearing `state.myOrders = []` on `loginUser.pending` is safe because "the user isn't logged in yet." In reality, `.pending` fires the moment the network request starts — before authentication is confirmed — creating a window where old orders are gone and new ones haven't arrived yet.
- **What actually mattered**: State resets tied to auth should fire on `.fulfilled`, not `.pending`. `.pending` = request started, not user confirmed. Moving clears to `.fulfilled` eliminates the race window while keeping the security invariant (old data gone before new user's data loads).
- **Corollary**: Any `loading = true` guard in a polling loop MUST check whether data already exists before activating the loading state. `if (state.array.length === 0)` alone is insufficient — add `&& !state.loading` to prevent double-firing the spinner on the second poll cycle after a login-induced clear.
- **Applies to**: `app/src/store/orderSlice.ts` (`loginUser.pending/fulfilled`, `registerUser.pending/fulfilled`, `fetchMyOrders.pending`). Generalizes to any Redux slice that polls + clears on auth events.

---

## Lesson 7 — Guest Order Interception & Multi-Layer Checkout Form Preservation — 2026-08-10
- **Pattern**: Converting anonymous/guest checkout flows to mandatory authenticated order placement without frustrating users or losing entered form details.
- **Wrong assumption made**: Relying solely on `route.params` to pass saved checkout form fields back from `AuthScreen` after authentication.
- **What actually mattered**: `route.params` can be cleared or overwritten during complex navigation stack resets (`navigation.reset`). Form state preservation MUST use a **dual-persistence strategy**: save to `AsyncStorage` (`@getfood_checkout_saved_form`) AND pass via `returnParams`. `CheckoutScreen` hydration reads `AsyncStorage` first, auto-populates all inputs (Name, Phone, Address, Instructions, Branch, Payment Method, Schedule), and purges the key cleanly post-hydration.
- **Applies to**: `app/src/screens/CheckoutScreen.tsx`, `app/src/screens/AuthScreen.tsx`, `backend/orders/serializers.py`, `backend/orders/views.py`.

---

## Lesson 8 — Django Keyword Argument Collisions in Model.objects.create — 2026-08-10
- **Pattern**: Unpacking `**validated_data` into Django model creation method (`Model.objects.create(...)`).
- **Wrong assumption made**: Assuming passing `user=user` explicitly alongside `**validated_data` (which already contains `'user': user`) is harmless or supported by kwargs merging.
- **What actually mattered**: In Python, passing a keyword argument explicitly while the unpacked `**dict` also contains that key raises a `TypeError: got multiple values for keyword argument`. On Django REST Framework in production, unhandled `TypeError` exceptions trigger HTTP 500 Internal Server Errors (`{"success":false,"message":"An internal server error occurred."}`). Always set model relationship fields directly inside `validated_data` before unpacking `**validated_data` into `objects.create()`.
- **Applies to**: `backend/orders/serializers.py` (`OrderCreateSerializer.create`).

---

## Lesson 9 — Rider Dispatch Server-Side Atomic State Synchronization — 2026-08-13
- **Pattern**: Assigning riders to orders and updating status transitions in client mobile apps.
- **Wrong assumption made**: Client app needs to send a secondary PATCH request (`PATCH /api/orders/{id}/` status='out_for_delivery') after calling `POST /api/orders/{id}/assign-rider/`.
- **What actually mattered**: Backend `OrderAssignRiderView` (`backend/orders/views.py`) ALREADY performs atomic side-effects: assigning a rider to a `preparing` order automatically updates `order.status = 'out_for_delivery'` and `rider.status = 'ON_DELIVERY'` in a single DB transaction. Furthermore, marking an order `delivered` or `cancelled` automatically frees up the rider (`rider.status = 'AVAILABLE'`) in backend signals. Sending redundant client-side status PATCH calls creates race conditions and double network overhead.
- **Applies to**: `admin-app/src/screens/placeholders/OrderManagementScreen.tsx`, `admin-app/src/store/riderSlice.ts`, `backend/orders/views.py`.

---

## Lesson 10 — Admin Mobile App Role-Scoped UI & Optimistic Redux Mutators — 2026-08-13
- **Pattern**: Shared management screens used by both Super Admins and Branch Managers on mobile devices.
- **Wrong assumption made**: Shared screens can use a single monolithic UI layout with conditional if-statements scattered throughout rendering code.
- **What actually mattered**: Role boundaries require completely distinct theme tokens (`COLORS.superAdmin.*` slate dark vs `COLORS.branchManager.*` warm light) and capability scoping. Branch Managers need low-friction, high-speed operational toggles (e.g. per-branch item stock switches via `POST /api/restaurants/branch-item-availability/`, 1-tap rider status switches) backed by **optimistic Redux mutators** (UI state updates immediately, reverts on API failure) so branch managers never experience UI lag on mobile networks. Super Admins receive HQ management controls (brand switcher bars, category creation, item editing with `expo-image-picker` gallery upload).
- **Applies to**: `admin-app/src/screens/placeholders/MenuManagementScreen.tsx`, `admin-app/src/screens/placeholders/RiderManagementScreen.tsx`, `admin-app/src/store/menuSlice.ts`, `admin-app/src/store/riderSlice.ts`.

---

## Lesson 11 — Porting Complex Web Admin Systems to Mobile UX Patterns — 2026-08-13
- **Pattern**: Porting complex web admin dashboards (Vite + React) to mobile apps (Expo / React Native).
- **Wrong assumption made**: Mobile management views can simply copy web admin JSX structures without adjusting touch density, form inputs, modal dialogs, or selector controls.
- **What actually mattered**: Mobile admin apps demand touch-optimized layouts (choice chip selectors, card rows with status pills, numeric touch inputs, `RefreshControl` pull-to-refresh). Super Admin HQ screens (`SuperDashboardScreen`, `TenantManagementScreen`, `ManagerManagementScreen`, `CustomerManagementScreen`, `PromoManagementScreen`, `FlashDealManagementScreen`, `NotificationCenterScreen`) require:
  1. Compact 2×2 metric grids and pure Flexbox inline bar charts for performance without heavy web chart dependencies.
  2. One-time copyable credential modals for staff provisioning results.
  3. Mandatory audit reason text inputs for sensitive customer loyalty balance modifications (`PATCH /api/admin/customers/{id}/loyalty/`).
  4. Explicit discount type switchers (`FLAT` vs `PERCENTAGE`) and scope dropdowns (`GLOBAL` vs specific brand ID).
## Lesson 12 — Environment API Base URL Desync & Metro Cache Resets — 2026-08-13
- **Pattern**: Running local development servers (`http://127.0.0.1:8000`) alongside production deployments (`https://getfoodpk-fd9b20442fcf.herokuapp.com`).
- **Wrong assumption made**: Hardcoding production backend fallback URLs or assuming environment variables automatically resolve across Expo Go / browser runs.
- **What actually mattered**: 
  1. API service wrappers across all client apps (`app/src/services/api.js`, `admin-app/src/services/api.ts`, `admin/src/services/api.ts`) MUST dynamically inspect `window.location.hostname` (or local environment flags) to route requests to `http://127.0.0.1:8000` when running locally, avoiding split-brain data states where coupons created in local admin HQ fail on local mobile apps hitting Heroku.
  2. Any repeat report of code fixes not taking effect locally requires resetting Metro bundler cache (`npx expo start -c`) to purge cached JS bundles.
## Lesson 13 — Django CORS Whitelist & Dynamic Browser Host Matching — 2026-08-13
- **Pattern**: Running multiple Expo web instances (`http://localhost:8081`, `http://localhost:8082`) and Vite web apps (`http://localhost:5173`) against a local Django REST API server (`http://localhost:8000`).
- **Wrong assumption made**: Hardcoding `http://127.0.0.1:8000` in API base URLs or leaving new local app dev ports out of Django `CORS_ALLOWED_ORIGINS` will work without issue.
- **What actually mattered**: 
  1. Web browsers enforce strict cross-origin policies. If a browser loads `http://localhost:8082`, sending requests to `http://127.0.0.1:8000` triggers cross-origin preflight requests that fail unless both `http://localhost:8082` and regex `r"^http://localhost(:\d+)?$"` are in `CORS_ALLOWED_ORIGINS` / `CORS_ALLOWED_ORIGIN_REGEXES` in `backend/config/settings.py`.
  2. Client API service wrappers MUST use `http://${window.location.hostname}:8000` to match the exact hostname (`localhost` vs `127.0.0.1`) used in the user's browser address bar.
- **Applies to**: `backend/config/settings.py`, `admin-app/src/services/api.ts`, `app/src/services/api.js`, `admin/src/services/api.ts`.

---

## Lesson 14 — Deploy Chain Verification & Production DB Seeding Invariant — 2026-08-13
- **Pattern**: Debugging repeat reports of backend API validation or data failures where local test suites pass but live production environment fails.
- **Wrong assumption made**: Assuming that because a bug fix passed in local integration tests (`test_welcome1_null_expiry_suite.py`), the live backend API automatically updated and production DB was seeded.
- **What actually mattered**: 
  1. ALWAYS execute `git status` and `git subtree push --prefix backend heroku main` when fixing Django REST Framework backend APIs. Local SQLite DB state and local uncommitted files do NOT affect live production Heroku APIs until committed, pushed to `origin/main`, and deployed via Heroku subtree push.
  2. Production databases (e.g. PostgreSQL on Heroku) are isolated from dev databases. Whenever adding promo codes or static system data, ALWAYS execute a seed script (`seed_welcome1_on_heroku`) against the live API to ensure production database records match local test databases.
  3. ALWAYS run live endpoint probes (`urllib.request` / `curl` against `https://getfoodpk-fd9b20442fcf.herokuapp.com/api/...`) to inspect exact production HTTP status codes and error bodies before concluding that application code is broken.
- **Applies to**: `backend/promotions/serializers.py`, `backend/orders/views.py`, `seed_heroku_coupons.py`, Heroku production deployment workflow.

---

## Lesson 15 — Physical Device Expo Go API Base URL Resolution & Network Error Resilience — 2026-08-15
- **Pattern**: Running mobile applications (React Native / Expo) on physical test devices via Expo Go LAN mode (`exp://192.168.x.x:8081`).
- **Wrong assumption made**: Assuming that because `Constants.expoConfig.hostUri` contains a LAN IP (`192.168.100.202`), the mobile app should automatically default to sending API traffic to `http://192.168.100.202:8000/api`.
- **What actually mattered**: 
  1. If local backend servers (Django on port 8000) are not running on the development machine, mobile devices hitting port 8000 fail immediately with `ECONNREFUSED` / "Network Error".
  2. Mobile apps must default to the production cloud backend (`https://getfoodpk-fd9b20442fcf.herokuapp.com/api`) while providing an interactive **Server Configuration & Connection Probe Modal** (`ServerConfigModal.tsx`) so developers and staff can switch to local LAN/emulator servers on-the-fly with 1-tap presets and real-time ping testing.
  3. Never leak raw Axios error strings (`ERR_NETWORK`, `ECONNABORTED`) to user interface error banners. Always sanitize errors through a centralized error parser (`sanitizeErrorMessage`) that explains the exact reason and offers recovery actions (e.g. "⚙️ Configure API Server").
- **Applies to**: `admin-app/src/services/api.ts`, `admin-app/src/screens/LoginScreen.tsx`, `admin-app/src/components/ServerConfigModal.tsx`, `app/src/services/api.js`.





