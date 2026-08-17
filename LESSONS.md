# 🧠 LESSONS.md — FoodSphere Architectural Lessons & Past Patterns

> Generalized engineering takeaways, multi-tenant patterns, and invariants learned from debugging across backend, admin, mobile, and web applications.

---

## Lesson 12 — Dynamic Home Banner Synchronization, Focus Binding & Zero-Deal Collapse — 2026-08-17
- **Pattern**: Promotional home banner carousels and marketing campaign state synchronization between Admin HQ and Mobile Customer Clients.
- **Wrong assumption made**: Assuming that banner components can maintain their own isolated mount-only `useEffect` fetching queries with hardcoded static fallback slides (`BANNERS` array) for when backend deals are empty or unreturned.
- **What actually mattered**:
  1. Isolated child components that fetch in `useEffect([], ...)` are immune to screen navigation focus (`useFocusEffect`) and pull-to-refresh (`handleRefresh`), causing stale promotional data to persist indefinitely on user devices until app process termination.
  2. Fallback mock arrays (e.g. `"3 Brands, One Cart!"`, `"Flat Rs. 250 OFF"`) trick user interfaces into rendering outdated campaigns even when all promotions are intentionally deleted or deactivated in Admin HQ.
  3. Promotional carousel components MUST evaluate the real active deals length and **cleanly return `null`** when `activeBanners.length === 0`, allowing the mobile layout to smoothly collapse without orphan cards or empty container whitespace.
  4. Promotional state MUST be managed at the screen container level and wired to `useFocusEffect`, background polling intervals, and pull-to-refresh handlers.
- **Applies to**: `app/src/screens/HomeScreen.tsx`, `app/src/screens/FlashDealsScreen.tsx`, `admin/src/views/FlashDealManagement.tsx`, `admin-app/src/screens/placeholders/FlashDealManagementScreen.tsx`.

---

## Lesson 11 — Super Admin Multi-Tenant Modal Provisioning & Delivered-Only CRM Annotation — 2026-08-16
- **Pattern**: Modal entity creation in role-differentiated apps (Super Admin vs Branch Manager) and CRM user metric aggregation.
- **Wrong assumption made**: Assuming that creation modals designed for branch managers (where branch context is implicitly known from `auth.branchId`) can be rendered unchanged for Super Admin, and assuming customer lists only need raw user model counts.
- **What actually mattered**: 
  1. Creation modals for global administrative roles (Super Admin) MUST provide explicit Brand and Branch selection controls so the target foreign key is deliberately chosen rather than falling back to arbitrary default IDs.
  2. Customer CRM profiles must annotate `delivered_orders_count` and `delivered_total_spent` using conditional Django ORM aggregations (`filter=Q(orders__status='delivered')`) to show true customer lifetime value without counting unearned or cancelled orders.
  3. Interactive UI date/time pickers with quick presets (+24h, +3d, +7d, End of Month) prevent malformed ISO timestamp errors and eliminate the cognitive friction of manual string typing on mobile keyboards.
- **Applies to**: `admin-app/src/screens/placeholders/RiderManagementScreen.tsx`, `admin-app/src/screens/placeholders/FlashDealManagementScreen.tsx`, `admin-app/src/screens/placeholders/PromoManagementScreen.tsx`, `backend/users/admin_views.py`, `backend/promotions/serializers.py`.

---

## Lesson 10 — Dual Slug/Numeric ID Resolution & Defensive Promo Error Extraction — 2026-08-16
- **Pattern**: Handling tenant route identifiers in REST endpoints and parsing validation errors across mobile clients.
- **Wrong assumption made**: Assuming that URLs structured as `/api/restaurants/{slug}/menu/` will only ever receive string slugs, and assuming error responses from coupon validation will always contain an `err.response.data.message` field.
- **What actually mattered**: 
  1. In JWT-authenticated systems, user token payloads frequently supply numeric database primary keys (`restaurant_id`) rather than alphanumeric slugs. REST endpoints taking `{slug}` MUST inspect whether the input is numeric (`isdigit()`) and support resolving either `id=int(slug)` or `slug__iexact=slug` to prevent spurious 404 errors for managers.
  2. Client-side promo handlers must never assume the exact JSON envelope (`res.data.code` vs `res.code` vs `res.data.data.code`). Unwrapping defensively (`res?.data?.data || res?.data || res`) and validating presence before accessing properties prevents JavaScript runtime `TypeError: Cannot read property 'code' of undefined`.
  3. Error parsers must unpack Django REST Framework's array structures (`data.code[0]`, `data.non_field_errors[0]`) rather than letting catch handlers fall back to generic client exceptions.
- **Applies to**: `backend/restaurants/views.py`, `app/src/screens/CartScreen.tsx`, `app/src/screens/CheckoutScreen.tsx`, `app/src/services/api.js`, `admin-app/src/screens/placeholders/MenuManagementScreen.tsx`.

---

## Lesson 9 — Delivered-Only Revenue Accounting & Rider-to-Brand Schema Linkage — 2026-08-16
- **Pattern**: Calculating revenue aggregates and identifying multi-tenant fleet relationships across administrative dashboards.
- **Wrong assumption made**: Assuming that summing `Order.total` with `status != 'cancelled'` accurately reflects earned business revenue, and assuming raw branch names are sufficient for Super Admin to identify rider brand affiliation.
- **What actually mattered**: 
  1. Financial metrics (today, 7d, 30d, all-time, daily trend) MUST filter strictly by `status === 'delivered'`. Counting `placed`, `received`, or `preparing` orders prematurely inflates financial statements with unearned or potentially cancellable funds.
  2. In multi-tenant systems, `BranchRider` is linked to `Branch`, and `Branch` is linked to `Restaurant`. Serializers (`BranchRiderSerializer`) must explicitly flatten `restaurant_id`, `restaurant_name`, and `restaurant_slug` so Super Admin views can provide brand filters and visual brand tags (`🏪 Brand • 📍 Branch`).
  3. Customer feedback submitted on completed deliveries must have dedicated endpoints (`/api/admin/reviews/`) and dedicated cards in operational dashboards.
- **Applies to**: `backend/config/analytics_views.py`, `backend/restaurants/serializers.py`, `backend/restaurants/views.py`, `admin/src/views/BranchDashboard.tsx`, `admin/src/views/SuperDashboard.tsx`, `admin-app/src/screens/placeholders/BranchDashboardScreen.tsx`, `admin-app/src/screens/placeholders/RiderManagementScreen.tsx`.

---

## Lesson 8 — Queryset Fallback Leaks & Multi-Tenant Rider Dispatch Integrity — 2026-08-16
- **Pattern**: Scoping filtered API querysets in multi-tenant backends (e.g. `GET /api/admin/riders/?branch_id=X`).
- **Wrong assumption made**: Assuming that when a branch filter yields 0 records (`t1_qs.exists() == False`), falling back to the base queryset (`qs = base_qs`) provides a "helpful default" list.
- **What actually mattered**: 
  1. Falling back to the base queryset silently leaks entities from other branches and restaurant brands into branch-specific modals.
  2. When the user selects one of these cross-branch entities, mutation endpoints reject the action with 403 Forbidden because of tenancy mismatch.
  3. Queryset filters MUST strictly return the scoped query result (even if empty) unless global fallback is explicitly requested by caller (`allow_global=true`).
  4. Mutation endpoints (`OrderAssignRiderView`) must support both internal integer primary keys and display IDs (`display_order_id`), and reject busy/offline assignments at the API layer with HTTP 400.
- **Applies to**: `backend/restaurants/views.py`, `backend/orders/views.py`, `admin-app/src/screens/placeholders/OrderManagementScreen.tsx`, `admin/src/views/OrderManagement.tsx`.

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

---

## Lesson 16 — Expo Remote OTA Update Fallback & Timeout Invariant — 2026-08-15
- **Pattern**: Configuring Expo Updates / OTA remote bundle download policies across mobile apps (`app.json`).
- **Wrong assumption made**: Leaving `updates.enabled: true` with a remote EAS URL without explicitly configuring `fallbackToCacheTimeout: 0` or `checkAutomatically: "NEVER"`.
- **What actually mattered**: 
  1. If the remote EAS update URL is mismatched, unreachable, or returns a non-200 response, Expo native runtimes block startup and crash with a fatal `java.io.IOException: Failed to download remote update`.
  2. For development and Expo Go builds, ALWAYS set `"fallbackToCacheTimeout": 0` and `"checkAutomatically": "NEVER"` with `"enabled": false` (or align `updates.url` precisely with the active EAS `projectId`).
  3. A 0-millisecond fallback timeout ensures the Expo runtime immediately boots the cached embedded JS bundle without waiting for or crashing on remote network drops.
- **Applies to**: `app/app.json`, `admin-app/app.json`, `app.json`.

---

## Lesson 17 — Reusable Mobile Design Systems & Operational UX Invariants — 2026-08-15
- **Pattern**: Polishing high-frequency operational mobile screens for branch managers and kitchen staff.
- **Wrong assumption made**: Implementing per-screen inline styles with raw elapsed minutes, unverified action button colors, unconfirmed header logout triggers, and raw debug indicators.
- **What actually mattered**: 
  1. **Time formatting at a glance**: Kitchen and dispatch staff cannot parse `7060m OVERDUE`. Timers must always be humanized (`23m`, `4h 12m`, `2d 3h`).
  2. **Accidental trigger prevention**: Never expose destructive or session-terminating buttons (e.g. Sign Out) as single-tap naked text links in navigation headers. Always wrap in confirmation alerts.
  3. **Clean client-facing UI vs Developer tools**: Debug and QA tooling (like server switching) must be cleanly gated behind hidden developer gestures (e.g. multi-tap logo) or dev flags rather than cluttering production staff sign-in flows.
  4. **Component reuse**: Building foundational UI components (`Card`, `StatusBadge`, `SlaBadge`, `Button`, `ConfirmModal`) rooted in centralized theme tokens ensures consistent visual hierarchy and seamless reuse across Super Admin and Branch views.
- **Applies to**: `admin-app/src/theme.ts`, `admin-app/src/components/ui/*`, `OrderManagementScreen.tsx`, `BranchDashboardScreen.tsx`, `NewOrderAlertOverlay.tsx`.

---

## Lesson 18 — Super Admin Design Cohesion & Semantic Clarity Invariants — 2026-08-15
- **Pattern**: Extending Phase 7's shared design system to Super Admin HQ screens (Tenants, CRM, Managers, Promos, Flash Deals, Notifications, Analytics).
- **Wrong assumption made**: Relying on raw object field strings without fallbacks, hardcoding red destructive buttons on safe actions (like password reset), showing technical database keys as menu subtext, and leaving sparse charts without an explicit baseline.
- **What actually mattered**: 
  1. **Data fallbacks**: Nullable database fields must always render meaningful human fallback copy (`"No minimum order"`, `"No expiry date"`, `"All Platform Brands"`) rather than broken empty prefixes like `"Min Order: Rs."`.
  2. **Color semantics**: Red must be reserved strictly for irreversible destructive actions (Delete Promo, Remove Brand, Delete Rider). Routine management actions (Reset Password, Edit Config) must use neutral or accent outline styling.
  3. **Section visual identity**: Within a dark theme, each functional area should have a distinct accent badge (Cyan for Tenants, Purple for CRM, Amber for Managers, Pink for Promos, Red for Flash Deals, Blue for FCM/Analytics) to prevent screen interchangeability.
  4. **Sparse chart design**: Bar charts with low/zero historical data need an explicit baseline, zero-pips, and explanatory context so administrators know live tracking is working.
- **Applies to**: `SuperDashboardScreen.tsx`, `TenantManagementScreen.tsx`, `ManagerManagementScreen.tsx`, `CustomerManagementScreen.tsx`, `PromoManagementScreen.tsx`, `FlashDealManagementScreen.tsx`, `NotificationCenterScreen.tsx`, `AppNavigator.tsx`.

---

## Lesson 19 — Network Resilience, Edge Cases & Empty State Design — 2026-08-15
- **Pattern**: Handling network drops, initial data loading, empty data returns, and auth lifecycle events across all screens in an operations mobile app.
- **Wrong assumption made**: Assuming that handling the happy path and having type-safe models is sufficient to prevent user confusion during transient network drops or empty data collections.
- **What actually mattered**: 
  1. **Triad of UI Feedback**: Every list/data screen must support 3 distinct non-happy states:
     - **LoadingState**: Prominent feedback during initial fetch so the screen is never blank.
     - **ErrorState**: Replaces raw stack traces with calm, humanized explanations and a clear "Try Again" / "Retry" action.
     - **EmptyState**: Visually and textually communicates when a collection is legitimately empty vs broken, with helpful context and next-step actions.
  2. **Defensive Background & Audio Teardown**: When authentication expires mid-session (HTTP 401), any foreground ringing alerts or audio players (`NewOrderAlertOverlay`) must be immediately stopped and torn down via reactive state watchers rather than relying solely on component unmount.
  3. **Stale Concurrency Protection**: In high-velocity ordering environments, multiple managers or automated systems may accept or cancel an order concurrently. Alert overlays and order lists must auto-eject stale orders gracefully without leaving the operator stranded.
- **Applies to**: `admin-app/src/components/ui/LoadingState.tsx`, `ErrorState.tsx`, `EmptyState.tsx`, `NewOrderAlertOverlay.tsx`, all screen views.

---

## Lesson 20 — Development Base URL Trapping & Brand Scoping Invariants — 2026-08-16
- **Pattern**: Dual-app deployment where backend runs in the cloud (Heroku) while mobile apps run in local development bundlers (`expo start`).
- **Wrong assumption made**: Assuming that `if (__DEV__) return 'http://' + ip + ':8000/api'` is a helpful dev convenience. When the local machine is not running a local Django backend, mobile devices automatically fail with fatal "Network Error" on every network call.
- **What actually mattered**: 
  1. **Production-First Default**: Mobile apps must ALWAYS default to the live 24/7 cloud backend URL (`https://getfoodpk-fd9b20442fcf.herokuapp.com/api`) across both `__DEV__` and production modes. Custom development URLs should be opt-in via AsyncStorage (`@getfood_custom_api_url`) or explicit environment injection.
  2. **Launch Brand Scoping**: In multi-tenant systems launching in phases, active brand filtering must be enforced at both the UI presentation layer (filtering out `is_active: false` brands) and the Super Admin analytics layer so that draft tenants do not pollute live operational statistics.
- **Applies to**: `app/src/services/api.js`, `app/src/screens/HomeScreen.tsx`, `admin-app/src/screens/placeholders/SuperDashboardScreen.tsx`, `admin-app/src/screens/placeholders/MenuManagementScreen.tsx`.

---

---

## Lesson 23 — Basket-Level Loyalty Invariants, Mock Elimination & DateTime Guarding — 2026-08-16
- **Pattern**: Managing user discounts across multi-step ordering funnels, removing offline mock code in enterprise admin dashboards, and securing promotional deal dates.
- **Wrong assumption made**: Managing loyalty points toggle state inside checkout screen component state while coupons were applied in the basket, causing total calculation desyncs and requiring duplicate price deduction recalculations.
- **What actually mattered**: 
  1. **All Discounts Consolidated in Basket**: Both Promo Code application and Loyalty Points redemption belong strictly on the Basket screen (`CartScreen.tsx`). The Checkout screen should act purely as a read-only consumer of `cart.appliedPromo` and `cart.useLoyaltyPoints`.
  2. **Redux-Driven Discount Invalidation**: Both promo discounts and loyalty point redemptions must be held in the centralized Redux state (`cartSlice.ts`). When subtotal changes, loyalty redemptions must automatically recalculate so points redeemed never exceed the remaining subtotal.
  3. **Zero Offline Mocks**: Production admin dashboards must never maintain static mock fallback arrays or `isMock` simulations. If an API call fails, the UI should render an explicit `ErrorState` or toast with a retry trigger rather than injecting fictitious data.
  4. **Strict Temporal Guards on DateTime Pickers**: Date/time picker modals for time-bound promotions must strictly enforce `minDate = new Date()`, disable previous month navigation when viewing the current month, and reject any configuration where `end_time <= start_time`.
- **Applies to**: `app/src/screens/CartScreen.tsx`, `app/src/screens/CheckoutScreen.tsx`, `app/src/store/cartSlice.ts`, `admin/src/views/ManagerManagement.tsx`, `admin-app/src/components/ui/DateTimePickerModal.tsx`, `admin-app/src/screens/placeholders/FlashDealManagementScreen.tsx`.


