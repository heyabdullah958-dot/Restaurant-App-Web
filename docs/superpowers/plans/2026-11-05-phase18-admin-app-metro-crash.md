# 🛠️ Phase 18: Admin App Metro Crash Resolution Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate fatal Metro 500 error (`Unable to resolve "./Audio/Recording" from "node_modules\expo-av\build\Audio.js"`) when bundling the Merchant Manager App (`admin-app`).

**Architecture:** Isolate the `Video` component import in `DineInPostManagementScreen.tsx` to direct subpaths (`expo-av/build/Video` and `expo-av/build/Video.types`), preventing Metro from attempting to resolve the unused `expo-av/Audio` module tree.

**Tech Stack:** React Native 0.86.2, Expo SDK 57, Metro Bundler, TypeScript.

---

### Task 1: Isolate Video Subpath Import in `DineInPostManagementScreen.tsx`

**Files:**
- Modify: `admin-app/src/screens/placeholders/DineInPostManagementScreen.tsx:24`

- [ ] **Step 1: Replace root package import with direct subpath imports**
- [ ] **Step 2: Verify TypeScript Compilation (`cd admin-app; npx tsc --noEmit`)**
- [ ] **Step 3: Verify Metro Bundler Packaging on Port 8082**
- [ ] **Step 4: Commit changes to Git**
