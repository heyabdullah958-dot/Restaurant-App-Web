## 2026-07-26T19:14:50Z
You are Explorer 3 for Milestone 2 (R2: Core Operations & Backend Wiring).
Your working directory is: d:/sitesdata/Resturent App/.agents/explorer_m2_3
Project plan: d:/sitesdata/Resturent App/.agents/orchestrator/plan.md

Objective:
Investigate and design Server-Side Coupon Validation & Atomic Counter Increments.

Tasks:
1. Examine `Coupon` model (`backend/orders/models.py`), `OrderCreateSerializer`, `CouponSerializer`, and `CheckoutScreen.tsx`.
2. Server-Side Coupon Validation:
   - In `OrderCreateSerializer.validate()`: validate coupon code existence, `is_active`, `valid_from` <= now <= `valid_until`, minimum order amount, and usage limit (`times_used < max_uses`).
   - Calculate discount server-side based on coupon type (percentage vs fixed amount) and apply to order subtotal.
3. Atomic Usage Increment:
   - In `OrderCreateSerializer.create()`: update coupon usage atomically using Django `F()` expression: `Coupon.objects.filter(id=coupon.id).update(times_used=F('times_used') + 1)`.
4. Document step-by-step model, serializer, and atomic ORM update changes in `d:/sitesdata/Resturent App/.agents/explorer_m2_3/analysis.md` and `handoff.md`. Communicate completion to parent.
