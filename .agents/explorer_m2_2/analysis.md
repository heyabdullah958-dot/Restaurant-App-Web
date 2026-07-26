# Comprehensive Technical Analysis: Delivery Radius & Operating Hours Enforcement

**Milestone**: Milestone 2 (R2: Core Operations & Backend Wiring)  
**Agent**: Explorer 2 (`explorer_m2_2`)  
**Target Areas**: 
- Backend Django Models: `backend/restaurants/models.py`, `backend/orders/models.py`
- Backend Django Serializers & Views: `backend/orders/serializers.py`, `backend/restaurants/serializers.py`, `backend/restaurants/views.py`, `backend/config/admin_utils.py`
- Frontend Mobile App: `app/src/screens/CheckoutScreen.tsx`, `app/src/screens/RestaurantScreen.tsx`

---

## 1. Executive Summary

This investigation details the design and step-by-step implementation for two critical core operational features of **GetFood (FoodSphere)**:
1. **Delivery Radius Enforcement**: Haversine formula-based geographical distance validation preventing customers outside a branch's service zone from placing orders (both server-side DRF validation and client-side Expo Location validation).
2. **Operating Hours Enforcement**: Dynamic server-side calculation of `is_currently_open` (accounting for overnight operations, e.g., 6:00 PM to 2:00 AM, and super-admin master overrides) coupled with immediate frontend lockdown of menu item add-to-cart controls and checkout actions.

---

## 2. Delivery Radius Enforcement Design

### 2.1 Model Enhancements (`Branch` Model in `backend/restaurants/models.py`)

Currently, `Branch` has fields `name`, `address`, `phone`, `is_active`, and `area_keywords`. Branch coordinates are currently looked up from `BRANCH_COORDINATES` in `config/admin_utils.py`. To enable per-branch configurable delivery zones and exact GPS matching, `Branch` requires explicit fields:

```python
# Proposed additions to Branch model in backend/restaurants/models.py
class Branch(models.Model):
    # ... existing fields ...
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        help_text="Latitude coordinate for Haversine distance calculations."
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True,
        help_text="Longitude coordinate for Haversine distance calculations."
    )
    delivery_radius_km = models.DecimalField(
        max_digits=5, decimal_places=2, default=10.00,
        help_text="Maximum allowed delivery radius in kilometers (e.g. 5.00 or 10.00 km)."
    )
```

#### Fallback Coordinate Resolution
If `branch.latitude` or `branch.longitude` is `None` in the database, backend calculations fall back to the `BRANCH_COORDINATES` mapping defined in `backend/config/admin_utils.py`:
- `johar town` / `johar`: `(31.4690, 74.2917)`
- `lake city`: `(31.3650, 74.2480)`
- `gt road baghbanpura` / `baghbanpura`: `(31.5714, 74.3800)`
- `dha`: `(31.4700, 74.3750)`
- `gulberg`: `(31.5150, 74.3450)`
- `saddar`: `(31.5350, 74.3700)`

---

### 2.2 Server-Side Haversine Formula (`backend/config/admin_utils.py`)

The Haversine formula calculates the great-circle distance between two points on a sphere given their longitudes and latitudes.

$$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$

Where:
- $R = 6371.0 \text{ km}$ (Earth's mean radius)
- $\phi_1, \phi_2$ = latitudes in radians
- $\Delta \phi = \phi_2 - \phi_1$
- $\Delta \lambda = \lambda_2 - \lambda_1$

#### Python Implementation in `backend/config/admin_utils.py`:
```python
def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance in kilometers between two points
    on the earth (specified in decimal degrees).
    """
    import math
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
    except (ValueError, TypeError):
        return float('inf')
        
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c
```

---

### 2.3 Server-Side Enforcement in `OrderCreateSerializer` (`backend/orders/serializers.py`)

In `OrderCreateSerializer.validate()`:
1. Extract `delivery_lat` and `delivery_lng` from order payload `attrs`.
2. Extract or resolve the target `Branch`:
   - If `attrs.get('branch')` is present, use that `Branch`.
   - Otherwise, call `resolve_branch_for_order(restaurant, delivery_address, delivery_lat, delivery_lng)`.
3. Retrieve branch coordinates (`b_lat`, `b_lng`) from database fields or fallback dictionary.
4. Calculate distance using `haversine_distance(delivery_lat, delivery_lng, b_lat, b_lng)`.
5. Compare `distance` with `branch.delivery_radius_km` (defaulting to 10.0 km if undefined).
6. If `distance > radius`, raise `serializers.ValidationError`:
   ```python
   raise serializers.ValidationError({
       "delivery_lat": (
           f"Delivery location ({distance:.1f} km away) exceeds the maximum delivery "
           f"radius of {radius:.1f} km for {branch.name} branch."
       )
   })
   ```

#### Code Modification Snippet for `backend/orders/serializers.py`:
```python
# In OrderCreateSerializer.validate(self, attrs):
delivery_lat = attrs.get('delivery_lat')
delivery_lng = attrs.get('delivery_lng')
restaurant = attrs.get('restaurant')
branch = attrs.get('branch')

if delivery_lat is not None and delivery_lng is not None and restaurant:
    if not branch:
        from config.admin_utils import resolve_branch_for_order
        branch = resolve_branch_for_order(restaurant, attrs.get('delivery_address', ''), delivery_lat, delivery_lng)

    if branch:
        from config.admin_utils import haversine_distance, BRANCH_COORDINATES
        b_lat = float(branch.latitude) if branch.latitude is not None else None
        b_lng = float(branch.longitude) if branch.longitude is not None else None
        
        if b_lat is None or b_lng is None:
            b_name_lower = branch.name.lower().strip()
            coords = BRANCH_COORDINATES.get(b_name_lower)
            if not coords:
                for key, val in BRANCH_COORDINATES.items():
                    if key in b_name_lower:
                        coords = val
                        break
            if coords:
                b_lat, b_lng = coords

        if b_lat is not None and b_lng is not None:
            dist_km = haversine_distance(delivery_lat, delivery_lng, b_lat, b_lng)
            max_radius = float(getattr(branch, 'delivery_radius_km', 10.0) or 10.0)
            if dist_km > max_radius:
                raise serializers.ValidationError(
                    f"Your delivery location is {dist_km:.1f} km away from {branch.name} Branch, "
                    f"which exceeds the maximum delivery radius of {max_radius:.1f} km. "
                    f"Please select a closer branch or update your address."
                )
```

---

### 2.4 Client-Side Enforcement (`app/src/screens/CheckoutScreen.tsx`)

In `CheckoutScreen.tsx`:
1. Maintain `deliveryLat` and `deliveryLng` state when user runs `handleDetectLocation()` or inputs address coordinates.
2. Implement TypeScript Haversine helper function:
   ```typescript
   function getHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
     const R = 6371; // Earth radius in km
     const dLat = (lat2 - lat1) * (Math.PI / 180);
     const dLon = (lon2 - lon1) * (Math.PI / 180);
     const a =
       Math.sin(dLat / 2) * Math.sin(dLat / 2) +
       Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
       Math.sin(dLon / 2) * Math.sin(dLon / 2);
     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
     return R * c;
   }
   ```
3. In `handlePlaceOrder()`, prior to dispatching `placeOrder`:
   - Obtain `selectedBranch` from state.
   - If `deliveryLat` & `deliveryLng` are available and branch has coordinates (or matching fallback coordinates):
     - Compute `distanceKm`.
     - Read `branch.delivery_radius_km || 10.0`.
     - If `distanceKm > radius`, block checkout and display alert:
       ```typescript
       showAlert(
         'Out of Delivery Range',
         `The selected branch (${selectedBranch.name}) only delivers within ${radius} km. Your location is ${distanceKm.toFixed(1)} km away.`
       );
       setIsSubmitting(false);
       return;
       ```

---

## 3. Operating Hours Enforcement Design

### 3.1 Backend Dynamic Serializer Property (`is_currently_open`)

Working hours logic must handle:
- **Standard day shift**: e.g., `opens_at = 09:00:00`, `closes_at = 23:00:00` ($opens\_at \le closes\_at$)
- **Overnight shift**: e.g., `opens_at = 18:00:00`, `closes_at = 02:00:00` ($opens\_at > closes\_at$)
- **Super-Admin Master Override**: `is_force_closed = True` forces `is_currently_open = False`.
- **Inactivity Check**: `is_active = False` forces `is_currently_open = False`.

#### Python Calculation Logic:
```python
from django.utils import timezone

def calculate_is_currently_open(opens_at, closes_at, is_active=True, is_force_closed=False):
    if is_force_closed or not is_active:
        return False
    if not opens_at or not closes_at:
        return True
        
    now_time = timezone.localtime().time()
    
    if opens_at <= closes_at:
        # Standard day shift
        return opens_at <= now_time <= closes_at
    else:
        # Overnight shift (e.g. 6 PM to 2 AM next day)
        return now_time >= opens_at or now_time <= closes_at
```

#### Serializer Property Wiring in `backend/restaurants/serializers.py`:

1. **`BranchSerializer`**:
```python
class BranchSerializer(serializers.ModelSerializer):
    is_currently_open = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = ('id', 'restaurant', 'name', 'address', 'phone', 'is_active', 'area_keywords', 
                  'delivery_radius_km', 'latitude', 'longitude', 'is_currently_open')

    def get_is_currently_open(self, obj):
        if not obj.is_active or obj.restaurant.is_force_closed or not obj.restaurant.is_active:
            return False
        from django.utils import timezone
        now_time = timezone.localtime().time()
        opens_at = obj.restaurant.opens_at
        closes_at = obj.restaurant.closes_at
        if not opens_at or not closes_at:
            return True
        if opens_at <= closes_at:
            return opens_at <= now_time <= closes_at
        else:
            return now_time >= opens_at or now_time <= closes_at
```

2. **`RestaurantSerializer` & `RestaurantDetailSerializer`**:
```python
class RestaurantSerializer(serializers.ModelSerializer):
    # ... existing fields ...
    is_currently_open = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Restaurant
        fields = (
            'id', 'name', 'slug', 'cuisine_type', 'logo', 'cover_image', 'banner_image',
            'description', 'address', 'city', 'phone', 'is_active', 'is_force_closed', 
            'is_open', 'is_currently_open', 'is_featured', 'opens_at', 'closes_at', 
            'delivery_time_min', 'delivery_time_max', 'min_order_amount', 'delivery_fee', 
            'rating', 'total_reviews', 'loyalty_points_ratio', 'branches'
        )

    def get_is_currently_open(self, obj):
        if obj.is_force_closed or not obj.is_active:
            return False
        from django.utils import timezone
        now_time = timezone.localtime().time()
        opens_at = obj.opens_at
        closes_at = obj.closes_at
        if not opens_at or not closes_at:
            return True
        if opens_at <= closes_at:
            return opens_at <= now_time <= closes_at
        else:
            return now_time >= opens_at or now_time <= closes_at
```

3. **`BranchListView` in `backend/restaurants/views.py`**:
Update response structure in `BranchListView` so branch endpoints include `is_currently_open`, `delivery_radius_km`, `latitude`, `longitude`.

---

### 3.2 Mobile App UI Lockdown (`app/src/screens/RestaurantScreen.tsx`)

In `RestaurantScreen.tsx`:

1. **Calculate Restaurant Open Status**:
   ```typescript
   const isOpen = useMemo(() => {
     if (!restaurant) return false;
     if (restaurant.is_force_closed || restaurant.is_active === false) return false;
     if (typeof (restaurant as any).is_currently_open === 'boolean') {
       return (restaurant as any).is_currently_open;
     }
     return isRestaurantOpen(restaurant);
   }, [restaurant]);
   ```

2. **Display Prominent Banner**:
   When `isOpen === false`, render a high-visibility warning banner in `infoCard` or immediately under header:
   ```tsx
   {!isOpen && (
     <View style={styles.closedBanner}>
       <Ionicons name="time-outline" size={20} color="#ffffff" />
       <View style={{ flex: 1, marginLeft: 8 }}>
         <Text style={styles.closedBannerTitle}>CLOSED NOW</Text>
         <Text style={styles.closedBannerSubtitle}>
           Working Hours: {restaurant.opens_at?.slice(0, 5)} - {restaurant.closes_at?.slice(0, 5)}
         </Text>
       </View>
     </View>
   )}
   ```

3. **Lock Add-to-Cart Controls**:
   In `MenuItemCard` and `RestaurantScreen`:
   - When `!isOpen`, disable the `ADD` button or show `CLOSED` badge.
   - If user taps item card or button when closed, trigger `showAlert('Restaurant Closed', 'This restaurant is currently closed and not accepting orders.')`.

4. **Disable Sticky Cart Bar & Checkout**:
   In `RestaurantScreen.tsx` and `CheckoutScreen.tsx`:
   - If `!isOpen` or all branches are closed, disable the sticky cart bar or block `handlePlaceOrder()`.

---

## 4. Step-by-Step File Revision Roadmap

| File Path | Component / Layer | Primary Changes Needed |
|---|---|---|
| `backend/restaurants/models.py` | Django Model | Add `latitude`, `longitude`, `delivery_radius_km` fields to `Branch` model. |
| `backend/restaurants/serializers.py` | DRF Serializers | Add `is_currently_open` SerializerMethodField to `BranchSerializer`, `RestaurantSerializer`, `RestaurantDetailSerializer`. Add `delivery_radius_km`, `latitude`, `longitude` to `BranchSerializer` fields. |
| `backend/restaurants/views.py` | DRF Views | Update `BranchListView` output dict to include `delivery_radius_km`, `latitude`, `longitude`, `is_currently_open`. |
| `backend/orders/serializers.py` | DRF Serializer | In `OrderCreateSerializer.validate()`, check `haversine_distance` between delivery lat/lng and branch coordinates vs `branch.delivery_radius_km`. |
| `app/src/screens/CheckoutScreen.tsx` | Mobile App Screen | Add client-side Haversine validation; block checkout if distance > branch radius. |
| `app/src/screens/RestaurantScreen.tsx` | Mobile App Screen | Use `is_currently_open` flag; show "CLOSED NOW" banner; lock "ADD" buttons and cart bar when closed. |

---

## 5. Verification & Testing Protocol

1. **Haversine Calculation Unit Tests**:
   - Customer at Johar Town `(31.4690, 74.2917)` ordering from Johar Town branch `(31.4690, 74.2917)` -> Distance: 0.0 km (Passes).
   - Customer at Gulberg `(31.5150, 74.3450)` ordering from Johar Town branch `(31.4690, 74.2917)` -> Distance ~7.2 km (Passes if radius = 10.0 km, Fails if radius = 5.0 km with HTTP 400 validation error).
2. **Operating Hours Unit Tests**:
   - Current time 14:00, `opens_at = 11:00`, `closes_at = 23:00` -> `is_currently_open = True`.
   - Current time 01:00, `opens_at = 18:00`, `closes_at = 02:00` -> `is_currently_open = True` (Overnight shift test).
   - Current time 04:00, `opens_at = 18:00`, `closes_at = 02:00` -> `is_currently_open = False`.
   - `is_force_closed = True` -> `is_currently_open = False`.
3. **Frontend Verification**:
   - Inspect banner rendering on `RestaurantScreen.tsx` when `is_currently_open = False`.
   - Confirm "ADD" buttons are disabled and `showAlert` triggers if clicked when closed.
