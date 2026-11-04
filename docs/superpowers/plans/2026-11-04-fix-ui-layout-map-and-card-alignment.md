# Phase 13: Customer Mobile App Screen Polish & Bug Resolution

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

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

## Root Cause Analysis (Verified from Codebase & Screenshots)

### 1. Top Gap / Status Bar Disconnect (Screenshot 1)
- In `HomeScreen.tsx` line 1048, the root view hardcodes `{ paddingTop: Platform.OS === 'android' ? 40 : insets.top }`.
- In `App.tsx` and `HomeScreen.tsx`, `<StatusBar style="dark" />` lacks `translucent={true}` and `backgroundColor="transparent"`. On modern Android, non-translucent status bars add their own native height or draw an opaque black letterbox, doubling with the manual 40px padding and leaving a massive gap above the top header.

### 2. Blank Map Canvas & Generic Pins (Screenshot 2)
- In `MapScreen.tsx` line 713, `androidLayerType="hardware"` causes Android WebView hardware-accelerated canvas surfaces to fail or render blank `#EBF0F5` grey on many devices and emulators.
- In line 552, `L.tileLayer(primaryTileUrl, { ..., crossOrigin: true })` applies `img.crossOrigin = ''`. In an Android WebView with `baseUrl: 'https://unpkg.com'`, tile requests to CartoDB and OpenStreetMap can be blocked by WebView CORS security policies.
- In line 600, map pins use plain text emoji (`<span class="mcd-pin-emoji">${b.emoji}</span>`) rather than actual brand logo images.

### 3. Menu Item Image & CUSTOMIZE Button Misalignment & Clipping (Screenshots 3, 4, 5)
- In `RestaurantScreen.tsx` line 203, `styles.menuItemImageContainer` has `{ borderRadius: 14, overflow: 'hidden' }`. Inside it, `quantitySelectorContainer` has `position: 'absolute', bottom: -10`. Because the parent has `overflow: 'hidden'`, the bottom 10px of the "CUSTOMIZE" button is sliced off by the bounding box.
- The button is constrained to `left: 5, right: 5` inside a 90px container (effective width ~80px). Fitting the sparkle icon and `"CUSTOMIZE"` text causes truncation and clipping.
- `styles.menuItemImageContainer` uses `alignSelf: 'center'` inside a flex-row card. When an item has a 1-line description versus a 3-line description, the card height varies, causing neighboring images and buttons to vertically shift unpredictably.

### 4. Deprecated `SafeAreaView` Warning Toast (Screenshots 3, 4, 5)
- React Native 0.86 prints a global warning when importing `SafeAreaView` from `'react-native'`.
- 7 screens currently import from `'react-native'`: `CartScreen.tsx`, `CheckoutScreen.tsx`, `OnboardingScreen.tsx`, `OrderConfirmationScreen.tsx`, `OrdersScreen.tsx`, `RestaurantScreen.tsx`, and `RewardsScreen.tsx`.

### 5. Cross-Brand Menu & Image Leakage into Blue (Screenshot 3 & 4)
- In `app/src/services/mediaAssetService.ts`, `BRAND_ORIGINAL_ASSETS` is a flat global dictionary indexed by item name without checking the restaurant brand. Items named "green apple mojito", "pepsi / 7up", "mineral water", and "steak fries" mapped directly to Jushh PK's photo assets (`menu_items/green_apple_mojito.jpg` showing Jushh can on dark red background).
- In the Heroku PostgreSQL database and `seed_restaurants.py`, the "BEVERAGES & SIDES" category for Blue had items seeded with Jushh PK image paths (`menu_items/green_apple_mojito.jpg`, `menu_items/soft_drink.jpg`, `menu_items/water_bottle.jpg`, `foodsphere/jushhpk/chicken_doner_fries.jpg`).

---

## Implementation Tasks

### Task 1: Fix Top Status Bar & Eliminate Home Screen Void

**Files:**
- Modify: `app/src/screens/HomeScreen.tsx:1047-1055`
- Modify: `app/App.tsx:264-266`

**Interfaces:**
- Consumes: `useSafeAreaInsets` from `react-native-safe-area-context`.
- Produces: Seamless top edge-to-edge layout with translucent status bar and dark icons.

- [ ] **Step 1: Update `App.tsx` StatusBar configuration**
  Update `<StatusBar style="dark" translucent={true} backgroundColor="transparent" />` to ensure Android renders transparent edge-to-edge status bar without letterboxing.

- [ ] **Step 2: Update `HomeScreen.tsx` root container padding**
  Change root padding from `paddingTop: Platform.OS === 'android' ? 40 : insets.top` to:
  ```tsx
  <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 0) }]}>
    <StatusBar style="dark" translucent={true} backgroundColor="transparent" />
  ```
  This ensures status bar icons sit cleanly above the header without creating a 40px blank black bar.

---

### Task 2: Fix Map Canvas Rendering & Implement McDonald's Custom Brand Logo Pins

**Files:**
- Modify: `app/src/screens/MapScreen.tsx:425-455, 540-635, 705-738`

**Interfaces:**
- Consumes: Leaflet.js bundled assets, CartoDB & OSM tile layers, Brand Logo URLs from Cloudinary.
- Produces: Reliably rendered interactive map with custom McDonald's-style brand logo pins.

- [ ] **Step 1: Fix tile layer CORS and fallback loading in HTML template**
  Remove `crossOrigin: true` from `L.tileLayer` so the WebView loads raster tiles directly without strict browser CORS origin checks.
  Add tile load timeout detection to instantly switch to OpenStreetMap tiles if CartoDB fails.

- [ ] **Step 2: Fix WebView Android layer type and props in `MapScreen.tsx`**
  Change `androidLayerType="hardware"` to `androidLayerType="software"` (or remove it to use standard system view rendering).
  Add `allowFileAccess={true}`, `geolocationEnabled={true}`, and use `onLoadEnd` instead of `onLoad` for triggering `map.invalidateSize()`.

- [ ] **Step 3: Implement McDonald's Store-Locator Style Brand Logo Pins**
  Update the HTML/CSS and pin generation in `MapScreen.tsx`:
  - Pass the brand's verified circular logo URL into each branch object (`b.logoUrl`).
  - Create custom CSS for `.mcd-brand-pin`:
    ```css
    .mcd-pin-badge {
      background: #FFFFFF;
      border: 2px solid ${accentColor};
      border-radius: 24px;
      padding: 4px 10px 4px 4px;
      display: flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 4px 14px rgba(0,0,0,0.18);
    }
    .mcd-pin-logo {
      width: 24px;
      height: 24px;
      border-radius: 12px;
      object-fit: cover;
    }
    ```
  - Markers display the brand's circular logo icon (Blue, Jushh PK, Tandoori Stop, Get A Fomo) + outlet name with a small pointer caret beneath.

---

### Task 3: Redesign Menu Item Card Layout & Un-Clip "CUSTOMIZE" Badge

**Files:**
- Modify: `app/src/screens/RestaurantScreen.tsx:200-260, 1430-1490`

**Interfaces:**
- Consumes: `MenuItem`, `cartQuantityMap`, `hasCustomOptions`.
- Produces: Pixel-perfect aligned food cards with unclipped, floating customize/add pill badges.

- [ ] **Step 1: Separate Image Container from Floating Action Button**
  Restructure the right column into an outer container (`rightColumnContainer`, fixed width: 96px, `alignItems: 'center'`, `justifyContent: 'flex-start'`):
  - Inner **Image Container**: `width: 90, height: 90, borderRadius: 14, overflow: 'hidden'`.
  - Floating **Action Button**: Positioned at `bottom: -12` relative to the image container, with `zIndex: 5`, `elevation: 4`, and `overflow: 'visible'`.

- [ ] **Step 2: Optimize Button Dimensions & Typography**
  - Increase button width to `84px` and height to `28px` with rounded pill borders (`borderRadius: 14`).
  - Set font size to `10.5px`, `fontWeight: '800'`, and reduce icon gap so `"CUSTOMIZE"` and `"ADD"` fit comfortably without text truncation.
  - Set badge background to `COLORS.primary` (`#E94124`) with white text and clean drop shadow.

- [ ] **Step 3: Enforce Uniform Vertical Alignment Across Cards**
  - Set card container to `alignItems: 'flex-start'` so the food thumbnail always anchors to the top-right of the card with uniform padding, regardless of whether the item description is 1 line or 3 lines.

---

### Task 4: Eliminate Deprecated `SafeAreaView` Warning Toast

**Files:**
- Modify: `app/src/screens/CartScreen.tsx:9`
- Modify: `app/src/screens/CheckoutScreen.tsx:13`
- Modify: `app/src/screens/OnboardingScreen.tsx:9`
- Modify: `app/src/screens/OrderConfirmationScreen.tsx:8`
- Modify: `app/src/screens/OrdersScreen.tsx:11`
- Modify: `app/src/screens/RestaurantScreen.tsx:11`
- Modify: `app/src/screens/RewardsScreen.tsx:10`

**Interfaces:**
- Consumes: `react-native-safe-area-context`.
- Produces: Clean console output with 0 deprecation banners.

- [ ] **Step 1: Replace imports across all 7 screens**
  Remove `SafeAreaView` from `'react-native'` imports.
  Add `import { SafeAreaView } from 'react-native-safe-area-context';` across all 7 screen files.

---

### Task 5: Enforce Strict Brand Isolation (Eliminate Jushh Leakage into Blue)

**Files:**
- Modify: `app/src/services/mediaAssetService.ts`
- Modify: `app/src/services/fallbackData.ts`
- Modify: `backend/restaurants/management/commands/seed_restaurants.py`
- Execute: Update query on Heroku PostgreSQL database to sanitize Blue menu image URLs

**Interfaces:**
- Consumes: `restaurantSlug`, `restaurantId`, brand-scoped asset dictionaries.
- Produces: 100% brand-isolated menu display with zero cross-brand image or product contamination.

- [ ] **Step 1: Scope `mediaAssetService.ts` by Brand**
  Restructure `BRAND_ORIGINAL_ASSETS` into brand-scoped dictionaries (`JUSHH_ORIGINAL_ASSETS`, `TANDOORI_ORIGINAL_ASSETS`, `BLUE_ORIGINAL_ASSETS`, `FOMO_ORIGINAL_ASSETS`).
  Update `resolveItemImageWithLogoFallback(item, restaurantIdOrSlug)`:
  - If brand is `dineatblue` or `blue`: ONLY search `BLUE_ORIGINAL_ASSETS` and Blue's own item image. If no item photo exists, fallback to Blue's clean circular logo (`dineatblue/logo.png`). NEVER return Jushh PK cans or dark red assets.
  - If brand is `tandooristoppk`: ONLY search `TANDOORI_ORIGINAL_ASSETS` or fallback to Tandoori Stop logo.
  - If brand is `jushhpk`: ONLY search `JUSHH_ORIGINAL_ASSETS` or fallback to Jushh PK logo.

- [ ] **Step 2: Update Fallback Data & Backend Seed Data for Blue**
  In `fallbackData.ts` and `seed_restaurants.py`, update Blue's "BEVERAGES & SIDES":
  - Replace any Jushh can references with Blue's own ocean cooler mocktails / neutral beverages or Blue logo fallback.
  - For Steak Fries in Blue: Use clean golden french fries photo without Jushh dark red background or doner branding.

- [ ] **Step 3: Update Live Heroku PostgreSQL Database for Blue**
  Run an update script against Heroku PostgreSQL to sanitize `MenuItem` image fields for `dineatblue`:
  - Set `image = 'https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/dineatblue/logo.png'` for any beverages lacking a dedicated Blue ocean photo.
  - Verify `/api/restaurants/dineatblue/` returns zero Jushh asset URLs.

---

### Task 6: Compilation, Typecheck & Verification

**Files:**
- Inspect: All modified files.
- Run: `cd app; npx tsc --noEmit`
- Run: Metro bundle check on port `8081`
- Run: Live Heroku API inspection

- [ ] **Step 1: Run TypeScript compiler check**
  Execute `npx tsc --noEmit` in `app` to ensure 0 errors.

- [ ] **Step 2: Verify Metro Bundler & Live API**
  Verify live `/api/restaurants/dineatblue/` and Metro bundling pass cleanly.

---

## Verification Plan

### Automated Tests
1. `cd app; npx tsc --noEmit` -> Must return exit code 0.
2. `cd backend; .\venv\Scripts\python.exe manage.py test restaurants.tests.test_dine_in_posts` -> Must pass 5/5 tests.
3. Live Heroku API check: `curl https://getfoodpk-fd9b20442fcf.herokuapp.com/api/restaurants/dineatblue/` -> Check that 0 items contain `jushh` in `image` URL.

### Manual / Device Verification
1. **Home Screen Top Gap:** Open Home screen. Verify status bar is translucent, and the header sits right below the status icons without a 40px black bar or void.
2. **Map Screen:** Navigate to Map tab. Verify CartoDB/OSM map tiles load cleanly with McDonald's-style pins showing the **Brand Logo** for each outlet.
3. **Menu Item Cards & Brand Isolation:** Open Blue menu.
   - Verify all items and beverages belong strictly to Blue with Blue/neutral imagery (zero Jushh cans or dark red Jushh cards).
   - Verify food images align consistently on the right edge.
   - Verify the "CUSTOMIZE" and "ADD" buttons float cleanly with zero bottom clipping.
4. **Warning Banner:** Verify that the yellow "SafeAreaView has been deprecated" toast no longer appears at the bottom of the screen.
