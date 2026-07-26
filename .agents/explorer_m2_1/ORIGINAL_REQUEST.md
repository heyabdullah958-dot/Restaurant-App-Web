## 2026-07-26T14:14:50Z
<USER_REQUEST>
You are Explorer 1 for Milestone 2 (R2: Core Operations & Backend Wiring).
Your working directory is: d:/sitesdata/Resturent App/.agents/explorer_m2_1
Project plan: d:/sitesdata/Resturent App/.agents/orchestrator/plan.md

Objective:
Investigate and design Rider Management System for GetFood (FoodSphere).

Tasks:
1. Examine `backend/restaurants/`, `backend/orders/`, `admin/src/views/BranchDashboard.tsx`, `admin/src/components/Sidebar.tsx`, and `admin/src/services/api.ts`.
2. Design `BranchRider` model:
   - Fields: `branch` (ForeignKey to Branch), `name` (CharField), `phone` (CharField), `vehicle_type` (CharField), `status` (ChoiceField: AVAILABLE, ON_DELIVERY, OFFLINE), `is_active` (BooleanField, default True), `created_at`.
   - DRF ViewSet & Serializer: endpoints for listing, adding, editing, and deleting riders for a branch manager.
   - Order assignment: endpoint/action to assign rider to an `Order`.
   - WhatsApp dispatch link generator: format `https://wa.me/<phone>?text=...` pre-filling order details, customer address, phone, items, and total amount.
3. Design Admin HQ UI integration:
   - New "Riders" management tab in Admin HQ navigation & `BranchDashboard`.
   - Rider list, Add Rider modal, and Rider Assignment modal on order cards.
4. Document all findings and step-by-step implementation details in `d:/sitesdata/Resturent App/.agents/explorer_m2_1/analysis.md` and `handoff.md`. Communicate completion to parent.
</USER_REQUEST>
