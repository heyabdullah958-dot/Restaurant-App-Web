# 🍽️ FoodSphere — Project Intelligence File
> One App · Seven Unique Dining Experiences  
> Unified Restaurant Aggregator Platform + 7 Individual Websites

---

## 📌 Project Overview

**FoodSphere** is a full-stack food delivery & restaurant aggregator platform — similar to FoodPanda — that brings **7 unique restaurant brands** under one mobile app while also giving each restaurant its **own fully branded website**.

The client's long-term vision is to **scale and onboard more brands** in the future, so all architecture must be **multi-tenant**, **modular**, and **easily extensible**.

---

## 🏢 Client & Business Context

- **Deal Type:** Full product development contract
- **Client Vision:** FoodPanda-style UX, scalable multi-brand platform
- **Current Scope:** 3 brands active at launch (4 more hidden for now)
- **Future Expectation:** Client will add more restaurant brands over time — architecture must support this cleanly

---

## 🏪 The 7 Restaurant Brands & Phase 1 Scope

### 🚀 Phase 1 Active Launch Brands (3 Brands · 7 Real Operational Branches)
*Note: There are NO upcoming or draft branches. Exactly these 7 live physical branches are active in the system.*

1. **🍗 Tandoori Stop (`tandooristoppk`) — 3 Branches**
   - **Johar Town Branch** (PIA Road, Hakim Chowk, Johar Town, Lahore | `0327-4945947`)
   - **Lake City Branch** (Opposite Lake City Mall, Raiwind Road, Lahore | `0324-4441735`)
   - **GT Road Baghbanpura Branch** (GT Road, Baghbanpura, Lahore | `0326-6811177`)

2. **🍔 Jush PK (`jushhpk`) — 3 Branches**
   - **DHA Phase 1 Branch** (Sector H, DHA Phase 1, Lahore | `03257217221`)
   - **Johar Town Branch** (Block R2, Phase 2 Johar Town, Lahore | `03269946142`)
   - **Lake City Branch** (Business Bay M1, Lake City, Lahore | `03244441735`)

3. **☕ Get A Fomo (`getafomo`) — 1 Branch**
   - **Gulberg III Branch** (65, Block D1, Gulberg III, Lahore | `03212784841`)

### 🏢 Phase 2 Hidden Brands (`is_active = False` for Phase 1)
| Brand Handle | Cuisine / Specialty | Scope |
|---|---|---|
| **seenbanao** | Desi BBQ & Handi items | Phase 2 Website / Direct Outlet |
| **dineatblue** | Seafood specialty | Phase 2 Direct Website |
| **sandmelts** | Sandwiches, melts & shakes | Phase 2 Website / Direct Outlet |
| **birdmanfoodspk** | Grilled & fried chicken | Phase 2 Direct Website |

---

## 📂 Project Directory Structure

```
FoodSphere/
├── /admin                # React Vite Admin Dashboard (HQ Command Center)
│   ├── /src
│   │   ├── /views        # Login, SuperDashboard, BranchDashboard, Order/Menu Mgmt, NotificationCenter, CustomerManagement
│   │   ├── /components   # Sidebar, AnalyticsCharts, Toast, SkeletonLoader
│   │   ├── /services     # api.ts (Fetch wrapper with JWT auth)
│   │   └── AdminContext.tsx # Context managing global state, live API syncing
│   └── package.json
│
├── /admin-app            # React Native / Expo Mobile Management App for Super Admins & Branch Managers
│   ├── /src
│   │   ├── /screens      # LoginScreen, OrderManagementScreen, BranchDashboardScreen, MenuManagementScreen, RiderManagementScreen
│   │   ├── /components   # NewOrderAlertOverlay, RiderAssignmentModal
│   │   ├── /navigation   # AppNavigator (Role-gated navigation shell)
│   │   ├── /store        # Redux Toolkit (auth, orders, menu, riders slices)
│   │   ├── /services     # api.ts (Axios, JWT storage, refresh interception), NewOrderAlertService
│   │   └── theme.ts      # Role-differentiated themes (Super Admin dark vs Branch Manager light)
│   └── package.json
│
├── /app                  # React Native / Expo mobile app

│   ├── /src
│   │   ├── /screens      # Home, Restaurant, Cart, Checkout, Tracking, Rewards, Profile
│   │   ├── /components   # Shared UI components
│   │   ├── /navigation   # Stack & Tab navigators
│   │   ├── /store        # Redux Toolkit state management (user, cart, order, restaurant slices)
│   │   ├── /services     # API calls (axios setup with auth token refresh & session handling)
│   │   └── /assets       # Images, icons, fonts
│   └── package.json
│
├── /backend              # Django REST Framework API
│   ├── /apps (internal structure)
│   │   ├── /restaurants  # Restaurant config, menu, category models, branch overrides
│   │   ├── /orders       # Order placement, status tracking (atomic save, F() expressions)
│   │   ├── /users        # Auth, profiles, loyalty points manual adjustment
│   │   └── /payments     # Stripe, PayFast, COD logic
│   ├── /config           # Settings, URLs, Analytics APIs, FCM notifications, Audit logs
│   ├── requirements.txt
│   └── manage.py
│
├── /websites             # 7 individual restaurant websites
│   ├── /seenbanao
│   ├── /dineatblue
│   ├── /jushhpk
│   ├── /tandooristoppk
│   ├── /sandmelts
│   ├── /birdmanfoodspk
│   └── /getafomo
│
└── GEMINI.md             # This file
```

---

## 🔑 Zaroori Files & Code Routes (Must Know for New Chats)

### 🖥️ Admin Panel (React)
- **Official Manager Logins Directory**: [CREDENTIALS.md](file:///d:/sitesdata/Resturent%20App/CREDENTIALS.md) — complete list of usernames and passwords for Super-Admin and all 7 brand/branch managers.
- **API Requests Handler**: [api.ts](file:///d:/sitesdata/Resturent%20App/admin/src/services/api.ts) — handles token refresh and real API fetch calls.
- **Global Context Provider**: [AdminContext.tsx](file:///d:/sitesdata/Resturent%20App/admin/src/AdminContext.tsx) — holds state for active view, live order lists, toggles, and login actions.
- **Push Notification UI**: [NotificationCenter.tsx](file:///d:/sitesdata/Resturent%20App/admin/src/views/NotificationCenter.tsx) — templates and targeted topic-based FCM dispatch.
- **Customer Points Control**: [CustomerManagement.tsx](file:///d:/sitesdata/Resturent%20App/admin/src/views/CustomerManagement.tsx) — handles searching user profiles and adjusting loyalty rewards.

### 📱 Mobile App (React Native)
- **API Service Layer**: [api.js](file:///d:/sitesdata/Resturent%20App/app/src/services/api.js) — handles JWT storage, bearer headers, 401 interception, and token refresh logic.
- **Auth & Session Reducer**: [userSlice.ts](file:///d:/sitesdata/Resturent%20App/app/src/store/userSlice.ts) — manages auth tokens, login, guest login, profile updates, and `sessionExpired` state.
- **Cart & Order Slices**: [cartSlice.ts](file:///d:/sitesdata/Resturent%20App/app/src/store/cartSlice.ts) & [orderSlice.ts](file:///d:/sitesdata/Resturent%20App/app/src/store/orderSlice.ts) — multi-restaurant cart isolation and state purging on logout/session expiry.

### 🐍 Backend API (Django)
- **Analytics APIs**: [analytics_views.py](file:///d:/sitesdata/Resturent%20App/backend/config/analytics_views.py) — consolidates platform summaries, 30d graphs, and active tenant breakdown.
- **FCM Push Notification Views**: [notification_views.py](file:///d:/sitesdata/Resturent%20App/backend/config/notification_views.py) — endpoint that connects backend to Google Firebase API.
- **Admin Audit Logs**: [mixins.py](file:///d:/sitesdata/Resturent%20App/backend/config/mixins.py) — `AuditLogMixin` which automatically captures creation/updates/deletions on models.
- **CSV Data Export**: [orders/admin.py](file:///d:/sitesdata/Resturent%20App/backend/orders/admin.py) — incorporates `django-import-export` v4 for immediate download of order sheets.

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| **Mobile App** | React Native / Expo |
| **Admin Dashboard** | React.js + Vite + Tailwind CSS |
| **Backend API** | Python · Django · Django REST Framework |
| **Websites** | React.js + Tailwind CSS |
| **Database** | PostgreSQL (production) / SQLite (dev) |
| **Authentication** | JWT Tokens (simplejwt) |
| **Payments** | Stripe + PayFast + Cash on Delivery |
| **Notifications** | Firebase Cloud Messaging (FCM) |
| **Hosting (Websites)** | Cloudflare Pages |
| **Hosting (Admin Dashboard)** | Cloudflare Pages & Vercel (Backup/Primary) |
| **Hosting (Backend)** | Heroku (Primary: https://getfoodpk-fd9b20442fcf.herokuapp.com) / Render (Backup) |

---

## 📦 Deliverables Checklist

- [x] Android APK / AAB (Google Play Store ready)
- [x] iOS build configuration
- [x] Payment integration (Stripe + PayFast + COD)
- [x] Loyalty Points System (F() expressions based)
- [x] Restaurant admin panel (Django Jazzmin + React Dashboard)
- [x] Super-admin dashboard (real-time order polling & live charts)
- [x] 7 fully responsive websites (live on Cloudflare Pages)
- [x] Full GitHub repository access
- [x] Automated integration testing suite (`test_backend.py`)
- [x] Session & Auth Lifecycle Protection (Cross-user state leak isolation)

---

## 📅 Milestone Tracker

| Milestone | Status | Target Date |
|---|---|---|
| App UI Design (Google Stitch mockups) | ✅ Completed (Live on Cloudflare) | Done |
| 7 Website UIs (7 brand sites active) | ✅ Completed (Live on Cloudflare Pages) | Done |
| Backend setup & models | ✅ Completed (Live on Heroku) | Done |
| App core screens (Home, Menu, Cart) | ✅ Completed (Build Configured) | Done |
| Payment integration (Stripe + PayFast) | ✅ Completed (Staging endpoints wired) | Done |
| Admin Panels (Django + React Live) | ✅ Completed (100% Integrated) | Done |
| All 7 websites live | ✅ Completed (7/7 Live) | Done |
| Tandoori Stop Asset Upload | ✅ Completed (41 Menu Items + Logo linked to Cloudinary) | Done |
| Branch Manager Settings Modal | ✅ Completed (Interactive contact & status modal) | Done |
| Heroku 24/7 Deployment | ✅ Completed (Live on getfoodpk-fd9b20442fcf.herokuapp.com) | Done |
| Session & State Leak Security Audit | ✅ Completed (Wired `sessionExpired` & Redux Purging across slices) | Done |
| Dynamic Popular Searches Engine | ✅ Completed (Live `/api/v1/search/popular-tags/` endpoint) | Done |
| In-App Notification Center & Top Toast | ✅ Completed (`inAppNotificationService.ts` & `NotificationToast.tsx`) | Done |
| Monotonic Order Status Engine & Live Track | ✅ Completed (`OrderTrackView` & monotonic status merging in Redux) | Done |
| Branch Loading Race Condition Fix | ✅ Completed (Suppressed false branch closed alerts on Checkout) | Done |
| Dispatch Modal Rider Hydration Fix | ✅ Completed (Active live API query fetch & multi-type branch matching) | Done |
| Tenant & Branch Scoped Order ID Overhaul | ✅ Completed (Human-readable `display_order_id` TS-LC-1001 & data migration) | Done |
| Universal Order Mode Engine (Dine-In/Takeaway) | ✅ Completed (Order mode toggle, table_number, delivery fee bypass) | Done |
| Cart Promo Code Input Engine & Validation | ✅ Completed (`CartScreen.tsx` input + `/coupons/validate/` API discount preview) | Done |
| 1-Tap Reorder API Endpoint | ✅ Completed (`POST /api/orders/<pk>/reorder/` with stock availability check) | Done |
| Persistent Search & History | ✅ Completed (`AsyncStorage` `@getfood_recent_searches` with clear & submit handlers) | Done |
| Admin Mobile App Scaffold (Phases 1-3) | ✅ Completed (`admin-app` scaffold, JWT auth, order polling, foreground ringing) | Done |
| Admin Mobile App Menu Management (Phase 4) | ✅ Completed (Role-scoped catalog, per-branch availability toggle, gallery photo upload) | Done |
| Admin Mobile App Rider Roster & Dispatch (Phase 5) | ✅ Completed (Rider roster CRUD, tap-to-call, atomic dispatch modal integration) | Done |
| Admin Mobile App Super Admin HQ Core (Phase 6A) | ✅ Completed (Platform analytics, multi-brand onboarding, branch manager provisioning & password reset) | Done |
| Admin Mobile App Super Admin CRM & Growth Suite (Phase 6B) | ✅ Completed (Customer CRM with loyalty adjustment, Promo Coupons engine, Flash Deals, FCM Push Notification center) | Done |
| Dual-App Integration, Merchant Alarm & Guest Gate | ✅ Completed (`test_dual_app_e2e.py` 100% pass, unstoppable merchant alarm, guest gate form restoration, account isolation) | Done |
| Flash Deals Engine v2.0 (Option A + Recurring Midnight Specials) | ✅ Completed (6-step progressive admin modal, item scoping hierarchy, midnight rollover, FlashDealRedemption ledger, 39/39 test pass) | Done |
| Customer App Guest Profile State & Auth Redirection (Phase 1 & 5) | ✅ Completed (Dual-mode guest profile card, hierarchy-aware post-auth navigation reset, form restoration) | Done |
| Customer App Home Header Layout & Fulfillment Streamlining (Phase 2) | ✅ Completed (Responsive flexbox, compact Sign In pill, truncated location, removal of obsolete toggle bar) | Done |
| Merchant Manager App Standalone APK Startup Crash Fix (Phase 3) | ✅ Completed (`react-native-gesture-handler` root entry, `GestureHandlerRootView`, `ErrorBoundary`, native permissions) | Done |
| Merchant Manager App Rider Modal Navigation & Vector Tabs (Phase 4) | ✅ Completed (Route mismatch fix to `'RiderManagement'`, `@expo/vector-icons` Ionicons integration with active pills) | Done |
| Customer Order History User-Scoping & Cache Isolation (Phase 6) | ✅ Completed (Strict `Order.objects.filter(user=user)` in DRF, Redux map isolation, Heroku v85 deploy) | Done |
| Firebase Push Notifications | ⏳ Pending (Awaiting client Firebase JSON key) | Client Handoff |
| App store submission | ⏳ Pending (Awaiting client developer accounts) | TBD |

### 🔗 Deployed Prototypes

#### ⛅️ Cloudflare Pages & Vercel (Active)
- **GetFood Customer App (Web Preview):** [https://getfood-app.pages.dev](https://getfood-app.pages.dev)
- **admin panel website:** [https://foodsphere-admin.pages.dev](https://foodsphere-admin.pages.dev) (Vercel Primary: [https://admin-orpin-psi.vercel.app](https://admin-orpin-psi.vercel.app))
- **seenbanao website:** [https://seenbanao-foodsphere.pages.dev](https://seenbanao-foodsphere.pages.dev)
- **dineatblue website:** [https://dineatblue-foodsphere.pages.dev](https://dineatblue-foodsphere.pages.dev)
- **jushhpk website:** [https://jushhpk-foodsphere.pages.dev](https://jushhpk-foodsphere.pages.dev)
- **tandooristoppk website:** [https://tandooristoppk-foodsphere.pages.dev](https://tandooristoppk-foodsphere.pages.dev)
- **sandmelts website:** [https://sandmelts-foodsphere.pages.dev](https://sandmelts-foodsphere.pages.dev)
- **birdmanfoodspk website:** [https://birdmanfoodspk-foodsphere.pages.dev](https://birdmanfoodspk-foodsphere.pages.dev)
- **getafomo website:** [https://getafomo-foodsphere.pages.dev](https://getafomo-foodsphere.pages.dev)

---

## 🔑 Key Architecture Decisions & Technical Invariants

1. **Multi-tenant backend:** Single Django instance serving all restaurants — new brands added via database, not code changes.
2. **Unified API:** One set of endpoints, `restaurant_id` as parameter.
3. **Modular websites:** Each website is an independent React app — can be deployed/updated independently.
4. **Guest ordering:** No account required to place an order (JWT guest token).
5. **Session Expiry & State Reset Invariant:** Whenever HTTP 401 occurs (or user logs out), Redux state across `userSlice`, `cartSlice`, and `orderSlice` MUST be purged completely (`sessionExpired` / `logout`). User A's cart or order data MUST NEVER leak to User B on shared devices.
6. **Mobile Fallback & Database Primary Keys:** Static fallback data in `app/src/services/fallbackData.ts` and component fallback maps match live Heroku PostgreSQL primary keys in Django (`seenbanao`: 1, `dineatblue`: 2, `jushhpk`: 3, `tandooristoppk`: 4, `sandmelts`: 5, `birdmanfoodspk`: 6, `getafomo`: 7). Render backup uses offset keys (70-76).
7. **Stock Availability Rules:** `MenuCategorySerializer` in DRF must **ALWAYS** return all menu items (including `is_available = False`). Out-of-stock items MUST remain visible in customer apps with an **"OUT OF STOCK"** badge and disabled button rather than being removed.
8. **Heroku Deployment Command:** Deploy backend updates using `git subtree push --prefix backend heroku main`.
9. **Branch Serializer Invariant:** `RestaurantSerializer` in DRF must **ALWAYS** include `branches = BranchSerializer(many=True, read_only=True)`. List endpoints (`/api/restaurants/`) MUST return nested branch arrays so managers and mobile apps receive branch location/phone/status data.
10. **Admin Dashboard Branch Binding:** In `AdminContext.tsx` and `BranchDashboard.tsx`, branch manager views MUST bind address, phone, and `is_active` status to `currentBranch` (resolved via `resolveUserBranchId`), NEVER to top-level `restaurant.address` / `restaurant.phone` fallbacks.
11. **Primary Admin Hosting (Vercel):** Live at [https://foodsphere-admin.vercel.app](https://foodsphere-admin.vercel.app). Deploy via CLI `npx vercel --token <TOKEN> --scope abdullah-47c1 --yes --prod` and alias `foodsphere-admin.vercel.app`.
12. **Price Modifier DB Verification Invariant:** `OrderCreateSerializer` in DRF MUST ALWAYS re-verify `selected_options` against `MenuItem.options` stored in database to prevent negative price injection attack vectors.
13. **Loyalty Cancellation Reversal Invariant:** When an order status is updated to `cancelled`, any redeemed loyalty points MUST be refunded to the user's loyalty balance (`F('loyalty_points') + points`), and any earned points reverted.
14. **Branch-Specific Stock Override:** `BranchMenuItemAvailability` model allows branch managers to set items out-of-stock for their specific branch (`POST /api/restaurants/branch-item-availability/`).
15. **Monotonic Order Status Engine Invariant:** Redux `orderSlice.ts` and `TrackingScreen.tsx` MUST use monotonic rank ordering (`getStatusRank`) to ensure polling/refetching data NEVER rolls back an order's status to a previous stage.
16. **Universal Live Track API:** Endpoint `GET /api/v1/orders/<pk>/track/` is unauthenticated (`AllowAny`) to support guest and user real-time order tracking without login header race conditions.
17. **Dispatch Modal Rider Hydration Invariant:** Assign Rider modal MUST perform an active live API fetch (`fetchRiders({ branch_id, status: 'AVAILABLE', is_active: true })`) upon opening, using multi-type branch comparison (`Number(r.branch) === Number(targetBranchId)` || slug || name) to prevent stale cached rider state.
18. **Tenant & Branch-Scoped Order ID Invariant:** `Order.display_order_id` MUST be populated upon order creation in the format `{BRAND_CODE}-{BRANCH_CODE}-{SEQUENCE}` (e.g., `TS-LC-1001`, `JK-JT-1001`). Sequence counters MUST be scoped per branch/tenant starting at 1001. All UI components (Admin Kanban, Order Receipts, Dispatch Modals, Customer Tracking) MUST display `order.display_order_id || `#${order.id}``.
19. **Universal Order Mode Invariant:** `Order.order_type` MUST support `DELIVERY`, `TAKEAWAY`, and `DINE_IN`. Dine-In orders MUST populate `table_number` and bypass delivery address requirements & delivery fees.
20. **Reorder Engine Invariant:** `ReorderView` (`POST /api/orders/<pk>/reorder/`) MUST validate item stock availability against current DB state and segregate out-of-stock items into an `unavailable_items` list.
21. **Persistent Search & App Rebrand Invariant:** App Expo configuration MUST be named `GetFood` in `app.json`. Recent search history MUST be persisted locally via `AsyncStorage` (`@getfood_recent_searches`).
22. **Brand Website Cloudflare Pages Deployment Invariant:** The 7 individual brand websites (`seenbanao`, `dineatblue`, `jushhpk`, `tandooristoppk`, `sandmelts`, `birdmanfoodspk`, `getafomo`) are deployed to Cloudflare Pages via **Wrangler Direct Upload** (`Git Provider: No`). Any updates to `websites/` MUST be deployed using `npx wrangler pages deploy websites/<brand_slug> --project-name=<brand_slug>-foodsphere` in addition to pushing code to GitHub `main`.
23. **Cart Drawer Image & Asset Fallback Invariant:** `CartDrawer.addItem` and `findProductImage` MUST resolve item images dynamically from `window.menuData` (`image_url` / `image` / `thumbnail`), DOM card images, or local brand asset paths (`./images/...`). Unsplash URLs (`https://images.unsplash.com/...`) MUST NEVER be returned by `resolveItemImage()` or used as fallbacks in `live_catalog.js` or `CartDrawer` components. If an item has no image, a clean emoji badge (e.g. `🫓`, `🍖`, `🍟`, `🥤`) MUST be rendered.
24. **JWT Token Rotation & App Launch Invariant:** `loadSavedToken` in `userSlice.ts` MUST NEVER proactively trigger `/auth/refresh/` on app launch. Since Django backend uses `ROTATE_REFRESH_TOKENS=True` and `BLACKLIST_AFTER_ROTATION=True`, proactive refresh invalidates the stored refresh token and creates a race condition where concurrent API requests receive HTTP 401, triggering `sessionExpired` purges. `loadSavedToken` MUST validate the active `auth_token` via `GET /users/profile/` first, and ONLY refresh if `/users/profile/` returns HTTP 401. Furthermore, any token refresh MUST save both the new `access` token and the rotated `refresh` token to `AsyncStorage` (`auth_token` and `refresh_token`), and the API 401 interceptor MUST skip `sessionExpired` dispatches if `!isAuthenticated` or user is a guest.
25. **Mandatory Authenticated Order Placement & Form State Preservation Invariant:** Unauthenticated or guest users MUST NOT be permitted to create orders in the database. Frontend `CheckoutScreen.tsx` MUST allow guests to fill out delivery inputs and select branches, but MUST intercept the `Place Order` button trigger behind a mandatory Sign In modal. Checkout input values MUST be saved to `@getfood_checkout_saved_form` in `AsyncStorage` and passed in `returnParams` to `AuthScreen`, restoring all form fields automatically upon post-auth navigation back to `CheckoutScreen`. Backend `OrderListCreateView` (POST) MUST enforce `IsAuthenticated` and `OrderCreateSerializer.validate()` MUST reject anonymous / guest user order creation.
26. **Admin Mobile App Role & Theme Scoping Invariant:** `admin-app` MUST strictly scope permissions and theme tokens by user role. Super Admin views MUST use slate dark theme (`COLORS.superAdmin.*`), brand selectors across all 7 brands, and full CRUD permissions. Branch Manager views MUST use warm light theme (`COLORS.branchManager.*`), scope strictly to the manager's assigned branch (`auth.branchId` / `auth.restaurantId`), and restrict operations to low-friction operational controls (per-branch stock toggling via `POST /api/restaurants/branch-item-availability/`, order status transitions, rider availability toggles).
27. **Rider Dispatch Atomic Side-Effects Invariant:** Assigning a rider to a `preparing` order (`POST /api/orders/{id}/assign-rider/`) automatically sets `order.status = 'out_for_delivery'` and `rider.status = 'ON_DELIVERY'` server-side. Setting order status to `delivered` or `cancelled` automatically frees up the rider (`rider.status = 'AVAILABLE'`) in backend `orders/models.py`. The mobile app MUST NOT make secondary client-side status PATCH calls after rider assignment.
28. **In-App Foreground Order Ringing Invariant:** `admin-app` uses `NewOrderAlertService` event bus singleton coupled to root-level `useOrderPolling` to trigger a full-screen takeover modal (`NewOrderAlertOverlay`) with looping sound (`expo-av` with `isLooping: true`) and screen keep-awake (`expo-keep-awake`) whenever new unaccepted orders arrive while foregrounded.
29. **Admin Mobile App Comprehensive 12-View Suite:** All 12 views in `admin-app` (Login, OrderManagement, BranchDashboard, MenuManagement, RiderManagement, SuperDashboard, TenantManagement, ManagerManagement, CustomerManagement, PromoManagement, FlashDealManagement, NotificationCenter) are 100% implemented, role-scoped, wired to real DRF backend APIs, and verified with zero compilation errors (`npx tsc --noEmit`).
30. **Flash Deals Engine v2.0 Invariant:** Flash deals support multi-tier item scoping (`ENTIRE_MENU`, `CATEGORY`, `SPECIFIC_ITEMS`), 3-way order modes (`ALL`, `DELIVERY`, `DINE_IN`), recurring daily schedules with timezone-aware midnight rollover (e.g. 10 PM – 2 AM with yesterday date boundary protection), priority conflict resolution (Priority integer -> Specificity -> Discount magnitude), and audit-ready `FlashDealRedemption` ledger tracking with customizable reset frequency (`DAILY` vs `LIFETIME`).
31. **Phase 1 Active Launch Brands Scoping Invariant:** All frontend brand pickers, filter chips, restaurant selectors, and deal/coupon target modals across `admin-app` and `admin` MUST strictly show ONLY the **3 active Phase 1 launch brands** (`tandooristoppk`, `jushhpk`, `getafomo`) and their 7 real operational branches. Inactive Phase 2 brands (`seenbanao`, `dineatblue`, `sandmelts`, `birdmanfoodspk`) MUST be filtered out by default using `filterActiveLaunchBrands` in `api.ts`. Any newly added features, screens, or dropdowns across the mobile and web admin portals MUST strictly inherit this active launch brands filter.
32. **Standalone Android APK Gesture Handler & Crash Recovery Invariant:** `import 'react-native-gesture-handler';` MUST be the very first line executed in the JavaScript bundle (top of `index.ts`), and the root view tree MUST be wrapped in `<GestureHandlerRootView style={{ flex: 1 }}>` and `<ErrorBoundary>`. `app.json` MUST declare `"android.permission.VIBRATE"`, `"android.permission.WAKE_LOCK"`, and `"android.permission.POST_NOTIFICATIONS"` to prevent OS security exceptions during sound/vibration alerts.
33. **Hierarchy-Aware Post-Auth Navigation Redirection Invariant:** In `AuthScreen.tsx`, post-auth redirection MUST distinguish nested tab destinations (`'Home'`, `'Map'`, `'Search'`, `'Cart'`, `'Orders'`, `'Profile'`) from root stack screens (`'Checkout'`, `'Restaurant'`, `'Tracking'`, `'Rewards'`, `'Legal'`, `'FlashDeals'`). For nested tabs, root stack MUST be reset to `Main` with nested state projection (`state: { routes: [{ name: returnScreen, params }] }`). Malformed flat reset arrays containing nested tab names at root level MUST NEVER be passed to `navigation.reset`.
34. **Strict Customer Order History Query Scoping Invariant:** `MyOrdersListView` in DRF backend MUST strictly query `Order.objects.filter(user=request.user)`. Fuzzy substring matching on guest names (`guest_name__icontains`) and database re-assignment mutations (`update(user=user)`) MUST NEVER be executed during customer order listing requests.
35. **Frontend Order State Cache Isolation Invariant:** In `orderSlice.ts`, `fetchMyOrders.fulfilled` MUST construct the order state map strictly from `fetchedArray` (the active user's authenticated response) rather than pre-populating with old session state, preventing cross-account state bleeding on shared devices. Order state MUST be purged completely on `guestLogin.fulfilled`, `logoutUser.fulfilled`, and `sessionExpired`.
36. **Bottom Navigation Vector Icon Standardization Invariant:** All bottom navigation tab bars across `admin-app` and `app` MUST use vector glyphs (`@expo/vector-icons` / `Ionicons`) with explicit theme active/inactive tokens and pill background highlights (`tabIconPill`), NEVER raw emoji unicode characters inside text containers.

---

## 📞 Important Notes for AI Assistants

- Always maintain **multi-tenant** thinking — every feature must work for N restaurants, not just 7.
- **Loyalty points** are a core feature — not an afterthought.
- **COD is the primary payment method** — Stripe/PayFast are secondary.
- App UX must feel as polished as **FoodPanda / Talabat**.
- Backend must have **separate admin access per restaurant owner**.
- All 7 websites are **static-first** (no backend dependency) with form submission via Formspree.
- **getafomo** requires Instagram feed integration — plan for this early.
- Code must be clean, commented, and **handoff-ready** for client's future team.
