# Handoff Report — Milestone 3 (R3: PlatformSettings & Welcome Bonus)

**Agent**: Explorer 2  
**Working Directory**: `d:/sitesdata/Resturent App/.agents/explorer_m3_2/`  
**Date**: 2026-07-26  

---

## 1. Observation

### Codebase Inspection & Direct Verifications

1. **`backend/config/models.py`** (Lines 1-38):
   - Currently contains `AdminAuditLog` model (lines 9-37).
   - `config` app is listed in `INSTALLED_APPS` in `backend/config/settings.py` (line 75).
   - No platform settings model currently exists in `config/models.py` or `users/models.py`.

2. **`backend/users/serializers.py`** (Lines 18-34):
   - `UserRegisterSerializer` handles user creation:
     ```python
     class UserRegisterSerializer(serializers.ModelSerializer):
         password = serializers.CharField(write_only=True)
         phone = serializers.CharField(required=False, allow_blank=True, allow_null=True)

         class Meta:
             model = User
             fields = ('username', 'email', 'password', 'phone')

         def create(self, validated_data):
             user = User.objects.create_user(
                 username=validated_data['username'],
                 email=validated_data.get('email', ''),
                 password=validated_data['password'],
                 phone=validated_data.get('phone', ''),
                 is_guest=False
             )
             return user
     ```
   - Currently, user registration creates a user with default `loyalty_points = 0` (defined in `User` model at `backend/users/models.py:7`).

3. **`backend/users/admin_views.py`** (Lines 15-20):
   - Contains `IsSuperUser` permission class:
     ```python
     class IsSuperUser(permissions.BasePermission):
         """Allows access only to superusers."""
         def has_permission(self, request, view):
             return bool(request.user and request.user.is_authenticated and request.user.is_superuser)
     ```

4. **`backend/config/urls.py`** (Lines 36-42):
   - Mounts `users.urls` at `/api/` (`path('api/', include('users.urls'))`).
   - Root URL router configuration cleanly handles `/api/` endpoints.

5. **`admin/src/types.ts`** (Lines 1-105):
   - Defines TypeScript interfaces for `User`, `Restaurant`, `Branch`, `Order`, `GlobalStats`.
   - `PlatformSettings` interface is not yet present.

6. **`admin/src/services/api.ts`** (Lines 500-559):
   - Uses `apiFetch<T>` wrapper with automatic JWT token management.
   - Contains API helper functions for restaurants, orders, customers, managers, coupons, deals, riders.

7. **`admin/src/components/Sidebar.tsx`** (Lines 225-307):
   - Renders navigation links for SuperAdmin (`activeView === 'super_dashboard'`, `'tenant_management'`, `'menu_management'`, `'customer_management'`, `'manager_management'`, `'rider_management'`, `'notification_center'`, `'promo_management'`, `'flash_deal_management'`).

8. **`admin/src/App.tsx`** (Lines 47-73):
   - `renderView()` switches between views based on `activeView` state string.

---

## 2. Logic Chain

1. **PlatformSettings Singleton Model**:
   - Creating `PlatformSettings` in `backend/config/models.py` places platform configurations alongside `AdminAuditLog`.
   - Overriding `save()` to enforce `self.pk = 1` and `delete()` to pass prevents multiple records or accidental deletion.
   - Adding a classmethod `get_solo(cls)` retrieves `pk=1` or creates default configuration (`loyalty_points_per_dollar=10`, `loyalty_point_value_usd=0.01`, `welcome_bonus_points=100`).
   - Registering `PlatformSettingsView` DRF APIView restricted by `IsSuperUser` permission at `/api/config/settings/` satisfies `GET` and `PUT/PATCH` requirements for SuperAdmin management.

2. **Welcome Bonus Trigger**:
   - Integrating `PlatformSettings.get_solo().welcome_bonus_points` inside `UserRegisterSerializer.create()` (or `UserRegisterView.post()`) ensures every new registered user immediately receives initial loyalty points (e.g. 100).
   - Creating a `LoyaltyTransaction` record with `transaction_type='earned'` and `description='Welcome bonus on registration'` ensures full auditability and transparency in customer history.

3. **Admin HQ Settings UI**:
   - Adding `PlatformSettings` type definition in `admin/src/types.ts` ensures end-to-end type safety.
   - Creating API wrappers `fetchPlatformSettings` and `updatePlatformSettings` in `admin/src/services/api.ts` standardizes API interaction.
   - Creating a dedicated, responsive `PlatformSettings.tsx` component in `admin/src/views/` gives SuperAdmin full control to update platform rates and welcome points.
   - Adding navigation entries in `Sidebar.tsx` and `App.tsx` seamlessly integrates the view into HQ Command Center.

---

## 3. Caveats

- **Existing Database Compatibility**: `PlatformSettings.get_solo()` will safely auto-seed the default row `#1` if no row exists in PostgreSQL/SQLite.
- **Guest Registration**: Guest user creation in `GuestAuthView` (`backend/users/views.py:65-87`) creates `is_guest=True` accounts. The welcome bonus MUST only trigger for regular user registration (`UserRegisterSerializer` / `UserRegisterView`), not for guest tokens.
- **Decimal Serializer Precision**: `loyalty_point_value_usd` is decimal (e.g., `0.01`). When serializing or submitting JSON, handle strings/numbers cleanly in DRF and React TypeScript.

---

## 4. Conclusion & Step-by-Step Implementation Guide for Worker

### Step 1: Backend Model & Admin (`backend/config/models.py` & `backend/config/admin.py`)

1. **Add `PlatformSettings` Model** in `backend/config/models.py`:
   ```python
   class PlatformSettings(models.Model):
       loyalty_points_per_dollar = models.IntegerField(
           default=10,
           help_text="Loyalty points earned per dollar spent"
       )
       loyalty_point_value_usd = models.DecimalField(
           max_digits=6,
           decimal_places=4,
           default=0.01,
           help_text="USD value per 1 loyalty point (e.g. 0.01 = $0.01 per point)"
       )
       welcome_bonus_points = models.IntegerField(
           default=100,
           help_text="Initial loyalty points awarded to newly registered users"
       )
       created_at = models.DateTimeField(auto_now_add=True)
       updated_at = models.DateTimeField(auto_now=True)

       class Meta:
           verbose_name = 'Platform Settings'
           verbose_name_plural = 'Platform Settings'

       def save(self, *args, **kwargs):
           self.pk = 1
           super().save(*args, **kwargs)

       def delete(self, *args, **kwargs):
           pass

       @classmethod
       def get_solo(cls):
           obj, _ = cls.objects.get_or_create(
               pk=1,
               defaults={
                   'loyalty_points_per_dollar': 10,
                   'loyalty_point_value_usd': 0.01,
                   'welcome_bonus_points': 100,
               }
           )
           return obj

       def __str__(self):
           return f"Platform Settings (Welcome Bonus: {self.welcome_bonus_points} pts, Rate: {self.loyalty_points_per_dollar} pts/$)"
   ```

2. **Register in Django Admin** in `backend/config/admin.py`:
   ```python
   from .models import AdminAuditLog, PlatformSettings

   @admin.register(PlatformSettings)
   class PlatformSettingsAdmin(admin.ModelAdmin):
       list_display = ('id', 'welcome_bonus_points', 'loyalty_points_per_dollar', 'loyalty_point_value_usd', 'updated_at')

       def has_add_permission(self, request):
           return not PlatformSettings.objects.exists()

       def has_delete_permission(self, request, obj=None):
           return False
   ```

3. **Generate and apply Django migrations**:
   - Command: `python manage.py makemigrations config`
   - Command: `python manage.py migrate`

---

### Step 2: Backend Serializer, View & Endpoint (`backend/config/views.py` & `backend/users/urls.py`)

1. **Create `PlatformSettingsSerializer` & `PlatformSettingsView`** in `backend/config/views.py` (or `backend/config/admin_views.py`):
   ```python
   from rest_framework import serializers, status, permissions
   from rest_framework.views import APIView
   from rest_framework.response import Response
   from .models import PlatformSettings
   from users.admin_views import IsSuperUser

   class PlatformSettingsSerializer(serializers.ModelSerializer):
       class Meta:
           model = PlatformSettings
           fields = ('id', 'loyalty_points_per_dollar', 'loyalty_point_value_usd', 'welcome_bonus_points', 'created_at', 'updated_at')
           read_only_fields = ('id', 'created_at', 'updated_at')

   class PlatformSettingsView(APIView):
       """
       GET /api/config/settings/
       PUT/PATCH /api/config/settings/
       SuperAdmin only view to inspect and modify platform-wide settings.
       """
       permission_classes = [IsSuperUser]

       def get(self, request):
           settings_obj = PlatformSettings.get_solo()
           serializer = PlatformSettingsSerializer(settings_obj)
           return Response({'success': True, 'data': serializer.data})

       def put(self, request):
           return self._update(request, partial=False)

       def patch(self, request):
           return self._update(request, partial=True)

       def _update(self, request, partial=False):
           settings_obj = PlatformSettings.get_solo()
           serializer = PlatformSettingsSerializer(settings_obj, data=request.data, partial=partial)
           if serializer.is_valid():
               serializer.save()
               return Response({
                   'success': True,
                   'message': 'Platform settings updated successfully',
                   'data': serializer.data
               })
           return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
   ```

2. **Register URL Endpoint** in `backend/users/urls.py` (or `backend/config/urls.py`):
   ```python
   from config.views import PlatformSettingsView

   # inside urlpatterns:
   path('config/settings/', PlatformSettingsView.as_view(), name='platform_settings'),
   ```

---

### Step 3: Welcome Loyalty Bonus Trigger (`backend/users/serializers.py`)

1. **Update `UserRegisterSerializer.create()`** in `backend/users/serializers.py`:
   ```python
   def create(self, validated_data):
       from config.models import PlatformSettings
       from users.models import LoyaltyTransaction

       welcome_bonus = 100
       try:
           settings_obj = PlatformSettings.get_solo()
           welcome_bonus = settings_obj.welcome_bonus_points
       except Exception:
           pass

       user = User.objects.create_user(
           username=validated_data['username'],
           email=validated_data.get('email', ''),
           password=validated_data['password'],
           phone=validated_data.get('phone', ''),
           is_guest=False,
           loyalty_points=welcome_bonus
       )

       if welcome_bonus > 0:
           LoyaltyTransaction.objects.create(
               user=user,
               points=welcome_bonus,
               transaction_type='earned',
               description='Welcome bonus on registration'
           )

       return user
   ```

---

### Step 4: Admin HQ Settings UI (`admin/src/`)

1. **Add `PlatformSettings` interface in `admin/src/types.ts`**:
   ```typescript
   export interface PlatformSettings {
     id: number;
     loyalty_points_per_dollar: number;
     loyalty_point_value_usd: number;
     welcome_bonus_points: number;
     created_at?: string;
     updated_at?: string;
   }
   ```

2. **Add API Functions in `admin/src/services/api.ts`**:
   ```typescript
   export const fetchPlatformSettings = () =>
     apiFetch<{ success: boolean; data: PlatformSettings }>('/api/config/settings/');

   export const updatePlatformSettings = (data: Partial<PlatformSettings>) =>
     apiFetch<{ success: boolean; data: PlatformSettings; message: string }>('/api/config/settings/', {
       method: 'PATCH',
       body: JSON.stringify(data),
     });
   ```

3. **Create `admin/src/views/PlatformSettings.tsx`**:
   Build an interactive Settings view featuring:
   - Input field for **Welcome Bonus Points** (default 100)
   - Input field for **Loyalty Points per Dollar** (default 10)
   - Input field for **Point USD Value** (default 0.01)
   - Live reward calculator preview box.
   - Form submission handler calling `updatePlatformSettings` with `showToast`.

4. **Update `Sidebar.tsx` (`admin/src/components/Sidebar.tsx`)**:
   Add nav item under SuperAdmin menu:
   ```tsx
   <button
     onClick={() => { setView('platform_settings'); setIsOpen(false); }}
     className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all ${
       activeView === 'platform_settings' ? activeLinkClass : inactiveLinkClass
     }`}
   >
     <Sliders size={18} />
     Platform Settings
   </button>
   ```

5. **Update `App.tsx` (`admin/src/App.tsx`)**:
   Import `PlatformSettings` component and add `case 'platform_settings': return <PlatformSettings />;` to `renderView()`.

---

## 5. Verification Method

1. **Backend Unit / Integration Verification**:
   - Run `python manage.py makemigrations` and `python manage.py migrate` in `backend/`.
   - Run python shell test:
     ```python
     python manage.py shell
     >>> from config.models import PlatformSettings
     >>> s = PlatformSettings.get_solo()
     >>> print(s.welcome_bonus_points) # Output: 100
     ```
   - Register a new user via API (`POST /api/auth/register/`):
     - Verify response includes `loyalty_points: 100`.
     - Verify `LoyaltyTransaction` has entry with `points=100` and `transaction_type='earned'`.

2. **Admin Endpoint Verification**:
   - Authenticate as SuperAdmin (`admin` / password).
   - Send `GET /api/config/settings/` → Returns status 200 with `{ "success": true, "data": { "welcome_bonus_points": 100, ... } }`.
   - Send `PATCH /api/config/settings/` with `{ "welcome_bonus_points": 150 }` → Returns updated settings data.

3. **Admin HQ UI Verification**:
   - Log in to Admin Dashboard as `admin`.
   - Click **Platform Settings** in sidebar navigation.
   - Verify values load cleanly into input fields.
   - Modify Welcome Bonus to `200` and click **Save Settings**.
   - Verify success toast notification appears and changes persist on page reload.
