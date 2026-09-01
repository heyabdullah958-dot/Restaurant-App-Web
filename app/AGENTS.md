# Customer Mobile App (`/app`) Architecture & Invariants

## Key Invariants
1. **App Identity**: Rebranded as **GetFood** (`com.abdullah958.getfood`) in `app.json`.
2. **Guest Mode & Auth Gates**:
   - Users browse freely in guest mode.
   - Profile screen in guest mode displays a clean guest card with benefits and Sign In / Sign Up CTA.
   - Checkout requires authentication prior to `Place Order` execution. Saved form data is persisted to `@getfood_checkout_saved_form` and restored post-auth.
3. **Hierarchy-Aware Navigation**:
   - `handlePostAuthNavigation` must distinguish nested tabs (`'Home'`, `'Cart'`, `'Orders'`, `'Profile'`) from root stack screens (`'Checkout'`).
   - For tabs: resets root stack to `Main` with nested state projection (`state: { routes: [{ name: returnScreen, params }] }`).
4. **Order History Isolation**:
   - `fetchMyOrders.fulfilled` strictly maps from `fetchedArray` (the server payload).
   - Order history is purged on `guestLogin.fulfilled`, `logoutUser.fulfilled`, and `sessionExpired`.
5. **Monotonic Order Tracking**:
   - `mergeMonotonicOrder` ensures order status polling never rolls back to a lower lifecycle stage.

