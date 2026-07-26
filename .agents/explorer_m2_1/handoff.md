# Handoff Report: Rider Management System Design (Milestone 2 - R2)

## 1. Observation
- **Backend Architecture**:
  - `backend/restaurants/models.py:41-63`: `Branch` model defined with ForeignKey to `Restaurant`, `name`, `address`, `phone`, `is_active`.
  - `backend/orders/models.py:6-73`: `Order` model defined with `user`, `restaurant`, `branch`, `tracking_token`, `status`, `payment_method`, `delivery_address`, `total`, `created_at`.
  - `backend/config/admin_utils.py:1-32`: Permissions utils `get_managed_restaurant(user)` and `get_managed_branch(user)` resolve manager profiles and groups.
- **Frontend Architecture**:
  - `admin/src/services/api.ts:549-552`: Existing API stubs for `/api/admin/riders/` (`fetchRiders`, `createRider`, `updateRider`, `deleteRider`).
  - `admin/src/AdminContext.tsx:38-69`: Context manager supporting multi-tenant view state and live API synchronization.
  - `admin/src/components/Sidebar.tsx:220-330`: Sidebar drawer rendering Super-Admin and Branch Manager navigation items.
  - `admin/src/views/BranchDashboard.tsx`: Branch manager dashboard view displaying store status and orders.
  - `admin/src/views/OrderManagement.tsx:243-345`: Live Kanban order board rendering order cards across 5 status columns (`pending`, `received`, `preparing`, `out_for_delivery`, `delivered`).

---

## 2. Logic Chain
1. **Multi-tenant Requirement**: FoodSphere operates 7 restaurant brands with multi-branch capabilities. Riders belong to specific branches, so `BranchRider` must reference `Branch` via a ForeignKey.
2. **State & Availability**: Riders must transition through statuses (`AVAILABLE`, `ON_DELIVERY`, `OFFLINE`). When an order is assigned and transitions to `out_for_delivery`, the rider's status should update to `ON_DELIVERY`.
3. **Order Assignment**: The `Order` model requires a `rider` ForeignKey pointing to `BranchRider` to store assignment data per order.
4. **WhatsApp Link Generator**: Managers require quick dispatch to riders. Using `https://wa.me/<phone>?text=<encoded_text>`, pre-filling Order ID, customer details, delivery address, item list, and total collection amount allows instant 1-click dispatch from order cards.
5. **HQ & Branch Navigation**: Introducing a dedicated "Riders" navigation tab in `Sidebar.tsx` and `RiderManagement.tsx` view enables complete CRUD operations for rider accounts.

---

## 3. Caveats
- **Phone Number Formatting**: WhatsApp dispatch links require clean international phone numbers (e.g., `923001234567`). The link generator handles local `03XX` conversion, but rider phone numbers must be validated on entry.
- **Database Migration**: Adding `BranchRider` and updating `Order` with `rider` ForeignKey requires running Django migrations (`makemigrations` & `migrate`).

---

## 4. Conclusion
The Rider Management System design is complete, modular, and fully compliant with FoodSphere multi-tenant invariants. The complete implementation specification, model structures, DRF ViewSet, WhatsApp link generator logic, and Admin UI mockups are documented in `d:/sitesdata/Resturent App/.agents/explorer_m2_1/analysis.md`.

---

## 5. Verification Method

### 5.1 Backend Verification
Run Django test suite or check endpoints:
```bash
python backend/manage.py test restaurants orders
```
Inspect model migration:
```bash
python backend/manage.py makemigrations restaurants orders
```

### 5.2 Frontend & UI Verification
1. Verify `Rider Management` tab renders in `Sidebar.tsx`.
2. Verify Rider List and Add/Edit Rider modal in `RiderManagement.tsx`.
3. Verify Rider Assignment modal/dropdown on order cards in `OrderManagement.tsx`.
4. Test WhatsApp dispatch link generation format:
   - Output string must start with `https://wa.me/92...` and contain encoded order summary.
