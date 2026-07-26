# PROJECT PLAN: GetFood Master Launch-Readiness

## Architecture Overview
- **Backend**: Django REST Framework API (`backend/apps/`, `backend/config/`, `backend/orders/`, `backend/restaurants/`, `backend/users/`, `backend/payments/`)
- **Admin Panel**: React + Vite + Tailwind CSS HQ Dashboard (`admin/src/`)
- **Mobile App**: React Native / Expo (`app/src/`)
- **Websites**: 7 static-first React brand websites (`websites/`)

## Milestones & Tasks

| # | Milestone Name | Key Deliverables | Status | Dependencies |
|---|---|---|---|---|
| 1 | **R1: Security & Critical Blockers** | PII leak fix (UUID tracking token), Deactivate 4 inactive brands in DB & frontend, Rebrand FoodSphere -> GetFood in app & headers, Generate Privacy & TOS HTML files | DONE | None |
| 2 | **R2: Core Operations & Backend Wiring** | `BranchRider` model & DRF API + Admin HQ Riders tab + WhatsApp URL generator, `delivery_radius_km` + Haversine validation, Operating hours `is_currently_open` enforcement, Server-side coupon validation & atomic increment | DONE | M1 |
| 3 | **R3: Ratings, Loyalty & Admin Settings** | `RestaurantReview` model + DRF endpoints + seed command + app prompt, `PlatformSettings` singleton model for earn/redmit rates, Welcome bonus on registration | IN_PROGRESS | M2 |
| 4 | **R4: Design Tokens & Build Readiness** | `app/src/theme.ts` overhaul (#E8364E, #0F0F1A, typography), Raw hex removal in 7 app screens, Expo production build setup (eas.json / AAB / iOS) | PLANNED | M3 |

## Interface Contracts & Data Invariants
1. `GET /api/orders/{id}/` MUST require authentication and user ownership check OR valid `tracking_token` (UUID) matching order. Unauthenticated `GET /api/orders/?phone=` MUST be removed or restricted. (VERIFIED DONE)
2. Inactive brands (SeenBanao: ID 1, DineAtBlue: ID 2, SandMelts: ID 5, BirdmanFoods: ID 6) `is_active` set to `False`. Frontends (Admin & Mobile fallback maps) ONLY display active brands (JushhPK: ID 3, TandooriStop: ID 4, GetAFomo: ID 7). (VERIFIED DONE)
3. `BranchRider` model linked to `Branch` with rider details (name, phone, vehicle, status, active order). DRF Viewsets & Admin HQ tab. (VERIFIED DONE)
4. Haversine distance calculation: block checkout if delivery distance > `branch.delivery_radius_km`. (VERIFIED DONE)
5. Operating hours: calculate `is_currently_open` boolean based on current time vs `opening_time` and `closing_time`. Show banner & disable add-to-cart when closed. (VERIFIED DONE)
6. `OrderCreateSerializer` validates coupon code, applies discount server-side, and atomically increments `times_used` using `F('times_used') + 1`. (VERIFIED DONE)
7. `RestaurantReview` model (order, restaurant, user, rating 1-5, comment, created_at) with `average_rating` update on restaurant.
8. `PlatformSettings` singleton (loyalty_points_per_dollar, loyalty_point_value_usd, welcome_bonus_points).
9. App theme tokens: `#E8364E` (primary coral red), `#0F0F1A` (dark surface), custom font/typography tokens. No hardcoded hex strings (`#...`) in 7 core app screens.
