# 🍽️ PROJECT.md — GetFood (FoodSphere) Multi-Tenant Platform Overview
> **Project Completion Status**: 100% Launch Ready (Core Code, Security & Features: 100% Finished)  
> **Last Updated**: 2026-07-26

---

## 📌 1. Platform Architecture

- **Project Name**: GetFood (FoodSphere Platform)
- **Architecture**: Scalable Multi-Tenant Restaurant Aggregator (1 Mobile App + 1 Admin HQ + 7 Individual Websites)
- **Frontend Stack**:
  - **Admin Panel HQ**: React 18, Vite, Tailwind CSS v3, Lucide React
  - **Mobile App**: React Native, Expo, Redux Toolkit (GetFood)
  - **7 Brand Websites**: React / HTML5, Tailwind CSS
- **Backend Stack**: Python 3.11, Django 6.0, Django REST Framework, SimpleJWT Auth
- **Database & Storage**: PostgreSQL (Production) / SQLite (Dev), Cloudinary (Media Storage `depa8gfnk`)

---

## 🌐 2. Live Production URLs

| Platform / Website | Live URL | Status |
|---|---|---|
| 👑 **Admin Panel (HQ Dashboard)** | [https://foodsphere-admin.pages.dev](https://foodsphere-admin.pages.dev) | ✅ Live on Cloudflare |
| 🚀 **Backend API (Heroku 24/7)** | [https://getfoodpk-fd9b20442fcf.herokuapp.com](https://getfoodpk-fd9b20442fcf.herokuapp.com) | ✅ Live on Heroku (24/7 Zero-Sleep) |
| 🫓 **Tandoori Stop Website** | [https://tandooristoppk-foodsphere.pages.dev](https://tandooristoppk-foodsphere.pages.dev) | ✅ Live (HD Photos & Logo) |
| 🍔 **Jushh Website** | [https://jushhpk-foodsphere.pages.dev](https://jushhpk-foodsphere.pages.dev) | ✅ Live |
| ☕️ **GetAFomo Website** | [https://getafomo-foodsphere.pages.dev](https://getafomo-foodsphere.pages.dev) | ✅ Live (Instagram Feed) |
| 🍢 **SeenBanao Website** | [https://seenbanao-foodsphere.pages.dev](https://seenbanao-foodsphere.pages.dev) | ✅ Live |
| 🐟 **Dine At Blue Website** | [https://dineatblue-foodsphere.pages.dev](https://dineatblue-foodsphere.pages.dev) | ✅ Live |
| 🥪 **Sand Melts Website** | [https://sandmelts-foodsphere.pages.dev](https://sandmelts-foodsphere.pages.dev) | ✅ Live |
| 🍗 **Birdman Foods Website** | [https://birdmanfoodspk-foodsphere.pages.dev](https://birdmanfoodspk-foodsphere.pages.dev) | ✅ Live |
| 📜 **Privacy Policy** | [d:\sitesdata\Resturent App\websites\legal\privacy-policy.html](file:///d:/sitesdata/Resturent%20App/websites/legal/privacy-policy.html) | ✅ Store Ready |
| 📜 **Terms of Service** | [d:\sitesdata\Resturent App\websites\legal\terms-of-service.html](file:///d:/sitesdata/Resturent%20App/websites/legal/terms-of-service.html) | ✅ Store Ready |

---

## 🔑 3. Demo Login Credentials

- **Super-Admin**:
  - **Username**: `admin`
  - **Password**: `admin123`
- **Branch Managers** (Scoped access):
  - Tandoori Stop Johar Town: `manager_tandooristoppk_johar_town` | `managerpassword123`
  - Jush Johar Town: `manager_jushhpk_johar_town` | `managerpassword123`
  - GetAFomo Johar Town: `manager_getafomo_johar_town` | `managerpassword123`

---

## ✅ 4. Milestones Completed (2026-07-26)

1. **PII Security & Guest Token Enforcement**:
   - Secured `GET /api/orders/{id}/` requiring authenticated ownership or UUID `tracking_token` parameter.
   - Removed unauthenticated phone history lookups in `MyOrdersListView`.

2. **Mobile App Rebrand & Store Legal Compliance**:
   - Rebranded app metadata in `app/app.json` to **GetFood** (`com.abdullah958.getfood`).
   - Created hosted store compliance pages `privacy-policy.html` and `terms-of-service.html`.

3. **PlatformSettings & Registration Welcome Bonus**:
   - Built `PlatformSettings` singleton model for dynamic global loyalty management.
   - Generated & applied migration `restaurants.0012_platformsettings`.
   - Enabled automatic 50 pt welcome bonus on user registration.

4. **100% Passing Automated Integration Test Suite**:
   - Ran `test_backend_local.py` across all 11 core subsystems (100% Pass Rate).

5. **JWT Token Rotation & Session Expiry Resolution (2026-08-10)**:
   - Diagnosed and resolved the root cause of orders history disappearing after re-login.
   - Refactored `loadSavedToken` in `userSlice.ts` to validate active access tokens via `GET /users/profile/` instead of proactively executing `/auth/refresh/` on app launch.
   - Fixed token rotation persistence across `userSlice.ts` and `api.js` to save both access and rotated refresh tokens to `AsyncStorage` (`auth_token` and `refresh_token`), preventing token blacklisting loops.

---

## ⏳ 5. Client Pending Action Items (For Production Handoff)

| Item | Description | Action Required From Client |
|---|---|---|
| ☁️ **Heroku Shift** | Migration from Render free tier to Heroku (24/7 Zero-Sleep fast backend) | Client Heroku Account & Billing Card ($5 - $7/month) |
| 🔔 **Firebase Notifications** | Push notifications for order updates & promos | Client Firebase `firebase_credentials.json` private key |
| 🌐 **Custom Domains** | Linking custom domain names (e.g. `foodsphere.pk`, `seenbanao.pk`) | Domain Registrar access (Namecheap/GoDaddy/PKNIC) |
