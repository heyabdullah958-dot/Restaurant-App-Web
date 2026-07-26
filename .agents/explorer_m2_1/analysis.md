# Comprehensive Analysis & Architectural Design: Rider Management System (GetFood / FoodSphere)

## Executive Summary
This document provides the complete structural investigation and architectural blueprint for implementing the **Rider Management System** in GetFood (FoodSphere). 
The system empowers branch managers and super-admins to manage delivery riders per branch, assign riders to incoming food delivery orders, track rider availability statuses (`AVAILABLE`, `ON_DELIVERY`, `OFFLINE`), and dispatch pre-filled order details directly to riders via WhatsApp links.

---

## 1. Codebase Findings & Current Architecture

### 1.1 Backend Inspection (`backend/restaurants/` & `backend/orders/`)
- **`restaurants/models.py`**:
  - `Restaurant`: Top-level multi-tenant brand model (lines 3–40).
  - `Branch`: Specific physical outlet of a restaurant (lines 41–63) containing `restaurant`, `name`, `address`, `phone`, `is_active`, `area_keywords`.
  - `BranchMenuItemAvailability`: Per-branch menu item availability overrides (lines 92–104).
- **`orders/models.py`**:
  - `Order`: Primary order entity (lines 6–73) containing `user`, `restaurant`, `branch`, `tracking_token`, `status`, `payment_method`, `delivery_address`, `subtotal`, `delivery_fee`, `total`, `created_at`.
  - `STATUS_CHOICES`: `('pending', 'received', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')`.
  - `BranchCashRegister`: End-of-day cash reconciliation model (lines 86–131).
- **`config/admin_utils.py`**:
  - `get_managed_restaurant(user)` & `get_managed_branch(user)` resolve manager permissions via Django Groups and `ManagerProfile` (lines 1–32).

### 1.2 Frontend Admin Panel Inspection (`admin/src/`)
- **`admin/src/services/api.ts`**:
  - Contains fetch wrapper `apiFetch` handling JWT bearer auth and 401 token refresh (lines 58–123).
  - Pre-existing stub definitions for rider endpoints at lines 549–552:
    - `fetchRiders = () => apiFetch('/api/admin/riders/')`
    - `createRider = (data) => apiFetch('/api/admin/riders/', { method: 'POST', ... })`
    - `updateRider = (id, data) => apiFetch('/api/admin/riders/${id}/', { method: 'PATCH', ... })`
    - `deleteRider = (id) => apiFetch('/api/admin/riders/${id}/', { method: 'DELETE' })`
- **`admin/src/AdminContext.tsx`**:
  - Manages global state (`user`, `restaurants`, `orders`, `activeView`).
  - Implements role resolution (`super_admin` vs `branch_manager`).
- **`admin/src/components/Sidebar.tsx`**:
  - Navigation drawer supporting view switching.
- **`admin/src/views/BranchDashboard.tsx` & `OrderManagement.tsx`**:
  - `BranchDashboard.tsx`: Displays branch status, metrics, and quick links.
  - `OrderManagement.tsx`: Live Kanban board rendering order cards across status columns (`pending`, `received`, `preparing`, `out_for_delivery`, `delivered`).

---

## 2. Backend Design Specification

### 2.1 `BranchRider` Model Design (`backend/restaurants/models.py`)

```python
class BranchRider(models.Model):
    STATUS_CHOICES = (
        ('available', 'Available'),
        ('on_delivery', 'On Delivery'),
        ('offline', 'Offline'),
    )

    VEHICLE_CHOICES = (
        ('bike', 'Motorcycle / Bike'),
        ('scooter', 'Scooter'),
        ('car', 'Car / Auto'),
        ('bicycle', 'Bicycle'),
    )

    branch = models.ForeignKey(
        'restaurants.Branch',
        on_delete=models.CASCADE,
        related_name='riders',
        help_text="Branch this rider is attached to."
    )
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    vehicle_type = models.CharField(max_length=50, choices=VEHICLE_CHOICES, default='bike')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available', db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['branch', 'name']
        verbose_name = 'Branch Rider'
        verbose_name_plural = 'Branch Riders'

    def __str__(self):
        return f"{self.name} ({self.branch.name}) — {self.get_status_display()}"
```

### 2.2 `Order` Model Update (`backend/orders/models.py`)

Add a foreign key field to link assigned riders:
```python
rider = models.ForeignKey(
    'restaurants.BranchRider',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='assigned_orders',
    help_text="Rider assigned to deliver this order."
)
```

### 2.3 DRF Serializers (`backend/restaurants/serializers.py` & `backend/orders/serializers.py`)

```python
# backend/restaurants/serializers.py
class BranchRiderSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source='branch.name', read_only=True)
    restaurant_name = serializers.CharField(source='branch.restaurant.name', read_only=True)

    class Meta:
        model = BranchRider
        fields = (
            'id', 'branch', 'branch_name', 'restaurant_name',
            'name', 'phone', 'vehicle_type', 'status', 'is_active',
            'created_at', 'updated_at'
        )
```

Include rider information in `AdminOrderListSerializer` and `OrderDetailSerializer`:
```python
# backend/orders/serializers.py
class AdminOrderListSerializer(serializers.ModelSerializer):
    ...
    rider_id = serializers.SerializerMethodField()
    rider_name = serializers.SerializerMethodField()
    rider_phone = serializers.SerializerMethodField()

    def get_rider_id(self, obj):
        return obj.rider.id if obj.rider else None

    def get_rider_name(self, obj):
        return obj.rider.name if obj.rider else None

    def get_rider_phone(self, obj):
        return obj.rider.phone if obj.rider else None
```

### 2.4 DRF ViewSet & Permission Scoping (`backend/restaurants/views.py`)

```python
from rest_framework import viewsets, permissions
from .models import BranchRider
from .serializers import BranchRiderSerializer

class AdminBranchRiderViewSet(viewsets.ModelViewSet):
    serializer_class = BranchRiderSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        user = self.request.user
        queryset = BranchRider.objects.select_related('branch', 'branch__restaurant')
        
        if user.is_superuser:
            branch_id = self.request.query_params.get('branch_id')
            restaurant_id = self.request.query_params.get('restaurant_id')
            if branch_id:
                return queryset.filter(branch_id=branch_id)
            if restaurant_id:
                return queryset.filter(branch__restaurant_id=restaurant_id)
            return queryset

        from config.admin_utils import get_managed_branch, get_managed_restaurant
        managed_branch = get_managed_branch(user)
        if managed_branch:
            return queryset.filter(branch=managed_branch)

        managed_restaurant = get_managed_restaurant(user)
        if managed_restaurant:
            return queryset.filter(branch__restaurant=managed_restaurant)

        return BranchRider.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser:
            from config.admin_utils import get_managed_branch
            managed_branch = get_managed_branch(user)
            if managed_branch:
                serializer.save(branch=managed_branch)
                return
        serializer.save()
```

### 2.5 Rider Assignment Action (`backend/orders/views.py`)

Add custom action on `OrderDetailView` or endpoint `/api/orders/<int:pk>/assign-rider/`:
```python
class AssignRiderView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=404)

        rider_id = request.data.get('rider_id')
        if rider_id is None:
            order.rider = None
            order.save(update_fields=['rider'])
            return Response({'success': True, 'message': 'Rider unassigned.'})

        try:
            rider = BranchRider.objects.get(pk=rider_id)
        except BranchRider.DoesNotExist:
            return Response({'error': 'Rider not found'}, status=404)

        order.rider = rider
        order.save(update_fields=['rider'])

        # Auto-update rider status if order is out for delivery
        if order.status == 'out_for_delivery':
            rider.status = 'on_delivery'
            rider.save(update_fields=['status'])

        return Response({
            'success': True,
            'message': f"Rider {rider.name} assigned to Order #{order.id}",
            'rider': {
                'id': rider.id,
                'name': rider.name,
                'phone': rider.phone,
                'status': rider.status
            }
        })
```

---

## 3. WhatsApp Dispatch Link Generator Specification

### 3.1 WhatsApp Link Format & Rules
Format:
`https://wa.me/<formatted_phone>?text=<url_encoded_message>`

1. **Phone Number Sanitization**:
   - Strip all spaces, dashes, parentheses.
   - Local format `03XXXXXXXXX` → convert to international `923XXXXXXXXX`.
   - Example: `0300-1234567` → `923001234567`.

2. **Pre-filled Message Template**:
```
🛵 *NEW DELIVERY ASSIGNMENT*
--------------------------------
*Order ID*: #{order.id}
*Restaurant*: {order.restaurant_name} ({order.branch_name || 'Branch'})
*Customer Name*: {order.guest_name || order.user_or_guest}
*Customer Phone*: {order.guest_phone || 'N/A'}
*Delivery Address*: {order.delivery_address}

*Items to Deliver*:
{bullet_item_list}

*Payment Method*: {order.payment_method.toUpperCase()}
*Total Amount to Collect*: Rs. {order.total}

Please confirm receipt and reply when out for delivery!
```

3. **TypeScript Helper Implementation (`admin/src/utils/whatsapp.ts`)**:
```typescript
export function formatWhatsAppPhone(phone: string): string {
  let clean = phone.replace(/[^0-9+]/g, '');
  if (clean.startsWith('0')) {
    clean = '92' + clean.slice(1);
  } else if (clean.startsWith('+')) {
    clean = clean.slice(1);
  }
  return clean;
}

export function generateRiderWhatsAppUrl(order: Order, riderPhone: string): string {
  const cleanPhone = formatWhatsAppPhone(riderPhone);
  
  const itemsText = (order.items || []).map((item) => (
    `• ${item.quantity}x ${item.menu_item_name || item.name} (Rs. ${item.total_price || item.price})`
  )).join('\n');

  const message = 
`🛵 *NEW DELIVERY ASSIGNMENT*
--------------------------------
*Order ID*: #${order.id}
*Restaurant*: ${order.restaurant_name} ${order.branch_name ? `(${order.branch_name})` : ''}
*Customer*: ${order.guest_name || order.user_or_guest}
*Phone*: ${order.guest_phone || 'N/A'}
*Address*: ${order.delivery_address}

*Items*:
${itemsText}

*Payment*: ${order.payment_method ? order.payment_method.toUpperCase() : 'COD'}
*Total Amount to Collect*: Rs. ${order.total}

Please acknowledge receipt & update status!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
```

---

## 4. Admin HQ UI Integration Design

### 4.1 Navigation Integration (`admin/src/components/Sidebar.tsx`)
- Add new menu item "Riders" with `Bike` icon:
```tsx
<button
  onClick={() => { setView('rider_management'); setIsOpen(false); }}
  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
    activeView === 'rider_management' ? activeLinkClass : inactiveLinkClass
  }`}
>
  <Bike size={18} />
  Rider Fleet
</button>
```

### 4.2 State Management (`admin/src/AdminContext.tsx`)
- Add `riders: ApiRider[]` to `AdminContextProps`.
- Provide `refreshRiders`, `addRider`, `editRider`, `removeRider`, `assignRider`.

### 4.3 Dedicated Rider Management View (`admin/src/views/RiderManagement.tsx`)
- KPI Summary Cards:
  - Total Active Riders
  - Available Riders (`AVAILABLE`)
  - On Delivery (`ON_DELIVERY`)
  - Offline Riders (`OFFLINE`)
- Rider Table / Card Grid:
  - Name, Phone, Vehicle Type, Status Badge (Color coded), Branch Name.
  - Quick action buttons: Toggle Status, Edit Rider Modal, Delete Rider.
- Add/Edit Rider Modal:
  - Form inputs: Name, Phone (e.g. 03001234567), Vehicle Type select, Branch select (if Super Admin), Status select.

### 4.4 Order Card Rider Assignment (`admin/src/views/OrderManagement.tsx`)
- On each Order card:
  - Display assigned rider badge: `🛵 Rider: {order.rider_name} ({order.rider_phone})`.
  - Add "Assign Rider" button triggering a Rider Selector Modal or dropdown.
  - When rider is assigned, show "WhatsApp Dispatch" button using `generateRiderWhatsAppUrl(order, order.rider_phone)`.

---

## 5. Step-by-Step Implementation Plan for Implementer

1. **Backend Model & Migration**:
   - Update `backend/restaurants/models.py` with `BranchRider`.
   - Update `backend/orders/models.py` with `rider = ForeignKey(BranchRider, ...)` on `Order`.
   - Run `python manage.py makemigrations` and `python manage.py migrate`.
2. **Backend Serializers & Views**:
   - Add `BranchRiderSerializer` to `backend/restaurants/serializers.py`.
   - Add `AdminBranchRiderViewSet` to `backend/restaurants/views.py`.
   - Register `/api/admin/riders/` in `backend/restaurants/urls.py`.
   - Add `AssignRiderView` or endpoint `/api/orders/<id>/assign-rider/` in `backend/orders/views.py` & `urls.py`.
   - Include rider fields in `AdminOrderListSerializer`.
3. **Frontend API Layer**:
   - Update `admin/src/services/api.ts` with typed rider endpoints and `assignRiderToOrder`.
4. **Frontend Admin UI**:
   - Add `rider_management` view tab in `Sidebar.tsx`.
   - Add rider state & functions in `AdminContext.tsx`.
   - Create `admin/src/views/RiderManagement.tsx`.
   - Update `admin/src/views/BranchDashboard.tsx` with Rider Fleet widget.
   - Update `admin/src/views/OrderManagement.tsx` with Rider Assignment selector & WhatsApp dispatch button.
5. **Testing & Verification**:
   - Verify DRF endpoints via automated test or curl.
   - Verify UI rendering, rider creation, assignment, and WhatsApp URL generation.
