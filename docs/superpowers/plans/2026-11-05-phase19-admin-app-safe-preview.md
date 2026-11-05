# 🛠️ Phase 19: Admin App Safe Video Preview & Crash Elimination Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the fatal startup crash (`[runtime not ready]: Error: Cannot find native module 'ExponentAV'`) in the Merchant Manager App (`admin-app`), ensuring immediate cold-launch success on the user's installed `GetFood-Manager.apk` without requiring an APK reinstallation.

**Architecture:** Remove uncompiled native packages (`expo-av`, `expo-video`) from `admin-app`. Replace the embedded `<Video>` player in `DineInPostManagementScreen.tsx` with a safe native video card that previews high-resolution video covers and launches hardware-accelerated playback via `Linking.openURL(media_url)`.

**Tech Stack:** React Native 0.86.2, Expo SDK 57, Metro Bundler, TypeScript.

---

### Task 1: Replace `expo-av` with Safe Native Player in `DineInPostManagementScreen.tsx`

**Files:**
- Modify: `admin-app/src/screens/placeholders/DineInPostManagementScreen.tsx`

- [ ] **Step 1: Remove `expo-av` imports and add `Linking`**
  Remove lines 24-25:
  ```ts
  import Video from 'expo-av/build/Video';
  import { ResizeMode } from 'expo-av/build/Video.types';
  ```
  Ensure `Linking` is imported from `'react-native'`.

- [ ] **Step 2: Update the Video Preview Modal Section**
  Replace lines 766-787 (the `<Video>` component and buffering indicator) with a polished native preview card:
  - Video cover image (`previewPost.thumbnail_url || previewPost.media_url`) with `resizeMode="cover"`.
  - Semi-transparent dark overlay with large circular red Play icon (`Ionicons name="play"`).
  - Tappable button with text "Tap to Watch Reel" and subtitle "Streams in device video player".
  - Safe `handleOpenVideoReel(url)` handler with `Linking.canOpenURL` and error alert fallback.
  - Retain all other modal functionality (status toggling, dish tags, delete buttons, captions).

- [ ] **Step 3: Remove `expo-av` and `expo-video` from `admin-app/package.json`**
  Clean up unused dependencies from `package.json` to avoid any accidental native module imports in the future.

---

### Task 2: Validation & Build Verification

- [ ] **Step 1: TypeScript Validation**
  Run: `cd admin-app; npx tsc --noEmit`
  Expected: 0 errors.

- [ ] **Step 2: Metro Bundler Android Verification**
  Request: `http://localhost:8082/index.bundle?platform=android`
  Expected: HTTP 200 OK, full bundle generated without any missing module warnings.

- [ ] **Step 3: Metro Bundler iOS Verification**
  Request: `http://localhost:8082/index.bundle?platform=ios`
  Expected: HTTP 200 OK.

- [ ] **Step 4: Commit and Push Changes**
  ```bash
  git add admin-app/src/screens/placeholders/DineInPostManagementScreen.tsx admin-app/package.json
  git commit -m "fix(admin-app): eliminate ExponentAV crash with safe native video preview"
  git push origin main
  ```
