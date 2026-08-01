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

## 🏪 The 7 Restaurant Brands

| # | Brand Handle | Cuisine / Specialty | Key Features Needed |
|---|---|---|---|
| 1 | **seenbanao** | Desi BBQ & Handi items | Delivery timing, location map, COD order form |
| 2 | **dineatblue** | Seafood specialty | Reservation inquiry, contact form |
| 3 | **jushhpk** | Fast food & burgers | Combo deals, working hours |
| 4 | **tandooristoppk** | Tandoori items, naan/roti counter | Gallery, phone order option |
| 5 | **sandmelts** | Sandwiches, melts & shakes | Nutrition info |
| 6 | **birdmanfoodspk** | Grilled & fried chicken | Catering inquiry |
| 7 | **getafomo** | Trendy café items | Instagram feed integration, event booking |

> ⚠️ **Phase 1 Active Brands:** 3 brands launching first. All 7 must be architected from day one for clean onboarding.

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
| Admin Live SLA Monitoring Timers | ✅ Completed (`OrderManagement.tsx` <15m green, 15-30m amber, >30m overdue pulse) | Done |
| SuperDashboard Today vs Yesterday Trends | ✅ Completed (`SuperDashboard.tsx` sales & order count growth indicators) | Done |
| GetFood App Rebrand Configuration | ✅ Completed (`app.json`, `AuthScreen`, `HomeScreen` branding updated) | Done |
| Firebase Push Notifications | ⏳ Pending (Awaiting client Firebase JSON key) | Client Handoff |
| App store submission | ⏳ Pending (Awaiting client developer accounts) | TBD |

### 🔗 Deployed Prototypes

#### ⛅️ Cloudflare Pages & Vercel (Active)
- **admin panel website:** [https://foodsphere-admin.vercel.app](https://foodsphere-admin.vercel.app) (Backup: [https://foodsphere-admin.pages.dev](https://foodsphere-admin.pages.dev))
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
