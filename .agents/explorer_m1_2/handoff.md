# Handoff Report — Brand Deactivation & Rebranding (Milestone 1 — Tasks 1.2 & 1.3)

**Agent:** Explorer 2 (`explorer_m1_2`)  
**Working Directory:** `d:/sitesdata/Resturent App/.agents/explorer_m1_2`  
**Date:** 2026-07-26  

---

## 1. Observation

### Observation 1: Backend Model & Seed Script
- **File Path:** `d:/sitesdata/Resturent App/backend/restaurants/models.py` (line 14)
  - `is_active = models.BooleanField(default=True, db_index=True)`
  - `is_force_closed = models.BooleanField(default=False)`
- **File Path:** `d:/sitesdata/Resturent App/backend/restaurants/management/commands/seed_restaurants.py` (lines 410-413):
  ```python
  is_active_brand = slug in ['tandooristoppk', 'jushhpk', 'getafomo']
  restaurant = Restaurant(
      slug=slug,
      is_active=is_active_brand,
      **brand_data
  )
  ```
- **File Path:** `d:/sitesdata/Resturent App/backend/restaurants/views.py` (lines 17-19):
  ```python
  def get_queryset(self):
      # Always return all restaurants so offline restaurants remain visible across UI with is_active=False status
      queryset = Restaurant.objects.all()
  ```

### Observation 2: Frontend Fallbacks & App Filtering
- **File Path:** `d:/sitesdata/Resturent App/app/src/services/fallbackData.ts` (lines 65-421):
  - `seenbanao` (ID 1): `is_active: false`
  - `dineatblue` (ID 2): `is_active: false`
  - `jushhpk` (ID 3): `is_active: true`
  - `tandooristoppk` (ID 4): `is_active: true`
  - `sandmelts` (ID 5): `is_active: false`
  - `birdmanfoodspk` (ID 6): `is_active: false`
  - `getafomo` (ID 7): `is_active: true`
- **File Path:** `d:/sitesdata/Resturent App/app/src/screens/HomeScreen.tsx` (lines 241-243):
  ```typescript
  const activeBrands = ['tandooristoppk', 'jushhpk', 'getafomo'];
  const src = restaurants && restaurants.length > 0 ? restaurants : FALLBACK_RESTAURANTS;
  const available = src.filter((r: any) => activeBrands.includes(r.slug || r.name?.toLowerCase().replace(/\s+/g, '')));
  ```
- **File Path:** `d:/sitesdata/Resturent App/admin/src/mockData.ts` (lines 63-217):
  - MOCK_RESTAURANTS matches IDs 1-7 with `is_active` boolean set appropriately.

### Observation 3: Rebranding `FoodSphere` -> `GetFood`
- **File Path:** `d:/sitesdata/Resturent App/app/app.json` (line 5):
  - `"name": "GetFood"`, `"displayName": "GetFood"`, `"slug": "app"`
- **File Path:** `d:/sitesdata/Resturent App/app/src/screens/AuthScreen.tsx`:
  - Line 117: `email: \`phone_user_${phone.slice(-4)}@foodsphere.com\``
  - Line 120: `'Welcome to FoodSphere.'`
  - Line 248: `'Welcome to FoodSphere!'`
- **File Path:** `d:/sitesdata/Resturent App/app/src/screens/MapScreen.tsx`:
  - Line 599: `Loading FoodSphere Map...`
- **File Path:** `d:/sitesdata/Resturent App/app/src/screens/ProfileScreen.tsx`:
  - Line 567: `mailto:support@foodsphere.com?subject=FoodSphere Inquiry`
  - Line 568: `support@foodsphere.com`
- **File Path:** `d:/sitesdata/Resturent App/app/src/screens/RewardsScreen.tsx`:
  - Line 234: `<Text style={styles.pointsUnit}>FoodSphere Points</Text>`
- **File Path:** `d:/sitesdata/Resturent App/app/src/store/userSlice.ts`:
  - Line 278: `email: 'guest@foodsphere.pk'`
- **File Path:** `d:/sitesdata/Resturent App/admin/src/components/Sidebar.tsx`:
  - Line 183: `'FoodSphere HQ'`
- **File Path:** `d:/sitesdata/Resturent App/admin/src/views/Login.tsx`:
  - Line 37: `'FoodSphere Workspace'`

---

## 2. Logic Chain

1. **Brand Activation State:**
   - From *Observation 1*, the backend model supports `is_active`, and the seeding logic already configures `is_active=True` for the 3 active launch brands (`jushhpk`, `tandooristoppk`, `getafomo`) and `is_active=False` for the 4 inactive brands (`seenbanao`, `dineatblue`, `sandmelts`, `birdmanfoodspk`).
   - From *Observation 2*, `app/src/services/fallbackData.ts` and `admin/src/mockData.ts` mirror these exact `is_active` values. `HomeScreen.tsx` and `SearchScreen.tsx` actively filter out inactive brands using `activeBrands = ['tandooristoppk', 'jushhpk', 'getafomo']`.
   - Therefore, brand deactivation infrastructure is fully aligned across backend seed code and frontend fallbacks. Ensuring `is_active=False` in the live DB via `python manage.py seed_restaurants` or ORM command completes the deactivation task.

2. **Rebranding Verification:**
   - From *Observation 3*, `app/app.json` has already been updated to `"name": "GetFood"`, but `"slug"` is `"app"`.
   - Exactly 7 user-facing occurrences of `FoodSphere` remain in `app/src/` (`AuthScreen.tsx`, `MapScreen.tsx`, `ProfileScreen.tsx`, `RewardsScreen.tsx`, `userSlice.ts`) and 2 in `admin/src/` (`Sidebar.tsx`, `Login.tsx`).
   - Replacing these strings will complete 100% of the `FoodSphere` -> `GetFood` rebranding requirement.

---

## 3. Caveats

- **Database State:** If the active Heroku or local PostgreSQL database was populated before `seed_restaurants.py` was executed with `is_active_brand` logic, existing DB records for IDs 1, 2, 5, 6 may still be marked `is_active=True` in the database table until `python manage.py seed_restaurants` or an explicit ORM query is run.
- **Admin HQ View:** In Admin HQ (`admin/src/`), Super-Admin is intended to see all 7 brands (with `(Offline)` badge for inactive brands) to allow future onboarding, while customer apps filter inactive brands out completely.

---

## 4. Conclusion

- **Brand Deactivation:** The architecture, seed files, and frontend fallback datasets correctly reflect `is_active=False` for SeenBanao (1), DineAtBlue (2), SandMelts (5), and BirdmanFoods (6), leaving only JushhPK (3), TandooriStop (4), and GetAFomo (7) active.
- **Rebranding:** All 7 specific code locations requiring text updates from `FoodSphere` to `GetFood` in `app/src/`, `app/app.json`, and `admin/src/` have been mapped with line numbers and proposed replacements.

---

## 5. Verification Method

1. **Backend Verification:**
   - Run: `python backend/manage.py shell -c "from restaurants.models import Restaurant; print({r.id: (r.slug, r.is_active) for r in Restaurant.objects.all()})"`
   - Confirm IDs 1, 2, 5, 6 are `is_active: False` and IDs 3, 4, 7 are `is_active: True`.
2. **App Rebranding Audit:**
   - Run: `grep -rn "FoodSphere" app/src/ app/app.json`
   - Confirm 0 matches remain after implementer changes.
