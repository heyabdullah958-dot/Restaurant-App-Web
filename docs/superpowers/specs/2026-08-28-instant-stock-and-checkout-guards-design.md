# 📐 Design Spec: Instant Stock State Resolution, Checkout Branch Availability Guard, and Cross-Branch Item Hints

---

## 📌 1. Objective & Scope
This specification details the end-to-end architectural enhancements to:
1. **Eliminate Menu Stock Hydration Lag (0ms instant resolution)**: Return and cache complete per-branch item stock states bundled inside the restaurant menu payload to eliminate the 1-2s delay and visual layout shift when viewing dishes.
2. **Cross-Branch Item Availability Hints & 1-Tap Branch Switch**: When an item is out of stock at the active branch, display alternative operational branches that have it in stock with an interactive 1-tap branch switcher.
3. **Smart Checkout Branch Selection Guard & Error Sanitizer**: Proactively evaluate cart fulfillment eligibility across all operational branches on the Checkout screen, visually dimming ineligible branches with clear explanation badges and preventing invalid order submissions.

---

## 🏛️ 2. Backend Architecture & Data Schema

### 2.1 `MenuItemSerializer` Enhancements ([`backend/restaurants/serializers.py`](file:///d:/sitesdata/Resturent%20App/backend/restaurants/serializers.py))
`MenuItemSerializer` will provide two new computed fields:
- `branch_availability_map`: A mapping of `{ [branch_id: number]: boolean }` for all branches of that restaurant.
- `other_available_branches`: An array `[{ id: number, name: string }]` containing all other active branches where `is_available = True` when the item is sold out at the requested/active branch.

```json
{
  "id": 105,
  "name": "Chicken Doner Fries",
  "price": "650.00",
  "is_available": false,
  "branch_availability_map": {
    "34": false,
    "4": true,
    "35": true
  },
  "other_available_branches": [
    { "id": 4, "name": "Johar Town" },
    { "id": 35, "name": "Lake City" }
  ]
}
```

### 2.2 Query Optimization (Batch Prefetching)
In `RestaurantDetailSerializer.get_categories` and `RestaurantMenuView.get`:
- Prefetch all `BranchMenuItemAvailability` records for the restaurant in a single batch query:
  ```python
  all_overrides = BranchMenuItemAvailability.objects.filter(
      branch__restaurant=obj
  ).values('branch_id', 'menu_item_id', 'is_available')
  ```
- Construct an in-memory dictionary `{(branch_id, menu_item_id): is_available}` and pass it via `context['branch_overrides_map']`.
- **Zero N+1 database queries** incurred during serialization.

---

## 📱 3. Customer Mobile App Architecture

### 3.1 Synchronous In-Memory Stock Evaluation ([`RestaurantScreen.tsx`](file:///d:/sitesdata/Resturent%20App/app/src/screens/RestaurantScreen.tsx))
- The menu item card computes its availability synchronously from `item.branch_availability_map` and the currently selected `selectedBranchId`:
  ```typescript
  const itemIsAvailable = useMemo(() => {
    if (item.is_available === false && !item.branch_availability_map) return false;
    if (selectedBranchId && item.branch_availability_map) {
      const branchVal = item.branch_availability_map[selectedBranchId];
      if (branchVal !== undefined) return branchVal;
    }
    return item.is_available !== false;
  }, [item, selectedBranchId]);
  ```
- **Result**: Immediate 0ms rendering of out-of-stock badges and disabled buttons on screen mount and branch switch without layout shifts.

### 3.2 Cross-Branch Availability Pill & 1-Tap Switch
- When `itemIsAvailable === false` and `item.other_available_branches.length > 0`:
  - Renders a clean badge below the item description:
    ```
    📍 In stock at Johar Town · Tap to Switch
    ```
  - Tapping this pill triggers a confirmation modal:
    > **"Switch to [Branch Name]?"**  
    > *"This item is available at [Branch Name]. Would you like to switch your active branch to [Branch Name] to order this item?"*  
    > `[Cancel]` `[Switch Branch]`
  - On confirm, `selectedBranchId` is updated immediately.

### 3.3 Smart Checkout Branch Fulfillment Guard ([`CheckoutScreen.tsx`](file:///d:/sitesdata/Resturent%20App/app/src/screens/CheckoutScreen.tsx))
- Computes fulfillment eligibility for each operational branch against `cart.items`:
  ```typescript
  const branchEligibilityMap = useMemo(() => {
    const map: Record<number, { isEligible: boolean; unavailableItems: string[] }> = {};
    for (const b of branches) {
      const unavailable: string[] = [];
      for (const cartItem of cart.items) {
        if (cartItem.branch_availability_map && cartItem.branch_availability_map[b.id] === false) {
          unavailable.push(cartItem.name);
        }
      }
      map[b.id] = {
        isEligible: unavailable.length === 0,
        unavailableItems: unavailable,
      };
    }
    return map;
  }, [branches, cart.items]);
  ```
- For ineligible branches:
  - Branch option card is dimmed (`opacity: 0.55`) with a warning badge: `⚠️ 1 item in your cart is sold out here`.
  - Tapping an ineligible branch opens an informative dialog explaining which cart items cannot be fulfilled, preventing selection.
  - Prevents order submission against sold-out branches.

### 3.4 Defensive Backend Error Formatter
- Added `formatCheckoutError(rawPayload)` in `CheckoutScreen.tsx`:
  - Unpacks `non_field_errors[0]`, `detail`, `items[0]`, or key-value validation errors into clean user-facing sentences.
  - Eliminates raw JSON strings like `{"non_field_errors": [...]}`.

---

## 🧪 4. 5-Tier Quality Assurance & Verification Suite

1. **Tier 1: Combinatorial Cart-Branch Matrix Engine**: Validates single-item, multi-item overlap, and zero-stock cart scenarios.
2. **Tier 2: Latency & N+1 Query Profiler**: Confirms batch query execution with zero N+1 overhead (<40ms serialization).
3. **Tier 3: Multi-Tenant E2E Simulation (`test_instant_stock_and_checkout_guards.py`)**: Tests real JWT stock toggles, menu serialization, and order creation rejection/acceptance across real operational branches.
4. **Tier 4: TypeScript Zero-Error Gate**: `npx tsc --noEmit` on `app` and `admin-app` with 0 errors.
5. **Tier 5: Live Heroku Cloud Production Verification**: Deploys release `v83` to Heroku and verifies live endpoints.
