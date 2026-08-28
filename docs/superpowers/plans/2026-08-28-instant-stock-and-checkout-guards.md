# Instant Stock State Resolution, Checkout Branch Availability Guard, and 5-Tier QA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide 0ms instant menu stock resolution, interactive cross-branch availability switch pills on unavailable items, smart checkout branch fulfillment guards with formatted error alerts, and verify with a comprehensive 5-tier QA suite.

**Architecture:** Backend serializers prefetch and bundle a complete multi-branch availability matrix (`branch_availability_map` and `other_available_branches`) in a single batch query. Frontend screens compute availability synchronously in-memory (0ms) and evaluate cart-branch compatibility before checkout selection.

**Tech Stack:** Django REST Framework, PostgreSQL, React Native (Expo), Redux Toolkit, TypeScript, Python automated testing.

## Global Constraints
- DRF serializers must NEVER execute N+1 database queries; batch prefetch all `BranchMenuItemAvailability` records.
- Menu items must evaluate stock availability synchronously from in-memory maps in 0ms without layout shifts.
- Checkout screen must proactively dim ineligible branches and prevent order placement against sold-out branches.
- Error alerts must be formatted into clean sentences without raw DRF JSON structures.
- All TypeScript checks (`npx tsc --noEmit`) across `app` and `admin-app` must pass with 0 errors.

---

### Task 1: Backend Data Schema & Batch Availability Serialization

**Files:**
- Modify: `backend/restaurants/serializers.py`
- Modify: `backend/restaurants/views.py`
- Test: `test_backend_local.py`

**Interfaces:**
- Produces: `MenuItemSerializer` fields: `branch_availability_map` (dict), `other_available_branches` (list)
- Produces: `RestaurantDetailSerializer` & `RestaurantMenuView` batch prefetch lookup map in context

- [ ] **Step 1: Write test verifying `branch_availability_map` and `other_available_branches` in serializer output**

```python
# Add test in test_backend_local.py
def test_branch_availability_matrix():
    # Verify MenuItemSerializer returns branch_availability_map and other_available_branches
    pass
```

- [ ] **Step 2: Update `backend/restaurants/serializers.py`**
Enhance `MenuItemSerializer` with `branch_availability_map` and `other_available_branches` methods, using batch prefetched overrides from `self.context['branch_overrides_map']`.

- [ ] **Step 3: Update `RestaurantDetailSerializer.get_categories` and `RestaurantMenuView.get`**
Batch prefetch `BranchMenuItemAvailability.objects.filter(branch__restaurant=obj)` and inject `branch_overrides_map` into serializer context.

- [ ] **Step 4: Run `test_backend_local.py` and verify all tests pass**

```bash
backend\venv\Scripts\python.exe test_backend_local.py
```

- [ ] **Step 5: Commit changes**

```bash
git add backend/restaurants/serializers.py backend/restaurants/views.py test_backend_local.py
git commit -m "feat(backend): add bundled branch availability matrix and zero N+1 prefetching"
```

---

### Task 2: Customer Mobile App Zero-Lag Stock Resolution & Cross-Branch Switcher

**Files:**
- Modify: `app/src/screens/RestaurantScreen.tsx`
- Modify: `app/src/types/index.ts`
- Modify: `app/src/services/fallbackData.ts`

**Interfaces:**
- Consumes: `item.branch_availability_map`, `item.other_available_branches` from MenuItem
- Produces: 0ms synchronous in-memory stock evaluation and 1-tap branch switch modal prompt

- [ ] **Step 1: Update `app/src/types/index.ts`**
Add `branch_availability_map?: Record<string | number, boolean>` and `other_available_branches?: Array<{ id: number; name: string }>` to `MenuItem` interface.

- [ ] **Step 2: Update `MenuItemCard` in `app/src/screens/RestaurantScreen.tsx`**
Compute `itemIsAvailable` synchronously using `useMemo` from `item.branch_availability_map` and `selectedBranchId`.
Add the cross-branch availability pill (*📍 In stock at [Branch] · Tap to Switch*) with confirmation dialog when `itemIsAvailable === false` and `other_available_branches.length > 0`.

- [ ] **Step 3: Update fallback catalog data in `app/src/services/fallbackData.ts`**
Ensure fallback restaurant items include baseline branch availability maps matching active PostgreSQL IDs.

- [ ] **Step 4: Verify type safety with `npx tsc --noEmit` in `app`**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 5: Commit changes**

```bash
git add app/src/types/index.ts app/src/screens/RestaurantScreen.tsx app/src/services/fallbackData.ts
git commit -m "feat(app): add zero-lag stock resolution and cross-branch switch pill"
```

---

### Task 3: Smart Checkout Branch Selection Guard & Error Sanitizer

**Files:**
- Modify: `app/src/screens/CheckoutScreen.tsx`

**Interfaces:**
- Consumes: `cart.items`, `branches`, `branch_availability_map`
- Produces: `branchEligibilityMap`, dimmed ineligible branch selector cards, formatted error alerts

- [ ] **Step 1: Implement `branchEligibilityMap` in `app/src/screens/CheckoutScreen.tsx`**
Compute fulfillment eligibility per operational branch synchronously against `cart.items`.

- [ ] **Step 2: Update branch selector cards in `CheckoutScreen.tsx`**
Dim ineligible branches (`opacity: 0.55`), display `⚠️ [N] item(s) sold out here` warning badge, and intercept taps with an informative dialog.

- [ ] **Step 3: Implement `formatCheckoutError` helper in `CheckoutScreen.tsx`**
Parse raw DRF error payloads (`non_field_errors`, `items`, `detail`) into clean, user-friendly sentences.

- [ ] **Step 4: Verify type safety with `npx tsc --noEmit` in `app`**

```bash
cd app && npx tsc --noEmit
```

- [ ] **Step 5: Commit changes**

```bash
git add app/src/screens/CheckoutScreen.tsx
git commit -m "feat(app): add smart checkout branch fulfillment guard and error sanitizer"
```

---

### Task 4: 5-Tier QA Suite Automation Script

**Files:**
- Create: `test_instant_stock_and_checkout_guards.py`

**Interfaces:**
- Produces: Automated 5-tier verification suite execution with detailed pass/fail report

- [ ] **Step 1: Write `test_instant_stock_and_checkout_guards.py`**
Implement Tier 1 combinatorial cart tests, Tier 2 N+1 query profiler, Tier 3 multi-tenant E2E manager stock toggles & order creation tests, Tier 4 typecheck verification, and Tier 5 live endpoint probing.

- [ ] **Step 2: Run `test_instant_stock_and_checkout_guards.py` locally**

```bash
backend\venv\Scripts\python.exe test_instant_stock_and_checkout_guards.py
```

- [ ] **Step 3: Commit test suite**

```bash
git add test_instant_stock_and_checkout_guards.py
git commit -m "test: add comprehensive 5-tier instant stock and checkout guard QA suite"
```

---

### Task 5: Cloud Deployment & Live Verification

**Files:**
- Deploy: Heroku backend (`v83`)
- Verify: Live endpoints on `https://getfoodpk-fd9b20442fcf.herokuapp.com`

- [ ] **Step 1: Push updates to GitHub `origin main`**

```bash
git push origin main
```

- [ ] **Step 2: Deploy backend subtree to Heroku**

```bash
git subtree push --prefix backend heroku main
```

- [ ] **Step 3: Run live verification against Heroku `v83`**

```bash
backend\venv\Scripts\python.exe -c "import urllib.request, json; data=json.loads(urllib.request.urlopen('https://getfoodpk-fd9b20442fcf.herokuapp.com/api/restaurants/jushhpk/').read()); print('Categories:', len(data['data']['categories'])); item=data['data']['categories'][0]['items'][0]; print('Item:', item['name'], 'Availability map:', item.get('branch_availability_map'))"
```

- [ ] **Step 4: Create completion walkthrough**
Document all test results, screenshots, and architecture changes.
