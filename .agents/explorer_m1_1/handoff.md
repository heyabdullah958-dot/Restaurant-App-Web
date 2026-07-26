# Handoff Report: Milestone 1 (R1 Security & PII Data Leak Fix Design)

## 1. Observation
- **Order Model**: `backend/orders/models.py:42-48`:
  ```python
  tracking_token = models.UUIDField(
      default=uuid.uuid4,
      unique=True,
      db_index=True,
      editable=False,
      help_text="Secure token for guest order tracking. Returned at order creation and stored client-side."
  )
  ```
- **Order Detail Endpoint**: `backend/orders/views.py:196-235`:
  `OrderDetailView` sets `permission_classes = [permissions.AllowAny()]` for `GET` requests and returns `Order.objects.all()` in `get_queryset()` when `self.request.method == 'GET'`. Any client can query `GET /api/orders/1/` and receive PII fields (`guest_name`, `guest_phone`, `delivery_address`, `delivery_lat`, `delivery_lng`, `items`, `total`).
- **My Orders List Endpoint**: `backend/orders/views.py:302-325`:
  `MyOrdersListView` has `permission_classes = [permissions.AllowAny]` and executes:
  ```python
  guest_phone = self.request.query_params.get('phone', '')
  if guest_phone:
      return Order.objects.filter(guest_phone=guest_phone)...
  ```
  Any client can pass `GET /api/orders/my-orders/?phone=03001234567` and fetch historical order records for any phone number.
- **Serializers**: `backend/orders/serializers.py:33-46` (`OrderCreateSerializer`), `lines 330-340` (`OrderDetailSerializer`), and `lines 290-300` (`OrderListSerializer`) do not include `tracking_token` in `fields`.

## 2. Logic Chain
1. `Order` model already includes `tracking_token` as a UUID field with `default=uuid.uuid4`.
2. However, because `tracking_token` is excluded from serializers, client applications (and guest users) are never returned this token when placing an order.
3. Simultaneously, `OrderDetailView` allows unauthenticated access to any order ID (`/api/orders/{id}/`) without checking `request.user == order.user` or validating `tracking_token`.
4. This creates a critical BOLA vulnerability allowing arbitrary PII extraction across all orders.
5. In addition, `MyOrdersListView` permits unauthenticated phone lookup via `?phone=`, allowing unauthenticated scraping of order history.
6. **Solution Logic**:
   - Expose `tracking_token` in `OrderCreateSerializer` and `OrderDetailSerializer`.
   - Restrict `GET /api/orders/{id}/` in `OrderDetailView` to require staff status, authenticated order ownership, OR matching `tracking_token` query parameter (`?tracking_token=<uuid>`).
   - Require `IsAuthenticated` permission on `MyOrdersListView` and remove unauthenticated `?phone=` lookups.

## 3. Caveats
- Legacy guest orders placed without JWT guest session: If an existing guest user lost their local session, they will need their `tracking_token` (from order placement confirmation) to look up their order detail.
- Mobile client app (`app/src/screens/TrackingScreen.tsx`): Needs to include `tracking_token` in query parameter if making unauthenticated/guest tracking requests.

## 4. Conclusion
The implementation plan is complete and fully scoped. The `Order` model already has the `tracking_token` field. The backend `OrderDetailView` and `MyOrdersListView` views must be refactored alongside DRF serializers to enforce strict authorization checks and eliminate unauthenticated PII leaks.

## 5. Verification Method
1. Start backend server or run unit tests:
   ```bash
   python backend/manage.py test orders
   ```
2. Unauthenticated request verification:
   - `GET /api/orders/1/` without auth header or tracking token MUST return `403 Forbidden` or `404 Not Found`.
   - `GET /api/orders/1/?tracking_token=<valid_uuid>` MUST return `200 OK` with order details.
   - `GET /api/orders/my-orders/?phone=03001234567` without JWT MUST return `401 Unauthorized`.
3. Authenticated request verification:
   - `GET /api/orders/my-orders/` with user JWT MUST return only orders belonging to `request.user`.
