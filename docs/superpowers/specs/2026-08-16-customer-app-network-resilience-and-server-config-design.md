# Design Spec: Customer App Network Resilience & Server Diagnostics Suite

**Date**: 2026-08-16  
**Status**: Approved (Approach 1)  
**Topic**: Customer App (`/app`) Network Error Elimination & Server Diagnostics Suite

---

## 1. Objective & Problem Statement

### Problem
When attempting to log in on the Customer App (`/app`), users on emulators or mobile devices encounter a fatal `"Network Error"` banner. The backend credentials (`Abdullah1` / `Password123`) are valid on the Heroku production backend, but the app fails to reach the server due to:
1. Legacy dev host URL resolution or cached dead local IPs in `AsyncStorage` (`@getfood_custom_api_url`).
2. Lack of live server connectivity diagnostics and server presets in `app/`.
3. `formatDRFErrorMessage` in `userSlice.ts` passing raw Axios `"Network Error"` strings rather than sanitized, actionable diagnostic messages.

### Objective
Port the proven `ServerConfigModal` and live diagnostic engine from `admin-app` to `app`, purge legacy stale host configs, default firmly to Heroku 24/7 Production, and provide a 1-tap connection test with preset switcher on `AuthScreen.tsx`.

---

## 2. Architecture & Component Design

### A. API Service Layer (`app/src/services/api.js`)
1. **Server Presets**:
   - `🚀 Heroku Production (24/7)`: `https://getfoodpk-fd9b20442fcf.herokuapp.com/api` (Default)
   - `💻 Local Dev (LAN IP)`: `http://${ip}:8000/api`
   - `📱 Android Emulator Loopback`: `http://10.0.2.2:8000/api`
2. **Connectivity Tester (`testApiConnectivity`)**:
   - Performs a lightweight HTTP `GET /api/platform-settings/` or `/api/restaurants/` with a 6-second timeout.
   - Measures real-time latency in milliseconds and returns `{ success, latencyMs, message, url }`.
3. **Storage & URL Normalization**:
   - Storage key: `@getfood_custom_api_url`.
   - `setActiveBaseUrl(newUrl)` and `resetBaseUrlToDefault()`.
   - Ensure trailing slashes and missing `/api` prefixes are automatically sanitized.

### B. UI Component: `ServerConfigModal` (`app/src/components/ServerConfigModal.tsx`)
1. **Theme**: Clean customer app theme (`COLORS.primary`, `COLORS.card`, `COLORS.dark`).
2. **Features**:
   - Displays active server URL with live status indicator (🟢 Connected / 🔴 Unreachable).
   - Lists 1-tap presets (Heroku Cloud, Local LAN, Emulator loopback).
   - "Test Connection" button measuring live latency.
   - Custom URL input field with Save & Reset to Heroku buttons.
3. **Access Trigger on `AuthScreen.tsx`**:
   - Triple-tap on the GetFood logo badge (`setLogoTapCount`) OR tap a subtle server status indicator chip below the login form.

### C. Redux & Error Handling (`app/src/store/userSlice.ts`)
1. **Error Sanitization**:
   - Update `formatDRFErrorMessage` to prioritize `error.userFriendlyMessage`.
   - In `loginUser` and `registerUser`, if network fails, attach clear actionable guidance:
     `"Unable to connect to backend server. Tap the server settings icon to verify connectivity."`

---

## 3. Verification & Acceptance Criteria
1. `npx tsc --noEmit` in `app/` passes with 0 errors.
2. Android bundle builds cleanly with HTTP 200.
3. Tapping the server settings trigger opens `ServerConfigModal`, runs a live ping against Heroku production, and reports `⚡ Success (XXX ms)`.
4. Logging in with `Abdullah1` / `Password123` successfully completes authentication on Heroku.
