# Universal Multi-Tenant Branch Item Availability Sync & Checkout Enforcement Spec

## 1. Overview & Goal
Ensure that menu item stock toggling performed by **any Branch Manager** (across all 7 operational branches) or **Super Admin** immediately and universally reflects across the customer ecosystem (Customer Mobile App + Brand Websites), preventing out-of-stock items from being displayed as available or ordered at checkout.

---

## 2. Role-Based Architecture & Account Portability

### A. Branch Managers (All 7 Live Operational Branches)
- **Tandoori Stop**: Johar Town (`id: 1`), Lake City (`id: 2`), GT Road Baghbanpura (`id: 3`)
- **Jush PK**: Johar Town (`id: 4`), DHA Phase 1 (`id: 34`), Lake City (`id: 35`)
- **Get A Fomo**: Gulberg III (`id: 36`)

**Behavior**:
- When any branch manager logs into `admin-app`, their session decodes `branch_id` directly from their JWT payload (`auth.branchId`).
- Toggling an item in `MenuManagementScreen.tsx` dispatches `POST /api/restaurants/branch-item-availability/` with their assigned `branch_id`.
- The backend checks `get_managed_branch(user)` / `manager_profile.branch_id` and records the override in PostgreSQL table `restaurants_branchmenuitemavailability` atomically.

### B. Super Admin
- Super Admin (`username: admin`) has global permissions across all 7 brands and all branches.
- When Super Admin views menu management, they can edit items globally (mutating `MenuItem.is_available`) or scope overrides to any individual branch.

---

## 3. Customer Touchpoints & Flow

### A. Restaurant Screen (`RestaurantScreen.tsx`)
- **Branch Selector & Context**:
  - Displays a clean, sticky **Branch Selector Chip** at the top of the restaurant header (e.g. `📍 Johar Town ▾`).
  - Auto-selects the nearest branch based on the user's location or defaults to the primary branch.
  - When the customer taps the branch selector modal or changes location, the menu re-fetches `GET /api/restaurants/{slug}/?branch_id={selectedBranchId}`.
- **Stock UI & Card Action**:
  - If `item.is_available === false` for that branch:
    - Renders a visible red badge: **"OUT OF STOCK"**.
    - Disables the `+ Add to Cart` button (`opacity: 0.65`, non-tappable).
    - Prevents adding to cart directly from the menu.

### B. Checkout Screen Pre-Flight Guard (`CheckoutScreen.tsx`)
- When the customer selects or confirms a branch during checkout:
  - The app verifies all line items in the cart against the selected branch's inventory.
  - If any item in the cart is sold out at the selected branch:
    - Renders a warning banner: *"⚠️ 1 item in your cart is sold out at {Branch Name}."*
    - Highlights the affected item in the cart breakdown.
    - Disables the **"Place Order"** button until the sold-out item is removed or the branch is changed.

---

## 4. Backend & Cloud Enforcement (Django + Heroku)

### A. Serializer Availability Resolution (`MenuItemSerializer`)
- Reads `branch_id` from request query params or context.
- Resolves against `BranchMenuItemAvailability` for integer IDs, slugs, and branch names.
- Returns `is_available: false` if either global `MenuItem.is_available` is False OR the branch override is False.

### B. Atomic Transactional Checkout Guard (`OrderCreateSerializer`)
- In `validate()` and inside `create()` (under `transaction.atomic()`):
  - Resolves target branch.
  - Verifies `menu_item.is_available` and `BranchMenuItemAvailability.objects.filter(branch=branch, menu_item=menu_item)`.
  - Aborts order creation with HTTP 400 if any cart item is out of stock at that branch.

### C. Live Cloud Deployment
- Deploy updated Django backend codebase to 24/7 Heroku production (`git subtree push --prefix backend heroku main`).

---

## 5. Verification Plan
1. **Multi-Account Manager Test**: Log into Manager Accounts across all 3 brands and verify stock toggle succeeds with optimistic rollback on network error.
2. **Branch Switching Test**: Turn an item OFF in Lake City, leave it ON in Johar Town. Verify Customer App shows "OUT OF STOCK" on Lake City and in-stock on Johar Town.
3. **Checkout Validation Test**: Verify automated backend test rejects order creation with HTTP 400 when attempting to purchase a sold-out item.
4. **Build & Live Health**: Confirm TypeScript passes (`0 errors`) and live Heroku API responds with HTTP 200.
