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
- **Current Scope:** 5 brands active at launch (2 more to be onboarded soon)
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

> ⚠️ **Phase 1 Active Brands:** 5 brands launching first. All 7 must be architected from day one for clean onboarding.

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
│   │   ├── /store        # Redux Toolkit state management
│   │   ├── /services     # API calls (axios setup)
│   │   └── /assets       # Images, icons, fonts
│   └── package.json
│
├── /backend              # Django REST Framework API
│   ├── /apps (internal structure)
│   │   ├── /restaurants  # Restaurant config, menu, category models
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
- **API Requests Handler**: [api.ts](file:///d:/sitesdata/Resturent%20App/admin/src/services/api.ts) — handles token refresh and real API fetch calls.
- **Global Context Provider**: [AdminContext.tsx](file:///d:/sitesdata/Resturent%20App/admin/src/AdminContext.tsx) — holds state for active view, live order lists, toggles, and login actions.
- **Push Notification UI**: [NotificationCenter.tsx](file:///d:/sitesdata/Resturent%20App/admin/src/views/NotificationCenter.tsx) — templates and targeted topic-based FCM dispatch.
- **Customer Points Control**: [CustomerManagement.tsx](file:///d:/sitesdata/Resturent%20App/admin/src/views/CustomerManagement.tsx) — handles searching user profiles and adjusting loyalty rewards.

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
| **Hosting (Websites)** | Netlify / Vercel |
| **Hosting (Admin Dashboard)** | Cloudflare Pages |
| **Hosting (Backend)** | Render.com |

---

## 📦 Deliverables Checklist

- [x] Android APK / AAB (Google Play Store ready)
- [x] iOS build configuration
- [x] Payment integration (Stripe + PayFast + COD)
- [x] Loyalty Points System (F() expressions based)
- [x] Restaurant admin panel (Django Jazzmin + React Dashboard)
- [x] Super-admin dashboard (real-time order polling & live charts)
- [x] 7 fully responsive websites (live on netlify/cloudflare pages)
- [x] Full GitHub repository access
- [x] Automated integration testing suite (`test_backend.py`)

---

## 📅 Milestone Tracker

| Milestone | Status | Target Date |
|---|---|---|
| App UI Design (Google Stitch mockups) | ✅ Completed (Live on Cloudflare) | Done |
| 7 Website UIs (7 brand sites active) | ✅ Completed (Live on Netlify/Cloudflare) | Done |
| Backend setup & models | ✅ Completed (Live on Render) | Done |
| App core screens (Home, Menu, Cart) | ✅ Completed (Build Configured) | Done |
| Payment integration (Stripe + PayFast) | ✅ Completed (Staging endpoints wired) | Done |
| Admin Panels (Django + React Live) | ✅ Completed (100% Integrated) | Done |
| All 7 websites live | ✅ Completed (7/7 Live) | Done |
| App store submission | ⏳ Pending (Awaiting client accounts) | TBD |

---

## 🔑 Key Architecture Decisions

1. **Multi-tenant backend:** Single Django instance serving all restaurants — new brands added via database, not code changes
2. **Unified API:** One set of endpoints, restaurant_id as parameter
3. **Modular websites:** Each website is an independent React app — can be deployed/updated independently
4. **Guest ordering:** No account required to place an order (JWT guest token)
5. **Offline resilience:** App caches menu data for offline viewing

---

## 📞 Important Notes for AI Assistants

- Always maintain **multi-tenant** thinking — every feature must work for N restaurants, not just 7
- **Loyalty points** are a core feature — not an afterthought
- **COD is the primary payment method** — Stripe/PayFast are secondary
- App UX must feel as polished as **FoodPanda / Talabat**
- Backend must have **separate admin access per restaurant owner**
- All 7 websites are **static-first** (no backend dependency) with form submission via Formspree
- **getafomo** requires Instagram feed integration — plan for this early
- Code must be clean, commented, and **handoff-ready** for client's future team
