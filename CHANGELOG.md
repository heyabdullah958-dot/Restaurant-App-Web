
## 2026-07-17 Updates
- Fixed MapScreen crash caused by hooks conditionality.
- Fixed Guest Customer bug on AuthScreen after real logins.
- Implemented FALLBACK_RESTAURANTS in HomeScreen to handle offline category filtering.
- Cleaned up POPULAR_SEARCHES in SearchScreen to match active phase 1 brands.

## 2026-07-21 Updates
- Multi-tenant Branch Manager feature deployed to production on Render & Cloudflare.
- Updated `create_restaurant_managers` command to dynamically seed branch-specific staff users & profiles.
- Integrated Cloudinary storage (`depa8gfnk`) for persistent media uploads.
- Processed Tandoori Stop brand guideline PDF & photos: uploaded primary logo, cover/banner, and 17 high-res food photos to Cloudinary, linking 41 MenuItems.
- Created `seed_tandoori_images` management command and integrated it into `render.yaml` build pipeline.
- Added interactive **Branch Settings** modal in Admin Panel (`BranchDashboard.tsx` & `AdminContext.tsx`) allowing managers to update WhatsApp numbers, locations, and active status in real time.
- Enhanced Mobile App (`CheckoutScreen`, `OrderConfirmationScreen`, `TrackingScreen`) with assigned branch indicators.
- Upgraded Instagram feed integration for GetAFomo website (`websites/getafomo/index.html`).
- Ran automated integration test suite `test_backend_local.py` (100% pass rate across all 3 active launch brands).

## 2026-07-22 Production Backend Readiness Updates
- Implemented 3-tier multi-tenant manager hierarchy (Super Admin -> Restaurant Manager -> Branch Manager).
- Seeded real branch data for Tandoori Stop (Johar Town, Lake City, GT Road Baghbanpura) and dummy branch structures for Jush & GetAFomo via `seed_branches`.
- Integrated dual email notifications on order creation (Detailed HTML/Text email to Branch Manager + Summary email to Restaurant Manager).
- Implemented area-based keyword matching in `resolve_branch_for_order` for customer delivery address auto-assignment.
- Created public/manager `GET /api/branches/` endpoint and `/api/managers/` endpoint routing.
- Built and passed 100% automated end-to-end integration test suite `test_order_flow_e2e.py`.

