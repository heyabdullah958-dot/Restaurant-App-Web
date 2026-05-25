# 🍽️ FoodSphere — Complete Project Handoff Document
> For: Next AI Session (Gemini)  
> Prepared: 2026-05-25  
> Project Location: `d:\sitesdata\Resturent App\`

---

## 📌 Project Summary

FoodSphere is a **multi-brand food delivery aggregator** — like FoodPanda — with:
- **1 unified mobile app** (React Native) showing all 7 restaurants
- **7 individual restaurant websites** (HTML/CSS/JS static)
- **1 Django REST backend** (multi-tenant)

---

## ✅ COMPLETED WORK (Don't Redo This)

### Phase 1 — App UI Prototype ✅
- `d:\sitesdata\Resturent App\index.html` — Full 10-screen app prototype
- `d:\sitesdata\Resturent App\style.css` — Complete app styling (2770 lines)
- `d:\sitesdata\Resturent App\app.js` — All JS logic (screens, cart, checkout, loyalty)
- **Live:** https://foodsphere-app.pages.dev (Cloudflare Pages)
- Screens: Splash, Onboarding, Home, Restaurant, Cart, Checkout, Tracking, Rewards, Orders, Profile

### Phase 2 — Individual Restaurant Websites ✅ (6 of 7 Live)
All in `d:\sitesdata\Resturent App\websites\`

| Brand | Folder | Live URL |
|---|---|---|
| SeenBanao (Desi BBQ) | `websites/seenbanao/` | https://foodsphere-seenbanao.pages.dev |
| DineAtBlue (Seafood) | `websites/dineatblue/` | https://foodsphere-dineatblue.pages.dev |
| JushhPK (Fast food) | `websites/jushhpk/` | https://foodsphere-jushhpk.pages.dev |
| TandooriStoppPK | `websites/tandooristoppk/` | https://foodsphere-tandooristoppk.pages.dev |
| SandMelts | `websites/sandmelts/` | https://foodsphere-sandmelts.pages.dev |
| GetAFomo (Café) | `websites/getafomo/` | https://foodsphere-getafomo.pages.dev |
| BirdManFoodsPK | `websites/birdmanfoodspk/` | ⏳ NOT BUILT YET |

Each website has:
- Full responsive HTML/CSS/JS (self-contained, no backend)
- Dynamic menu with cart/order form
- Formspree contact/order form
- Mobile media query `@media(max-width:768px)` applied

### Phase 3 — Mobile Responsiveness ✅
- All 6 websites have mobile responsive CSS
- App `style.css` has `@media (max-width: 1024px)` block (lines 2687–2768)

---

## 🐛 PENDING BUG FIXES (Do These First)

### Bug 1 — `jushhpk/index.html`: Duplicate closing tags
* **Status:** FIXED ✅

### Bug 2 — `getafomo/index.html`: Menu grid style conflict
* **Status:** FIXED ✅

### Bug 3 — `app.js`: Sidebar nav active state not resetting
* **Status:** FIXED ✅

### Bug 4 — `index.html`: Bottom nav active hardcoded
* **Status:** FIXED ✅

### Bug 5 — `index.html`: Search screen missing
* **Status:** FIXED ✅

### Bug 6 — `getafomo/index.html`: Instagram tiles UX
* **Status:** FIXED ✅

### Bug 7 — `seenbanao/index.html`: Urdu letter overflow on 320px
* **Status:** FIXED ✅

### Bug 8 — `style.css`: Missing scroll on phone-screen mobile
* **Status:** FIXED ✅

---

## ⏳ REMAINING PHASES TO BUILD

---

## 🔵 Phase 4 — Django REST Backend

### Project Location
Create at: `d:\sitesdata\Resturent App\backend\`

### Tech Stack
- Python 3.11+
- Django 4.2
- Django REST Framework
- PostgreSQL (production) / SQLite (dev)
- JWT Authentication (djangorestframework-simplejwt)
- CORS Headers (django-cors-headers)

### Setup Commands
```bash
cd "d:\sitesdata\Resturent App"
mkdir backend
cd backend
python -m venv venv
venv\Scripts\activate
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers Pillow psycopg2-binary python-decouple
django-admin startproject config .
python manage.py startapp restaurants
python manage.py startapp orders
python manage.py startapp users
python manage.py startapp payments
```

### Required Models

#### `restaurants/models.py`
```python
class Restaurant(models.Model):
    name, slug, cuisine_type, logo, cover_image
    description, address, city, phone
    is_active, is_featured
    opens_at, closes_at
    delivery_time_min, delivery_time_max
    min_order_amount, delivery_fee
    rating, total_reviews
    created_at, updated_at

class MenuCategory(models.Model):
    restaurant (FK), name, icon, order, is_active

class MenuItem(models.Model):
    category (FK), name, description
    price, image, is_available, is_featured
    preparation_time
```

#### `orders/models.py`
```python
class Order(models.Model):
    user (FK nullable — supports guest orders)
    restaurant (FK)
    guest_name, guest_phone (for guest orders)
    status: received → preparing → out_for_delivery → delivered
    payment_method: cod / stripe / payfast
    delivery_address, delivery_lat, delivery_lng
    subtotal, delivery_fee, discount, total
    special_instructions
    created_at, updated_at

class OrderItem(models.Model):
    order (FK), menu_item (FK)
    quantity, unit_price, total_price
    special_notes
```

#### `users/models.py`
```python
class User(AbstractUser):
    phone, profile_photo
    loyalty_points
    is_guest (bool)

class LoyaltyTransaction(models.Model):
    user (FK), order (FK nullable)
    points, transaction_type (earned/redeemed)
    description, created_at
```

#### `payments/models.py`
```python
class Payment(models.Model):
    order (FK), method (cod/stripe/payfast)
    amount, status, transaction_id
    gateway_response (JSON)
    created_at
```

### Required API Endpoints

```
GET  /api/restaurants/              — List all active restaurants
GET  /api/restaurants/{slug}/       — Restaurant detail + menu
GET  /api/restaurants/{slug}/menu/  — Full menu by category

POST /api/orders/                   — Place order (auth + guest)
GET  /api/orders/{id}/              — Order detail + status
GET  /api/orders/my-orders/         — User's order history

POST /api/auth/register/            — Register user
POST /api/auth/login/               — JWT login
POST /api/auth/guest/               — Get guest JWT token
POST /api/auth/refresh/             — Refresh JWT

GET  /api/users/profile/            — User profile
GET  /api/users/loyalty/            — Loyalty points + history

POST /api/payments/cod/confirm/     — COD payment confirm
POST /api/payments/stripe/create/   — Create Stripe PaymentIntent
POST /api/payments/stripe/confirm/  — Confirm Stripe payment
POST /api/payments/payfast/notify/  — PayFast IPN webhook
```

### Admin Panels
- Per-restaurant admin: `RestaurantAdmin` with menu management
- Super-admin: Full access to all restaurants + orders

### Django Settings Key Config
```python
INSTALLED_APPS = [
    'restaurants', 'orders', 'users', 'payments',
    'rest_framework', 'corsheaders',
    'rest_framework_simplejwt',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ]
}

CORS_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:8081']
```

---

## 🟢 Phase 5 — React Native App

### Project Location
Create at: `d:\sitesdata\Resturent App\app\`

### Setup
```bash
cd "d:\sitesdata\Resturent App"
npx create-expo-app app --template blank-typescript
cd app
npx expo install expo-router expo-status-bar expo-font
npm install @reduxjs/toolkit react-redux axios @react-navigation/native
npm install react-native-safe-area-context react-native-screens
```

### Required Screens (match the prototype)
1. `SplashScreen` — FoodSphere logo + loading
2. `OnboardingScreen` — 3 slide intro
3. `HomeScreen` — Banner carousel + restaurant list + search
4. `RestaurantScreen` — Menu categories + items
5. `CartScreen` — Order items + total
6. `CheckoutScreen` — Address + delivery time + payment method
7. `TrackingScreen` — Order status (4 stages)
8. `RewardsScreen` — Loyalty points + history
9. `OrdersScreen` — Past orders list
10. `ProfileScreen` — User info + settings
11. `SearchScreen` — Search bar + filtered results
12. `AuthScreen` — Login / Register / Guest

### State Management (Redux Toolkit)
```
store/
├── restaurantSlice.js   — restaurants list, menu
├── cartSlice.js         — cart items, total
├── orderSlice.js        — current order, tracking
├── userSlice.js         — auth, profile, loyalty points
└── searchSlice.js       — search query, results
```

### API Service
```
services/
├── api.js              — axios instance with base URL + JWT header
├── restaurantService.js
├── orderService.js
└── authService.js
```

---

## 🔵 Phase 6 — Payment Integration

### COD (Primary)
- Already in order form UI
- Backend: `OrderSerializer` includes `payment_method: 'cod'`
- No external gateway needed

### Stripe
```bash
pip install stripe
npm install @stripe/stripe-react-native
```
- Backend: Create PaymentIntent → Frontend: Collect card → Confirm

### PayFast (Pakistan)
```bash
pip install python-payfast
```
- Redirect-based payment
- IPN webhook for confirmation

---

## 🚀 Phase 7 — Deployment

| Component | Target |
|---|---|
| Backend API | Railway / Render / AWS EC2 |
| Database | PostgreSQL (Railway managed) |
| Media Files | AWS S3 or Cloudflare R2 |
| 7 Websites | Cloudflare Pages (already set up) |
| Android App | Google Play Store |
| iOS App | Apple App Store + TestFlight |

---

## 📁 Final Folder Structure (When Complete)

```
d:\sitesdata\Resturent App\
├── index.html          ← App prototype (HTML mockup)
├── style.css           ← App prototype styles
├── app.js              ← App prototype JS
├── GEMINI.md           ← Project rules
│
├── websites/           ← 7 individual restaurant sites
│   ├── seenbanao/
│   ├── dineatblue/
│   ├── jushhpk/
│   ├── tandooristoppk/
│   ├── sandmelts/
│   ├── getafomo/
│   └── birdmanfoodspk/ ← NOT BUILT YET
│
├── backend/            ← Django REST API (NOT BUILT YET)
│   ├── config/
│   ├── restaurants/
│   ├── orders/
│   ├── users/
│   ├── payments/
│   ├── requirements.txt
│   └── manage.py
│
└── app/                ← React Native App (NOT BUILT YET)
    ├── src/
    │   ├── screens/
    │   ├── components/
    │   ├── store/
    │   └── services/
    └── package.json
```

---

## ⚠️ Important Rules (ALWAYS Follow)

1. **Multi-tenant backend** — Every feature works for N restaurants, not just 7
2. **Loyalty points** are a CORE feature, not optional
3. **COD is PRIMARY payment** — Stripe/PayFast are secondary
4. **Guest ordering** must work — no forced registration
5. **All 7 websites are static** — Formspree for forms, no backend dependency
6. **Backend must NOT require schema migrations** to add new restaurants

---

## 🔗 Live URLs
- App Prototype: https://foodsphere-app.pages.dev
- SeenBanao: https://foodsphere-seenbanao.pages.dev
- DineAtBlue: https://foodsphere-dineatblue.pages.dev
- JushhPK: https://foodsphere-jushhpk.pages.dev
- TandooriStoppPK: https://foodsphere-tandooristoppk.pages.dev
- SandMelts: https://foodsphere-sandmelts.pages.dev
- GetAFomo: https://foodsphere-getafomo.pages.dev
