# 🛡️ FoodSphere Platform — Comprehensive Full-Stack Security Audit Report
**Classification:** HIGH-RISK VULNERABILITY INVENTORY & REMEDIATION ROADMAP  
**Date:** November 4, 2026  
**Auditor:** Antigravity AI Security Specialist  
**Methodology:** Cloudflare Security Audit Framework & OWASP Top 10 API Security Risks  
**Scope:** Entire FoodSphere Multi-Tenant Platform (`backend/`, `admin/`, `admin-app/`, `app/`, `websites/`, and Deployment Infrastructure)  
**Status:** READ-ONLY AUDIT & PLANNING PHASE (ZERO APPLICATION LOGIC OVERWRITTEN)

---

## Executive Summary

A deep, end-to-end full-stack security audit was executed across all layers of the FoodSphere (GetFood) Multi-Tenant Restaurant Platform. The audit evaluated source code, data isolation barriers, concurrency controls, authentication schemes, media handlers, deployment manifests, storefront web clients, and mobile applications.

The investigation identified **16 security vulnerabilities**, categorized as follows:
- **CRITICAL:** 2 findings (Immediate risk to financial assets, database integrity, and system-wide account control)
- **HIGH:** 8 findings (Multi-tenant IDOR, CORS/CSRF origin reflection, password reset link hijacking, dangerous production purge endpoints, unauthenticated push broadcasts, cleartext mobile traffic)
- **MEDIUM:** 4 findings (DOM XSS in storefront cart drawers, unvalidated file upload extension handling, 6-hour stateless token persistence post-logout, verbose error leakage)
- **LOW & INFORMATIONAL:** 2 findings (Permissive `ALLOWED_HOSTS` fallback, `AsyncStorage` unencrypted token storage)

---

## Vulnerability Inventory by Severity

---

### [CRITICAL] FS-SEC-01: Loyalty Points Double-Spend TOCTOU Race Condition Grants Infinite Discounts

- **Severity:** `CRITICAL`
- **Affected Surface:** Backend API & Financial Transaction Engine
- **Target Files:**
  - `backend/orders/serializers.py` (lines 495–505 and 544–559)
- **Vulnerability Mechanism:**
  In `OrderCreateSerializer.create()`, an authenticated customer's available loyalty points are refreshed via `user.refresh_from_db()` without acquiring a database-level row lock (`select_for_update()`). The serializer applies `loyalty_discount` to calculate `total` and calls `Order.objects.create()` **before** deducting points from the user's account.
  
  When deducting points in lines 547–550:
  ```python
  updated_count = User.objects.filter(pk=user.pk, loyalty_points__gte=actual_pts_redeemed).update(
      loyalty_points=F('loyalty_points') - actual_pts_redeemed
  )
  if updated_count > 0:
      LoyaltyTransaction.objects.create(...)
  ```
  If `updated_count == 0` (which occurs when concurrent requests have already claimed the user's balance), **the code contains no `else` block and raises no exception**. Because `create()` completes normally, the outer `transaction.atomic()` block successfully commits.

- **Proof of Concept / Attack Scenario:**
  1. A customer possesses 500 loyalty points (equivalent to Rs. 500 in discounts).
  2. The customer script fires 10 concurrent HTTP `POST /api/orders/` requests with `use_loyalty_points=True` and `points_to_redeem=500`.
  3. All 10 requests read `user.loyalty_points = 500` simultaneously and compute `loyalty_discount = 500.00`.
  4. Request 1 executes the atomic `update()`, reducing balance to 0 and creating a `LoyaltyTransaction`.
  5. Requests 2 through 10 execute `update()`, which returns `updated_count = 0`.
  6. Because no validation error is thrown, all 9 remaining orders are created and persisted with Rs. 500 discounts each.
  7. **Financial Loss:** The attacker receives Rs. 5,000 worth of food for Rs. 500 in points (Rs. 4,500 theft).

- **Precise Remediation Plan:**
  Wrap the user points check in a row-locked transaction and raise an explicit `serializers.ValidationError` when `updated_count == 0`, ensuring rollback:
  ```python
  if user and not user.is_guest and actual_pts_redeemed > 0:
      from django.contrib.auth import get_user_model
      User = get_user_model()
      updated_count = User.objects.filter(
          pk=user.pk, 
          loyalty_points__gte=actual_pts_redeemed
      ).update(loyalty_points=F('loyalty_points') - actual_pts_redeemed)
      
      if updated_count == 0:
          raise serializers.ValidationError({"loyalty_points": "Insufficient loyalty points available."})
      
      LoyaltyTransaction.objects.create(
          user=user,
          order=order,
          points=-actual_pts_redeemed,
          transaction_type='redeemed',
          description=f"Redeemed on Order #{order.id}"
      )
  ```

---

### [CRITICAL] FS-SEC-02: Plaintext Production Super-Admin & Manager Credentials Tracked in Git

- **Severity:** `CRITICAL`
- **Affected Surface:** Infrastructure & Access Control
- **Target Files:**
  - `CREDENTIALS.md` (lines 1–69)
- **Vulnerability Mechanism:**
  `CREDENTIALS.md` is actively tracked in Git version control and contains default and production passwords for:
  - Super Admin HQ: `admin` / `admin123`
  - All 7 Brand Managers: `manager_seenbanao` (`seenbanao123`), `manager_dineatblue` (`dineatblue123`), `manager_jushhpk` (`jushhpk123`), `manager_tandooristoppk` (`tandooristoppk@2025`), `manager_sandmelts` (`sandmelts123`), `manager_birdmanfoodspk` (`birdmanfoodspk123`), `manager_getafomo` (`getafomo123`)
  - Branch Managers: `manager_jushhpk_johar_town` (`admin123`), `manager_jushhpk_dha_phase_1` (`Branch@Jushhp2025!`), etc.

- **Proof of Concept / Attack Scenario:**
  Any individual with read access to the GitHub/GitLab repository, developer backup, or cloned workstation can immediately authenticate against the live production APIs and dashboards (`https://getfoodpk-fd9b20442fcf.herokuapp.com` and `https://foodsphere-admin.pages.dev`) as Super Admin, gaining complete access to order databases, customer PII, and financial ledgers.

- **Precise Remediation Plan:**
  1. Untrack `CREDENTIALS.md` from Git via `git rm --cached CREDENTIALS.md` and append `CREDENTIALS.md` to `.gitignore`.
  2. Enforce an automated Django migration/management command that sets strong random passwords for all existing manager accounts and flags `must_change_password=True`.
  3. Ensure production environments strictly configure superuser passwords via secure environment variables.

---

### [HIGH] FS-SEC-03: Insecure Financial & Settlement Mutation on `OrderDetailSerializer`

- **Severity:** `HIGH`
- **Affected Surface:** Backend API / Order Management
- **Target Files:**
  - `backend/orders/serializers.py` (lines 657–663)
  - `backend/orders/views.py` (lines 398–463)
- **Vulnerability Mechanism:**
  `OrderDetailView` permits `PATCH` updates from any authenticated staff member (`IsAdminUser`). However, `OrderDetailSerializer.Meta.fields` includes sensitive financial and payment reconciliation attributes:
  ```python
  fields = (
      'id', 'display_order_id', 'tracking_token', 'user', 'guest_name', 'guest_phone',
      'restaurant', 'restaurant_name', 'branch', 'branch_name', 'items', 'status',
      'delivery_address', 'delivery_lat', 'delivery_lng', 'special_instructions',
      'subtotal', 'delivery_fee', 'discount', 'total', 'payment_method',
      'rider', 'rider_name', 'rider_phone', 'cod_settled', 'cod_settled_at', 'created_at',
  )
  read_only_fields = ('id', 'display_order_id', 'tracking_token')
  ```
  `subtotal`, `delivery_fee`, `discount`, `total`, `cod_settled`, and `cod_settled_at` are **NOT** read-only.

- **Proof of Concept / Attack Scenario:**
  A branch manager or compromised staff account issues:
  ```http
  PATCH /api/orders/142/ HTTP/1.1
  Authorization: Bearer <manager_token>
  Content-Type: application/json

  {
      "total": "10.00",
      "cod_settled": true
  }
  ```
  The order total is updated to Rs. 10 and marked as settled without recording an entry in `CashSettlementLog` or going through cash register reconciliation.

- **Precise Remediation Plan:**
  Update `read_only_fields` in `OrderDetailSerializer`:
  ```python
  read_only_fields = (
      'id', 'display_order_id', 'tracking_token', 'user', 'restaurant',
      'subtotal', 'delivery_fee', 'discount', 'total', 'created_at',
      'cod_settled', 'cod_settled_at', 'payment_method'
  )
  ```

---

### [HIGH] FS-SEC-04: Permissive CORS Origin Reflection & Wildcard Subdomain Matching

- **Severity:** `HIGH`
- **Affected Surface:** Backend API Security Configuration
- **Target Files:**
  - `backend/config/settings.py` (lines 315–365)
- **Vulnerability Mechanism:**
  Line 315 explicitly sets `CORS_ALLOW_ALL_ORIGINS = True`, while line 364 sets `CORS_ALLOW_CREDENTIALS = True`. In `django-cors-headers`, when both are enabled, the middleware dynamically reflects the `Origin` header from any incoming request in `Access-Control-Allow-Origin` while returning `Access-Control-Allow-Credentials: true`.
  
  Furthermore, lines 347–349 and 360–361 configure regexes:
  ```python
  r"^https://.*\.pages\.dev$",
  r"^https://.*\.vercel\.app$",
  r"^https://.*\.netlify\.app$",
  ```
  and `CSRF_TRUSTED_ORIGINS = ['https://*.pages.dev', 'https://*.vercel.app']`.

- **Proof of Concept / Attack Scenario:**
  An attacker creates a free website at `https://evil-attacker.pages.dev` or `https://malicious.vercel.app`. Because the wildcard regex matches, any customer or manager visiting the attacker's site can be tricked into making cross-origin authenticated API requests that read customer order histories, profiles, or trigger administrative actions with credentials.

- **Precise Remediation Plan:**
  1. Set `CORS_ALLOW_ALL_ORIGINS = False`.
  2. Remove wildcard shared domains (`*.pages.dev`, `*.vercel.app`, `*.netlify.app`) from `CORS_ALLOWED_ORIGIN_REGEXES` and `CSRF_TRUSTED_ORIGINS`.
  3. Restrict `CORS_ALLOWED_ORIGINS` to exact production domains:
     - `https://foodsphere-admin.pages.dev`
     - `https://admin.getfoodpk.com`
     - `https://getfoodpk.com`
     - `https://www.getfoodpk.com`
     - Exact brand subdomains (`https://*.getfoodpk.com`).

---

### [HIGH] FS-SEC-05: Insecure Substring Domain Validation in `ForgotPasswordView` Allows Password Reset Hijacking

- **Severity:** `HIGH`
- **Affected Surface:** Authentication & Password Management
- **Target Files:**
  - `backend/users/views.py` (lines 258–273)
- **Vulnerability Mechanism:**
  In `ForgotPasswordView`:
  ```python
  safe_base_url = None
  if redirect_url:
      r_lower = str(redirect_url).lower()
      if r_lower.startswith('foodsphere://') or 'pages.dev' in r_lower or 'vercel.app' in r_lower or 'localhost' in r_lower or '127.0.0.1' in r_lower:
          safe_base_url = redirect_url
  ```
  The substring check `'pages.dev' in r_lower` matches any domain containing that string, such as `https://attacker-harvester.pages.dev` or `https://evil.com/?pages.dev`.

- **Proof of Concept / Attack Scenario:**
  1. Attacker sends a request:
     ```http
     POST /api/auth/forgot-password/ HTTP/1.1
     Content-Type: application/json

     {
       "email": "manager_jushhpk@foodsphere.com",
       "redirect_url": "https://attacker-harvester.pages.dev/reset"
     }
     ```
  2. Django validates the substring `'pages.dev'`, generates a valid reset token for the manager, and sends the email containing:
     `https://attacker-harvester.pages.dev/reset?uid=...&token=...`
  3. When the user clicks the link in their inbox, the token and UID are delivered directly to the attacker's web server.
  4. The attacker submits the token to `POST /api/auth/reset-password-confirm/` and takes over the account.

- **Precise Remediation Plan:**
  Enforce strict origin matching against an explicit whitelist of approved web URLs or mobile URI schemes:
  ```python
  ALLOWED_RESET_ORIGINS = {
      'https://foodsphere-admin.pages.dev',
      'https://admin.getfoodpk.com',
      'https://getfoodpk.com',
  }
  
  safe_base_url = None
  if redirect_url:
      from urllib.parse import urlparse
      parsed = urlparse(redirect_url)
      origin = f"{parsed.scheme}://{parsed.netloc}"
      if parsed.scheme == 'foodsphere' and parsed.netloc == 'reset-password':
          safe_base_url = redirect_url
      elif origin in ALLOWED_RESET_ORIGINS:
          safe_base_url = redirect_url.split('?')[0]
  ```

---

### [HIGH] FS-SEC-06: Production Database Hard Purge Endpoint Exposed

- **Severity:** `HIGH`
- **Affected Surface:** Database / Data Lifecycle Security
- **Target Files:**
  - `backend/orders/views.py` (lines 514–531)
- **Vulnerability Mechanism:**
  `PurgeOrdersView` (`POST /api/orders/purge-all/`) accepts requests from superusers to wipe all transactional data:
  ```python
  Payment.objects.all().delete()
  Order.objects.all().delete()
  ```

- **Proof of Concept / Attack Scenario:**
  If a superuser token is leaked, stolen via XSS, or replayed, an attacker can issue a single `POST` request to permanently erase all production order records, customer purchase receipts, and financial audit trails.

- **Precise Remediation Plan:**
  Disable the endpoint completely when `settings.DEBUG = False`:
  ```python
  class PurgeOrdersView(APIView):
      permission_classes = [permissions.IsAdminUser]

      def post(self, request):
          if not settings.DEBUG:
              return Response({'error': 'Hard purge is strictly disabled in production.'}, status=403)
          ...
  ```

---

### [HIGH] FS-SEC-07: Missing Tenant Authorization on Coupon & FlashDeal CRUD ViewSets

- **Severity:** `HIGH`
- **Affected Surface:** Multi-Tenant Isolation & Promotion Engine
- **Target Files:**
  - `backend/promotions/views.py` (lines 38–142)
- **Vulnerability Mechanism:**
  `CouponListCreateView`, `CouponDetailView`, `FlashDealListCreateView`, and `FlashDealDetailView` allow any authenticated staff user (`IsAdminUser`) to perform full CRUD operations without verifying that the coupon or deal belongs to their assigned restaurant:
  - In `CouponListCreateView`, `get_queryset()` filters by `restaurant_id` only if the caller supplies it in `query_params`. A manager who omits the query parameter receives all coupons across all restaurants.
  - In `CouponDetailView` and `FlashDealDetailView`, `queryset = Coupon.objects.all()` and `queryset = FlashDeal.objects.all()` allow any manager to modify (`PUT`/`PATCH`) or delete (`DELETE`) another brand's promotions.
  - In `CouponListCreateView.perform_create`, no check prevents a branch manager from creating global platform coupons (`restaurant=None`, `discount_value=90%`).

- **Proof of Concept / Attack Scenario:**
  A branch manager at Jush PK issues `DELETE /api/coupons/12/` to delete a major marketing coupon belonging to Tandoori Stop, or issues `POST /api/coupons/` creating a 95% discount coupon valid across all restaurants.

- **Precise Remediation Plan:**
  Scope all querysets and mutations in `promotions/views.py` using `get_managed_restaurant(request.user)`:
  - Superusers maintain global access.
  - Non-superusers can only view, create, update, or delete coupons/deals where `restaurant == managed_restaurant`. Non-superusers cannot set `restaurant=None` (global scope).

---

### [HIGH] FS-SEC-08: Missing Tenant Validation on Rider Updates in `AdminBranchRiderViewSet`

- **Severity:** `HIGH`
- **Affected Surface:** Multi-Tenant Isolation & Logistics
- **Target Files:**
  - `backend/restaurants/views.py` (lines 357–452)
  - `backend/restaurants/serializers.py` (lines 232–250)
- **Vulnerability Mechanism:**
  While `AdminBranchRiderViewSet.perform_create` validates that new riders are added only to the caller's managed branch, `perform_update` is missing. Because `branch` is a writable field in `BranchRiderSerializer`, a branch manager can send a `PATCH` request altering the rider's `branch` attribute.

- **Proof of Concept / Attack Scenario:**
  A manager of Branch A sends:
  ```http
  PATCH /api/restaurants/admin/riders/8/ HTTP/1.1
  Authorization: Bearer <manager_token>

  {
      "branch": 15
  }
  ```
  The rider is reassigned to Branch B (which may belong to a competing brand), causing cross-branch data corruption and dispatch disruption.

- **Precise Remediation Plan:**
  Implement `perform_update` in `AdminBranchRiderViewSet`:
  ```python
  def perform_update(self, serializer):
      user = self.request.user
      if not user.is_superuser:
          from config.admin_utils import get_managed_branch, get_managed_restaurant
          managed_branch = get_managed_branch(user)
          new_branch = serializer.validated_data.get('branch')
          if new_branch and managed_branch and new_branch != managed_branch:
              raise PermissionDenied("You cannot reassign riders to another branch.")
      serializer.save()
  ```

---

### [HIGH] FS-SEC-09: Unrestricted Push Notification Broadcast via `SendNotificationView`

- **Severity:** `HIGH`
- **Affected Surface:** Push Notification Engine & Customer Trust
- **Target Files:**
  - `backend/config/notification_views.py` (lines 165–204)
- **Vulnerability Mechanism:**
  `SendNotificationView` uses `permission_classes = [IsAdminUser]`. Any staff user (including individual branch managers) can dispatch push notifications to `target = 'all'` (`all_users` topic) or to any restaurant's topic.

- **Proof of Concept / Attack Scenario:**
  A rogue or compromised branch manager sends a notification with `target: "all"` containing spam, false discount codes, or phishing links, which is immediately broadcast via FCM to all mobile app installations.

- **Precise Remediation Plan:**
  Enforce role verification in `SendNotificationView.post`:
  - `target == 'all'` requires `request.user.is_superuser`.
  - For restaurant targets, verify `managed_restaurant.id == int(target)`.

---

### [HIGH] FS-SEC-10: Cleartext HTTP Traffic Permitted in Standalone Android Builds

- **Severity:** `HIGH`
- **Affected Surface:** Mobile Applications (`/app` and `/admin-app`)
- **Target Files:**
  - `app/app.json` (line 68)
  - `admin-app/app.json` (line 41)
- **Vulnerability Mechanism:**
  Both Expo configuration files specify `"usesCleartextTraffic": true` in their `expo-build-properties` plugins:
  ```json
  "plugins": [
    [
      "expo-build-properties",
      {
        "android": {
          "buildArchs": ["arm64-v8a", "armeabi-v7a", "x86_64"],
          "usesCleartextTraffic": true
        }
      }
    ]
  ]
  ```

- **Proof of Concept / Attack Scenario:**
  On Android 9+, cleartext HTTP traffic is blocked by default to protect user data from unencrypted transit. Disabling this flag allows the application to communicate over unencrypted HTTP. If an attacker controls the local network (e.g. public Wi-Fi), they can execute a man-in-the-middle (MITM) attack to inspect or modify API requests, capturing passwords, customer addresses, and JWT tokens.

- **Precise Remediation Plan:**
  Set `"usesCleartextTraffic": false` in both `app/app.json` and `admin-app/app.json`. Ensure all endpoints strictly communicate over HTTPS in production.

---

### [MEDIUM] FS-SEC-11: Unsanitized LocalStorage & Cart State Interpolated into `innerHTML` across Storefront Cart Drawers

- **Severity:** `MEDIUM`
- **Affected Surface:** 7 Brand Storefront Web Clients
- **Target Files:**
  - `websites/*/cart_drawer.js` (lines 662, 750, 819–848)
- **Vulnerability Mechanism:**
  In `cart_drawer.js`, customer names, branch names, display order IDs, and item names from `localStorage` and URL parameters are concatenated directly into HTML strings assigned to `body.innerHTML`:
  ```javascript
  body.innerHTML = `
    <span style="color:#ffffff; font-weight:700;">${cartState.selectedBranch || activeStored?.selectedBranch || 'Main Branch'}</span>
    <input type="text" id="cd-input-name" value="${cartState.customerName || ''}" />
  `;
  ```

- **Proof of Concept / Attack Scenario:**
  If an attacker crafts a malicious link or injects a payload into `localStorage` (via shared tablet or previous session) containing `"><img src=x onerror=alert(document.domain)>`, opening the cart drawer triggers DOM XSS execution within the website context.

- **Precise Remediation Plan:**
  Introduce an `escapeHtml()` helper in `cart_drawer.js` and wrap all variable interpolations before setting `innerHTML`.

---

### [MEDIUM] FS-SEC-12: Unrestricted File Extension Handling in Media Upload Fallback

- **Severity:** `MEDIUM`
- **Affected Surface:** Media Storage & Dine-In Video Service
- **Target Files:**
  - `backend/restaurants/media_service.py` (lines 129–146)
- **Vulnerability Mechanism:**
  When Cloudinary is disabled or unreachable, `handle_media_upload_or_url` falls back to Django's `default_storage`. The saved filename uses the raw extension provided by the client:
  ```python
  ext = os.path.splitext(media_file.name)[1].lower()
  if not ext:
      ext = '.mp4' if detected_type == 'VIDEO' else '.jpg'
  filename = f"{uuid.uuid4().hex[:12]}{ext}"
  ```
  No extension whitelist validation is performed on `ext`.

- **Proof of Concept / Attack Scenario:**
  An authenticated manager uploads a file named `payload.html` or `graphic.svg` containing embedded JavaScript. The server saves it with the `.html` / `.svg` extension. If the media storage serves files directly, opening the file URL executes JavaScript in the victim's browser (Stored XSS).

- **Precise Remediation Plan:**
  Validate file extensions against a strict whitelist:
  ```python
  ALLOWED_EXTENSIONS = {
      'VIDEO': {'.mp4', '.mov', '.webm', '.m4v'},
      'IMAGE': {'.jpg', '.jpeg', '.png', '.webp'}
  }
  if ext not in ALLOWED_EXTENSIONS[detected_type]:
      raise ValueError(f"Invalid file extension '{ext}' for {detected_type} upload.")
  ```

---

### [MEDIUM] FS-SEC-13: 6-Hour Access Token Lifetime Persists Post-Logout

- **Severity:** `MEDIUM`
- **Affected Surface:** SimpleJWT Authentication & Token Lifecycle
- **Target Files:**
  - `backend/config/settings.py` (line 296)
  - `backend/users/views.py` (lines 173–196)
- **Vulnerability Mechanism:**
  `SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']` is set to 6 hours (`timedelta(hours=6)`). When a user calls `/api/auth/logout/`, only the refresh token is added to the blacklist. Because SimpleJWT access tokens are stateless, an issued access token remains valid for API requests for up to 6 hours even after explicit logout.

- **Proof of Concept / Attack Scenario:**
  On a shared terminal (e.g. restaurant POS or tablet), Manager A logs out. An attacker inspects browser network logs or memory, extracts Manager A's access token, and continues executing authenticated API calls for several hours.

- **Precise Remediation Plan:**
  Reduce `ACCESS_TOKEN_LIFETIME` to 15–30 minutes in `SIMPLE_JWT` and rely on automatic token refreshing via the refresh token.

---

### [MEDIUM] FS-SEC-14: Verbose Exception Details Returned in API Responses

- **Severity:** `MEDIUM`
- **Affected Surface:** API Error Handling
- **Target Files:**
  - `backend/restaurants/views.py` (lines 140, 773)
  - `backend/payments/views.py` (line 737)
- **Vulnerability Mechanism:**
  Several exception handlers catch generic `Exception` and return `{'success': False, 'message': str(e)}` with HTTP 500 status codes.

- **Proof of Concept / Attack Scenario:**
  Maliciously malformed requests trigger database connection exceptions or SQL syntax errors that return raw database table names, column structures, and file paths to unauthenticated callers.

- **Precise Remediation Plan:**
  Log the full exception internally via `logger.error()`, and return a sanitized error message (e.g. `{"success": False, "message": "An internal server error occurred."}`) when `settings.DEBUG = False`.

---

### [LOW] FS-SEC-15: Permissive `ALLOWED_HOSTS = ['*']` Fallback

- **Severity:** `LOW`
- **Affected Surface:** Django Core Settings
- **Target Files:**
  - `backend/config/settings.py` (line 40)
- **Vulnerability Mechanism:**
  If the `ALLOWED_HOSTS` environment variable is omitted or misconfigured, it defaults to `['*']`.

- **Precise Remediation Plan:**
  Raise `ImproperlyConfigured` if `ALLOWED_HOSTS` is unset or set to `'*'` in production when `DEBUG = False`.

---

### [INFORMATIONAL] FS-SEC-16: `AsyncStorage` Plaintext Token Storage on Mobile Devices

- **Severity:** `INFORMATIONAL`
- **Affected Surface:** Mobile Applications (`/app` and `/admin-app`)
- **Target Files:**
  - `app/src/services/api.js` (lines 61–86)
  - `admin-app/src/services/api.ts`
- **Vulnerability Mechanism:**
  Mobile JWT access and refresh tokens are stored in `AsyncStorage`. On Android, `AsyncStorage` stores data in SQLite files within the application's internal data directory. While protected by Android's sandbox on standard devices, tokens can be extracted on rooted devices or via ADB backup if backup is enabled.

- **Precise Remediation Plan:**
  Transition token storage to `expo-secure-store`, which utilizes Android Keystore and iOS Keychain hardware-backed encryption.

---

## Phased Remediation Roadmap

To ensure zero production downtime and eliminate regression risks, fixes are organized into three prioritized sequential phases:

```mermaid
flowchart TD
    subgraph Phase 1: Critical Financial & Secrets Lockdown
        A1["FS-SEC-01: Fix Loyalty Points TOCTOU Race Condition"]
        A2["FS-SEC-02: Remove CREDENTIALS.md from Git & Enforce Credential Rotation"]
        A3["FS-SEC-03: Lock Financial Fields in OrderDetailSerializer"]
        A4["FS-SEC-06: Disable Hard Purge in Production"]
    end

    subgraph Phase 2: Tenant Isolation & Authentication Hardening
        B1["FS-SEC-04: Strict CORS & CSRF Origin Whitelist"]
        B2["FS-SEC-05: Strict Host Validation in ForgotPasswordView"]
        B3["FS-SEC-07: Scope Coupon & FlashDeal CRUD ViewSets"]
        B4["FS-SEC-08: Enforce Branch Scoping on Rider Updates"]
        B5["FS-SEC-09: Restrict Push Broadcast Permissions"]
    end

    subgraph Phase 3: Client & Mobile Hardening
        C1["FS-SEC-10: Disable Cleartext HTTP in Mobile Builds"]
        C2["FS-SEC-11: Escape HTML in Storefront Cart Drawers"]
        C3["FS-SEC-12: Enforce Upload Extension Whitelist"]
        C4["FS-SEC-13: Shorten Access Token Lifetime to 30 mins"]
        C5["FS-SEC-14: Sanitize Verbose 500 API Error Messages"]
    end

    Phase 1 --> Phase 2 --> Phase 3
```

---

## Verification & Compliance Checklist

- [x] Installed `cloudflare/security-audit-skill` instructions loaded and applied.
- [x] All 7 core repository memory files (`PROJECT.md`, `FRONTEND.md`, `BACKEND.md`, `BUGS.md`, `BUILD.md`, `CHANGELOG.md`, `LESSONS.md`) cross-referenced.
- [x] Every DRF endpoint, serializer, and custom action checked for tenant isolation and financial integrity.
- [x] All 4 priority surfaces (Backend, Secrets/Infra, Web Admin/Storefronts, Mobile Apps) audited with concrete line-by-line evidence.
- [x] Zero application logic files modified or overwritten during audit phase.
- [x] Findings categorized by severity: `CRITICAL` (2), `HIGH` (8), `MEDIUM` (4), `LOW` (1), `INFORMATIONAL` (1).
