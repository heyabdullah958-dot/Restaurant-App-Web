# 🧠 LESSONS.md — FoodSphere Architectural Lessons & Past Patterns

> Generalized engineering takeaways, multi-tenant patterns, and invariants learned from debugging across backend, admin, mobile, and web applications.

---

## Lesson 1 — Multi-Tenant Order Sequence Scoping — 2026-07-25
- **Pattern**: Generating branch/tenant scoped display IDs (e.g. `TS-LC-1001`).
- **Wrong assumption made**: Using global auto-incrementing integer IDs (`Order.id`) for customer receipt display and dispatcher modals.
- **What actually mattered**: Customers and branch managers expect tenant/branch isolated readable sequences (`display_order_id`). Scoping must be handled atomically in Django backend models on order save.
- **Applies to**: `backend/orders/models.py`, `backend/orders/serializers.py`, `admin/src/views/OrderManagement.tsx`.

---

## Lesson 2 — Monotonic Order Status Transitions — 2026-07-26
- **Pattern**: Real-time polling/refetching order statuses in mobile app & web trackers.
- **Wrong assumption made**: Incoming API responses during race conditions or background sync can be blindly written to Redux state.
- **What actually mattered**: Order state transitions must be strictly monotonic (`getStatusRank`). State should NEVER roll back to a previous stage (e.g. from `DISPATCHED` back to `PREPARING`) due to delayed HTTP responses.
- **Applies to**: `app/src/store/orderSlice.ts`, `app/src/screens/TrackingScreen.tsx`.

---

---

## Lesson 4 — Deployment Chain Verification & Guest Order State Hydration — 2026-08-10
- **Pattern**: Debugging repeat-reported mobile app bugs across Expo builds & guest navigation screens.
- **Wrong assumption made**: Assuming a git commit alone reaches a test device, and assuming Redux `user.is_guest` state guards are sufficient for guest tracking screens.
- **What actually mattered**: 
  1. For this project, always confirm EAS publish (`eas update`), channel match, and `app.json` `updates.enabled` status before re-diagnosing application code on a repeat-reported mobile bug. (When `updates.enabled` is `false`, fresh APK builds or local Metro dev server runs are required).
  2. Guest navigation screens (`OrdersScreen`, `TrackingScreen`) MUST hydrate active guest order credentials from `AsyncStorage` (`@getfood_active_guest_order` / `guest_tracking_token`) rather than blocking guest users with a static login guard.
- **Applies to**: `app/app.json`, `app/src/screens/OrdersScreen.tsx`, `app/src/screens/TrackingScreen.tsx`, `BUILD.md`.

