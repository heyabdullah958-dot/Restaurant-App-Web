# Customer App Network Resilience & Server Diagnostics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate "Network Error" on Customer App (`/app`) login by porting the server diagnostic engine and `ServerConfigModal` from `admin-app`, defaulting firmly to Heroku 24/7 Production backend, and sanitizing error responses.

**Architecture:** Extend `app/src/services/api.js` with server presets, connection latency testing, and storage-backed active URL switching. Build `app/src/components/ServerConfigModal.tsx` and integrate with `AuthScreen.tsx` and `userSlice.ts`.

**Tech Stack:** React Native, Expo SDK 57, Axios, Redux Toolkit, AsyncStorage.

## Global Constraints

- Never break existing auth token storage keys (`auth_token`, `refresh_token`, `user_profile`).
- Default base URL must always be `https://getfoodpk-fd9b20442fcf.herokuapp.com/api`.
- Zero TypeScript errors (`npx tsc --noEmit`).

---

### Task 1: API Service Layer Enhancements

**Files:**
- Modify: `app/src/services/api.js`

**Interfaces:**
- Produces:
  - `getAvailablePresets(): { id: string; label: string; url: string; description: string }[]`
  - `testApiConnectivity(targetUrl: string): Promise<{ success: boolean; latencyMs: number; message: string; url: string }>`
  - `setActiveBaseUrl(newUrl: string): Promise<string>`
  - `resetBaseUrlToDefault(): Promise<string>`
  - `getActiveBaseUrl(): string`
  - `sanitizeErrorMessage(error: any, baseUrl?: string): string`

- [ ] **Step 1: Implement Server Presets and Connectivity Tester in `app/src/services/api.js`**

```javascript
export const getAvailablePresets = () => [
  {
    id: 'heroku_prod',
    label: '🚀 Heroku Production (24/7)',
    url: PRODUCTION_API_URL,
    description: 'Live cloud backend on Heroku with PostgreSQL & Cloudinary',
  },
  {
    id: 'local_lan',
    label: '💻 Local Dev (LAN IP)',
    url: detectLocalLanUrl(),
    description: 'Local Django server running on your development machine',
  },
  {
    id: 'emulator',
    label: '📱 Android Emulator Loopback',
    url: 'http://10.0.2.2:8000/api',
    description: 'Direct alias for host localhost inside Android Virtual Device',
  },
];

export const testApiConnectivity = async (targetUrl) => {
  const normalized = normalizeApiUrl(targetUrl);
  const startTime = Date.now();
  try {
    const testAxios = axios.create({
      baseURL: normalized,
      timeout: 6000,
    });
    // Ping public endpoint
    await testAxios.get('/restaurants/');
    const latencyMs = Date.now() - startTime;
    return {
      success: true,
      latencyMs,
      message: `Connected successfully (${latencyMs}ms)`,
      url: normalized,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      latencyMs,
      message: err.code === 'ECONNABORTED' ? 'Request timed out after 6s' : (err.message || 'Unable to connect'),
      url: normalized,
    };
  }
};
```

- [ ] **Step 2: Add `setActiveBaseUrl` and `resetBaseUrlToDefault`**

```javascript
export const setActiveBaseUrl = async (newUrl) => {
  const normalized = normalizeApiUrl(newUrl);
  activeBaseUrl = normalized;
  api.defaults.baseURL = normalized;
  await safeSetItem(CUSTOM_API_STORAGE_KEY, normalized);
  return normalized;
};

export const resetBaseUrlToDefault = async () => {
  activeBaseUrl = PRODUCTION_API_URL;
  api.defaults.baseURL = PRODUCTION_API_URL;
  await safeRemoveItem(CUSTOM_API_STORAGE_KEY);
  return PRODUCTION_API_URL;
};
```

- [ ] **Step 3: Run Typecheck on `app/`**

Run: `npx tsc --noEmit` (in `app/`)
Expected: PASS (0 errors)

---

### Task 2: Build `ServerConfigModal.tsx` Component

**Files:**
- Create: `app/src/components/ServerConfigModal.tsx`

**Interfaces:**
- Consumes: `getActiveBaseUrl`, `setActiveBaseUrl`, `resetBaseUrlToDefault`, `getAvailablePresets`, `testApiConnectivity` from `../services/api`
- Produces: `<ServerConfigModal visible={boolean} onClose={() => void} onServerChanged={(url: string) => void} />`

- [ ] **Step 1: Create `app/src/components/ServerConfigModal.tsx`**

Create modal with:
- Active server banner with live latency test badge.
- Preset list (`Heroku 24/7`, `Local LAN`, `Android Emulator`).
- Live "Test Connection" button.
- Custom URL input field with Save & Reset to Heroku buttons.

- [ ] **Step 2: Run Typecheck on `app/`**

Run: `npx tsc --noEmit` (in `app/`)
Expected: PASS (0 errors)

---

### Task 3: Integrate with `AuthScreen.tsx` & `userSlice.ts`

**Files:**
- Modify: `app/src/screens/AuthScreen.tsx`
- Modify: `app/src/store/userSlice.ts`

- [ ] **Step 1: Connect `ServerConfigModal` in `AuthScreen.tsx`**
- Add `showServerModal` state and `logoTapCount` handler on GetFood logo.
- Add a subtle status chip below the Login button displaying the active server and allowing 1-tap open of the Server Diagnostics modal.

- [ ] **Step 2: Update `formatDRFErrorMessage` in `userSlice.ts`**
- Prioritize `error.userFriendlyMessage` if available.
- If network error occurs, append guidance to check server configuration.

- [ ] **Step 3: Run Typecheck on `app/`**

Run: `npx tsc --noEmit` (in `app/`)
Expected: PASS (0 errors)

---

### Task 4: Verification & End-to-End Test

- [ ] **Step 1: Test TypeScript build**

Run: `npx tsc --noEmit` (in `app/`)
Expected: 0 errors

- [ ] **Step 2: Test Metro Android Bundle**

Run: `powershell -Command "(Invoke-WebRequest -Uri 'http://localhost:8082/index.bundle?platform=android&dev=true' -UseBasicParsing).StatusCode"`
Expected: 200

- [ ] **Step 3: Git Commit & Push**

Run: `git add -A; git commit -m "feat: add server diagnostics modal and network resilience to customer app"; git push origin main`
Expected: Pushed to origin/main
