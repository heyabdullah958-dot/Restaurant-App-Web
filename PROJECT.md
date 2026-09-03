# 🍽️ PROJECT.md — GetFood (FoodSphere) Multi-Tenant Platform Overview
> **Project Completion Status**: 100% Launch Ready (Core Code, Security & Features: 100% Finished)  
> **Last Updated**: 2026-09-01

---

## 📌 1. Platform Architecture

- **Project Name**: GetFood (FoodSphere Platform)
- **Architecture**: Scalable Multi-Tenant Restaurant Aggregator (1 Customer Mobile App + 1 Merchant Manager Mobile App + 1 Admin Web HQ + 7 Individual Websites)
- **Frontend Stack**:
  - **Admin Panel HQ (Web)**: React 18, Vite, Tailwind CSS v3, Lucide React (Hosted on Vercel & Cloudflare Pages)
  - **Customer Mobile App (`/app`)**: React Native, Expo SDK 57, Redux Toolkit, React Navigation
  - **Merchant Manager Mobile App (`/admin-app`)**: React Native, Expo SDK 57, Redux Toolkit, Full 12-View Role-Scoped Suite
  - **7 Brand Websites**: React / HTML5, Tailwind CSS
- **Backend Stack**: Python 3.11, Django REST Framework, SimpleJWT Auth, PostgreSQL
- **Database & Storage**: PostgreSQL (Production Heroku), Cloudinary (Media Storage `depa8gfnk`)

---

## 🌐 2. Live Production URLs

| Platform / Website | Live URL | Status |
|---|---|---|
| 👑 **Admin Panel (HQ Dashboard)** | [https://foodsphere-admin.vercel.app](https://foodsphere-admin.vercel.app) | ✅ Live on Vercel |
| 🚀 **Backend API (Heroku 24/7)** | [https://getfoodpk-fd9b20442fcf.herokuapp.com](https://getfoodpk-fd9b20442fcf.herokuapp.com) | ✅ Live on Heroku (Release v85) |
| 📱 **GetFood Customer App Web Preview** | [https://getfood-app.pages.dev](https://getfood-app.pages.dev) | ✅ Live on Cloudflare |
| 🫓 **Tandoori Stop Website** | [https://tandooristoppk-foodsphere.pages.dev](https://tandooristoppk-foodsphere.pages.dev) | ✅ Live (HD Photos & Logo) |
| 🍔 **Jushh Website** | [https://jushhpk-foodsphere.pages.dev](https://jushhpk-foodsphere.pages.dev) | ✅ Live |
| ☕️ **GetAFomo Website** | [https://getafomo-foodsphere.pages.dev](https://getafomo-foodsphere.pages.dev) | ✅ Live (Instagram Feed) |
| 🍢 **SeenBanao Website** | [https://seenbanao-foodsphere.pages.dev](https://seenbanao-foodsphere.pages.dev) | ✅ Live (Phase 2 Preview) |
| 🐟 **Dine At Blue Website** | [https://dineatblue-foodsphere.pages.dev](https://dineatblue-foodsphere.pages.dev) | ✅ Live (Phase 2 Preview) |
| 🥪 **Sand Melts Website** | [https://sandmelts-foodsphere.pages.dev](https://sandmelts-foodsphere.pages.dev) | ✅ Live (Phase 2 Preview) |
| 🍗 **Birdman Foods Website** | [https://birdmanfoodspk-foodsphere.pages.dev](https://birdmanfoodspk-foodsphere.pages.dev) | ✅ Live (Phase 2 Preview) |
| 📜 **Privacy Policy** | [https://foodsphere-admin.pages.dev/privacy-policy.html](https://foodsphere-admin.pages.dev/privacy-policy.html) | ✅ Store Ready |
| 📜 **Terms of Service** | [https://foodsphere-admin.pages.dev/terms-of-service.html](https://foodsphere-admin.pages.dev/terms-of-service.html) | ✅ Store Ready |

---

## 🔑 3. Demo Login Credentials

- **Super-Admin**:
  - **Username**: `admin`
  - **Password**: `admin123`
- **Branch Managers** (Scoped access):
  - Tandoori Stop Johar Town: `manager_tandooristoppk_johar_town` | `managerpassword123`
  - Tandoori Stop Lake City: `manager_tandooristoppk_lake_city` | `managerpassword123`
  - Tandoori Stop Mozang Chungi: `manager_tandooristoppk_mozang_chungi` | `managerpassword123`
  - Tandoori Stop Baghbanpura: `manager_tandooristoppk_baghbanpura` | `managerpassword123`
  - Jushh DHA Phase 1: `manager_jushhpk_dha_phase_1` | `managerpassword123`
  - Jushh Johar Town: `manager_jushhpk_johar_town` | `managerpassword123`
  - Jushh Lake City: `manager_jushhpk_lake_city` | `managerpassword123`
  - GetAFomo Gulberg III: `manager_getafomo_gulberg_iii` | `managerpassword123`

---

## ✅ 4. Latest Milestones Completed (2026-09-01)

1. **Merchant Manager Mobile App (`/admin-app`) Standalone Stability & Vector UI**:
   - Resolved APK launch crash by declaring `react-native-gesture-handler` root import, wrapping tree in `GestureHandlerRootView`, building dark-mode `ErrorBoundary`, and declaring native Android permissions.
   - Standardized bottom navigation tab bar using vector `Ionicons` with active pill backgrounds.
   - Fixed dispatch modal navigation route binding (`'RiderManagement'`).

2. **Customer Mobile App Auth & Navigation Harmonization**:
   - Implemented clean Guest profile mode with Sign In / Sign Up CTA, hiding authenticated actions.
   - Restructured Home header with responsive flexbox and removed obsolete Takeaway/Dine-In switcher.
   - Fixed hanging post-login spinner with hierarchy-aware `handlePostAuthNavigation` and nested tab state projection.

3. **Customer Order History Isolation & DRF Query Scoping**:
   - Eliminated legacy fuzzy substring queries and database re-assignments in `MyOrdersListView`.
   - Strictly scoped querysets to `Order.objects.filter(user=user)`.
   - Refactored Redux `orderSlice.ts` to populate state strictly from active authenticated user response.

4. **Flash Deals Engine v2.0 & Recurring Midnight Specials**:
   - Implemented multi-tier item scoping (`ENTIRE_MENU`, `CATEGORY`, `SPECIFIC_ITEMS`), 3-way order modes, and midnight schedule rollover.

5. **Exhaustive Multi-Platform Regression, Invariants & Security Suite (90/90 Tests Passed)**:
   - **100% Pass** across 5 automated suites:
     - `test_phase8_production_regression.py` (23/23 tests)
     - `test_deep_invariant_matrix.py` (21/21 tests)
     - `test_security_concurrency_penetration.py` (18/18 tests)
     - `test_live_heroku_e2e_deep.py` (11/11 tests)
     - `test_live_heroku_auth_order_flow.py` (12/12 tests)
     - `test_dual_app_e2e.py` (5/5 steps)

6. **Standalone Production Android APKs Built**:
   - **GetFood Customer App**: `D:\GetFood-Customer.apk` (55.6 MB)
   - **GetFood Merchant Manager App**: `D:\GetFood-Manager.apk` (35.5 MB)

---

## ⏳ 5. Client Pending Action Items (For Production Handoff)

| Item | Description | Action Required From Client |
|---|---|---|
| 🔔 **Firebase Notifications** | Production push notifications for order updates & promos | Client Firebase `firebase_credentials.json` private key |
| 🌐 **Custom Domains** | Linking custom domain names (e.g. `foodsphere.pk`, `seenbanao.pk`) | Domain Registrar DNS access (Namecheap/GoDaddy/PKNIC) |
| 📱 **Store Deployment** | Google Play Store & Apple App Store submission | Client Google Play Console & Apple Developer accounts |

