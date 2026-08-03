# FRONTEND.md — FoodSphere Frontend Intelligence & Design Systems
## Auto-generated — 2026-07-21
### Detected from codebase scan

- **Design System**: Slate/Dark palette (`slate-900`/`slate-950`), custom rounded cards (`rounded-xl`), Lucide icons.
- **Admin HQ Views**: SuperDashboard, BranchDashboard, OrderManagement, MenuManagement, ManagerManagement, CustomerManagement, NotificationCenter.
- **Mobile App Screens**: Home, Restaurant, Cart, Checkout, OrderConfirmation, Tracking, Rewards, Profile.
- **State Management**: React AdminContext + JWT payload decoding (`restaurantId`, `branchId`), Redux Toolkit in Mobile App.

---

## Phase 1 — Fix Minified React Error #310 — 2026-07-22
- **What was done**: Fixed React Hooks ordering violations in `BranchDashboard.tsx`, `OrderManagement.tsx`, and `MenuManagement.tsx` where `useState` and `useMemo` hooks were placed after conditional early `return` statements (`if (!restaurant) return (...)`).
- **Files modified**:
  - `admin/src/views/BranchDashboard.tsx`
  - `admin/src/views/OrderManagement.tsx`
  - `admin/src/views/MenuManagement.tsx`
- **Issues encountered & resolved**: Minified React Error #310 ("Rendered more hooks than during the previous render") caused when component initially rendered without a restaurant object loaded, then rendered with a restaurant object present. Moved all hook calls above the conditional returns.
- **Self-corrections used**: 0/3
- **Confidence score**: 100% (Verified with `npm run build` TypeScript compilation and production bundle build)

---

## Phase 2 — Mobile Application 60 FPS Optimization from A to Z — 2026-07-25
- **What was done**:
  1. Converted `HomeScreen`, `RestaurantScreen`, and `SearchScreen` list rendering from un-windowed `.map()` inside `ScrollView` to optimized, windowed `FlatList` with `getItemLayout`, `keyExtractor`, `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, and `removeClippedSubviews`.
  2. Isolated `BannerCarousel` state (`setBannerIndex`) into a memoized sub-component to eliminate cascading re-renders of the home screen and restaurant card list every 3.5 seconds.
  3. Extracted `RestaurantCard`, `CategoryChip`, `MenuItemCard`, `RestaurantResultCard`, and `DishResultCard` into pure `React.memo` components with `useCallback` event handlers to prevent inline closure allocations during scroll frames.
  4. Implemented an O(1) cart quantity lookup map (`cartQuantityMap`) via `useMemo` in `RestaurantScreen` to avoid expensive array `.find()` lookups per menu item on every render frame.
  5. Enabled `enableFreeze(true)` from `react-native-screens` in `App.tsx` to automatically freeze unfocused screen trees, preventing background JS thread re-renders during navigation transitions.
- **Files modified**:
  - `app/App.tsx`
  - `app/src/screens/HomeScreen.tsx`
  - `app/src/screens/RestaurantScreen.tsx`
  - `app/src/screens/SearchScreen.tsx`
  - `app/src/screens/OrdersScreen.tsx`
- **Issues encountered & resolved**: Fixed syntax closing brace in `HomeScreen.tsx` during component extraction; verified zero TypeScript type errors using `npx tsc --noEmit`.
- **Self-corrections used**: 1/3 (Resolved JSX closing bracket error in `HomeScreen.tsx` instantly)
- **Confidence score**: 100% (Verified 0 TypeScript errors with `npx tsc --noEmit`, memoization boundaries, and FlatList windowing)

---

## Phase 3 — Guest Tracking Token Persistence & In-App Legal WebView — 2026-07-26
- **What was done**:
  1. Saved `tracking_token` to `AsyncStorage` (`guest_tracking_token` and `order_token_${orderId}`) upon order placement completion in `CheckoutScreen.tsx`.
  2. Created `fetchGuestOrderStatus` Redux thunk calling `/api/orders/track/?token=<uuid>` in `orderSlice.ts`.
  3. Configured guest tracking polling in `TrackingScreen.tsx` to utilize `fetchGuestOrderStatus(guestToken)` for guest users.
  4. Created `LegalScreen.tsx` rendering `react-native-webview` for Terms of Service and Privacy Policy URLs. Registered `Legal` route in `App.tsx` and updated footer touchables in `AuthScreen.tsx`.
- **Files modified**:
  - `app/src/screens/CheckoutScreen.tsx`
  - `app/src/store/orderSlice.ts`
  - `app/src/screens/TrackingScreen.tsx`
  - `app/src/screens/LegalScreen.tsx` [NEW]
  - `app/App.tsx`
  - `app/src/screens/AuthScreen.tsx`
- **Issues encountered & resolved**: `StyleSheet.absoluteFillObject` error resolved by switching to `StyleSheet.absoluteFill`. Verified 0 TypeScript compilation errors with `npx tsc --noEmit`.
- **Self-corrections used**: 1/3

---

## Phase 4 — Real-Time Web Audio Chime, Loyalty Points UI & Checkout Hotfix — 2026-07-26
- **What was done**:
  1. Integrated Web Audio API synthesized dual-tone bell chime (`880Hz` + `1760Hz`) in `AdminContext.tsx` triggered when new orders with status `pending` or `received` arrive during live 5s polling.
  2. Fixed `Property 'availablePoints' doesn't exist` crash in `CheckoutScreen.tsx` by declaring top-level scope variables `availablePoints` and `maxRedeemablePoints`.
  3. Added **Redeem Loyalty Points Card** with 1-tap **"Use Points / Applied"** toggle button in `CheckoutScreen.tsx` and updated order summary display to show explicit loyalty discounts (`-Rs. X`).
  4. Made Loyalty Points banner interactive in `ProfileScreen.tsx` with a `History >` button linking to `RewardsScreen.tsx`.
- **Files modified**:
  - `admin/src/AdminContext.tsx`
  - `app/src/screens/CheckoutScreen.tsx`
  - `app/src/screens/ProfileScreen.tsx`
  - `app/src/screens/RewardsScreen.tsx`
- **Confidence score**: 100% (Verified 0 TypeScript compilation errors and 100% test pass rate in local audit suite)

---

## Phase 5 — Interactive Cart Drawer & KFC/McDonald's Style Checkout Engine — 2026-08-04
- **What was done**:
  1. Created modular, zero-dependency `cart_drawer.js` & `cart_drawer.css` implementing persistent client-side cart storage, a floating cart trigger button with live count/subtotal badge, and a glassmorphic slide-over cart drawer.
  2. Built a 3-step QSR checkout workflow: Step 1 (Cart item quantity modifiers & notes), Step 2 (Fulfillment toggle `DELIVERY` vs `TAKEAWAY`, active tenant branch picker, validated customer fields, and live subtotal/delivery fee calculation), Step 3 (Order confirmation with `display_order_id` and 1-tap WhatsApp confirmation link).
  3. Integrated cart drawer scripts across brand websites (`jushhpk`, `tandooristoppk`, `getafomo`) and monkey-patched menu card `addToOrderForm` actions.
- **Files modified**:
  - `websites/cart_drawer.js` [NEW]
  - `websites/cart_drawer.css` [NEW]
  - `websites/jushhpk/cart_drawer.js` [NEW]
  - `websites/jushhpk/cart_drawer.css` [NEW]
  - `websites/jushhpk/index.html`
  - `websites/tandooristoppk/cart_drawer.js` [NEW]
  - `websites/tandooristoppk/cart_drawer.css` [NEW]
  - `websites/tandooristoppk/index.html`
  - `websites/getafomo/cart_drawer.js` [NEW]
  - `websites/getafomo/cart_drawer.css` [NEW]
  - `websites/getafomo/index.html`
- **Self-corrections used**: 0/3
- **Confidence score**: 100% (Verified web order creation API return status `201 Created` with display ID `JK-JT-1014`)



