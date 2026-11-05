# 🎬 Phase 15: "Crave & Watch" Reels Lag Elimination & Instant Image Loading Specification

**Date:** 2026-11-05  
**Status:** Approved by User  
**Surface:** Customer Mobile App (`/app`)  

---

## 1. Executive Summary

This design specification addresses two critical performance and UX bottlenecks in the FoodSphere Customer Mobile App:
1. **Reels Performance & Layout:** Eliminating playback lag (1–3s buffering), removing static thumbnail poster flashing during vertical swipes, and enforcing a true 100% full-screen video bleed with floating overlay controls.
2. **Instant Image Rendering:** Eliminating blank white box pop-in delays when opening restaurant screens (`Jushh PK`, `Tandoori Stop`, `Blue`, `Get A Fomo`) and scrolling through menu item thumbnails.

---

## 2. Problem Statement & Root Cause Analysis

### 2.1 "Crave & Watch" Reels Stutter, Poster Flashes & Split Layout
* **Current Behavior:** In [`DineInVideoFeed.tsx`](file:///d:/sitesdata/Resturent%20App/app/src/components/DineInVideoFeed.tsx), video playback stalls for 1–3 seconds on swipe. During vertical drag gestures, an un-buffered static food photo thumbnail (`thumbnail_url`) flashes on screen. The video is letterboxed in the upper ~60–65% with a solid black rectangle underneath holding the product card.
* **Root Cause:**
  1. `renderItem` evaluates `isCurrentlyPlaying = index === activeReelIndex && isModalOpen`. For all adjacent slides during swipe, it defaults to `<Image source={{ uri: item.thumbnail_url }} />`. When `onMomentumScrollEnd` fires, the image unmounts and a cold WebView spins up from scratch.
  2. Cloudinary video URLs serve unoptimized raw landscape MP4 files averaging **6.14 MB** each (e.g. `reel_6.mp4` is 6,144,212 bytes), requiring heavy buffering over mobile connections.
  3. `fullScreenReelPage` is configured with `justifyContent: 'space-between'` and relative child positioning, while non-9:16 videos cause hardware letterboxing above `modalBottomArea`.

### 2.2 Blank White Image Delays on Restaurant Open & Menu Scroll
* **Current Behavior:** When opening a restaurant from `HomeScreen.tsx`, the cover image and circular brand logo render as blank white boxes for 1–2 seconds. Scrolling menu items displays white squares before photos load.
* **Root Cause:**
  1. `HomeScreen.tsx` navigates via `navigation.navigate('Restaurant', { slug })`, passing only the slug string. `RestaurantScreen.tsx` waits for Redux state or API completion before discovering image URLs.
  2. Image containers (`coverContainer`, `logoContainer`, `menuItemImageContainer`) default to white (`#FFFFFF`) backgrounds without warm skeleton placeholders.
  3. Menu items request large `w_400`–`w_800` images for small `90x90` list thumbnail containers.
  4. Brand logos, cover banners, and top menu items are not prefetched into cache on app boot.

---

## 3. Technical Design & Architecture

### 3.1 "Crave & Watch" Zero-Flash Full-Screen Player (`DineInVideoFeed.tsx`)

#### A. 3-Slide Pre-Buffering Window
* In `FlatList`, maintain a window where `Math.abs(index - activeReelIndex) <= 1` keeps the video player mounted.
* For the active slide (`index === activeReelIndex`), video auto-plays with sound control (`isMuted`).
* For adjacent slides (`index === activeReelIndex - 1` and `index === activeReelIndex + 1`), the video is loaded with `preload="auto"` and paused at frame 0.
* When the user swipes, the incoming reel is already loaded in memory and begins playing immediately on snap.

#### B. Complete Removal of Poster Flashes
* Remove `item.thumbnail_url` from `<Modal>` slides entirely.
* If a reel is beyond the 3-slide buffer, render a subtle dark gradient backdrop (`['#1F2937', '#0F172A']`) instead of a food photograph, preventing jarring thumbnail flashes.

#### C. True 100% Full-Screen Video Bleed
* Video container set to `StyleSheet.absoluteFillObject` (`width: '100%'`, `height: '100%'`).
* `modalBottomArea` styled as an absolute floating sheet:
  ```ts
  modalBottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    zIndex: 30,
  }
  ```
* Seamless gradient vignette from `rgba(0,0,0,0)` to `rgba(0,0,0,0.88)` anchored behind the bottom card ensures total legibility while video moves edge-to-edge underneath.

### 3.2 Cloudinary 9:16 Video Stream Optimization (`mediaAssetService.ts`)

* Implement `optimizeCloudinaryVideoUrl(url, targetWidth = 540, targetHeight = 960)`:
  * Automatically injects: `f_mp4,q_auto,w_540,h_960,c_fill`.
  * Reduces raw file size by **~80%** (from 6.14 MB down to ~1.2 MB).
  * Enforces vertical 9:16 aspect ratio so videos fill vertical phone viewports without black borders.

### 3.3 Instant Restaurant Banner, Logo & Menu Image Loading

#### A. 0ms Frame-1 Navigation Hydration (`HomeScreen.tsx` → `RestaurantScreen.tsx`)
* In `HomeScreen.tsx`, pass `initialRestaurant` in navigation params:
  ```ts
  navigation.navigate('Restaurant', {
    slug: restaurant.slug,
    initialRestaurant: {
      id: restaurant.id,
      name: restaurant.name,
      slug: restaurant.slug,
      logo: restaurant.logo,
      banner_image: restaurant.banner_image || restaurant.cover_image,
      cuisine_type: restaurant.cuisine_type,
      rating: restaurant.rating,
      delivery_time: restaurant.delivery_time,
      branches: restaurant.branches,
    }
  });
  ```
* In `RestaurantScreen.tsx`, consume `route.params?.initialRestaurant` as immediate fallback state so header cover, logo, and title appear on Frame 1 without waiting for API roundtrips.

#### B. Background Image Prefetching (`HomeScreen.tsx`)
* On `HomeScreen` mount, trigger background `Image.prefetch()` for:
  * All 4 active brand logos (`Dine At Blue`, `Jushh PK`, `Tandoori Stop`, `Get A Fomo`).
  * All 4 active brand hero cover banners.
  * The first 10 popular menu dish thumbnails.

#### C. Right-Sized Menu Thumbnail Transformations (`mediaAssetService.ts`)
* In `resolveItemImageWithLogoFallback`:
  * Transform menu thumbnails to `f_auto,q_auto:eco,w_240,c_fill` for `90x90` containers.
  * Reduces individual thumbnail payload from ~350 KB down to ~25 KB.

#### D. Warm Skeleton Placeholders (`RestaurantScreen.tsx`)
* Replace blank `#FFFFFF` containers on `coverContainer`, `logoContainer`, and `menuItemImageContainer` with warm `#F5EBE1` / `#F1F5F9` tints to eliminate harsh white flashes on cold decodes.

---

## 4. Verification & Testing Strategy

1. **Reels Verification:**
   * Open "Crave & Watch" Reels modal.
   * Verify video occupies 100% of the screen height with the bottom product card floating over live video.
   * Swipe rapidly up and down: verify zero static poster images flash and playback begins immediately on snap.
2. **Restaurant Image Verification:**
   * From `HomeScreen`, tap "Jushh PK", "Tandoori Stop", "Blue", and "Get A Fomo".
   * Confirm top banner and circular logo appear on Frame 1 with 0ms delay.
   * Scroll rapidly through menu items: confirm thumbnails load swiftly with warm skeleton backgrounds and zero white pop-ins.
3. **Build Integrity:**
   * Run `npx tsc --noEmit` in `app/` and confirm 0 TypeScript errors.
