# Jushh PK Full Dubai Shawaya Promotional Vertical Reel (9:16) Design Spec

**Date:** 2026-11-05  
**Topic:** Promotional Vertical Reel for Jushh PK Hero Item via HyperFrames  
**Target Format:** 9:16 Vertical Video (1080×1920 @ 30 FPS, 14.0 Seconds)  
**Brand:** Jushh PK (`jushhpk`)  
**Hero Item:** Full Dubai Shawaya with Fragrant Mandi Rice  

---

## 1. Executive Summary & Objective
Generate a high-energy, appetizing 9:16 vertical video reel for Jushh PK's flagship menu item: **Full Dubai Shawaya with Fragrant Mandi Rice**. 
The reel is authored as a modular HyperFrames project (`reels/jushh_shawaya_promo/`), adhering to HyperFrames rendering contracts, action/title-safe zones for vertical social apps (TikTok, Instagram Reels, and FoodSphere's in-app "Crave & Watch" feed), and beat-synced GSAP animation.

---

## 2. Brand & Asset Identity
- **Brand Name:** Jushh PK
- **Cuisine:** Authentic Turkish Shawarma, Doner & Gulf Rotisserie Shawaya
- **Color Palette:**
  - Flame Red / Orange: `#E94124` (FoodSphere primary)
  - Deep Crimson / Maroon: `#881337` (Jushh brand identity)
  - Amber / Saffron Gold: `#F59E0B` (Mandi rice & discount accents)
  - Dark Charcoal / Smoke: `#121214` (Background canvas)
  - Crisp Cream / White: `#FFFFFF` / `#FAF8F5`
- **Key Media Assets (Cloudinary `qodsfm34` CDN):**
  - Hero Shawaya Photo: `https://res.cloudinary.com/qodsfm34/image/upload/menu_items/full_dubai_shawaya.jpg`
  - Jushh Brand Logo: `https://res.cloudinary.com/qodsfm34/image/upload/f_auto,q_auto,w_800/foodsphere/jushhpk/logo.jpg`
  - Jushh Feast Collage: `https://res.cloudinary.com/qodsfm34/image/upload/menu_items/jushh_banner_collage.jpg`
  - Mandi Rice / Shawaya Closeup: `https://res.cloudinary.com/qodsfm34/image/upload/menu_items/addon_rice.jpg`

---

## 3. Safe Zones & Dimensions (9:16 Standard)
- **Canvas Resolution:** 1080 × 1920 pixels
- **Frame Rate:** 30 fps
- **Total Duration:** 14.0 seconds (420 frames)
- **Vertical Safe Margins:**
  - **Top 168 px:** Clear zone (status bar / app title safe)
  - **Main Visual & Content Band:** 168 px to 1330 px (all text, food photography, price cards, and promo badges live inside this band)
  - **Bottom 590 px (1330 px to 1920 px):** Reserved for in-app UI overlay (Crave & Watch bottom drawer, 1-tap cart button, caption)

---

## 4. Multi-Scene Narrative & Pacing (14.0 Seconds)

### Scene 1: The Hook (0.0s – 3.0s | 90 frames)
- **Visual:** Fast zoom into charcoal textured backdrop with ambient warm saffron glow. Jushh PK circular badge punches into view.
- **Copy:** 
  - Subhead: *"LAHORE'S MOST CRAVED"*
  - Main Title: *"AUTHENTIC DUBAI SHAWAYA"*
  - Badge: *"🔥 Sizzling Hot"*
- **Motion:** GSAP punch-in with elastic ease, subtle steam float particles.

### Scene 2: Sizzle Showcase (3.0s – 7.5s | 135 frames)
- **Visual:** High-resolution hero showcase of the golden rotisserie whole chicken over steaming spiced Mandi rice with garlic toum and grilled peppers.
- **Callouts (Animated Pills):**
  - Pill 1: *"🍗 Slow Rotisserie Roast"* (Slides from left @ 3.5s)
  - Pill 2: *"🍚 Fragrant Spiced Mandi Rice"* (Slides from right @ 4.8s)
  - Pill 3: *"🧄 Signature Garlic Toum Spread"* (Punches in @ 6.0s)
- **Motion:** Subtle slow cinematic scale-up (Ken Burns effect) + staggered pill reveals.

### Scene 3: The Crave Deal (7.5s – 11.0s | 105 frames)
- **Visual:** High-contrast crimson & amber offer container.
- **Copy:**
  - Badge: *"⚡ EXCLUSIVE FLASH DEAL"*
  - Main Discount: *"FLAT 25% OFF"*
  - Code: *"USE CODE: JUSHH25"*
  - Pricing: *"Rs. 1,999"* (struck through) -> *"Rs. 1,499"* in bold neon gold.
- **Motion:** Dynamic price slash animation with pulsing discount badge.

### Scene 4: Call to Action & Fulfillment (11.0s – 14.0s | 90 frames)
- **Visual:** Jushh PK branding + FoodSphere 1-tap order button.
- **Copy:**
  - Action Button: *"ORDER NOW · 1-TAP IN APP"*
  - Fulfillment: *"🛵 30 MIN DELIVERY · DINE-IN · PICKUP"*
  - Lahore Outlets: *"DHA Phase 1 · Johar Town · Lake City"*
- **Motion:** Button pulse + celebratory particle flash, settling on last frame for smooth replay loop.

---

## 5. HyperFrames Project Architecture
```
reels/jushh_shawaya_promo/
├── index.html                   # Root HyperFrames composition (1080x1920, 14s)
├── assets/
│   ├── images/
│   │   ├── hero_shawaya.jpg     # High-res Cloudinary source
│   │   ├── jushh_logo.jpg       # Brand logo
│   │   └── mandi_rice.jpg       # Rice detail
│   └── audio/
│       └── upbeat_food_beat.mp3 # Energetic 120bpm royalty-free track
├── compositions/
│   ├── scene_hook.html          # Sub-composition 1
│   ├── scene_sizzle.html        # Sub-composition 2
│   ├── scene_deal.html          # Sub-composition 3
│   └── scene_cta.html           # Sub-composition 4
└── package.json                 # Optional runner script definitions
```

---

## 6. Verification & Quality Gates
1. **HyperFrames Linter:** `npx hyperframes check --json` passes with zero errors and zero critical layout violations.
2. **Snapshot Verification:** `npx hyperframes snapshot` captures verification frames at 1.5s (Hook), 5.5s (Sizzle), 9.0s (Deal), and 12.5s (CTA).
3. **App Integration:** Link resulting reel composition into `DineInVideoFeed.tsx` and `backend/restaurants/seed_media_posts.py` under Jushh PK.
