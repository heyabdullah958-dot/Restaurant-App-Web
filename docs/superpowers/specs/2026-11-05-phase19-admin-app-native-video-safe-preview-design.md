# Design Spec: Admin App Native Safe Video Preview & Crash Elimination

**Date:** 2026-11-05  
**Scope:** `admin-app/` (Merchant Manager Mobile Application)  
**Issue:** Standalone APK crash on startup: `[runtime not ready]: Error: Cannot find native module 'ExponentAV'`

---

## 1. Context & Problem Statement

The Merchant Manager Mobile App (`admin-app`) crashes immediately upon cold launch on Android devices running the standalone release APK (`GetFood-Manager.apk`).

### Root Cause
- The standalone APK (`GetFood-Manager.apk`) was built without the native module `ExponentAV` compiled into the Android APK binary (verified via DEX analysis).
- In [`admin-app/src/screens/placeholders/DineInPostManagementScreen.tsx`](file:///d:/sitesdata/Resturent%20App/admin-app/src/screens/placeholders/DineInPostManagementScreen.tsx), `expo-av` was imported for in-modal video previews.
- At runtime cold boot, `AppNavigator.tsx` loads `DineInPostManagementScreen.tsx`, which triggers `requireNativeModule('ExponentAV')`.
- Because the native module does not exist in the APK binary, React Native throws:
  `[runtime not ready]: Error: Cannot find native module 'ExponentAV'` and crashes before rendering the first screen.

---

## 2. Design Goals

1. **Immediate Crash Elimination**: Zero native module dependencies in `admin-app` that are missing from `GetFood-Manager.apk`.
2. **Preserve Full Management Features**: Super Admins and Branch Managers must still be able to create, view, preview, toggle active/hidden, and delete video reels and photos.
3. **Hardware-Accelerated Video Playback**: Provide a smooth, high-resolution video viewing experience using `Linking.openURL(previewPost.media_url)` to leverage the phone's native video player (hardware-accelerated, scrub controls, audio, full screen).
4. **Metro Cleanliness**: Remove `expo-av` completely from `admin-app`, eliminating Windows filesystem path collisions.

---

## 3. Architecture & UI Changes

### In `admin-app/src/screens/placeholders/DineInPostManagementScreen.tsx`:
1. Remove `import Video from 'expo-av/build/Video'` and `import { ResizeMode } from 'expo-av/build/Video.types'`.
2. Add `Linking` to `react-native` imports.
3. Replace the embedded `<Video>` player inside `previewMediaWrapper` with a sleek, interactive Video Reel Card:
   - Displays the video cover poster (`previewPost.thumbnail_url || previewPost.media_url`) with a dark translucent gradient overlay.
   - Prominent circular play button (`Ionicons name="play"`) with label "Tap to Watch Full Reel".
   - Subtitle: "Streams in device video player".
   - On tap, calls `Linking.openURL(previewPost.media_url)` safely with error alert fallback if URL cannot be opened.
4. Keep all existing preview modal header controls, active status toggles (`Active (Tap to Hide)` / `Hidden (Tap to Make Live)`), linked dish pills, and delete buttons untouched.
5. In `admin-app/package.json`:
   - Remove `"expo-av"` and `"expo-video"`.

---

## 4. Verification Strategy

1. **TypeScript Check**: `cd admin-app; npx tsc --noEmit` must report 0 errors.
2. **Metro Packaging**:
   - `http://localhost:8082/index.bundle?platform=android` must return HTTP 200 with 0 missing module warnings.
   - `http://localhost:8082/index.bundle?platform=ios` must return HTTP 200.
3. **Codebase Verification**:
   - Confirm 0 references to `expo-av` across `admin-app/src/`.
4. **Device Testing**:
   - Confirm `GetFood Manager` boots immediately to the login / dashboard screen without any `Cannot find native module 'ExponentAV'` red screen.
