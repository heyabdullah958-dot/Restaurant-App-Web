## 2026-07-26T15:00:10Z

<USER_REQUEST>
You are Explorer 2 for Milestone 3 (R3: Ratings, Loyalty & Admin Settings).
Your working directory is `d:/sitesdata/Resturent App/.agents/explorer_m3_2/`. Create this directory if it doesn't exist.

TASK: Investigate the backend and Admin HQ implementation details for `PlatformSettings` singleton and Welcome Loyalty Bonus:
1. `PlatformSettings` singleton model:
   - Check `backend/config/models.py` or `backend/users/models.py`.
   - Fields: `loyalty_points_per_dollar` (default e.g. 10), `loyalty_point_value_usd` (default e.g. 0.01), `welcome_bonus_points` (default e.g. 100), `created_at`, `updated_at`. Ensure singleton pattern (save method enforcement or pk=1 restriction).
   - DRF ViewSet & Endpoint: `GET /api/config/settings/` and `PUT/PATCH /api/config/settings/` (SuperAdmin only).
2. Welcome Loyalty Bonus trigger:
   - When a new user registers (`backend/users/serializers.py` or `views.py` `UserRegistrationSerializer`), check `PlatformSettings.get_solo().welcome_bonus_points` and credit initial loyalty points to `User.loyalty_points`.
3. Admin HQ Settings UI:
   - Investigate SuperAdmin views in `admin/src/views/` (e.g. `SuperDashboard.tsx` or new `PlatformSettings.tsx`), `Sidebar.tsx`, and `AdminContext.tsx` to add UI for viewing/editing platform loyalty settings.

Investigate existing code, models, serializers, views, admin UI, and endpoints.
Write a detailed investigation report and handoff to `d:/sitesdata/Resturent App/.agents/explorer_m3_2/handoff.md`. Include exact file paths, line numbers, and step-by-step implementation instructions for the Worker.
Communicate completion back to parent via `send_message`.
</USER_REQUEST>
