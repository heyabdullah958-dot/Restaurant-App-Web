## 2026-07-26T13:54:12Z
You are Worker 1 for Milestone 1 (R1: Security & Critical Blockers).
Your working directory is: d:/sitesdata/Resturent App/.agents/worker_m1
Project plan: d:/sitesdata/Resturent App/.agents/orchestrator/plan.md

Explorer handoffs to review:
- d:/sitesdata/Resturent App/.agents/explorer_m1_1/handoff.md (PII security leak fixes)
- d:/sitesdata/Resturent App/.agents/explorer_m1_2/handoff.md (Brand deactivation & rebranding)
- d:/sitesdata/Resturent App/.agents/explorer_m1_3/handoff.md (Privacy policy & terms of service files)

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks for Milestone 1:
1. PII Security Fixes:
   - In `backend/orders/serializers.py`, add `tracking_token` (UUID, read-only) to `OrderCreateSerializer`, `OrderDetailSerializer`, and `OrderListSerializer`.
   - In `backend/orders/views.py`:
     - Update `OrderDetailView` (`GET /api/orders/{id}/`): Ensure permissions allow access only if:
       (a) `request.user` is authenticated and owns the order (`order.user == request.user` or `request.user.is_staff`), OR
       (b) request query parameter `?tracking_token=<uuid>` matches `order.tracking_token`.
       Return 403 Forbidden or 404 Not Found for unauthorized access attempts.
     - Update `MyOrdersListView` (`GET /api/orders/my-orders/`): Remove unauthenticated `?phone=` filtering. Require `IsAuthenticated` or filter strictly by authenticated user / valid token.
2. Brand Deactivation & Rebranding:
   - Ensure inactive brands (`seenbanao`, `dineatblue`, `sandmelts`, `birdmanfoodspk`) have `is_active = False` in the database. Run `python manage.py seed_restaurants` or Django shell script.
   - Verify `app/src/services/fallbackData.ts` and `admin/src/AdminContext.tsx` only list active brands (JushhPK, TandooriStop, GetAFomo).
   - Rebrand all occurrences of `FoodSphere` -> `GetFood` in `app/app.json` (including name, displayName, slug), `AuthScreen.tsx`, `MapScreen.tsx`, `ProfileScreen.tsx`, `RewardsScreen.tsx`, `userSlice.ts`, `Sidebar.tsx`, `Login.tsx`.
3. Legal Pages Deployment:
   - Copy `privacy-policy.html` and `terms-of-service.html` from `d:/sitesdata/Resturent App/.agents/explorer_m1_3/` to `admin/public/`.
   - Wire links to Privacy Policy and Terms of Service in `app/src/screens/ProfileScreen.tsx` and `AuthScreen.tsx`.
4. Verification & Testing:
   - Run backend tests (`python manage.py test` or relevant test suite in `backend/`).
   - Verify non-breaking behavior across backend and app code.
   - Document all changes, test commands, and execution results in `d:/sitesdata/Resturent App/.agents/worker_m1/handoff.md` and communicate completion to parent.
