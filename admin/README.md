# 👑 FoodSphere — Admin HQ Web Command Center

The web-based management dashboard for Super Admins and Branch Managers, built with React 18, Vite, TypeScript, and Tailwind CSS.

---

## 🚀 Live Deployments
- **Primary (Vercel)**: [https://foodsphere-admin.vercel.app](https://foodsphere-admin.vercel.app)
- **Backup (Cloudflare Pages)**: [https://foodsphere-admin.pages.dev](https://foodsphere-admin.pages.dev)
- **Backend API**: [https://getfoodpk-fd9b20442fcf.herokuapp.com/api/](https://getfoodpk-fd9b20442fcf.herokuapp.com/api/)

---

## 🛠️ Key Views & Modules
- **SuperDashboard**: Real-time cross-brand revenue, active orders, live tenant metrics, and customer reviews.
- **BranchDashboard**: Branch manager operational command center for tracking live orders, toggling branch online status, and updating branch contact info.
- **OrderManagement**: Live Kanban and table views with multi-stage status progression and rider assignment.
- **MenuManagement**: Restaurant catalog management, item availability toggles, price editing, and Cloudinary image uploads.
- **FlashDealManagement**: 6-step progressive creation modal supporting multi-tier item scoping (`ENTIRE_MENU`, `CATEGORY`, `SPECIFIC_ITEMS`) and recurring midnight specials.
- **PromoManagement**: Promo coupon creation, percentage/fixed discounts, expiration, and minimum spend rules.
- **CustomerManagement**: Customer CRM with lifetime metrics aggregation and manual loyalty point adjustments.
- **NotificationCenter**: Push notification composer with targeted topic dispatch via FCM.

---

## 💻 Local Development & Build
```bash
# Install dependencies
npm install

# Run local development server
npm run dev

# Build for production
npm run build
```

