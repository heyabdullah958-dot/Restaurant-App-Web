# Phase 1: Fix "Crave & Watch" (Live Reels) Full-Screen Layout, UI Duplication & Video Playback

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the "Crave & Watch" Reels Viewer Modal into a true full-screen, vertical snap-scrolling TikTok/Reels experience with active video playback, eliminate top control bar duplication across items, and replace dead video URLs with fast, CORS-enabled Cloudinary video streams.

**Architecture:** Refactor `DineInVideoFeed.tsx` so each item container matches the exact measured modal viewport dimensions (`onLayout`), enforce single-screen snapping with `snapToInterval` and `onViewableItemsChanged`, elevate the top controls (`X`, badge, mute toggle) into a single fixed root overlay, and update video sources to verified Cloudinary video URLs with HTML5 `<video muted autoplay loop playsinline>` for reliable mobile WebView playback.

**Tech Stack:** React Native, Expo SDK 57, `react-native-webview`, `expo-linear-gradient`, `react-native-safe-area-context`, Cloudinary CDN (`qodsfm34`), Django REST Framework backend.

## Global Constraints
- Target screen: Customer Mobile App (`app/src/components/DineInVideoFeed.tsx` & `app/src/screens/HomeScreen.tsx`).
- Exactly 4 launch brands active: Jushh PK, Get A Fomo, Tandoori Stop, Dine At Blue.
- Zero mock fallbacks for production data; fallback array must only serve as defensive fallback with valid assets.
- Must compile cleanly with `npx tsc --noEmit` in `app` (0 errors).

---

## Root Cause Analysis (Verified Against Codebase)

1. **Top Bar Duplication & Viewport Clipping**:
   - In `DineInVideoFeed.tsx` (lines 526–550), `<SafeAreaView style={styles.modalTopBar}>` is nested **inside the `FlatList` `renderItem`**. Because of this, every reel item renders its own Close button, badge, and Mute button.
   - `fullScreenReelPage` used fixed `SCREEN_HEIGHT = Dimensions.get('window').height`. In a translucent modal on Android, `window.height` is smaller than the full screen modal canvas, causing adjacent items to peek into the viewport and `pagingEnabled` to miscalculate offsets.
   - The `FlatList` lacked `snapToInterval`, `snapToAlignment="start"`, `decelerationRate="fast"`, and `onViewableItemsChanged`, relying only on `onMomentumScrollEnd` which fails on partial drags.

2. **Video Playback Failure**:
   - All 6 video URLs in the backend DB and fallback array pointed to `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/*.mp4`. These URLs now return **`HTTP 403 Forbidden`**, causing the HTML5 `<video>` element to immediately error out and render a black screen.
   - The HTML5 `<video>` tag lacked the `muted` attribute (`<video autoplay loop playsinline>`). Android WebView Chromium policy blocks unmuted autoplay without prior user interaction.

---

### Task 1: Upload & Verify Reliable Cloudinary Video Assets for All 6 Reels

**Files:**
- Modify: `backend/restaurants/seed_media_posts.py`
- Modify: `app/src/components/DineInVideoFeed.tsx`

**Interfaces:**
- Consumes: Cloudinary account `qodsfm34` credentials in `backend/.env`.
- Produces: 6 fast, CORS-enabled, playable MP4 URLs hosted on `https://res.cloudinary.com/qodsfm34/video/upload/...` for the 6 food reels:
  1. Full Dubai Shawaya (Jushh PK)
  2. Loaded Chicken Doner Feast Box (Jushh PK)
  3. Smoky Charcoal BBQ Platter (Tandoori Stop)
  4. Clay Oven Melting Cheese Naan Pull (Tandoori Stop)
  5. Golden Kunafa Prawns Sizzle (Dine At Blue)
  6. Luxury Coastal Steam Seafood Platter (Dine At Blue)

- [ ] **Step 1: Upload 6 verified food video clips to Cloudinary `qodsfm34/foodsphere/reels/`**
  Run Python upload script via `backend\.venv\Scripts\python.exe` utilizing verified sample food MP4s, generating permanent URLs under `foodsphere/reels/reel_1` through `reel_6`.

- [ ] **Step 2: Update `backend/restaurants/seed_media_posts.py`**
  Replace the 403 Google sample URLs with the verified Cloudinary video URLs.

- [ ] **Step 3: Update `FALLBACK_DINE_IN_POSTS` in `app/src/components/DineInVideoFeed.tsx`**
  Synchronize `media_url` across all 6 fallback posts with the verified Cloudinary URLs.

- [ ] **Step 4: Verify video URLs via HTTP HEAD check**
  Run PowerShell verification checking that all 6 URLs return `HTTP 200` with `ContentType: video/mp4`.

---

### Task 2: Refactor Reels Modal Viewport Layout & Fix Top Control Duplication

**Files:**
- Modify: `app/src/components/DineInVideoFeed.tsx`

**Interfaces:**
- Consumes: Modal layout events `onLayout` to capture dynamic viewport height/width.
- Produces: Single fixed top bar overlay + exact full-viewport snap-scrolling reel pages.

- [ ] **Step 1: Add dynamic modal dimension tracking in `DineInVideoFeed.tsx`**
  Implement `modalDimensions` state (`{ width, height }`) initialized to `Dimensions.get('screen')`, updated via `onLayout` on `modalBackdrop`.

- [ ] **Step 2: Extract Top Control Bar from `renderItem` into a Single Fixed Overlay**
  Remove `modalTopBar` from `fullScreenReelPage`. Mount it once as `<SafeAreaView style={styles.fixedModalTopBar} pointerEvents="box-none" edges={['top']}>` directly inside the Modal root above the `FlatList`.

- [ ] **Step 3: Configure `FlatList` for TikTok/Reels single-screen vertical snapping**
  Add props:
  - `snapToInterval={modalDimensions.height}`
  - `snapToAlignment="start"`
  - `decelerationRate="fast"`
  - `showsVerticalScrollIndicator={false}`
  - `disableIntervalMomentum={true}`
  - `getItemLayout={(_, index) => ({ length: modalDimensions.height, offset: modalDimensions.height * index, index })}`
  - `onViewableItemsChanged` with `viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}`

- [ ] **Step 4: Update `fullScreenReelPage` style to use measured dimensions**
  Set `width: modalDimensions.width` and `height: modalDimensions.height` with `overflow: 'hidden'`.

---

### Task 3: Harden HTML5 Video Playback & Autoplay in WebView

**Files:**
- Modify: `app/src/components/DineInVideoFeed.tsx`

**Interfaces:**
- Consumes: `isCurrentlyPlaying`, `isMuted`, `item.media_url`, `item.thumbnail_url`.
- Produces: Autoplaying, looping HTML5 video in WebView with poster pre-buffer, touch-to-play fallback, and instant mute/unmute injection.

- [ ] **Step 1: Add `muted` and `poster` to the `<video>` HTML element**
  Update HTML template:
  ```html
  <video
    id="reelVideo"
    src="${item.media_url}"
    poster="${item.thumbnail_url || ''}"
    autoplay
    loop
    muted
    playsinline
    webkit-playsinline
  ></video>
  ```
  Ensure `muted` is present in HTML so WebView Chromium autoplay policy permits playback.

- [ ] **Step 2: Add inline JavaScript to handle unmute and play lifecycle**
  Add JS bridge in HTML:
  ```javascript
  const v = document.getElementById('reelVideo');
  if (v) {
    v.muted = ${isMuted};
    v.play().catch(function(e) {
      console.warn('Autoplay failed, retrying on touch:', e);
    });
  }
  ```

- [ ] **Step 3: Improve `handleToggleMute` to control audio without WebView reload**
  Inject `var v = document.getElementById('reelVideo'); if(v) { v.muted = ${next}; }` across the active WebView ref.

- [ ] **Step 4: Add video error and buffering state handler**
  Add thumbnail image fallback underneath the WebView with a subtle `ActivityIndicator` so users never see an empty black screen while the stream buffers.

---

### Task 4: Typecheck & Full End-to-End Verification

**Files:**
- Inspect: `app/src/components/DineInVideoFeed.tsx`
- Run: `cd app; npx tsc --noEmit`
- Run: Emulator verification on `emulator-5554`

- [ ] **Step 1: Run TypeScript compiler validation**
  Execute `npx tsc --noEmit` in `app` to ensure 0 type errors.

- [ ] **Step 2: Launch Customer App on Android emulator and open Crave & Watch**
  Tap a Crave & Watch reel card, inspect the full-screen modal layout, verify that the Top Bar appears exactly once, swipe vertically, and confirm video autoplay and sound toggle.

---

## Verification Plan

### Automated Tests
1. `npx tsc --noEmit` in `app` (0 errors).
2. Video URL HTTP verification script: all 6 URLs respond `HTTP 200` with `video/mp4`.

### Manual / Device Verification
1. **Modal Layout & Single Top Bar**:
   - Open reel #1. Verify header controls (Close X, "Crave & Watch" badge, Mute toggle) appear once at the very top.
   - Swipe down to reel #2. Verify header does not duplicate or scroll away.
2. **Snapping & Dimensions**:
   - Swipe vertically between reels. Verify each reel snaps cleanly to 100% of the screen height without showing adjacent items.
3. **Video Playback & Audio**:
   - Verify video starts playing automatically on active reel.
   - Tap Mute/Unmute icon. Verify sound toggles without video reload or screen flash.
   - Swipe to next reel. Verify previous video stops and new video starts.
4. **Bottom Card Interaction**:
   - Verify brand pill, title, caption, and "Add +" button work.
   - Tap "Explore Menu / Order Now" and confirm navigation to that brand's menu.
