# Universal Branch Item Availability Sync & Checkout Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure menu item stock toggling across any branch manager profile or super admin immediately reflects in customer apps/websites with "OUT OF STOCK" badges and is strictly enforced during checkout.

**Architecture:** Location/branch-aware menu queries (`?branch_id=X`), real-time checkout pre-flight stock validation, universal branch manager JWT decoding, and PostgreSQL atomic order rejection deployed to 24/7 Heroku.

**Tech Stack:** React Native (Expo), Redux Toolkit, Django 6.0 REST Framework, SimpleJWT, PostgreSQL (Heroku).

## Global Constraints
- Must support all 7 live operational branches across Tandoori Stop, Jush PK, and Get A Fomo.
- Must support both Super Admin (global scope) and Branch Managers (branch-scoped) without permission issues.
- Zero frame drop during menu scrolling; instant optimistic UI updates on manager stock toggles.
- Zero guest state / cross-user notification leakage.

---

### Task 1: Restaurant Screen Location & Branch-Aware Menu Query

**Files:**
- Modify: `app/src/screens/RestaurantScreen.tsx`
- Consumes: `GET /api/restaurants/{slug}/?branch_id={id}`
- Produces: Branch selector chip in restaurant header, automatic nearest branch resolution, dynamic stock badge rendering (`OUT OF STOCK` + disabled "+ Add" button).

- [ ] **Step 1: Add branch resolution and state to RestaurantScreen.tsx**
  - Read `customerAddress` or location from Redux / state.
  - Determine default/nearest branch from `restaurant.branches`.
  - Maintain `selectedBranchId` in component state.

- [ ] **Step 2: Update menu fetch query to include branch_id**
  - Update `fetchRestaurantDetail` dispatch or API call to pass `?branch_id=${selectedBranchId}` whenever `selectedBranchId` is set or changed.

- [ ] **Step 3: Render Branch Selector Chip & Branch Selection Modal**
  - In `RestaurantScreen.tsx` header, add `📍 {selectedBranch.name} ▾` pill.
  - Tapping opens a quick bottom sheet modal to switch branches for multi-branch brands (e.g. Jush PK: Johar Town / Lake City / DHA Phase 1).

- [ ] **Step 4: Verify typecheck & component rendering**
  - Run: `npx tsc --noEmit` in `app/`.

---

### Task 2: Checkout Screen Pre-Flight Branch Stock Verification

**Files:**
- Modify: `app/src/screens/CheckoutScreen.tsx`
- Consumes: Cart items, `selectedBranchId`, `restaurant.branches`.
- Produces: Instant visual alert on sold-out items, checkout button disabled state when any cart item is out of stock at the selected branch.

- [ ] **Step 1: Add checkBranchStockAvailability helper in CheckoutScreen.tsx**
  - When `selectedBranchId` changes, fetch/check line item availability against the branch.
  - If any item in cart is unavailable, set `outOfStockItemNames: string[]`.

- [ ] **Step 2: Render Out-of-Stock Warning Banner & Button Lock**
  - Render red banner: *"⚠️ {item_name} is sold out at {branch_name}. Please remove it to proceed."*
  - Disable "Place Order" button if `outOfStockItemNames.length > 0`.

- [ ] **Step 3: Verify TypeScript compilation**
  - Run: `npx tsc --noEmit` in `app/`.

---

### Task 3: Backend Universal Multi-Tenant Availability & Checkout Gate

**Files:**
- Modify: `backend/restaurants/serializers.py`
- Modify: `backend/orders/serializers.py`
- Modify: `backend/restaurants/views.py`

- [ ] **Step 1: Test Branch Item Availability Serializer**
  - Verify `MenuItemSerializer.get_is_available` resolves integer and slug branch IDs against `BranchMenuItemAvailability`.

- [ ] **Step 2: Test OrderCreateSerializer Validation & Transactional Create Gate**
  - Verify `OrderCreateSerializer.validate()` and `create()` reject branch-disabled items with HTTP 400.

- [ ] **Step 3: Run backend test suite**
  - Run: `backend\venv\Scripts\python.exe test_backend_local.py`
  - Expected: 23/23 tests pass.

---

### Task 4: Merchant App Stock Toggle Standardization

**Files:**
- Modify: `admin-app/src/screens/placeholders/MenuManagementScreen.tsx`
- Consumes: `auth.branchId`, `auth.role`, `toggleBranchItemAvailability`.
- Produces: Optimistic stock toggling with rollback on failure, role-scoped permissions.

- [ ] **Step 1: Verify manager branch scoping in MenuManagementScreen.tsx**
  - Ensure `branchId` is decoded from `auth` state and passed to `toggleItemAvailabilityThunk`.

- [ ] **Step 2: Verify typecheck in admin-app**
  - Run: `npx tsc --noEmit` in `admin-app/`.

---

### Task 5: Live Heroku Cloud Deployment & End-to-End Verification

**Files:**
- Remote: `heroku/main`

- [ ] **Step 1: Commit all local changes**
  - Run `git add .` and `git commit -m "feat: universal branch item availability sync and checkout gate"`.

- [ ] **Step 2: Push backend subtree to Heroku**
  - Run `git subtree push --prefix backend heroku main`.

- [ ] **Step 3: Verify live endpoint health**
  - Send test request to `https://getfoodpk-fd9b20442fcf.herokuapp.com/api/restaurants/` and verify HTTP 200.
