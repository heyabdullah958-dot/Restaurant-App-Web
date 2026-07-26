# Brand Deactivation & Rebranding Investigation Report (Milestone 1 — Task 1.2 & 1.3)

**Author:** Explorer 2 (`explorer_m1_2`)  
**Target Milestone:** Milestone 1 (R1: Security & Critical Blockers)  
**Scope:** Django Backend (`backend/`), Admin HQ (`admin/`), Mobile App (`app/`)  
**Date:** 2026-07-26  

---

## 1. Executive Summary

This investigation covers the complete architecture for **Brand Deactivation** (deactivating 4 inactive brands so only 3 active brands are accessible to customers) and **App Rebranding** (`FoodSphere` -> `GetFood`) across the Django REST Backend, React Admin HQ, and React Native Expo Mobile App.

### Core Discoveries:
1. **7 Brand Catalog Status:**
   - **Active Launch Brands (3):** `JushhPK` (ID: 3, slug: `jushhpk`), `TandooriStop` (ID: 4, slug: `tandooristoppk`), `GetAFomo` (ID: 7, slug: `getafomo`).
   - **Inactive Brands (4):** `SeenBanao` (ID: 1, slug: `seenbanao`), `DineAtBlue` (ID: 2, slug: `dineatblue`), `SandMelts` (ID: 5, slug: `sandmelts`), `BirdmanFoods` (ID: 6, slug: `birdmanfoodspk`).
2. **Backend Deactivation State:**
   - `Restaurant.is_active` exists in `backend/restaurants/models.py`.
   - `seed_restaurants.py` already contains logic assigning `is_active=True` for the 3 active brands and `is_active=False` for the 4 inactive brands.
   - However, `RestaurantListView` (`GET /api/restaurants/`) in `backend/restaurants/views.py` returns `Restaurant.objects.all()` without filtering `is_active=True` by default, relying on serializer representation.
3. **Frontend Fallbacks:**
   - `app/src/services/fallbackData.ts` defines all 7 brands in `FALLBACK_RESTAURANTS` with `is_active: false` set for IDs 1, 2, 5, 6 and `is_active: true` for IDs 3, 4, 7.
   - `HomeScreen.tsx` and `SearchScreen.tsx` enforce `activeBrands = ['tandooristoppk', 'jushhpk', 'getafomo']` filtering.
   - `admin/src/mockData.ts` and `AdminContext.tsx` support all 7 brands, displaying `(Offline)` status for inactive brands in simulated branch views.
4. **Rebranding Findings (`FoodSphere` -> `GetFood`):**
   - `app/app.json` already has `"name": "GetFood"` and `"displayName": "GetFood"`, but `"slug"` is `"app"`.
   - `FoodSphere` occurs in user-facing text inside `AuthScreen.tsx`, `MapScreen.tsx`, `ProfileScreen.tsx`, `RewardsScreen.tsx`, and `userSlice.ts`.

---

## 2. Detailed Technical Findings

### A. Backend Architecture & `is_active` Enforcement (`backend/restaurants/`)

| File Path | Code Element | Current Status & Finding |
|---|---|---|
| `backend/restaurants/models.py` | `Restaurant` model (line 14) | `is_active = models.BooleanField(default=True, db_index=True)`<br/>`is_open` property (lines 30-36) returns `False` if `not self.is_active`. |
| `backend/restaurants/views.py` | `RestaurantListView` (line 19) | Currently queries `Restaurant.objects.all()`. Comment notes returning all restaurants so offline brands carry `is_active=False`. |
| `backend/restaurants/serializers.py` | `RestaurantSerializer` (line 128) | Serializes `is_active`, `is_force_closed`, `is_open`, and nested `branches`. |
| `backend/restaurants/management/commands/seed_restaurants.py` | `seed_restaurants.py` (line 410) | `is_active_brand = slug in ['tandooristoppk', 'jushhpk', 'getafomo']`. Sets `is_active=False` for the remaining 4 brands during seeding. |
| `backend/restaurants/management/commands/seed_branches.py` | `seed_branches.py` | Seeds branches for `tandooristoppk`, `jushhpk`, and `getafomo`. Non-seeded branches have `is_active=False`. |

### B. Brand Catalog & Primary Keys Matrix

| Brand ID | Slug | Brand Name | Target Launch Status (`is_active`) | DB Primary Key Invariant |
|---|---|---|---|---|
| 1 | `seenbanao` | SeenBanao | **FALSE** (Inactive) | ID 1 |
| 2 | `dineatblue` | DineAtBlue | **FALSE** (Inactive) | ID 2 |
| 3 | `jushhpk` | JushhPK | **TRUE** (Active) | ID 3 |
| 4 | `tandooristoppk` | TandooriStopPK | **TRUE** (Active) | ID 4 |
| 5 | `sandmelts` | SandMelts | **FALSE** (Inactive) | ID 5 |
| 6 | `birdmanfoodspk` | BirdmanFoodsPK | **FALSE** (Inactive) | ID 6 |
| 7 | `getafomo` | GetAFomo | **TRUE** (Active) | ID 7 |

### C. Rebranding Audit (`FoodSphere` -> `GetFood`)

#### 1. Mobile App (`app/`) Occurrences:

| File Path | Line # | Verbatim Content | Recommended Replacement |
|---|---|---|---|
| `app/app.json` | 5 | `"slug": "app"` | `"slug": "getfood"` |
| `app/src/screens/AuthScreen.tsx` | 117 | `email: \`phone_user_${phone.slice(-4)}@foodsphere.com\`` | `email: \`phone_user_${phone.slice(-4)}@getfood.pk\`` |
| `app/src/screens/AuthScreen.tsx` | 120 | `'Welcome to FoodSphere.'` | `'Welcome to GetFood.'` |
| `app/src/screens/AuthScreen.tsx` | 248 | `'Welcome to FoodSphere!'` | `'Welcome to GetFood!'` |
| `app/src/screens/MapScreen.tsx` | 599 | `Loading FoodSphere Map...` | `Loading GetFood Map...` |
| `app/src/screens/ProfileScreen.tsx` | 567 | `mailto:support@foodsphere.com?subject=FoodSphere Inquiry` | `mailto:support@getfood.pk?subject=GetFood Inquiry` |
| `app/src/screens/ProfileScreen.tsx` | 568 | `support@foodsphere.com` | `support@getfood.pk` |
| `app/src/screens/RewardsScreen.tsx` | 234 | `<Text style={styles.pointsUnit}>FoodSphere Points</Text>` | `<Text style={styles.pointsUnit}>GetFood Points</Text>` |
| `app/src/store/userSlice.ts` | 278 | `email: 'guest@foodsphere.pk'` | `email: 'guest@getfood.pk'` |

#### 2. Admin HQ (`admin/`) Branding:
- `admin/src/components/Sidebar.tsx` (line 183): Header label `'FoodSphere HQ'` -> `'GetFood HQ'`.
- `admin/src/views/Login.tsx` (line 37): Subtitle `'FoodSphere Workspace'` -> `'GetFood Workspace'`.
- `admin/src/mockData.ts` (line 8): `admin@foodsphere.com` -> `admin@getfood.pk`.

---

## 3. Step-by-Step Implementation Recommendations for Implementer

### Step 1: Database Brand Deactivation
1. Execute `python manage.py seed_restaurants` or run Django ORM update:
   ```python
   Restaurant.objects.filter(slug__in=['seenbanao', 'dineatblue', 'sandmelts', 'birdmanfoodspk']).update(is_active=False)
   Restaurant.objects.filter(slug__in=['jushhpk', 'tandooristoppk', 'getafomo']).update(is_active=True)
   ```
2. Verify in Django Shell that `Restaurant.objects.filter(is_active=True).values_list('id', 'name')` returns exactly 3 records (JushhPK, TandooriStoppk, GetAFomo).

### Step 2: REST API Endpoint Consistency
1. In `backend/restaurants/views.py` (`RestaurantListView`), support public filtering by `is_active=True` for customer applications, while allowing `?all=true` for Admin HQ dashboards.

### Step 3: Mobile App Rebranding & Fallback Verification
1. Edit `app/app.json`: change `"slug": "app"` to `"slug": "getfood"`.
2. Edit `app/src/screens/AuthScreen.tsx`: update welcome alerts and synthetic email domains to `getfood.pk`.
3. Edit `app/src/screens/MapScreen.tsx`: change loading text to `Loading GetFood Map...`.
4. Edit `app/src/screens/ProfileScreen.tsx`: update mailto link and email text to `support@getfood.pk`.
5. Edit `app/src/screens/RewardsScreen.tsx`: update points text to `GetFood Points`.
6. Edit `app/src/store/userSlice.ts`: update guest email to `guest@getfood.pk`.

### Step 4: Admin HQ Branding
1. Edit `admin/src/components/Sidebar.tsx` and `admin/src/views/Login.tsx`: update title text from `FoodSphere` to `GetFood`.

---

## 4. Verification Method

1. **DB & API Verification:**
   - Command: `python backend/manage.py shell -c "from restaurants.models import Restaurant; print(list(Restaurant.objects.filter(is_active=True).values_list('slug', flat=True)))"`
   - Expected Output: `['jushhpk', 'tandooristoppk', 'getafomo']`
2. **API Endpoint Test:**
   - Command: `curl http://127.0.0.1:8000/api/restaurants/`
   - Inspect JSON response: confirm active restaurants have `is_active: true` and inactive restaurants have `is_active: false`.
3. **App Search & Header Audit:**
   - Command: `grep -rn "FoodSphere" app/src/ app/app.json`
   - Expected Output: 0 occurrences in `app/src/` or `app/app.json`.
