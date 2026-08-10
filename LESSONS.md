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
---

## Lesson 5 — Redux State Preservation & DRF Error Sanitization — 2026-08-10
- **Pattern**: Handling state array mutations and error alert formatting across authentication boundaries.
- **Wrong assumption made**: Assuming `guestLogin.pending` should clear `myOrders`, and assuming raw stringification of DRF error objects is user-friendly.
- **What actually mattered**: 
  1. `guestLogin.pending` must NOT clear existing order history arrays in Redux state, and `placeOrder.fulfilled` MUST prepend newly created orders to `myOrders` to prevent UI array wipes.
  2. Django REST Framework error objects containing `non_field_errors` MUST have raw key prefixes stripped and field keys formatted nicely (`Guest phone: ...`) before passing to alert UI dialogs.
  3. Form inputs on checkout MUST be preserved in navigation params (`returnParams`) when sending users to AuthScreen so form data auto-restores post-login.
- **Applies to**: `app/src/store/orderSlice.ts`, `app/src/screens/CheckoutScreen.tsx`, `app/src/screens/AuthScreen.tsx`, `app/src/screens/OrdersScreen.tsx`.

---

## Lesson 6 — Redux Auth Lifecycle Race Conditions on Re-Login — 2026-08-10
- **Pattern**: Any screen that reads Redux state populated by polling (fetchMyOrders, fetchGuestOrderStatus) and also reacts to login/logout lifecycle transitions.
- **Wrong assumption made**: Clearing `state.myOrders = []` on `loginUser.pending` is safe because "the user isn't logged in yet." In reality, `.pending` fires the moment the network request starts — before authentication is confirmed — creating a window where old orders are gone and new ones haven't arrived yet.
- **What actually mattered**: State resets tied to auth should fire on `.fulfilled`, not `.pending`. `.pending` = request started, not user confirmed. Moving clears to `.fulfilled` eliminates the race window while keeping the security invariant (old data gone before new user's data loads).
- **Corollary**: Any `loading = true` guard in a polling loop MUST check whether data already exists before activating the loading state. `if (state.array.length === 0)` alone is insufficient — add `&& !state.loading` to prevent double-firing the spinner on the second poll cycle after a login-induced clear.
- **Applies to**: `app/src/store/orderSlice.ts` (`loginUser.pending/fulfilled`, `registerUser.pending/fulfilled`, `fetchMyOrders.pending`). Generalizes to any Redux slice that polls + clears on auth events.
