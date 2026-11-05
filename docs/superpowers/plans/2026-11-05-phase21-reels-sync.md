# 🛠️ Phase 21: Manager-to-Customer Real-Time Sync for Dine-In Reels Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the disconnected sync between manager actions (Hide, Unhide, Delete) in `admin-app` and the Customer App feed (`app`), ensuring that any post status change or deletion instantly reflects in the database and customer-facing UI on pull-to-refresh or screen focus.

**Architecture:**
- Make `/dine-in-posts` completely public in `app/src/services/api.js` (strip stale/guest authorization headers).
- Eliminate hardcoded sticky fallbacks in `app/src/components/DineInVideoFeed.tsx`.
- Connect pull-to-refresh and tab focus events in `app/src/screens/HomeScreen.tsx` to re-fetch reels.
- Add `restaurant_slug` filtering and `no-cache` response headers in `backend/restaurants/views.py`.

**Tech Stack:** Django REST Framework, React Native 0.86.2, Expo SDK 57, TypeScript, Axios.

---

### Task 1: Backend Endpoint Optimization & No-Cache Headers

**Files:**
- Modify: `backend/restaurants/views.py:840`

- [ ] **Step 1: Add `restaurant_slug` filtering in `RestaurantMediaPostViewSet.get_queryset`**
  Support `?restaurant_slug=<slug>` alongside `restaurant_id`.
- [ ] **Step 2: Add `Cache-Control: no-cache, no-store, must-revalidate` to `list` action**
  Ensure API responses for public reels are never cached by intermediate proxies or mobile clients.
- [ ] **Step 3: Run backend unit tests**
  Run: `cd backend; python manage.py test restaurants.tests.test_dine_in_posts`
  Expected: All tests pass.

---

### Task 2: Customer App Public API Route & Invalidation Wiring

**Files:**
- Modify: `app/src/services/api.js:216`
- Modify: `app/src/components/DineInVideoFeed.tsx:515-625`
- Modify: `app/src/screens/HomeScreen.tsx:840-845, 1035`

- [ ] **Step 1: Add `'/dine-in-posts'` to `publicPatterns` in `app/src/services/api.js`**
  Prevent stale/guest authorization tokens from being sent with GET `/dine-in-posts/`.
- [ ] **Step 2: Remove sticky hardcoded fallback in `DineInVideoFeed.tsx`**
  - Initialize `posts` as `[]` and track `isFetched`.
  - On API response, unconditionally set `setPosts(activeList)`.
  - If `isFetched && posts.length === 0`, return `null` (safely collapse feed).
  - Add `refreshTrigger?: number` prop to trigger re-fetch.
- [ ] **Step 3: Connect pull-to-refresh and screen focus in `HomeScreen.tsx`**
  - Add `reelsRefreshTrigger` state.
  - Increment trigger in `handleRefresh` (pull-to-refresh).
  - Add `useFocusEffect` to re-validate reels on screen focus.
  - Pass `refreshTrigger={reelsRefreshTrigger}` to `<DineInVideoFeed />`.

---

### Task 3: Build & End-to-End Verification

- [ ] **Step 1: TypeScript Validation**
  Run: `cd app; npx tsc --noEmit`
  Run: `cd admin-app; npx tsc --noEmit`
  Expected: 0 errors across both applications.
- [ ] **Step 2: Live Backend & Customer App Test**
  Verify via Python script that `GET /api/dine-in-posts/` returns only active reels and that hidden/deleted posts are never returned.
- [ ] **Step 3: Commit and Push Changes**
  Deploy backend to Heroku and push frontend changes to `origin/main`.
