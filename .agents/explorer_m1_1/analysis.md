# Security Investigation Analysis: PII Data Leaks in Order Endpoints

## Executive Summary
This investigation analyzed authentication, authorization, and data privacy vulnerabilities in order endpoints (`GET /api/orders/{id}/` and `GET /api/orders/my-orders/`).

Two critical security vulnerabilities (PII Data Leaks) were identified:
1. **Broken Object Level Authorization (BOLA) in `GET /api/orders/{id}/`**: Any unauthenticated user can enumerate sequential integer order IDs and access complete order records including customer names, phone numbers, exact delivery addresses, coordinates, and purchase items.
2. **Unauthenticated PII Access / Bulk Enumeration in `GET /api/orders/my-orders/?phone=`**: Any unauthenticated attacker can query any phone number and retrieve full historical order lists for that phone number without authorization or identity verification.

---

## 1. File Inventory & Current Implementation Analysis

### `backend/orders/models.py`
- **`Order` Model (Lines 6-74)**:
  - `tracking_token`: Already defined at line 42 as `models.UUIDField(default=uuid.uuid4, unique=True, db_index=True, editable=False)`.
  - `user`: `ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True)` (Line 22).
  - `guest_name`: `CharField(max_length=100, blank=True, null=True)` (Line 49).
  - `guest_phone`: `CharField(max_length=20, blank=True, null=True)` (Line 50).
  - `delivery_address`: `TextField()` (Line 53).

### `backend/orders/views.py`
- **`OrderDetailView` (Lines 196-300)**:
  - `permission_classes`: `get_permissions()` returns `[permissions.AllowAny()]` for `GET` requests (Line 206).
  - `get_queryset()` (Lines 208-234):
    ```python
    if self.request.method == 'GET':
        return queryset
    ```
  - **Flaw**: `get_queryset()` returns `Order.objects.all()` for any `GET` request. DRF's `get_object()` retrieves the order by primary key (`id`) without verifying whether `request.user` owns the order or if a valid `tracking_token` was provided.

- **`MyOrdersListView` (Lines 302-325)**:
  - `permission_classes = [permissions.AllowAny]` (Line 309).
  - `get_queryset()` (Lines 311-324):
    ```python
    user = self.request.user
    if user.is_authenticated:
        return Order.objects.filter(
            user=user
        ).select_related('restaurant').order_by('-created_at')
        
    guest_phone = self.request.query_params.get('phone', '')
    if guest_phone:
        return Order.objects.filter(
            guest_phone=guest_phone
        ).select_related('restaurant').order_by('-created_at')
        
    return Order.objects.none()
    ```
  - **Flaw**: Allows unauthenticated users to pass `?phone=<number>` and retrieve all orders matching that phone number.

### `backend/orders/serializers.py`
- `OrderCreateSerializer` (Lines 33-288): Does not expose `tracking_token` in response fields.
- `OrderDetailSerializer` (Lines 330-368): Exposes `guest_name`, `guest_phone`, `delivery_address`, `delivery_lat`, `delivery_lng`, `subtotal`, `delivery_fee`, `discount`, `total`, `special_instructions`, `items`, `restaurant`, `created_at`, `updated_at`. `tracking_token` is missing from `fields`.

### Mobile Frontend (`app/src/services/api.js`, `orderSlice.ts`, `OrdersScreen.tsx`, `TrackingScreen.tsx`)
- `app/src/services/api.js`: Interceptor injects JWT token `Authorization: Bearer <token>` when present.
- `app/src/store/orderSlice.ts`:
  - `fetchOrderDetails(orderId)`: `GET /orders/${orderId}/`
  - `fetchMyOrders()`: `GET /orders/my-orders/`
- `OrdersScreen.tsx`: Already checks `if (!isAuthenticated)` and prompts user to sign in or register before fetching order history (Lines 271-303).
- `TrackingScreen.tsx`: Calls `fetchOrderDetails(orderId)`.

---

## 2. Vulnerability Assessment & Security Flaws

| Vulnerability ID | Vulnerable Endpoint | Flaw Mechanism | Impact |
|---|---|---|---|
| **VULN-01** | `GET /api/orders/{id}/` | `get_queryset()` returns all orders for GET requests with `AllowAny` permissions. | **Critical BOLA / PII Leak**: Unauthenticated or cross-account users can scrape customer names, phone numbers, delivery addresses, order items, and locations using sequential integer IDs (e.g. `/api/orders/1/`, `/api/orders/2/`). |
| **VULN-02** | `GET /api/orders/my-orders/?phone=` | `MyOrdersListView` permits unauthenticated query parameter `?phone=` lookup. | **High PII Leak**: Anyone can enumerate phone numbers to harvest order histories, timestamps, and customer spending habits. |
| **VULN-03** | `POST /api/orders/` & `OrderDetailSerializer` | `tracking_token` UUID is not returned in serializers. | **Guest Tracking Blocker**: Guest users cannot perform secure token-based order tracking because `tracking_token` is omitted from serializers. |

---

## 3. Step-by-Step Fix Recommendations & Implementation Plan

### Step 1: Update Serializers to Expose `tracking_token`
- **File**: `backend/orders/serializers.py`
- **Changes**:
  1. Add `'tracking_token'` to `OrderCreateSerializer.fields` (read-only) or `OrderDetailSerializer.fields` and `OrderListSerializer.fields`.
  2. Ensure `tracking_token` is serialized in `OrderCreateView` response so guest users receive their unique tracking token upon placing an order.

### Step 2: Refactor `OrderDetailView` in `backend/orders/views.py`
- **File**: `backend/orders/views.py`
- **Changes**:
  1. Update `OrderDetailView.get_queryset()` and `get_object()`:
     - If `user.is_authenticated` and (`user.is_staff` or `user.is_superuser`): Allow access.
     - If `user.is_authenticated`: Allow access if `order.user == user` or `(user.phone and order.guest_phone == user.phone)`.
     - Otherwise (unauthenticated guest or cross-account access): Require query parameter `?tracking_token=<uuid>` or header `X-Tracking-Token: <uuid>`. Check if `str(order.tracking_token) == provided_token`.
     - If none of the conditions pass, raise `PermissionDenied("You do not have permission to access this order.")` or `Http404`.

### Step 3: Refactor `MyOrdersListView` in `backend/orders/views.py`
- **File**: `backend/orders/views.py`
- **Changes**:
  1. Change `permission_classes` to `[permissions.IsAuthenticated]`.
  2. Remove `guest_phone = self.request.query_params.get('phone', '')` completely.
  3. Filter orders strictly by `Order.objects.filter(user=request.user)`. If `request.user.phone` exists, allow `Q(user=request.user) | Q(guest_phone=request.user.phone)`.

### Step 4: Verification Method
- Execute pytest / Django test runner:
  - Test `GET /api/orders/{id}/` without auth & without tracking token -> HTTP 403 / 404.
  - Test `GET /api/orders/{id}/?tracking_token=<valid_uuid>` -> HTTP 200 OK.
  - Test `GET /api/orders/my-orders/?phone=...` without JWT auth -> HTTP 401 Unauthorized.
  - Test `GET /api/orders/my-orders/` with valid JWT -> HTTP 200 OK returning user's orders.
