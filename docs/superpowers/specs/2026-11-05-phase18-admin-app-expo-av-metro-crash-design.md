# 🛠️ Phase 18: Admin App Metro Crash Resolution (expo-av Subpath Import) Specification

**Date:** 2026-11-05  
**Status:** Approved by User  
**Surface:** Merchant Manager Mobile App (`/admin-app`)  

---

## 1. Executive Summary

When bundling the Merchant Manager App (`admin-app`), Metro bundler fails with a fatal 500 error:
```
Unable to resolve "./Audio/Recording" from "node_modules\expo-av\build\Audio.js"
```
This halts development testing on Expo Go and prevents launching the manager app. This specification details the targeted fix to bypass `expo-av/Audio` and isolate the `Video` component import.

---

## 2. Problem Statement & Root Cause

* **Symptom:** Metro crashes with a 500 red-screen on device during bundling:
  `Unable to resolve "./Audio/Recording" from "node_modules\expo-av\build\Audio.js"`
* **Root Cause:**
  1. [`admin-app/src/screens/placeholders/DineInPostManagementScreen.tsx:24`](file:///d:/sitesdata/Resturent%20App/admin-app/src/screens/placeholders/DineInPostManagementScreen.tsx#L24) contains:
     ```ts
     import { Video, ResizeMode } from 'expo-av';
     ```
  2. Metro resolves `'expo-av'` to `node_modules/expo-av/build/index.js`, which executes `export * from './Audio';`.
  3. Inside `build/Audio.js`, line 3 attempts `export * from './Audio/Recording';`.
  4. On Windows filesystems, because a sibling file `Audio.js` and folder `Audio/` exist in the same directory (`expo-av/build/`), Metro bundler mistakenly treats `./Audio` as the file `Audio.js` rather than descending into the `Audio/` directory, causing a module resolution failure.
  5. The manager app does not use audio recording or playback from `expo-av` — audio alerts are managed via native vibration and Web Audio fallback.

---

## 3. Technical Design

### Direct Subpath Isolation
Update the import in [`DineInPostManagementScreen.tsx`](file:///d:/sitesdata/Resturent%20App/admin-app/src/screens/placeholders/DineInPostManagementScreen.tsx#L24) from root package to isolated Video subpaths:
```ts
// Before:
import { Video, ResizeMode } from 'expo-av';

// After:
import Video from 'expo-av/build/Video';
import { ResizeMode } from 'expo-av/build/Video.types';
```

### Invariants Maintained:
- **Zero JSX / Prop Changes:** `<Video>` usage at line 767 in `DineInPostManagementScreen.tsx` remains 100% untouched (`useNativeControls`, `resizeMode={ResizeMode.CONTAIN}`, `isLooping`, `shouldPlay`, etc.).
- **Zero Audio Resolution:** Metro completely bypasses `expo-av/build/Audio.js`, resolving the Windows Metro 500 collision immediately.
- **Backwards Compatibility:** Works natively with both Expo Go (SDK 57) and the existing standalone release APK (`D:\GetFood-Manager.apk`).

---

## 4. Verification Plan

1. **Static Typecheck:** Run `cd admin-app; npx tsc --noEmit` and verify 0 errors.
2. **Metro Bundler Verification:**
   - Request bundle on port 8082: `http://localhost:8082/index.bundle?platform=android`.
   - Confirm Metro responds with `HTTP 200 OK` and 0 resolution errors.
