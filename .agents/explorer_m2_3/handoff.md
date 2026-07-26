# Handoff Report: Server-Side Coupon Validation & Atomic Counter Increments (Milestone 2 - Task 6)

## 1. Observation
- **Model Inspection (`backend/promotions/models.py`)**:
  - `Coupon` model currently contains fields: `code`, `discount_type` ('percentage', 'flat'), `discount_value`, `min_subtotal`, `max_discount`, `restaurant`, `valid_from`, `valid_to`, `usage_limit`, `per_user_limit`, `is_active`, `created_at`.
  - `Coupon` does **not** currently have a `times_used` integer counter field.
- **Serializer Inspection (`backend/orders/serializers.py`)**:
  - `OrderCreateSerializer` handles order creation but does not accept `coupon_code` or validate promo codes server-side.
  - Subtotal and price modifier calculations are already present in `OrderCreateSerializer.validate()` and `create()`.
  - Loyalty point atomic deduction using `F()` expression exists in `OrderCreateSerializer.create()`.
- **Validation API Inspection (`backend/promotions/serializers.py` & `views.py`)**:
  - `CouponValidateSerializer` and `CouponValidateView` exist at `POST /api/coupons/validate/`, but currently do not check `times_used < usage_limit` or per-user limits.
- **App Inspection (`app/src/screens/CheckoutScreen.tsx` & `orderSlice.ts`)**:
  - `CheckoutScreen.tsx` contains address auto-detection, branch selection, and loyalty points redemption UI, but does not yet contain a Promo Coupon Code input field or validation API call.

## 2. Logic Chain
1. **Model Requirement**: Atomic counter increments require an explicit database column `times_used = models.IntegerField(default=0, db_index=True)` on the `Coupon` model so SQL `UPDATE` queries can execute `times_used = times_used + 1` atomically.
2. **Validation Specification**: `OrderCreateSerializer.validate()` must validate `coupon_code` if supplied, looking up the `Coupon` instance and verifying `is_active`, date window (`valid_from <= now <= valid_to`), total usage limit (`times_used < usage_limit`), per-user limit (`CouponUsage` count), restaurant match, and subtotal threshold (`subtotal >= min_subtotal`).
3. **Discount & Atomic Execution**: In `OrderCreateSerializer.create()`, inside `with transaction.atomic()`:
   - Server computes `coupon_discount` (percentage vs flat, capped by `max_discount` and `subtotal`).
   - `Coupon.objects.filter(pk=coupon.pk, is_active=True, times_used__lt=F('usage_limit')).update(times_used=F('times_used') + 1)` executes an atomic increment. If 0 rows updated, a `ValidationError` aborts the transaction.
   - `CouponUsage.objects.create(...)` logs the redemption.
4. **App UI Specification**: `CheckoutScreen.tsx` requires a promo code input box, interactive "Apply" button connected to `POST /coupons/validate/`, applied discount badge UI, and payload wiring in `orderSlice.ts`.

## 3. Caveats
- **Guest Usage Tracking**: Unauthenticated guest users do not have a user ID, so per-user limit (`per_user_limit`) enforcement relies on `usage_limit` across system for guests, while registered users have both `per_user_limit` and `usage_limit` enforced.
- **Discount Stacking**: The design calculates coupon discount first against subtotal, then applies loyalty points discount against the remaining subtotal (if both are selected), capping total discount at order subtotal.

## 4. Conclusion
The step-by-step model additions, DRF serializer validation logic, atomic DB counter update queries, and React Native frontend code specifications are complete and documented in `d:/sitesdata/Resturent App/.agents/explorer_m2_3/analysis.md`. The design prevents race conditions, guarantees server-side price integrity, and provides a polished user experience.

## 5. Verification Method
1. **Model & Migration Verification**:
   - Add `times_used = models.IntegerField(default=0, db_index=True)` to `Coupon` model.
   - Run `python backend/manage.py makemigrations promotions`
   - Run `python backend/manage.py migrate`
2. **Serializer & Views Verification**:
   - Run backend test suite: `python backend/manage.py test orders promotions`
3. **API & App Verification**:
   - Test `POST /api/coupons/validate/` with payload `{"code": "TEST10", "subtotal": 1000, "restaurant_id": 3}`.
   - Verify `POST /api/orders/` with `{"coupon_code": "TEST10", ...}` calculates correct discount and increments `Coupon.times_used` by 1.
