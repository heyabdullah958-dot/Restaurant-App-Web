# BUILD.md — FoodSphere Deployment & Build Configurations
## Auto-generated — 2026-07-21
### Detected from codebase scan

- **Render Backend Deployment**: `render.yaml` orchestrates build (`pip install`, `collectstatic`, `migrate`, `seed_restaurants`, `seed_branches`, `create_admin`, `create_restaurant_managers`).
- **Cloudflare Pages Deployment**: Static & Vite production builds for 7 websites and Admin panel.
- **Media Assets**: Cloudinary storage (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`).

---

## Phase 1 — Local Menu Asset Mapping & Multi-Tenant Catalog Sync — 2026-08-02
- **What was done**: Parsed local menu asset directories (`Tandoori stop`, `Jush Menu Pics`), uploaded media to Cloudinary CDN, bound items to DRF Django backend models, and synchronized 160 menu items across 37 categories to `websites/shared_catalog.json` and `live_catalog.js`.
- **Files modified**: `websites/shared_catalog.json`, `websites/live_catalog.js`, `fix_website_product_images.py`, `upload_tandoori_stop_assets.py`, `sync_app_to_web_catalog.py`, `inject_live_catalog.py`, `CHANGELOG.md`, `BUILD.md`.
- **Self-corrections used**: 0/3.
- **Confidence score**: 98%.
