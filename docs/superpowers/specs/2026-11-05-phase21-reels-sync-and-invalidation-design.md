# Design Spec: Phase 21 — Manager-to-Customer Real-Time Sync & Invalidation for Dine-In Reels

**Date:** 2026-11-05  
**Scope:** Backend (`backend/restaurants/views.py`), Customer Mobile App (`app/src/components/DineInVideoFeed.tsx`, `app/src/screens/HomeScreen.tsx`, `app/src/services/api.js`), and Manager App API integrity.  
**Issue:** Changes in Manager App (marking reels hidden, deleting reels) do not reflect in Customer App's "Crave & Watch" feed.

---

## 1. Problem Statement & Root Cause

When a restaurant manager toggles a reel to "Hidden" or deletes a reel in `admin-app`:
1. The backend endpoint `PATCH /api/dine-in-posts/{id}/` and `DELETE /api/dine-in-posts/{id}/` successfully updates PostgreSQL on Heroku (verified via live inspection).
2. However, the Customer Mobile App (`app`) continues to display the deleted or hidden reels on the Home Screen.

### Three Root Causes Identified:
1. **Auth Header Collision on Public Endpoint**: In `app/src/services/api.js`, `'/dine-in-posts'` is missing from `publicPatterns`. Unauthenticated/guest users with stale tokens send `Authorization: Bearer <invalid>`, resulting in `401 Unauthorized` and silent failure in `DineInVideoFeed.tsx`.
2. **Sticky Hardcoded Fallback**: In `app/src/components/DineInVideoFeed.tsx`, `FALLBACK_DINE_IN_POSTS` hardcodes Post 6 ("Full Dubai Shawaya") and Post 5 ("Loaded Chicken Doner"). If the API call fails or returns 0 active posts, `displayedPosts` falls back to these hardcoded items, resurrecting deleted/hidden reels.
3. **Zero Cache Invalidation**: `HomeScreen.tsx` pull-to-refresh (`handleRefresh`) only reloads restaurants and flash deals, omitting reels. Switching tabs or focusing the Home Screen never triggers a reels refetch.

---

## 2. Design Goals

1. **Immediate Multi-Tenant Synchronization**: Any reel marked hidden or deleted by any brand manager (Jushh PK, Blue, Tandoori Stop, Get A Fomo) must vanish from the Customer App on next focus or pull-to-refresh.
2. **100% Public Access**: The public reels feed must never fail due to invalid or stale client auth tokens.
3. **Clean Zero-Reel Behavior**: If a brand or platform has 0 active reels, the "Crave & Watch" section gracefully hides without displaying ghost/deleted items.
4. **Pull-to-Refresh & Focus Invalidation**: Wire `DineInVideoFeed` to both pull-to-refresh and `useFocusEffect`.

---

## 3. Architecture & Code Changes

### 1. `app/src/services/api.js`
- Add `'/dine-in-posts'` to `publicPatterns` for `GET` requests so that `delete config.headers['Authorization']` is always enforced for public reel queries.

### 2. `app/src/components/DineInVideoFeed.tsx`
- Change state initialization:
  ```typescript
  const [posts, setPosts] = useState<DineInFeedPost[]>([]);
  const [isFetched, setIsFetched] = useState<boolean>(false);
  ```
- Unconditionally set posts on API response:
  ```typescript
  const res = await api.get('/dine-in-posts/');
  const data = Array.isArray(res.data) ? res.data : (res.data?.results || []);
  const activeList = data.filter((p: any) => p.is_active);
  setPosts(activeList);
  setIsFetched(true);
  ```
- If `isFetched && posts.length === 0`, return `null` (safely collapse feed).
- Accept prop: `refreshTrigger?: number` in `DineInVideoFeedProps`, re-fetching whenever `refreshTrigger` changes.

### 3. `app/src/screens/HomeScreen.tsx`
- Add `reelsRefreshTrigger` state (`const [reelsRefreshTrigger, setReelsRefreshTrigger] = useState(0)`).
- In `handleRefresh`: increment `setReelsRefreshTrigger((prev) => prev + 1)` alongside `dispatch(fetchRestaurants())` and `fetchFlashDeals()`.
- In `useFocusEffect`: trigger a subtle background revalidation of reels on tab focus.
- Pass `refreshTrigger={reelsRefreshTrigger}` to `<DineInVideoFeed />`.

### 4. `backend/restaurants/views.py`
- In `RestaurantMediaPostViewSet.get_queryset()`:
  - Add `restaurant_slug = self.request.query_params.get('restaurant_slug')` filter.
- Add `Cache-Control: no-cache, no-store, must-revalidate` response header on `list` action to prevent HTTP proxy caching.

---

## 4. Verification Plan

1. **Automated API Verification**:
   - Query `GET /api/dine-in-posts/` with no auth and with expired auth header -> verify HTTP 200 and only active posts returned.
2. **TypeScript Check**:
   - `cd app; npx tsc --noEmit` -> 0 errors.
   - `cd admin-app; npx tsc --noEmit` -> 0 errors.
3. **Manager-Customer Sync Verification**:
   - Hide/Unhide a reel via manager API / app -> verify customer query immediately reflects the updated state.
