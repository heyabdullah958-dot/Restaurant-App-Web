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
- **Confidence score**: 100% (Verified via `test_backend_local.py` — 11/11 tests passed)


