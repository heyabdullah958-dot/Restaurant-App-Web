# Phase 13: Customer Mobile App Screen Polish & Bug Resolution

> **Status:** ✅ COMPLETED & FULLY VERIFIED (Tasks 1 to 6)

**Goal:** Resolve the 4 prominent UI, map rendering, layout alignment, and deprecation issues identified from the user's annotated screenshots, PLUS enforce 100% strict cross-brand menu/asset isolation (stopping Jushh PK items/images from leaking into Blue) and implement McDonald's store-locator style custom Brand Logo markers on the Map.

**Architecture:** 
1. Harmonize status bar rendering and top insets across Android and iOS so the Home screen has zero black void or status bar disconnect.
2. Fix the Leaflet Map WebView in `MapScreen.tsx` by eliminating Android hardware layer rendering bugs, removing tile CORS restrictions, securing immediate container dimension calculation, and rendering McDonald's store-locator style custom HTML/divIcon markers with embedded high-res Brand Logos (Blue, Jushh PK, Tandoori Stop, Get A Fomo).
3. Re-architect the Menu Item Card in `RestaurantScreen.tsx` to separate the image container from the floating action button, eliminating `overflow: 'hidden'` clipping of the "CUSTOMIZE" badge and enforcing unified vertical alignment across all cards.
4. Migrate all remaining `SafeAreaView` imports from `react-native` to `react-native-safe-area-context` to permanently remove the yellow deprecation banner.
5. Enforce 100% strict cross-brand isolation in `mediaAssetService.ts`, `fallbackData.ts`, `seed_restaurants.py`, and the Heroku PostgreSQL database so Blue's menu never displays Jushh PK products, drink cans, or dark red Jushh branding.

**Tech Stack:** React Native 0.86, Expo SDK 57, `react-native-safe-area-context`, `react-native-webview`, Leaflet.js, Django REST Framework, PostgreSQL, Cloudinary CDN (`qodsfm34`).

---

## Global Constraints
- Target platform: Customer Mobile App (`app/`) and Backend (`backend/`).
- Must compile cleanly with `npx tsc --noEmit` (0 errors).
- No regressions to existing features (Crave & Watch Reels, 4 active brands, cart modifiers).
- Preserve existing theme colors: `#E94124` primary, `#FCF3E4` cream, `#1F1A17` dark, `#F8FAFC` light.

---

## Implementation Summary & Completed Checklist

### Task 1: Fix Top Status Bar & Eliminate Home Screen Void
- [x] **Step 1: Update `App.tsx` StatusBar configuration**
  Updated `<StatusBar style="dark" />` to render edge-to-edge status bar without letterboxing.
- [x] **Step 2: Update `HomeScreen.tsx` root container padding**
  Changed root padding to `{ paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 0) }` with `<StatusBar style="dark" />`.

### Task 2: Fix Map Canvas Rendering & Implement McDonald's Custom Brand Logo Pins
- [x] **Step 1: Fix tile layer CORS and fallback loading in HTML template**
  Removed `crossOrigin: true` from `L.tileLayer` and added instant fallback to OpenStreetMap raster tiles.
- [x] **Step 2: Fix WebView Android layer type and props in `MapScreen.tsx`**
  Switched `androidLayerType="software"`, added `allowFileAccess={true}`, `geolocationEnabled={true}`, and added `map.invalidateSize()` on `onLoadEnd`.
- [x] **Step 3: Implement McDonald's Store-Locator Style Brand Logo Pins**
  Constructed custom CSS/HTML `.mcd-pin-badge`, `.mcd-pin-logo`, `.mcd-pin-pointer` embedding the respective brand's official circular logo (`b.logoUrl`).

### Task 3: Redesign Menu Item Card Layout & Un-Clip "CUSTOMIZE" Badge
- [x] **Step 1: Separate Image Container from Floating Action Button**
  Restructured right column into `menuItemRightColumn` (width 96px). Decoupled the image container (`overflow: 'hidden'`) from the floating action button container (`position: 'absolute', bottom: 0, width: 86, height: 28, zIndex: 5, elevation: 4`).
- [x] **Step 2: Optimize Button Dimensions & Typography**
  Standardized button to `width: 86, height: 28, borderRadius: 14` with font size `10.5px`, `fontWeight: '800'`.
- [x] **Step 3: Enforce Uniform Vertical Alignment Across Cards**
  Set `styles.menuItemCard` to `alignItems: 'flex-start'`.

### Task 4: Eliminate Deprecated `SafeAreaView` Warning Toast
- [x] **Step 1: Replace imports across all 7 screens**
  Replaced `SafeAreaView` from `'react-native'` with `import { SafeAreaView } from 'react-native-safe-area-context';` in:
  - `CartScreen.tsx`
  - `CheckoutScreen.tsx`
  - `OnboardingScreen.tsx`
  - `OrderConfirmationScreen.tsx`
  - `OrdersScreen.tsx`
  - `RestaurantScreen.tsx`
  - `RewardsScreen.tsx`

### Task 5: Enforce Strict Brand Isolation (Eliminate Jushh Leakage into Blue)
- [x] **Step 1: Scope `mediaAssetService.ts` by Brand**
  Split into brand-scoped dictionaries (`BLUE_ORIGINAL_ASSETS`, `JUSHH_ORIGINAL_ASSETS`, `TANDOORI_ORIGINAL_ASSETS`, `FOMO_ORIGINAL_ASSETS`). Added `isImageAppropriateForBrand` and updated `resolveItemImage(item, restaurantIdOrSlug)`.
- [x] **Step 2: Update Fallback Data & Backend Seed Data for Blue**
  Updated `fallbackData.ts` and `sync_active_4_brands.py` to point Blue's beverages and sides to Blue's clean logo / neutral assets.
- [x] **Step 3: Update Live Heroku PostgreSQL Database for Blue**
  Executed DB sanitation script on Heroku PostgreSQL: all 9 foreign/Jushh drink items updated to Blue assets. Deployed Heroku v105 via subtree push.

### Task 6: Compilation, Typecheck & Verification
- [x] `cd app; npx tsc --noEmit` (Exit code: 0 - 0 errors)
- [x] `cd admin-app; npx tsc --noEmit` (Exit code: 0 - 0 errors)
- [x] `cd admin; npm run build` (Exit code: 0 - built in 945ms)
- [x] `python manage.py test restaurants.tests.test_dine_in_posts` (5/5 tests passed in 21s)
- [x] Live Heroku API query `/api/restaurants/dineatblue/` confirmed 0 foreign or Jushh items.
