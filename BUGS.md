
## Phase 1 — Fix Bug 4 (MapScreen crash) — 2026-07-17
- What was done: Moved early return block below hook declarations to comply with React Hooks rules.
- Files modified: app/src/screens/MapScreen.tsx
- Root cause (if bug fix): Hooks were declared conditionally after an early return.
- Solution applied: Moved the early return block containing the loadingLocation view below all hook calls, keeping it before the main render return.
- Self-corrections used: 0/3
- Confidence: 100%

## Phase 2 — Fix Bug 1 (Guest profile shown after Google Sign-In) — 2026-07-17
- What was done: Overrode is_guest flag from backend response in updateUserProfile dispatch.
- Files modified: app/src/screens/AuthScreen.tsx
- Root cause (if bug fix): Backend guestLogin token sets is_guest=true, which was not overridden in subsequent profile update.
- Solution applied: Added is_guest: false property to the payload in handleSelectGoogleAccount and handleVerifyOtp.
- Self-corrections used: 0/3
- Confidence: 100%

## Phase 3 — Fix Bug 3 (Café / Burgers category shows empty) — 2026-07-17
- What was done: Mirrored local fallback pattern for HomeScreen category filters.
- Files modified: app/src/screens/HomeScreen.tsx
- Root cause (if bug fix): filteredRestaurants useMemo returned empty array when API offline/slow, without falling back to local static data.
- Solution applied: Imported FALLBACK_RESTAURANTS and applied the fallback logic similar to SearchScreen.
- Self-corrections used: 0/3
- Confidence: 100%

## Phase 4 — Fix Bug 2 (Search popular chips showing irrelevant terms) — 2026-07-17
- What was done: Removed inactive terms and updated POPULAR_SEARCHES list.
- Files modified: app/src/screens/SearchScreen.tsx
- Root cause (if bug fix): Hardcoded search chips included Seafood and Melt which matched no active brands.
- Solution applied: Updated the constant POPULAR_SEARCHES to only contain words known to match active brands and dishes.
- Self-corrections used: 0/3
- Confidence: 100%
