# 🛠️ FoodSphere Mobile App Bug Fixes Summary

This document lists the critical bug fixes implemented in the React Native / Expo mobile application (`/app`).

---

## 📁 Modified Files

1. **Map Screen**: [MapScreen.tsx](file:///d:/sitesdata/Resturent App/app/src/screens/MapScreen.tsx)
2. **Home Screen**: [HomeScreen.tsx](file:///d:/sitesdata/Resturent App/app/src/screens/HomeScreen.tsx)
3. **Restaurant Detail Screen**: [RestaurantScreen.tsx](file:///d:/sitesdata/Resturent App/app/src/screens/RestaurantScreen.tsx)

---

## 🔍 Detailed Bug Fixes

### 1. Map Section App Close/Crash Fix
* **Issue**: Opening the maps section immediately crashed the app on several Android/iOS devices.
* **Root Cause**: 
  1. The app requested location permissions concurrently with mounting the native map element while `showsUserLocation` was toggled to true, triggering native thread race conditions.
  2. If the GPS services were disabled, `getCurrentPositionAsync` failed, and `MapView` attempted to use dynamic geolocation hooks in an unhandled/broken state.
  3. String coordinates (if loaded from the API) passed directly to the `Marker` component caused react-native-maps coordinate serialization failures.
* **Fix implemented**:
  * Added `loadingLocation` state in [MapScreen.tsx](file:///d:/sitesdata/Resturent App/app/src/screens/MapScreen.tsx#L21) to show a standard `<ActivityIndicator>` loader while permissions and geolocation are being fetched.
  * Native `MapView` is not mounted until `loadingLocation` resolves to `false`.
  * Only set `showsUserLocation={hasPermission && location !== null}` to avoid calling native location updates on null references.
  * Cast coordinate fields defensively to numbers: `coordinate={{ latitude: Number(coords.lat), longitude: Number(coords.lng) }}` in [MapScreen.tsx](file:///d:/sitesdata/Resturent App/app/src/screens/MapScreen.tsx#L80).
  * Filtered out any null restaurants or restaurants without a slug before rendering markers.

### 2. Jushh!! Menu Black Screen Resolution (Transition Mismatch)
* **Issue**: Clicking on the Jushh!! brand card loaded a blank/black screen and didn't display the menu.
* **Root Cause**:
  * Jushh!! (`jushhpk`) in the production database has empty/null values for `cover_image` and `banner_image`.
  * In [HomeScreen.tsx](file:///d:/sitesdata/Resturent App/app/src/screens/HomeScreen.tsx), a conditional check was omitting the `<Animated.Image>` element entirely when cover images were null, fallback rendering a text emoji.
  * In [RestaurantScreen.tsx](file:///d:/sitesdata/Resturent App/app/src/screens/RestaurantScreen.tsx), the details header ALWAYS mounts an `<Animated.Image>` bound to `sharedTransitionTag="restaurant-jushhpk-image"`.
  * The lack of a matching source `<Animated.Image>` in the home view broke the React Native Reanimated transition hierarchy layout, resulting in a blank screen.
* **Fix implemented**:
  * Updated [HomeScreen.tsx](file:///d:/sitesdata/Resturent App/app/src/screens/HomeScreen.tsx#L303-L312) to always render `<Animated.Image>` using `getImageUrl(brand.banner_image || brand.cover_image)`.
  * When cover images are empty, it loads the default placeholder image defined in `fallbackData.ts` with low opacity (`opacity: 0.2`) and overlays the brand emoji.
  * This guarantees a matching shared transition tag element is always present in both views, resolving the Reanimated animation crash.

### 3. Safe Parsing of Restaurant Operational Hours
* **Issue**: Potential blank screens when loading restaurants with incomplete profiles on the API.
* **Root Cause**:
  * [RestaurantScreen.tsx](file:///d:/sitesdata/Resturent App/app/src/screens/RestaurantScreen.tsx) was directly calling `opens_at.slice(0, 5)` and `closes_at.slice(0, 5)`. If those hours returned null or undefined from the backend database, it crashed the entire view render.
* **Fix implemented**:
  * Wrapped working hours rendering in an inline fallback check: `{restaurant.opens_at && restaurant.closes_at ? ... : 'Closed / N/A'}` in [RestaurantScreen.tsx](file:///d:/sitesdata/Resturent App/app/src/screens/RestaurantScreen.tsx#L358).

---

## 🚀 Publishing OTA Updates (Expo EAS)

The updates can be pushed to the active mobile applications via Expo OTA (Over-The-Air) update using:
```bash
cd app
$env:EXPO_PUBLIC_API_URL="https://restaurant-app-web.onrender.com/api"; $env:CI="1"; npx eas-cli update --channel preview --platform android --environment preview --message "Fix MapScreen crash and JushhPK menu layout" --non-interactive
```
