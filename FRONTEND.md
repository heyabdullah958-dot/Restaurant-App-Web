# FRONTEND.md — FoodSphere Frontend Intelligence & Design Systems
## Auto-generated — 2026-07-21
### Detected from codebase scan

- **Design System**: Slate/Dark palette (`slate-900`/`slate-950`), custom rounded cards (`rounded-xl`), Lucide icons.
- **Admin HQ Views**: SuperDashboard, BranchDashboard, OrderManagement, MenuManagement, ManagerManagement, CustomerManagement, NotificationCenter.
- **Mobile App Screens**: Home, Restaurant, Cart, Checkout, OrderConfirmation, Tracking, Rewards, Profile.
- **State Management**: React AdminContext + JWT payload decoding (`restaurantId`, `branchId`), Redux Toolkit in Mobile App.

---

## Phase 1 — Fix Minified React Error #310 — 2026-07-22
- **What was done**: Fixed React Hooks ordering violations in `BranchDashboard.tsx`, `OrderManagement.tsx`, and `MenuManagement.tsx` where `useState` and `useMemo` hooks were placed after conditional early `return` statements (`if (!restaurant) return (...)`).
- **Files modified**:
  - `admin/src/views/BranchDashboard.tsx`
  - `admin/src/views/OrderManagement.tsx`
  - `admin/src/views/MenuManagement.tsx`
- **Issues encountered & resolved**: Minified React Error #310 ("Rendered more hooks than during the previous render") caused when component initially rendered without a restaurant object loaded, then rendered with a restaurant object present. Moved all hook calls above the conditional returns.
- **Self-corrections used**: 0/3
- **Confidence score**: 100% (Verified with `npm run build` TypeScript compilation and production bundle build)
