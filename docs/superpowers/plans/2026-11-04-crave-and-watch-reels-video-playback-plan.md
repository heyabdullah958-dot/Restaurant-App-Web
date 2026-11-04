# Crave & Watch (Live Reels) Video Playback Engine Plan

> **Status:** 📋 PROPOSED & AWAITING USER APPROVAL  
> **Target Branch:** `main`  
> **Relevant Files:** `app/src/components/DineInVideoFeed.tsx`, `backend/restaurants/management/commands/seed_restaurant_data.py`, `backend/restaurants/models.py`

---

## 1. Goal Description

Restore 100% video playback across the "Crave & Watch (Live Reels)" viewer in the mobile app by replacing dead Google sample video URLs (`HTTP 403 Forbidden`) with 6 authentic, high-speed Cloudinary CDN video streams (`HTTP 200 video/mp4;codecs=avc1`). Enable TikTok/Instagram Reels style swipe auto-play, 1-tap pause/play toggle with a subtle center indicator, sound ON by default, and synchronize both the Heroku PostgreSQL database and frontend fallback arrays.

---

## 2. User Review Required

> [!IMPORTANT]
> **Video Stream Migration to Cloudinary CDN:**
> All 6 reels will be immediately migrated from the blocked Google Cloud Storage bucket (`commondatastorage.googleapis.com` -> `HTTP 403 Forbidden`) to our verified Cloudinary account (`qodsfm34` -> `HTTP 200`). Both the live Heroku PostgreSQL database and the mobile app's offline fallback data will be updated simultaneously.

> [!NOTE]
> **Audio Policy (Sound ON Default):**
> Reels will start with sound unmuted by default so users immediately experience the restaurant sizzling ambiance and music. If the device's native WebView security policy blocks unmuted autoplay without a prior touch gesture, the player will automatically fall back to muted autoplay and present a 1-tap sound toggle.

---

## 3. Proposed Changes

### Component 1: Mobile App Video Player (`app/src/components/DineInVideoFeed.tsx`)

#### [MODIFY] `app/src/components/DineInVideoFeed.tsx`
- Replace `commondatastorage.googleapis.com` URLs with verified Cloudinary video URLs across `FALLBACK_POSTS`.
- Initialize `isMuted` to `false` (Sound ON by default).
- Add `baseUrl: 'https://res.cloudinary.com'` to `<WebView source={{ html, baseUrl }}>`.
- Add inline play/pause tap gesture handler with animated center play/pause overlay icon (`Ionicons play / pause`).
- Add robust autoplay with muted fallback exception handling.

---

### Component 2: Heroku PostgreSQL Database Live Update

#### [EXECUTE] Remote Database Update via Heroku CLI
- Update the 6 existing `RestaurantMediaPost` records on Heroku PostgreSQL to point to the Cloudinary video URLs.
- Update `seed_restaurant_data.py` in the backend repository.

---

## 4. Verification Plan

### Automated Tests
1. **Live Heroku API Verification:**
   Query `GET https://getfoodpk-fd9b20442fcf.herokuapp.com/api/dine-in-posts/` and assert all 6 returned video posts contain `res.cloudinary.com/qodsfm34` URLs and HTTP 200 status.
2. **TypeScript Compilation:**
   Run `cd app && npx tsc --noEmit` and assert exit code 0.

### Manual Verification
1. Tap on any reel card on the Home Screen.
2. Verify the video immediately buffers and plays moving video without showing a black screen.
3. Verify sound plays on launch and toggles smoothly when tapping the mute/speaker button at the top right.
4. Tap anywhere on the active reel to pause; verify subtle center indicator appears. Tap again to resume playback.
5. Swipe down to the next reel; verify the new reel immediately starts playing smoothly.
