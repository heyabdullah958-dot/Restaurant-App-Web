# BRIEFING — 2026-07-26T15:00:10Z

## Mission
Investigate backend & Admin HQ implementation details for PlatformSettings singleton model, welcome loyalty bonus trigger, and Admin HQ Settings UI.

## 🔒 My Identity
- Archetype: Teamwork explorer
- Roles: Read-only investigator
- Working directory: d:\sitesdata\Resturent App\.agents\explorer_m3_2
- Original parent: 2ad39c6d-45aa-4bf8-b4cd-4cb141026e4a
- Milestone: Milestone 3 (R3: Ratings, Loyalty & Admin Settings)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement backend or admin changes directly (except writing reports in own folder)
- Follow exact project invariants and structure

## Current Parent
- Conversation ID: 2ad39c6d-45aa-4bf8-b4cd-4cb141026e4a
- Updated: 2026-07-26T15:00:10Z

## Investigation State
- **Explored paths**:
  - `backend/config/models.py`, `admin.py`, `urls.py`, `settings.py`
  - `backend/users/models.py`, `serializers.py`, `views.py`, `admin_views.py`, `urls.py`
  - `admin/src/types.ts`, `services/api.ts`, `components/Sidebar.tsx`, `App.tsx`, `AdminContext.tsx`, `views/SuperDashboard.tsx`
- **Key findings**:
  - Singleton model `PlatformSettings` should be created in `backend/config/models.py` with `get_solo()`, enforced `pk=1` in `save()`, and no-op `delete()`.
  - Serializer `PlatformSettingsSerializer` and view `PlatformSettingsView` (with `IsSuperUser` permission) should serve `GET` and `PUT/PATCH` requests at `/api/config/settings/`.
  - Welcome bonus trigger should be placed in `UserRegisterSerializer.create` in `backend/users/serializers.py`, reading `PlatformSettings.get_solo().welcome_bonus_points`, initializing `user.loyalty_points`, and creating a `LoyaltyTransaction` entry.
  - Admin HQ Settings UI requires adding `PlatformSettings` types, API functions in `api.ts`, a dedicated view `PlatformSettings.tsx` in `admin/src/views/`, and navigation links in `Sidebar.tsx` and `App.tsx`.
- **Unexplored areas**: None. Investigation complete.

## Key Decisions Made
- Confirmed `backend/config/models.py` as the optimal home for `PlatformSettings`.
- Structured `PlatformSettings.get_solo()` to auto-create defaults (`10` pts/$, `$0.01` per pt, `100` welcome pts) if not present.
- Enforced `IsSuperUser` permission for `GET` and `PUT/PATCH` on `/api/config/settings/`.
- Designed clean, isolated `PlatformSettings.tsx` UI view for SuperAdmin panel.

## Artifact Index
- ORIGINAL_REQUEST.md — Original request log
- BRIEFING.md — Working memory index
- handoff.md — Detailed investigation report and Worker instructions
