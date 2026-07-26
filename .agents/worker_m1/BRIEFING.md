# BRIEFING — 2026-07-26T14:05:30Z

## Mission
Execute Milestone 1 tasks: PII Security Fixes, Brand Deactivation & Rebranding, Legal Pages Deployment, and Verification.

## 🔒 My Identity
- Archetype: implementer / qa / specialist
- Roles: implementer, qa, specialist
- Working directory: d:/sitesdata/Resturent App/.agents/worker_m1
- Original parent: 8ac5b67c-63dd-454b-b01f-6bc8af6b1987
- Milestone: Milestone 1 (R1: Security & Critical Blockers)

## 🔒 Key Constraints
- Minimal change principle.
- Genuine implementation — no hardcoded test results, facade logic, or cheating.
- PII security: tracking_token read-only in order serializers, OrderDetailView security check, remove phone filter from MyOrdersListView.
- Brand deactivation: ensure 4 inactive brands set to is_active=False. Fallback files only list active brands (JushhPK, TandooriStop, GetAFomo). Rebrand FoodSphere -> GetFood in target files.
- Legal pages: copy privacy-policy.html and terms-of-service.html to admin/public/ and wire links in app.
- Verification: Run backend tests and ensure all tests pass.

## Current Parent
- Conversation ID: 8ac5b67c-63dd-454b-b01f-6bc8af6b1987
- Updated: 2026-07-26T14:05:30Z

## Task Summary
- **What to build**: Fix PII security in orders API, deactivate inactive brands in DB and fallback files, rebrand FoodSphere -> GetFood across UI files, copy legal pages to admin/public, wire legal links in mobile app screens, run test suite.
- **Success criteria**: All 10 unit tests pass, order endpoints secure against unauthorized PII access, branding updated, legal pages deployed and wired.
- **Interface contracts**: GEMINI.md, DRF order endpoints.
- **Code layout**: d:/sitesdata/Resturent App/ (backend, app, admin)

## Key Decisions Made
- `tracking_token` added as a read-only field to `OrderCreateSerializer`, `OrderListSerializer`, and `OrderDetailSerializer`.
- `OrderDetailView.get_object()` enforces access check for GET requests: allows access if request user owns order or is staff, OR if query param `?tracking_token=<uuid>` matches order's tracking token. Otherwise raises `PermissionDenied` (403 Forbidden).
- `MyOrdersListView` permission changed to `IsAuthenticated`, removing unauthenticated `?phone=` query param lookup.
- Migration `0009_order_tracking_token.py` generated and applied to backend DB.
- Set `is_active=False` in DB for inactive brands (seenbanao, dineatblue, sandmelts, birdmanfoodspk) and `is_active=True` for active launch brands (jushhpk, tandooristoppk, getafomo).
- Rebranded FoodSphere to GetFood in `app/app.json`, `AuthScreen.tsx`, `MapScreen.tsx`, `ProfileScreen.tsx`, `RewardsScreen.tsx`, `userSlice.ts`, `Sidebar.tsx`, `Login.tsx`.
- Deployed `privacy-policy.html` and `terms-of-service.html` to `admin/public/` and wired links in `ProfileScreen.tsx` and `AuthScreen.tsx`.

## Change Tracker
- **Files modified**:
  - `backend/orders/serializers.py` - Added tracking_token to OrderCreateSerializer, OrderListSerializer, OrderDetailSerializer.
  - `backend/orders/views.py` - Added permission check to OrderDetailView and required IsAuthenticated for MyOrdersListView.
  - `backend/orders/models.py` - Updated tracking_token field declaration for migration.
  - `backend/orders/migrations/0009_order_tracking_token.py` - Added tracking_token field migration.
  - `backend/orders/tests.py` - Added 10 unit tests for PII security checks.
  - `app/app.json` - Rebranded slug from app to getfood.
  - `app/src/screens/AuthScreen.tsx` - Rebranded text to GetFood, imported Linking, added legal footer links.
  - `app/src/screens/MapScreen.tsx` - Rebranded FoodSphere Map to GetFood Map.
  - `app/src/screens/ProfileScreen.tsx` - Rebranded support email, wired Privacy Policy & Terms of Service action items.
  - `app/src/screens/RewardsScreen.tsx` - Rebranded FoodSphere Points to GetFood Points.
  - `app/src/store/userSlice.ts` - Rebranded fallback guest email to guest@getfood.pk.
  - `admin/src/components/Sidebar.tsx` - Rebranded FS / FoodSphere HQ to GF / GetFood HQ.
  - `admin/src/views/Login.tsx` - Rebranded FS / FoodSphere Workspace to GF / GetFood Workspace.
  - `admin/public/privacy-policy.html` - Created Privacy Policy HTML.
  - `admin/public/terms-of-service.html` - Created Terms of Service HTML.
- **Build status**: PASS
- **Pending issues**: None

## Quality Status
- **Build/test result**: 10/10 Django order PII security unit tests PASSED. test_backend_local.py full audit PASSED.
- **Lint status**: OK
- **Tests added/modified**: `backend/orders/tests.py` (10 unit tests added for order PII security)

## Loaded Skills
- None

## Artifact Index
- d:/sitesdata/Resturent App/.agents/worker_m1/ORIGINAL_REQUEST.md — Original request instructions
- d:/sitesdata/Resturent App/.agents/worker_m1/BRIEFING.md — Working memory briefing
- d:/sitesdata/Resturent App/.agents/worker_m1/progress.md — Progress log
- d:/sitesdata/Resturent App/.agents/worker_m1/handoff.md — Final handoff report
