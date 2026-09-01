# Task 4: 5-Tier QA Suite Automation Script

## Objective
Create and execute `test_instant_stock_and_checkout_guards.py` providing automated verification for all 5 quality tiers:
1. Tier 1: Combinatorial Cart-Branch Matrix Tests (Single-item, multi-item overlap, and all-out-of-stock scenarios).
2. Tier 2: Latency & N+1 Database Query Inspection (confirms single batch query prefetch, <40ms serialization).
3. Tier 3: Multi-Tenant E2E Lifecycle Simulation (manager JWT stock toggles, menu serialization verification, order creation rejection & acceptance).
4. Tier 4: TypeScript Zero-Defect Gate (`npx tsc --noEmit` across `app` and `admin-app`).
5. Tier 5: Live Heroku Production Cloud Probing.

## Files to Create/Modify:
- Create: `test_instant_stock_and_checkout_guards.py`
- Run: `backend\venv\Scripts\python.exe test_instant_stock_and_checkout_guards.py`
- Commit: `git add test_instant_stock_and_checkout_guards.py; git commit -m "test: add comprehensive 5-tier instant stock and checkout guard QA suite"`
