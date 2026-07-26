# Legal & Hosting Analysis: Privacy Policy & Terms of Service Integration

**Platform:** GetFood (FoodSphere Aggregator Platform)  
**Author:** Explorer 3 (Milestone 1 — R1: Security & Critical Blockers)  
**Working Directory:** `d:/sitesdata/Resturent App/.agents/explorer_m1_3/`  
**Date:** July 26, 2026  

---

## 1. Executive Summary

This report delivers a complete architectural and legal investigation into generating, hosting, and deploying the **Privacy Policy** (`privacy-policy.html`) and **Terms of Service** (`terms-of-service.html`) for the **GetFood (FoodSphere)** platform.

To satisfy Google Play Store, Apple App Store, and Cloudflare Pages compliance, we have engineered standalone, highly professional, responsive HTML5 documents tailored specifically to the operational, technical, and business mechanics of GetFood. 

---

## 2. Repository Layout & Cloudflare Hosting Analysis

### 2.1 Directory Structure & Deployment Target
- **Admin Workspace (`admin/`):** React Vite application deployed on Cloudflare Pages (`https://foodsphere-admin.pages.dev`) and Vercel (`https://foodsphere-admin.vercel.app`).
- **Static Assets Directory (`admin/public/`):** Vite automatically copies all files inside `admin/public/` directly to the root of the build output (`admin/dist/`) without modifying or intercepting them.
- **Cloudflare Pages Routing (`admin/public/_redirects` & `admin/wrangler.jsonc`):**
  - Cloudflare Pages serves physical static files (e.g. `privacy-policy.html`) directly before evaluating SPA fallback rules (`/* /index.html 200`).
  - Therefore, placing `privacy-policy.html` and `terms-of-service.html` in `admin/public/` ensures public accessibility at:
    - `https://foodsphere-admin.pages.dev/privacy-policy.html`
    - `https://foodsphere-admin.pages.dev/terms-of-service.html`
    - `https://foodsphere-admin.vercel.app/privacy-policy.html`
    - `https://foodsphere-admin.vercel.app/terms-of-service.html`

### 2.2 Brand Website Redundancy (`websites/`)
- In addition to centralizing legal documents on the admin HQ web host, copies can also be served across active brand websites (`websites/jushhpk/`, `websites/tandooristoppk/`, `websites/getafomo/`) or linked in brand footers to point back to the central `foodsphere-admin.pages.dev` URLs.

---

## 3. App Store Compliance & Mobile Integration Strategy

### 3.1 Google Play & Apple App Store Requirements
- **Privacy Policy URL Mandate:** Both Google Play Console and Apple App Store Connect mandate a publicly accessible, valid HTTPS Privacy Policy link during app submission.
- **Public Accessibility:** The generated HTML files require no authentication or JavaScript rendering, ensuring automated store reviewers and web crawlers index them seamlessly.

### 3.2 Mobile App Integration (`app/src/screens/ProfileScreen.tsx` & `AuthScreen.tsx`)
We recommend adding explicit legal buttons/links in `ProfileScreen.tsx` and `AuthScreen.tsx`:
```tsx
import { Linking } from 'react-native';

const PRIVACY_POLICY_URL = 'https://foodsphere-admin.pages.dev/privacy-policy.html';
const TERMS_OF_SERVICE_URL = 'https://foodsphere-admin.pages.dev/terms-of-service.html';

<TouchableOpacity onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
  <Text style={styles.legalLink}>Privacy Policy</Text>
</TouchableOpacity>

<TouchableOpacity onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}>
  <Text style={styles.legalLink}>Terms of Service</Text>
</TouchableOpacity>
```

---

## 4. Tailored Legal Content Breakdown

Both documents have been generated in full HTML format and crafted to cover all platform-specific mechanics:

### 4.1 Key Legal Aspects Covered in Privacy Policy (`privacy-policy.html`)
1. **Multi-Tenant Architecture:** Identity of GetFood as a unified aggregator platform operating 7 distinct brands (*Jushh PK, Tandoori Stop, GetAFomo, Seen Banao, Dine At Blue, SandMelts, Birdman Foods*).
2. **Data Collection Scope:** User identity (name, email, phone), delivery addresses, device tokens (Firebase Cloud Messaging), order history, and guest user UUID tracking tokens.
3. **Location Tracking & Geolocation:** Explicit disclosure of GPS/foreground location usage for auto-address detection, Haversine delivery radius calculation (`delivery_radius_km`), and location sharing with assigned delivery riders (`BranchRider`).
4. **Payment Card Security:** Clear guarantee that payment card numbers and CVVs are handled exclusively by PCI-DSS Level 1 payment gateways (Stripe / PayFast) and are **never** stored or processed on GetFood servers.
5. **Loyalty Program Processing:** Point calculations, cancellation reversals, non-transferability, and point restore policy.
6. **User Rights & Account Deletion:** Clear instructions for requesting data export, rectification, and complete account deletion via `privacy@getfood.pk`.

### 4.2 Key Legal Aspects Covered in Terms of Service (`terms-of-service.html`)
1. **Aggregator Model & Brand Scope:** Rights and operational boundaries across all 7 brand websites and the unified mobile app.
2. **Guest User Binding:** Provisions clarifying that guest checkout orders bound to UUID tracking tokens are fully subject to Terms of Service.
3. **Pricing, Availability & Hours:** Dynamic menu pricing server verification, "OUT OF STOCK" display rules, and branch opening hours enforcement.
4. **Delivery & Haversine Limits:** Enforcement of maximum branch delivery radius (`delivery_radius_km`), Haversine validation, and rider handoff protocols.
5. **Cash on Delivery (COD) Obligations:** Legal commitment of user to pay cash upon arrival; anti-fraud consequences for refusing COD orders.
6. **Loyalty Points Terms:** Earning rates, zero cash value outside platform, non-transferability, and automatic reversal upon order cancellation.
7. **Hygiene & Preparation Disclaimer:** Klarification that food hygiene, ingredient freshness, and allergen management are the responsibility of individual restaurant branches.
8. **Intellectual Property & Conduct:** Strict prohibition against automated scraping, payload price tampering, or GPS spoofing.

---

## 5. Artifact Index & Deployment Proposals

| Artifact File | Description | Target Deployment Location |
|---|---|---|
| `.agents/explorer_m1_3/privacy-policy.html` | Complete Privacy Policy document | `admin/public/privacy-policy.html` |
| `.agents/explorer_m1_3/terms-of-service.html` | Complete Terms of Service document | `admin/public/terms-of-service.html` |
| `.agents/explorer_m1_3/analysis.md` | In-depth technical & legal analysis | Explorer 3 agent directory |
| `.agents/explorer_m1_3/handoff.md` | Handoff report following 5-component protocol | Explorer 3 agent directory |

---

## 6. Implementation Steps for Implementer

1. Copy `.agents/explorer_m1_3/privacy-policy.html` to `admin/public/privacy-policy.html`.
2. Copy `.agents/explorer_m1_3/terms-of-service.html` to `admin/public/terms-of-service.html`.
3. Add optional copy or symlink in `websites/jushhpk/`, `websites/tandooristoppk/`, etc.
4. Wire legal links into `app/src/screens/ProfileScreen.tsx` and `app/src/screens/AuthScreen.tsx`.
5. Deploy `admin` to Cloudflare Pages / Vercel. Verify live access at `https://foodsphere-admin.pages.dev/privacy-policy.html` and `https://foodsphere-admin.pages.dev/terms-of-service.html`.
