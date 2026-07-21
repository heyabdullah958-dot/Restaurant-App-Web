# 🍽️ PROJECT.md — FoodSphere Multi-Tenant Platform Overview
> **Project Completion Status**: 98% Complete (Core Code & Features: 100% Finished)  
> **Last Updated**: 2026-07-21

---

## 📌 1. Platform Architecture

- **Project Name**: FoodSphere
- **Architecture**: Scalable Multi-Tenant Restaurant Aggregator (1 Mobile App + 1 Admin HQ + 7 Individual Websites)
- **Frontend Stack**:
  - **Admin Panel HQ**: React 18, Vite, Tailwind CSS v3, Lucide React
  - **Mobile App**: React Native, Expo, Redux Toolkit
  - **7 Brand Websites**: React / HTML5, Tailwind CSS
- **Backend Stack**: Python 3.11, Django 6.0, Django REST Framework, SimpleJWT Auth
- **Database & Storage**: PostgreSQL (Production) / SQLite (Dev), Cloudinary (Media Storage `depa8gfnk`)

---

## 🌐 2. Live Production URLs

| Platform / Website | Live URL | Status |
|---|---|---|
| 👑 **Admin Panel (HQ Dashboard)** | [https://foodsphere-admin.pages.dev](https://foodsphere-admin.pages.dev) | ✅ Live on Cloudflare |
| 🐍 **Backend API** | [https://restaurant-app-web.onrender.com](https://restaurant-app-web.onrender.com) | ✅ Live on Render |
| 🫓 **Tandoori Stop Website** | [https://tandooristoppk-foodsphere.pages.dev](https://tandooristoppk-foodsphere.pages.dev) | ✅ Live (HD Photos & Logo) |
| 🍔 **Jushh Website** | [https://jushhpk-foodsphere.pages.dev](https://jushhpk-foodsphere.pages.dev) | ✅ Live |
| ☕️ **GetAFomo Website** | [https://getafomo-foodsphere.pages.dev](https://getafomo-foodsphere.pages.dev) | ✅ Live (Instagram Feed) |
| 🍢 **SeenBanao Website** | [https://seenbanao-foodsphere.pages.dev](https://seenbanao-foodsphere.pages.dev) | ✅ Live |
| 🐟 **Dine At Blue Website** | [https://dineatblue-foodsphere.pages.dev](https://dineatblue-foodsphere.pages.dev) | ✅ Live |
| 🥪 **Sand Melts Website** | [https://sandmelts-foodsphere.pages.dev](https://sandmelts-foodsphere.pages.dev) | ✅ Live |
| 🍗 **Birdman Foods Website** | [https://birdmanfoodspk-foodsphere.pages.dev](https://birdmanfoodspk-foodsphere.pages.dev) | ✅ Live |

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

## ✅ 4. Milestones Completed Today (2026-07-21)

1. **Tandoori Stop Brand Assets & Cloudinary Upload**:
   - Extracted primary vector logo from `Guideline.pdf` (`tandoori_stop_logo.png`).
   - Uploaded 17 high-res dish photos & logos to Cloudinary (`depa8gfnk`).
   - Linked images to 41 MenuItems and Restaurant models in database.
   - Built `seed_tandoori_images` management command and integrated into `render.yaml`.

2. **Admin Panel Interactive Branch Settings Modal**:
   - Built interactive Branch Settings modal in [`BranchDashboard.tsx`](file:///d:/sitesdata/Resturent%20App/admin/src/views/BranchDashboard.tsx).
   - Allows Branch Managers to edit WhatsApp/phone numbers, location/city, and toggle active/suspended status in real-time.

3. **Mobile App Offline & Server Wake-Up Resilience**:
   - Added graceful guest session fallback in `userSlice.ts`.
   - Quieted network timeout logs in `api.js` to eliminate Expo RedBox error popups.

4. **Automated Testing Suite**:
   - Ran `test_backend_local.py` across all 3 active launch brands (100% Pass Rate).

---

## ⏳ 5. Client Pending Action Items (For Production Handoff)

| Item | Description | Action Required From Client |
|---|---|---|
| ☁️ **Heroku Shift** | Migration from Render free tier to Heroku (24/7 Zero-Sleep fast backend) | Client Heroku Account & Billing Card ($5 - $7/month) |
| 🔔 **Firebase Notifications** | Push notifications for order updates & promos | Client Firebase `firebase_credentials.json` private key |
| 🌐 **Custom Domains** | Linking custom domain names (e.g. `foodsphere.pk`, `seenbanao.pk`) | Domain Registrar access (Namecheap/GoDaddy/PKNIC) |
