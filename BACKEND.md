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



