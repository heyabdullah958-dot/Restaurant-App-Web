# BACKEND.md — FoodSphere Django API & Database Architecture
## Auto-generated — 2026-07-21
### Detected from codebase scan

- **Core Apps**: `restaurants`, `orders`, `users`, `payments`.
- **Branch-Wise Multi-Tenancy**: `Branch` model linked to `Restaurant`. `ManagerProfile` links `User` to `Branch`.
- **Order Scoping**: `resolve_branch_for_order(restaurant, address)` matches area keywords to branch; falls back to active branch.
- **Admin Management Commands**: `seed_restaurants`, `seed_branches`, `create_restaurant_managers`, `create_admin`.

---
