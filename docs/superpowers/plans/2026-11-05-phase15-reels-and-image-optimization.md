# 🎬 Phase 15: Reels Lag Elimination & Instant Image Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate "Crave & Watch" Reels playback lag and thumbnail poster flash on swipe, enforce 100% full-screen video layout with floating overlay card, and make restaurant hero banner, brand logo, and menu thumbnails render instantly (0ms delay) on navigation.

**Architecture:** 
1. Pre-buffered 3-slide video window (`activeIndex - 1`, `activeIndex`, `activeIndex + 1`) inside `DineInVideoFeed.tsx` with zero static poster fallbacks, streaming optimized 9:16 vertical Cloudinary MP4s (`c_fill,w_540,h_960,q_auto,f_mp4`).
2. Floating bottom action overlay (`position: 'absolute', bottom: 0`) over full-bleed video (`StyleSheet.absoluteFillObject`) with dark gradient backdrop.
3. Frame-1 navigation hydration from `HomeScreen.tsx` to `RestaurantScreen.tsx` via `initialRestaurant` route params, background `Image.prefetch()`, right-sized thumbnail URLs (`w_240,c_fill`), and warm skeleton placeholders (`#F5EBE1`).

**Tech Stack:** React Native 0.86.2, Expo SDK 57, TypeScript, React Native WebView 13.16.1, Redux Toolkit, Cloudinary Media Delivery.

## Global Constraints
- Must NOT break backwards compatibility with the existing standalone Android APK `D:\GetFood-Customer.apk`.
- Zero static food photos may flash during vertical swiping between reels.
- Out-of-stock items in menus must remain visible with "OUT OF STOCK" badge.
- Monotonic order status progression and cross-user session purge invariants must remain strictly preserved.

---

### Task 1: Cloudinary 9:16 Video Stream & Thumbnail Transformations

**Files:**
- Modify: `app/src/services/mediaAssetService.ts:145-320`

**Interfaces:**
- Produces: `optimizeCloudinaryVideoUrl(url: string | null | undefined, width?: number, height?: number): string`
- Updates: `resolveItemImageWithLogoFallback(item?: any, restaurantIdOrSlug?: string | number): { uri: string; isLogoFallback: boolean }` (deliver `w_240,c_fill` for menu thumbnails)

- [ ] **Step 1: Implement `optimizeCloudinaryVideoUrl` in `mediaAssetService.ts`**
- [ ] **Step 2: Right-size thumbnail output in `resolveItemImageWithLogoFallback`**
- [ ] **Step 3: Verify TypeScript compilation (`cd app; npx tsc --noEmit`)**

---

### Task 2: Overhaul "Crave & Watch" Reels Player in `DineInVideoFeed.tsx`

**Files:**
- Modify: `app/src/components/DineInVideoFeed.tsx:440-690, 850-1025`

**Interfaces:**
- Consumes: `optimizeCloudinaryVideoUrl` from `../services/mediaAssetService`
- Removes: static `thumbnail_url` `<Image>` fallbacks from reel slides
- Enforces: 3-slide pre-buffering window (`Math.abs(index - activeReelIndex) <= 1`) and true absolute full-screen layout

- [ ] **Step 1: Import `optimizeCloudinaryVideoUrl` and update video sources**
- [ ] **Step 2: Implement 3-Slide Pre-Buffering Window & Eliminate Poster Flash**
- [ ] **Step 3: Restructure Slide Layout for 100% Full-Screen Bleed with Floating Overlay**
- [ ] **Step 4: Configure FlatList for Smooth Windowing**
- [ ] **Step 5: Verify TypeScript compilation (`cd app; npx tsc --noEmit`)**

---

### Task 3: Frame-1 Navigation Hydration & Warm Skeleton Tinting in `RestaurantScreen.tsx`

**Files:**
- Modify: `app/src/screens/RestaurantScreen.tsx:35-45, 345-365, 1245-1310, 1475-1490`

**Interfaces:**
- Consumes: `route.params?.initialRestaurant` passed from `HomeScreen`
- Produces: 0ms frame-1 display of cover image, circular logo, and brand title

- [ ] **Step 1: Extend `RootStackParamList` Route Mapping**
- [ ] **Step 2: Hydrate `restaurant` state immediately from `route.params`**
- [ ] **Step 3: Apply Warm Skeleton Background Colors**
- [ ] **Step 4: Verify TypeScript compilation (`cd app; npx tsc --noEmit`)**

---

### Task 4: Background Asset Prefetching & Route Params in `HomeScreen.tsx`

**Files:**
- Modify: `app/src/screens/HomeScreen.tsx:810-860, 960-990`

**Interfaces:**
- Consumes: `Image.prefetch` from `react-native`
- Passes: `initialRestaurant` object in `navigation.navigate('Restaurant', { ... })`

- [ ] **Step 1: Trigger background `Image.prefetch()` on `HomeScreen` mount**
- [ ] **Step 2: Pass full restaurant object in navigation calls**
- [ ] **Step 3: Verify TypeScript compilation (`cd app; npx tsc --noEmit`)**

---

### Task 5: Regression & Verification Testing

- [ ] **Step 1: Run full static typecheck across all applications (`npx tsc --noEmit`)**
- [ ] **Step 2: Verification Checklist against Screen Recording**
