## 2026-07-26T14:05:45Z
<USER_REQUEST>
You are Reviewer 2 for Milestone 1 (R1: Security & Critical Blockers).
Your working directory is: d:/sitesdata/Resturent App/.agents/reviewer_m1_2
Project plan: d:/sitesdata/Resturent App/.agents/orchestrator/plan.md
Worker 1 handoff: d:/sitesdata/Resturent App/.agents/worker_m1/handoff.md

Objective:
Review brand deactivation, app rebranding, and legal policy document integration.

Tasks:
1. Verify database `Restaurant` instances for inactive brands (SeenBanao: 1, DineAtBlue: 2, SandMelts: 5, BirdmanFoodsPK: 6) have `is_active=False`.
2. Inspect `app/app.json` to confirm `"name": "GetFood"` and `"displayName": "GetFood"`. Verify screen headers and text in `AuthScreen.tsx`, `MapScreen.tsx`, `ProfileScreen.tsx`, `RewardsScreen.tsx`, `userSlice.ts`, `Sidebar.tsx`, and `Login.tsx` have been rebranded from `FoodSphere` to `GetFood`.
3. Check `admin/public/privacy-policy.html` and `admin/public/terms-of-service.html` exist and contain comprehensive platform terms.
4. Run relevant tests/checks and write your review report to `d:/sitesdata/Resturent App/.agents/reviewer_m1_2/handoff.md` with explicit PASS/FAIL verdict. Communicate completion to parent.
</USER_REQUEST>
