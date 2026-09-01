# BACKEND.md — GetFood (FoodSphere) Django API & Database Architecture
## Auto-generated & Updated — 2026-07-26

- **Core Apps**: `restaurants`, `orders`, `users`, `payments`, `promotions`.
- **Branch-Wise Multi-Tenancy**: `Branch` model linked to `Restaurant`. `ManagerProfile` links `User` to `Branch`. `BranchRider` manages rider dispatch per branch.
- **Order Security & Guest Token Authorization**: `Order.tracking_token` (UUID) guarantees guest order privacy. Unauthenticated `GET /api/orders/{id}/` rejected without valid `tracking_token`.
- **Order Scoping**: `resolve_branch_for_order(restaurant, address)` matches area keywords to branch; falls back to active branch.
- **Platform Settings & Loyalty Rules**: `PlatformSettings` singleton model controls global loyalty points earn/redemption rates and automatic 50 pt registration welcome bonuses.
- **Admin Management Commands**: `seed_restaurants`, `seed_branches`, `create_restaurant_managers`, `create_admin`, `seed_tandoori_images`.

---

## Phase 0 & 1 — Security, Loyalty & Rider Management Updates — 2026-07-26
- **What was done**:
  1. Enforced PII guest order protection in `OrderDetailView` and `MyOrdersListView` using `tracking_token` UUID authorization.
  2. Added `PlatformSettings` model (`restaurants.0012_platformsettings` migration) for Super-Admin global loyalty control.
  3. Added registration welcome bonus points trigger in `UserRegisterView`.
  4. Verified Rider Management endpoints (`OrderAssignRiderView`) and WhatsApp dispatch string formatting.
- **Files modified**:
  - `backend/restaurants/models.py`
  - `backend/orders/views.py`
  - `backend/users/views.py`
  - `backend/restaurants/migrations/0012_platformsettings.py`
## Phase 3 — Flash Deals Engine v2.0 & Recurring Specials — 2026-08-17
- **What changed and why**:
  - Upgraded `promotions.FlashDeal` model to support multi-tier item scoping (`ENTIRE_MENU`, `CATEGORY`, `SPECIFIC_ITEMS`), 3-way order fulfillment modes (`ALL`, `DELIVERY`, `DINE_IN`), and recurring daily timing with timezone-aware midnight rollover (`ZoneInfo('Asia/Karachi')`).
  - Created `promotions.FlashDealRedemption` audit ledger model tracking individual user/order redemptions with configurable reset frequency (`DAILY` vs `LIFETIME`).
  - Built `backend/promotions/deal_engine.py` with 3-tier specificity resolution algorithm (Priority Integer -> Specificity Scope -> Discount Magnitude).
  - Wired live `active_flash_deal` computed serialization to `MenuItemSerializer` in `restaurants/serializers.py`.
  - Added atomic `FlashDealRedemption` record creation to `OrderCreateSerializer` in `orders/serializers.py`.
- **Files modified / created**:
  - `backend/promotions/models.py`
  - `backend/promotions/deal_engine.py` [NEW]
  - `backend/promotions/serializers.py`
  - `backend/promotions/views.py`
  - `backend/promotions/urls.py`
  - `backend/restaurants/serializers.py`
  - `backend/orders/serializers.py`
  - `backend/test_flash_deals_v2_engine_suite.py` [NEW]
- **How it was verified**: Ran `manage.py test orders test_flash_deals_v2_engine_suite` (39/39 tests passed, 100% OK).
- **Confidence**: 100% — verified across all timezone boundaries, rollover edge cases, and multi-tenant scoping rules.

---

## Phase 1 — Tandoori Stop Branch Seeding, Verified Coordinates & Availability Defaults — 2026-09-01
- **What changed and why**:
  1. Created reproducible Django data migration `backend/restaurants/migrations/0015_seed_tandoori_stop_branches.py` to seed and update the 3 operational Tandoori Stop branches with verified coordinates:
     - **Lake City**: `Sector M7 Lake City, Lahore` (lat `31.3521664`, lng `74.2529319`)
     - **Mozang Chungi**: `16-B Temple Road, Shoukat Plaza, Mozang Chungi, Lahore` (lat `31.5577696`, lng `74.3173073`)
     - **Baghbanpura**: `Ghass Mandi Stop, Baghbanpura, Lahore, 54000` (lat `31.5808224`, lng `74.3732920`)
  2. Initialized `BranchMenuItemAvailability` records with default `is_available=True` for all menu items across the new branches to ensure stock overrides function deterministically without silent inheritance bugs.
  3. Updated `branch_map` in `Order.generate_display_order_id()` in `backend/orders/models.py` to map:
     - `'lake city'` -> `LC` (e.g. `TS-LC-1001`)
     - `'mozang chungi'`, `'mozang'` -> `MC` (e.g. `TS-MC-1001`)
     - `'baghbanpura'`, `'gt road baghbanpura'` -> `BP` / `GTR` (e.g. `TS-BP-1001`)
  4. Updated `seed_branches.py` management command with verified addresses, phone numbers, coordinates, and comprehensive area keyword maps.
- **Files modified / created**:
  - `backend/restaurants/migrations/0015_seed_tandoori_stop_branches.py` [NEW]
  - `backend/orders/models.py`
  - `backend/restaurants/management/commands/seed_branches.py`
  - `test_backend_local.py`
- **How it was verified**: Executed `python manage.py migrate restaurants` (migration 0015 OK), verified `generate_display_order_id()` output for all 3 branches, ran `test_backend_local.py` (all tests passed), and ran `test_dual_app_e2e.py` (100% passed).
- **Confidence**: 100% — verified via database migration execution and end-to-end multi-tenant test suites.

---

## Phase 6 — Customer Order History User-Scoping & Queryset Isolation — 2026-09-01
- **What changed and why**:
  1. **Strict User Scoping in `MyOrdersListView` (`backend/orders/views.py`)**:
     - Removed legacy heuristic auto-linking code that executed `guest_name__icontains=base_name` and `update(user=user)` on GET requests.
     - Scoped `get_queryset()` strictly to `Order.objects.filter(user=request.user)` with `select_related('restaurant', 'branch', 'rider')` and `prefetch_related('items__menu_item')`.
     - Returns `Order.objects.none()` for unauthenticated or guest callers.
  2. **Production Heroku Deployment**:
     - Released backend build **v85** live to `https://getfoodpk-fd9b20442fcf.herokuapp.com`.
- **Files modified**:
  - `backend/orders/views.py`
- **How it was verified**: Ran `test_dual_app_e2e.py` Step 5 (Multi-Account Isolation) with 100% pass rate.
- **Confidence**: 100% — verified via multi-user integration tests and live Heroku release.





