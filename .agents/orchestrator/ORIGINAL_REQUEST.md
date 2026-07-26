# Original User Request

## Initial Request — 2026-07-26T18:49:34+05:00

You are the Project Orchestrator for GetFood (FoodSphere) Launch-Readiness.
Your task is to manage and execute the full launch-readiness plan based on the original user prompt in `d:/sitesdata/Resturent App/.agents/ORIGINAL_REQUEST.md` and `GEMINI.md`.

Working directory: d:/sitesdata/Resturent App
Agent folder: d:/sitesdata/Resturent App/.agents/orchestrator

Key Objectives & Requirements:
1. Requirements R1: Security & Critical Blockers (Fix PII order leaks with guest tracking token UUIDs, deactivate 4 inactive brands, rebrand FoodSphere -> GetFood in app/app.json and headers, generate privacy-policy.html and terms-of-service.html for Cloudflare Pages).
2. Requirements R2: Core Operations & Backend Wiring (BranchRider model & management tab + WhatsApp link generator, delivery radius enforcement, operating hours enforcement on API/app, server-side coupon validation & atomic increment).
3. Requirements R3: Ratings, Loyalty & Admin Settings (RestaurantReview model + DRF endpoints + seeding command + app prompt, PlatformSettings singleton model for earn/redemption rates, welcome loyalty bonus on signup).
4. Requirements R4: Design Tokens & App Store Build Readiness (Overhaul app/src/theme.ts to #E8364E, #0F0F1A + typography tokens, eliminate raw hex values across screens, Expo production build setup).

## Follow-up (Generation 2 Succession) — 2026-07-26T19:27:23Z

You are the Successor Orchestrator (Generation 2) for GetFood (FoodSphere) Launch-Readiness.
Resume work at d:/sitesdata/Resturent App/.agents/orchestrator. Read handoff.md, BRIEFING.md, ORIGINAL_REQUEST.md, and progress.md for current state.
Your parent is 8ac5b67c-63dd-454b-b01f-6bc8af6b1987 — use this ID for all escalation and status reporting (send_message).

State summary:
- Milestone 1 (R1: Security & Critical Blockers) — COMPLETED & VERIFIED CLEAN.
- Milestone 2 (R2: Core Operations & Backend Wiring) — COMPLETED & VERIFIED CLEAN.

Your Objectives:
Execute Milestone 3 (R3: Ratings, Loyalty & Admin Settings) and Milestone 4 (R4: Design Tokens & Build Readiness) to 100% completion using the Project Pattern iteration loop:
1. Milestone 3 (R3):
   - Ratings & Reviews system (`RestaurantReview` model, DRF endpoints, seeding command `python manage.py seed_reviews`, app rating prompt).
   - `PlatformSettings` singleton model for Super Admin configurable loyalty points earn/redemption rates.
   - Welcome loyalty bonus trigger on new user registration.
2. Milestone 4 (R4):
   - Overhaul `app/src/theme.ts` with vibrant coral red (`#E8364E`), dark surface (`#0F0F1A`), and typography tokens.
   - Eliminate hardcoded hex strings across 7 core screen files in app.
   - Expo production build configuration (`eas.json` & AAB / iOS readiness).

For each remaining milestone:
a. Dispatch Explorers -> b. Dispatch Worker -> c. Dispatch Reviewers, Challengers, and Forensic Auditor -> d. Gate evaluation (Auditor CLEAN required).
When all milestones are 100% complete and verified CLEAN, present your final completion report and victory claim to parent `8ac5b67c-63dd-454b-b01f-6bc8af6b1987`.
