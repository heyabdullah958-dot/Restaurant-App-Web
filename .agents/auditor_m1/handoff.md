# Forensic Audit Report — Milestone 1 (R1: Security & Critical Blockers)

**Work Product**: Milestone 1 Deliverables (`backend/orders/views.py`, `serializers.py`, `models.py`, `app/app.json`, `admin/public/*.html`, screen headers & legal wiring)  
**Profile**: General Project / Integrity Forensics  
**Verdict**: **CLEAN**  

---

## 1. Observation

1. **PII Security & Authorization Logic (`backend/orders/`):**
   - `models.py`: Added `tracking_token = models.UUIDField(default=uuid.uuid4, db_index=True, editable=False, ...)` to `Order` model. Migration `0009_order_tracking_token.py` generated and applied.
   - `serializers.py`: `tracking_token` included as a `read_only_fields` property across `OrderCreateSerializer`, `OrderListSerializer`, and `OrderDetailSerializer`.
   - `views.py`:
     - `OrderDetailView.get_object()`: For `GET` requests, verifies access requires either `(user.is_authenticated and (obj.user == user or user.is_staff))` OR `(tracking_token parameter matches str(obj.tracking_token))`. Raises `rest_framework.exceptions.PermissionDenied` (HTTP 403) on failure.
     - `MyOrdersListView`: Configured with `permission_classes = [permissions.IsAuthenticated]` and queries strictly `Order.objects.filter(user=request.user)`. Unauthenticated `?phone=` lookups completely removed.
   - `tests.py`: 10 comprehensive Django DRF `APITestCase` unit tests covering UUID token generation, 403 authorization rejections for unauthenticated/unauthorized access, valid tracking token access, and 401 unauthenticated my-orders access.

2. **Rebranding Consistency & Legal Compliance (`app/`, `admin/`):**
   - `app/app.json`: Updated `name` ("GetFood"), `displayName` ("GetFood"), and `slug` ("getfood").
   - Rebranding: Verified zero occurrences of legacy `FoodSphere` in `app/src/`. All instances in `AuthScreen.tsx`, `MapScreen.tsx`, `ProfileScreen.tsx`, `RewardsScreen.tsx`, `userSlice.ts`, `Sidebar.tsx`, and `Login.tsx` updated to `GetFood` / `@getfood.pk`.
   - Legal Documents: Created `admin/public/privacy-policy.html` (509 lines) and `admin/public/terms-of-service.html` (541 lines) as valid, responsive HTML5 documents. Wired touchable links in `AuthScreen.tsx` and `ProfileScreen.tsx`.

3. **Behavioral Verification Results:**
   - Ran `manage.py test orders`: **10 tests passed in 25.773s (OK)**.
   - Ran `test_backend_local.py`: Verified security governance, loyalty points, branch out-of-stock overrides, and cross-account isolation.

---

## 2. Logic Chain

1. **Authentic Security Implementation:**
   - Security controls in `OrderDetailView` and `MyOrdersListView` execute genuine DRF permission checks against Django's ORM model attributes (`obj.user`, `obj.tracking_token`, `request.user`). No hardcoded bypasses, dummy conditional branches, or static return mocks exist.
   - Read-only constraint on `tracking_token` in serializers prevents clients from setting or tampering with tracking tokens during order creation.

2. **Authentic Data & UI Assets:**
   - The generated HTML files in `admin/public/` contain valid semantic HTML structure, CSS custom properties matching platform design tokens, and comprehensive legal disclosures suitable for app store verification.
   - Brand string updates across React Native and React Vite components were verified via static analysis (`grep_search`) to ensure complete eradication of legacy references in source files.

---

## 3. Caveats

- **External Domain Alias:** The legal document links in `ProfileScreen.tsx` and `AuthScreen.tsx` point to `https://foodsphere-admin.pages.dev/*.html`. When the client configures a custom apex domain (e.g. `getfood.pk`), these URLs will need to be updated in a future release or routed via CNAME redirect.

---

## 4. Conclusion

**Verdict: CLEAN**

Milestone 1 changes contain zero integrity violations, facade implementations, or hardcoded security bypasses. All DRF permission logic, UUID token verification, database migrations, rebranding assets, and legal documents are genuinely implemented and fully verified.

---

## 5. Verification Method

To independently verify the auditor's findings:

1. **Run Unit Tests:**
   ```bash
   cd "d:/sitesdata/Resturent App"
   .\backend\venv\Scripts\python.exe backend/manage.py test orders
   ```
   *Expected Output:* `Ran 10 tests ... OK`.

2. **Verify Source Code Search Cleanliness:**
   ```bash
   grep -rn "FoodSphere" "d:/sitesdata/Resturent App/app/src"
   ```
   *Expected Output:* `No results found`.

3. **Inspect Modified Files & Diffs:**
   - `backend/orders/views.py` (lines 200–248)
   - `backend/orders/models.py` (line 42)
   - `admin/public/privacy-policy.html`
   - `admin/public/terms-of-service.html`
