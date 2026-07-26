# Original User Request

## 2026-07-26T13:49:12Z

<USER_REQUEST>
# Teamwork Project Prompt — GetFood Master Launch-Readiness (0 to Hero)

Complete end-to-end execution of the GetFood (FoodSphere) launch-readiness plan across Django Backend, React Vite Admin HQ, and React Native Expo App.

Working directory: d:/sitesdata/Resturent App
Integrity mode: development

---

## Requirements

### R1. Security & Critical Blockers (Phase 0)
- Fix PII data leak in `GET /api/orders/{id}/` and `MyOrdersListView` by implementing guest UUID `tracking_token` authorization and user ownership checks.
- Deactivate and hide 4 empty-menu brands (SeenBanao, DineAtBlue, SandMelts, BirdmanFoods) in database and frontend fallback maps.
- Rebrand app-facing strings from `FoodSphere` to `GetFood` in `app/app.json` and screen headers.
- Generate and host `privacy-policy.html` and `terms-of-service.html` for Cloudflare Pages deployment.

### R2. Core Operations & Backend Wiring (Phase 1)
- Build Rider Management System: `BranchRider` model, DRF endpoints, Admin HQ "Riders" management tab, rider assignment modal, and WhatsApp `wa.me` dispatch link generator.
- Implement delivery radius enforcement (`delivery_radius_km` on `Branch` model + Haversine checkout validation).
- Implement operating hours enforcement (`is_currently_open` serializer property, closed banner, and button lock on `RestaurantScreen`).
- Wire coupons server-side in `OrderCreateSerializer` with atomic usage counter increments.

### R3. Ratings, Loyalty & Admin Settings (Phase 2)
- Build Ratings & Reviews system (`RestaurantReview` model, DRF endpoints, seeding management command, and app rating prompt).
- Build `PlatformSettings` singleton model for Super Admin configurable loyalty points earn/redemption rates.
- Add welcome loyalty bonus trigger on new user registration.

### R4. Design Tokens & App Store Build Readiness (Phase 3 & 4)
- Overhaul `app/src/theme.ts` with vibrant coral red (`#E8364E`), dark surface (`#0F0F1A`), and typography tokens.
- Replace hardcoded hex values across all 7 core screen files.
- Configure Expo app for production AAB and iOS builds.

---

## Acceptance Criteria

### Security & Access Control
- [ ] `GET /api/orders/{id}/` without valid owner token returns 403/404.
- [ ] `MyOrdersListView` unauthenticated `?phone=` parameter removed; guest orders require `?token=<uuid>`.
- [ ] Only active launch brands (JushhPK, TandooriStop, GetAFomo) display in list endpoints and mobile app.

### Operational Features
- [ ] Branch Managers can add, edit, and assign riders; WhatsApp dispatch message generates correctly formatted URL.
- [ ] Orders beyond branch `delivery_radius_km` are blocked at checkout.
- [ ] Restaurants past `closing_time` show closed badge and lock item addition.
- [ ] Coupons calculate discount server-side and increment `times_used`.

### Ratings & Loyalty
- [ ] `POST /api/restaurants/{id}/reviews/` registers reviews for delivered orders and computes `average_rating`.
- [ ] `PlatformSettings` controls earn and redemption rates dynamically.

### Visual & Build Quality
- [ ] All screens consume `theme.ts` tokens without raw hex values.
- [ ] `app/app.json` name is `GetFood`.

</USER_REQUEST>
