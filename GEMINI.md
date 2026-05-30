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

## 🗺️ Project Phases

### Phase 1 — Mobile App (React Native / Flutter)
The **primary deliverable** and main focus of the project.

**Core Features:**
- [ ] Single unified app listing all 7 restaurants
- [ ] Individual restaurant profiles (menu, cuisine info, delivery timings)
- [ ] Cart & order placement — **Cash on Delivery (COD)**
- [ ] Online payments — **Stripe** (international) + **PayFast** (local PK)
- [ ] Basic order tracking: `received → preparing → out for delivery → delivered`
- [ ] Push notifications for order updates
- [ ] User login / register — **guest ordering also supported**
- [ ] Restaurant search + filter by cuisine, dish, or restaurant name
- [ ] **Loyalty Points System:** earn on every order, redeem for discounts
- [ ] Available on **Android (Google Play)** + **iOS (App Store)**

---

### Phase 2 — Backend (Python Django REST Framework)

**Architecture: Multi-tenant, RESTful API**

**Core Features:**
- [ ] **Per-restaurant admin panel:** manage menu, prices, availability
- [ ] View & update incoming order statuses
- [ ] **Super-admin dashboard:** manage all restaurants from one place
- [ ] RESTful API endpoints consumed by mobile app
- [ ] Database: users, orders, menus, restaurants, loyalty points

**Key Design Requirement:**
> The backend MUST be designed so adding a new restaurant brand requires zero schema migrations — just a new restaurant record. Use a generic multi-tenant data model.

---

### Phase 3 — 7 Individual Websites (React.js + Tailwind CSS)

Each restaurant gets its **own branded, fully responsive website**:
- Static content + contact/order form (Formspree or similar — no backend needed)
- Hosted on **Netlify / Vercel**
- SEO optimized, mobile-first

**Per-brand requirements listed in Brand Table above.**

---

### Phase 4 — Deployment

| Component | Target Platform |
|---|---|
| Android App | Google Play Store |
| iOS App | Apple App Store + TestFlight |
| 7 Websites | Netlify / Vercel (client's domain/subdomain) |
| Backend API | AWS / Heroku / VPS |

---

## 🛠️ Technical Stack

| Layer | Technology |
|---|---|
| **Mobile App** | React Native or Flutter |
| **Backend API** | Python · Django · Django REST Framework |
| **Websites** | React.js + Tailwind CSS |
| **Database** | PostgreSQL (production) / SQLite (dev) |
| **Authentication** | JWT Tokens |
| **Payments** | Stripe + PayFast + Cash on Delivery |
| **Notifications** | Firebase Cloud Messaging (FCM) |
| **Version Control** | Git + GitHub |
| **Hosting (Websites)** | Netlify / Vercel |
| **Hosting (Backend)** | AWS / Heroku / VPS |

---

## 📂 Recommended Folder Structure

```
FoodSphere/
├── /app                  # React Native / Flutter mobile app
│   ├── /src
│   │   ├── /screens      # Home, Restaurant, Cart, Orders, Profile
│   │   ├── /components   # Shared UI components
│   │   ├── /navigation   # Stack & Tab navigators
│   │   ├── /store        # Redux / Zustand state management
│   │   ├── /services     # API calls (axios)
│   │   └── /assets       # Images, icons, fonts
│   └── package.json
│
├── /backend              # Django REST Framework API
│   ├── /apps
│   │   ├── /restaurants  # Restaurant model, menu, timings
│   │   ├── /orders       # Order model, status tracking
│   │   ├── /users        # Auth, profile, loyalty points
│   │   └── /payments     # Stripe, PayFast integration
│   ├── /config           # Django settings, URLs
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

## 🎨 Design Guidelines

### App Design (FoodPanda-inspired)
- **Style:** Clean, modern, food-forward
- **Color Palette:** Bold accent (orange/red food tones) + white background + dark text
- **UX Pattern:** Tab-based navigation (Home, Search, Orders, Profile)
- **Home Screen:** Featured restaurants, banner carousel, cuisine category chips
- **Restaurant Screen:** Cover photo, menu categories, items with photos & prices
- **Cart:** Sticky bottom bar showing item count + total
- **Typography:** Sans-serif, readable (e.g., Inter, Poppins)

### Brand Websites
- Each site must feel **unique to the brand** while maintaining professional quality
- Mobile-first responsive design
- Fast load times (optimized images, lazy loading)

---

## 📦 Deliverables Checklist

- [ ] Android APK / AAB (Google Play Store ready)
- [ ] iOS build (App Store + TestFlight)
- [ ] Payment integration (Stripe + PayFast + COD)
- [ ] Loyalty Points System
- [ ] Restaurant admin panel (per brand)
- [ ] Super-admin dashboard
- [ ] 7 fully responsive websites (live on client domains)
- [ ] Full GitHub repository access
- [ ] Documentation guide (orders & menu management)

---

## ⚖️ Terms & Conditions (Contract Notes)

- **Website hosting & domain names:** NOT included in proposal
- **Revisions:** 2 rounds free per website / app screen — additional revisions are chargeable
- **Client responsibility:** Provide brand assets (logos, photos, menu details) per restaurant

---

## 🚀 Development Priority Order

```
1. App UI Design (Google Stitch mockups) ← START HERE
2. Backend API architecture & models
3. Mobile App (React Native) — core screens
4. Payment integration (Stripe + PayFast)
5. Loyalty points system
6. Restaurant admin panels
7. Super-admin dashboard
8. 7 Individual websites (React.js + Tailwind)
9. Deployment & store submissions
```

---

## 📅 Milestone Tracker

| Milestone | Status | Target Date |
|---|---|---|
| App UI Design (Google Stitch mockups) | ✅ Completed (Live on Cloudflare) | Done |
| 3 Website UIs (6 brand sites active) | ✅ Completed (Live on Cloudflare) | Done |
| Backend setup & models | ✅ Completed (Live on Render) | Done |
| App core screens (Home, Menu, Cart) | ⏳ Pending (Local Build Active) | TBD |
| Payment integration | ⏳ Pending | TBD |
| All 7 websites live | ✅ Completed (7/7 Live) | Done |
| App store submission | ⏳ Pending | TBD |

### 🔗 Deployed Prototypes (Netlify)
- **seenbanao website:** [https://seenbanao-foodsphere-201.netlify.app](https://seenbanao-foodsphere-201.netlify.app)
- **dineatblue website:** [https://dineatblue-foodsphere-501.netlify.app](https://dineatblue-foodsphere-501.netlify.app)
- **jushhpk website:** [https://jushhpk-foodsphere-919.netlify.app](https://jushhpk-foodsphere-919.netlify.app)
- **tandooristoppk website:** [https://tandooristoppk-foodsphere-758.netlify.app](https://tandooristoppk-foodsphere-758.netlify.app)
- **sandmelts website:** [https://sandmelts-foodsphere-676.netlify.app](https://sandmelts-foodsphere-676.netlify.app)
- **birdmanfoodspk website:** [https://birdmanfoodspk-foodsphere-978.netlify.app](https://birdmanfoodspk-foodsphere-978.netlify.app)
- **getafomo website:** [https://getafomo-foodsphere-849.netlify.app](https://getafomo-foodsphere-849.netlify.app)


---

## 🔑 Key Architecture Decisions

1. **Multi-tenant backend:** Single Django instance serving all restaurants — new brands added via database, not code changes
2. **Unified API:** One set of endpoints, restaurant_id as parameter
3. **Modular websites:** Each website is an independent React app — can be deployed/updated independently
4. **Guest ordering:** No account required to place an order (JWT guest token)
5. **Offline resilience:** App should cache menu data for offline viewing

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
