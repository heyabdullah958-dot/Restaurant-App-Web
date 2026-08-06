# BUILD.md — FoodSphere Deployment & Build Configurations
## Auto-generated — 2026-07-21
### Detected from codebase scan

- **Render Backend Deployment**: `render.yaml` orchestrates build (`pip install`, `collectstatic`, `migrate`, `seed_restaurants`, `seed_branches`, `create_admin`, `create_restaurant_managers`).
- **Cloudflare Pages Deployment**: Static & Vite production builds for 7 websites and Admin panel.
  - **Admin HQ (`foodsphere-admin`)**: Automatic Git deploy on `git push origin main`.
  - **7 Brand Websites Direct Upload**: Deployed via Wrangler CLI (`npx wrangler pages deploy`):
    ```bash
    npx wrangler pages deploy websites/tandooristoppk --project-name=tandooristoppk-foodsphere
    npx wrangler pages deploy websites/jushhpk --project-name=jushhpk-foodsphere
    npx wrangler pages deploy websites/getafomo --project-name=getafomo-foodsphere
    npx wrangler pages deploy websites/seenbanao --project-name=seenbanao-foodsphere
    npx wrangler pages deploy websites/dineatblue --project-name=dineatblue-foodsphere
    npx wrangler pages deploy websites/sandmelts --project-name=sandmelts-foodsphere
    npx wrangler pages deploy websites/birdmanfoodspk --project-name=birdmanfoodspk-foodsphere
    ```
- **Media Assets**: Cloudinary storage (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).

---

## Phase 1 — Local Menu Asset Mapping & Multi-Tenant Catalog Sync — 2026-08-02
- **What was done**: Parsed local menu asset directories (`Tandoori stop`, `Jush Menu Pics`), uploaded media to Cloudinary CDN, bound items to DRF Django backend models, and synchronized 160 menu items across 37 categories to `websites/shared_catalog.json` and `live_catalog.js`.
- **Files modified**: `websites/shared_catalog.json`, `websites/live_catalog.js`, `fix_website_product_images.py`, `upload_tandoori_stop_assets.py`, `sync_app_to_web_catalog.py`, `inject_live_catalog.py`, `CHANGELOG.md`, `BUILD.md`.
- **Self-corrections used**: 0/3.
- **Confidence score**: 98%.

---

## Phase 2 — Local Development Server Launch & Shutdown — 2026-08-06
- **What was done**: Launched full local development environment (Django REST API on 8000, Vite Admin HQ on 5173, Web App on 3000, Expo Metro on 8081). Upon request, cleanly terminated all active background localhost server processes.
- **Files modified**: None (Runtime server management).
- **Self-corrections used**: 0/3.
- **Confidence score**: 100%.

---

## Phase 3 — Auth Session Loss & Order History Hydration Fix — 2026-08-06
- **What was done**: Fixed persistent auth session loss, guest fallback loops during bottom tab navigation, and un-hydrated order history for logged-in users across all accounts.
- **Files modified**: `app/src/store/userSlice.ts`, `app/src/screens/AuthScreen.tsx`, `app/src/screens/OrdersScreen.tsx`, `app/src/services/api.js`, `CHANGELOG.md`, `BUILD.md`.
- **Self-corrections used**: 1/3 (Resolved TS2304 variable scoping error in `userSlice.ts`).
- **Confidence score**: 100%.

---

## Phase 4 — Expo Go Local Development Server Launch — 2026-08-06
- **What was done**: Launched the Expo Go local development server (`npx expo start --go`) listening on `http://localhost:8081`.
- **Files modified**: None (Runtime process launch).
- **Self-corrections used**: 0/3.
- **Confidence score**: 100%.
