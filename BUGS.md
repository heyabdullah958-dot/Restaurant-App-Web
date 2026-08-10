# 🐛 BUGS.md — GetFood Platform Bug Log

## Resolved Bugs Log

### Bug #1: HTTP 404 Error on Save Coupon in Admin Panel (Resolved 2026-07-27)
- **Symptom**: Clicking 'Save Coupon' in the Super Admin Promo Code modal triggered a browser alert popup: HTTP 404.
- **Root Cause**: admin/src/services/api.ts called POST /api/coupons/, but backend/promotions/urls.py only contained /api/coupons/validate/ and /api/coupons/active/ without any list/create/update/delete CRUD views registered.
- **Fix Applied**:
  - Implemented CouponListCreateView and CouponDetailView in backend/promotions/views.py.
  - Registered path('coupons/', ...) and path('coupons/<int:pk>/', ...) in backend/promotions/urls.py.
  - Updated admin/src/services/api.ts to call /api/coupons/ with optional scope filtering.
  - Verified with test_promo_engine.py (100% Pass Rate).

---

### Bug #2: Missing Branch Scoping on Promo Code Model & Validation (Resolved 2026-07-27)
- **Symptom**: Promos could only be global or scoped to a restaurant, preventing individual branches from running localized promo campaigns.
- **Root Cause**: Coupon model in backend/promotions/models.py only had a restaurant ForeignKey, missing a branch ForeignKey.
- **Fix Applied**:
  - Added branch ForeignKey to Coupon model and generated migration promotions.0003_coupon_branch.
  - Updated CouponValidateSerializer and OrderCreateSerializer to enforce branch-specific validation.
  - Added Scope Selector UI in admin/src/views/PromoManagement.tsx allowing Global, Specific Restaurant, or Specific Branch configuration.

---

### Bug #3: Unauthenticated Mutation Risk on Coupons & Flash Deals (Resolved 2026-08-10)
- **Symptom**: `CouponListCreateView`, `CouponDetailView`, `FlashDealListCreateView`, and `FlashDealDetailView` endpoints permitted unauthenticated write operations (`POST`, `PUT`, `PATCH`, `DELETE`).
- **Root Cause**: `permission_classes = [permissions.AllowAny]` was specified without method-level overrides.
- **Fix Applied**: Updated `get_permissions()` across all promotion management views to strictly require `permissions.IsAdminUser` for mutation methods.

---

### Bug #4: Unauthenticated Customer PII Exposure on Order Tracking (Resolved 2026-08-10)
- **Symptom**: Hitting `GET /api/v1/orders/<pk>/track/` using integer primary key `pk` returned un-redacted customer phone numbers and full street addresses without authentication.
- **Root Cause**: `OrderTrackView` permitted status queries by integer ID without verifying matching `tracking_token` UUID or owner authentication.
- **Fix Applied**: Added automatic PII redaction (`guest_phone = None`, `delivery_address = "[Protected]"`) on integer ID queries unless a valid `tracking_token` or owner session is supplied. Verified via `test_backend_local.py` (100% Pass Rate).


