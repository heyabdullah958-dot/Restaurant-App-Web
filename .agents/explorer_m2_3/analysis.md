# Milestone 2 (R2): Server-Side Coupon Validation & Atomic Counter Increments

## Executive Summary
This document presents the architecture, evidence chain, and step-by-step implementation design for **Server-Side Coupon Validation & Atomic Counter Increments** in GetFood (FoodSphere).

The core objectives are:
1. Validate promo codes on the server during order placement (`OrderCreateSerializer.validate()`) verifying code existence, active status, date validity window, minimum subtotal, restaurant ownership, and total/per-user usage limits.
2. Calculate discounts server-side (percentage vs flat amounts, with optional max discount capping) and apply them safely alongside loyalty discounts.
3. Perform atomic usage counter updates during order creation (`OrderCreateSerializer.create()`) using Django `F('times_used') + 1` DB-level atomic expressions inside an explicit `transaction.atomic()` block.
4. Integrate coupon validation and state into `CheckoutScreen.tsx` and `orderSlice.ts` on the Expo React Native app.

---

## 1. Baseline System & File Audit

### A. Coupon Model (`backend/promotions/models.py`)
- **Location**: `backend/promotions/models.py`
- **Current Fields**:
  - `code` (CharField, max_length=30, unique=True, db_index=True)
  - `discount_type` (CharField: `'percentage'` or `'flat'`)
  - `discount_value` (DecimalField)
  - `min_subtotal` (DecimalField, default=0)
  - `max_discount` (DecimalField, null=True, blank=True)
  - `restaurant` (ForeignKey to `restaurants.Restaurant`, null=True, blank=True)
  - `valid_from` (DateTimeField)
  - `valid_to` (DateTimeField)
  - `usage_limit` (IntegerField, default=100)
  - `per_user_limit` (IntegerField, default=1)
  - `is_active` (BooleanField, default=True)
  - `created_at` (DateTimeField)
- **Gap Identified**: `Coupon` model currently lacks a `times_used` integer counter field. Without `times_used`, checking total usage requires executing `self.usages.count()`, which cannot be updated atomically via Django `F()` expressions.
- **Required Change**: Add `times_used = models.IntegerField(default=0, db_index=True, help_text="Total number of times this coupon has been used.")` to `Coupon` model, create migration `0002_coupon_times_used.py`, and update helper method `is_valid()`.

### B. Order & OrderCreateSerializer (`backend/orders/serializers.py`)
- **Location**: `backend/orders/serializers.py`
- **Current Status**:
  - `OrderCreateSerializer` accepts `items`, `restaurant`, `branch`, `payment_method`, `delivery_address`, `guest_name`, `guest_phone`, `use_loyalty_points`, `points_to_redeem`.
  - Does **NOT** currently accept `coupon_code` in `Meta.fields` or `validate()`.
  - Calculates subtotal and loyalty discount, but has no coupon code validation or discount logic.
- **Required Change**:
  - Add `coupon_code = serializers.CharField(required=False, allow_blank=True, allow_null=True, write_only=True)`.
  - In `validate()`: re-verify option price modifiers, calculate true subtotal, look up `Coupon`, validate active status, date range (`valid_from <= now <= valid_to`), usage limits (`times_used < usage_limit`), per-user limits (`CouponUsage`), restaurant match, and minimum order subtotal (`min_subtotal`).
  - In `create()` inside `with transaction.atomic()`: compute coupon discount (percentage vs flat, apply max_discount cap), stack with loyalty points discount, execute atomic counter increment `Coupon.objects.filter(pk=coupon.pk, is_active=True, times_used__lt=F('usage_limit')).update(times_used=F('times_used') + 1)`, and record usage in `CouponUsage`.

### C. Coupon Validation API (`backend/promotions/serializers.py` & `views.py`)
- **Location**: `backend/promotions/serializers.py` & `backend/promotions/views.py`
- **Current Endpoint**: `POST /api/coupons/validate/`
- **Current Behavior**: Validates code, dates, min_subtotal, and restaurant, but does not check `times_used < usage_limit` or per-user limit.
- **Required Change**: Upgrade `CouponValidateSerializer` to call `coupon.is_valid()` with subtotal, user, and restaurant context, returning calculated discount and validity message.

### D. Mobile Frontend (`app/src/screens/CheckoutScreen.tsx` & `orderSlice.ts`)
- **Location**: `app/src/screens/CheckoutScreen.tsx` & `app/src/store/orderSlice.ts`
- **Current Status**: CheckoutScreen handles address auto-detection, branch selection, and loyalty points redemption, but lacks promo coupon input UI.
- **Required Change**:
  - Add Coupon Code text input and "Apply" button.
  - Wire endpoint `POST /coupons/validate/` to check coupon live before order placement.
  - Display applied coupon badge, calculated discount line item in Order Summary, and pass `coupon_code` in `placeOrder` payload.

---

## 2. Detailed Implementation Specification

### Step 1: Update Coupon Model & Migration (`backend/promotions/models.py`)

#### Proposed Model Changes:
```python
# backend/promotions/models.py

from django.db import models
from django.utils import timezone
from config.mixins import AuditLogMixin

class Coupon(AuditLogMixin, models.Model):
    DISCOUNT_TYPES = [('percentage', '%'), ('flat', 'Flat Rs.')]
    
    code = models.CharField(max_length=30, unique=True, db_index=True)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    min_subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    restaurant = models.ForeignKey('restaurants.Restaurant', on_delete=models.CASCADE, null=True, blank=True)
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()
    usage_limit = models.IntegerField(default=100)
    times_used = models.IntegerField(default=0, db_index=True, help_text="Total number of times this coupon has been used across all orders.")
    per_user_limit = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.code} ({self.discount_type} {self.discount_value})"
        
    def is_valid_for(self, subtotal=None, user=None, restaurant_id=None):
        """
        Comprehensive validity check helper. Returns tuple: (is_valid: bool, error_message: str)
        """
        now = timezone.now()
        if not self.is_active:
            return False, "This coupon code is inactive."
        if now < self.valid_from:
            return False, "This coupon code is not active yet."
        if now > self.valid_to:
            return False, "This coupon code has expired."
        if self.usage_limit is not None and self.times_used >= self.usage_limit:
            return False, "This coupon code has reached its maximum usage limit."
        if restaurant_id and self.restaurant_id and self.restaurant_id != restaurant_id:
            return False, "This coupon code is not valid for the selected restaurant."
        if subtotal is not None and Decimal(str(subtotal)) < self.min_subtotal:
            return False, f"Minimum order subtotal of Rs. {self.min_subtotal:.0f} is required for this coupon."
        if user and user.is_authenticated and not getattr(user, 'is_guest', False) and self.per_user_limit:
            used_count = self.usages.filter(user=user).count()
            if used_count >= self.per_user_limit:
                return False, "You have already reached the maximum usage limit for this coupon."
        return True, "Coupon is valid."

    def calculate_discount(self, subtotal):
        """
        Calculate discount amount for a given subtotal.
        """
        subtotal_dec = Decimal(str(subtotal))
        if self.discount_type == 'percentage':
            discount = subtotal_dec * (self.discount_value / Decimal('100.00'))
            if self.max_discount is not None:
                discount = min(discount, self.max_discount)
        else:  # 'flat'
            discount = self.discount_value
        return min(discount, subtotal_dec)
```

#### Migration File (`backend/promotions/migrations/0002_coupon_times_used.py`):
```python
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('promotions', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='coupon',
            name='times_used',
            field=models.IntegerField(db_index=True, default=0, help_text='Total number of times this coupon has been used across all orders.'),
        ),
    ]
```

---

### Step 2: Server-Side Coupon Validation in `OrderCreateSerializer` (`backend/orders/serializers.py`)

#### Code Modifications for `OrderCreateSerializer`:

```python
# In backend/orders/serializers.py

from promotions.models import Coupon, CouponUsage
from django.utils import timezone

class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderCreateItemSerializer(many=True, write_only=True)
    use_loyalty_points = serializers.BooleanField(required=False, default=False, write_only=True)
    points_to_redeem = serializers.IntegerField(required=False, default=0, min_value=0, write_only=True)
    coupon_code = serializers.CharField(required=False, allow_blank=True, allow_null=True, write_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'tracking_token', 'restaurant', 'branch', 'guest_name', 'guest_phone', 'payment_method',
            'delivery_address', 'delivery_lat', 'delivery_lng', 'special_instructions',
            'items', 'subtotal', 'delivery_fee', 'discount', 'total',
            'use_loyalty_points', 'points_to_redeem', 'coupon_code'
        )
        read_only_fields = ('id', 'tracking_token', 'subtotal', 'delivery_fee', 'discount', 'total')

    def validate(self, attrs):
        request = self.context.get('request')

        # 1. Require phone for all users
        is_guest_or_anon = (
            not request or
            not request.user or
            request.user.is_anonymous or
            (hasattr(request.user, 'is_guest') and request.user.is_guest)
        )
        
        has_phone = bool(attrs.get('guest_phone')) or (not is_guest_or_anon and getattr(request.user, 'phone', None))
        if not has_phone:
            raise serializers.ValidationError("A contact phone number is required to place an order.")

        if is_guest_or_anon and not attrs.get('guest_name'):
            raise serializers.ValidationError("Guest name is required for guest checkout.")

        # 2. Must have at least one item
        items = attrs.get('items', [])
        if not items:
            raise serializers.ValidationError("Order must have at least one menu item.")

        # 3. Validate item availability
        restaurant = attrs.get('restaurant')
        for item_data in items:
            menu_item = item_data['menu_item']
            if not menu_item.is_available:
                raise serializers.ValidationError(
                    f"'{menu_item.name}' is currently unavailable. Please remove it from your cart and try again."
                )

        # 4. Calculate accurate subtotal with DB option verification
        subtotal = Decimal('0.00')
        for item in items:
            menu_item = item['menu_item']
            item_price = menu_item.price
            selected_opts = item.get('selected_options', [])
            db_options = menu_item.options or []
            price_modifier_sum = Decimal('0.00')
            for opt in selected_opts:
                if isinstance(opt, dict) and opt.get('name'):
                    matched_db_opt = next((o for o in db_options if isinstance(o, dict) and o.get('name') == opt.get('name')), None)
                    if matched_db_opt:
                        try:
                            mod_val = float(matched_db_opt.get('price_modifier', 0) or 0)
                            price_modifier_sum += Decimal(str(max(0.0, mod_val)))
                        except (ValueError, TypeError):
                            pass
            item_price += price_modifier_sum
            subtotal += item_price * item['quantity']

        # 5. Minimum order amount for restaurant
        if restaurant and restaurant.min_order_amount > 0:
            if subtotal < restaurant.min_order_amount:
                raise serializers.ValidationError(
                    f"Minimum order amount for {restaurant.name} is Rs. {restaurant.min_order_amount:.0f}. "
                    f"Your subtotal is Rs. {subtotal:.0f}."
                )

        # 6. Validate loyalty points redemption
        use_loyalty = attrs.get('use_loyalty_points', False)
        pts_to_redeem = attrs.get('points_to_redeem', 0)
        if use_loyalty or pts_to_redeem > 0:
            if is_guest_or_anon:
                raise serializers.ValidationError("Loyalty points can only be redeemed by registered accounts.")
            user_pts = getattr(request.user, 'loyalty_points', 0)
            if pts_to_redeem > user_pts:
                raise serializers.ValidationError(
                    f"You only have {user_pts} loyalty points available (requested {pts_to_redeem})."
                )

        # 7. SERVER-SIDE COUPON VALIDATION
        coupon_code = attrs.get('coupon_code')
        if coupon_code and coupon_code.strip():
            code_str = coupon_code.strip()
            try:
                coupon = Coupon.objects.get(code__iexact=code_str)
            except Coupon.DoesNotExist:
                raise serializers.ValidationError({'coupon_code': f"Invalid coupon code '{code_str}'."})

            user_obj = request.user if (request and request.user and request.user.is_authenticated) else None
            is_valid, err_msg = coupon.is_valid_for(
                subtotal=subtotal,
                user=user_obj,
                restaurant_id=restaurant.id if restaurant else None
            )
            if not is_valid:
                raise serializers.ValidationError({'coupon_code': err_msg})

            attrs['_validated_coupon'] = coupon

        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            items_data = validated_data.pop('items')
            use_loyalty = validated_data.pop('use_loyalty_points', False)
            pts_to_redeem = validated_data.pop('points_to_redeem', 0)
            coupon_code = validated_data.pop('coupon_code', None)
            coupon_obj = validated_data.pop('_validated_coupon', None)
            restaurant = validated_data['restaurant']

            request = self.context.get('request')
            user = None
            if request and request.user and request.user.is_authenticated:
                user = request.user
                if (user.is_guest or not user.phone) and validated_data.get('guest_phone'):
                    user.phone = validated_data.get('guest_phone', '')
                    user.save()

            # Calculate Subtotal and OrderItems
            subtotal = Decimal('0.00')
            order_items_to_create = []

            for item_data in items_data:
                menu_item = item_data['menu_item']
                quantity = item_data['quantity']

                if menu_item.category.restaurant != restaurant:
                    raise serializers.ValidationError(
                        f"Menu item '{menu_item.name}' does not belong to restaurant '{restaurant.name}'."
                    )

                unit_price = menu_item.price
                selected_opts = item_data.get('selected_options', [])
                db_options = menu_item.options or []
                price_modifier_sum = Decimal('0.00')
                sanitized_selected_options = []

                for opt in selected_opts:
                    if isinstance(opt, dict) and opt.get('name'):
                        matched_db_opt = next((o for o in db_options if isinstance(o, dict) and o.get('name') == opt.get('name')), None)
                        if matched_db_opt:
                            try:
                                mod_val = float(matched_db_opt.get('price_modifier', 0) or 0)
                                mod_dec = Decimal(str(max(0.0, mod_val)))
                                price_modifier_sum += mod_dec
                                sanitized_selected_options.append({
                                    'name': opt.get('name'),
                                    'price_modifier': float(mod_dec)
                                })
                            except (ValueError, TypeError):
                                sanitized_selected_options.append(opt)
                        else:
                            sanitized_selected_options.append(opt)

                unit_price += price_modifier_sum
                total_price = unit_price * quantity
                subtotal += total_price

                order_items_to_create.append({
                    'menu_item': menu_item,
                    'quantity': quantity,
                    'unit_price': unit_price,
                    'total_price': total_price,
                    'special_notes': item_data.get('special_notes', ''),
                    'selected_options': sanitized_selected_options
                })

            delivery_fee = restaurant.delivery_fee
            
            # --- DISCOUNT COMPUTATION ---
            coupon_discount = Decimal('0.00')
            if coupon_obj:
                coupon_discount = coupon_obj.calculate_discount(subtotal)

            loyalty_discount = Decimal('0.00')
            actual_pts_redeemed = 0
            remaining_subtotal_after_coupon = max(Decimal('0.00'), subtotal - coupon_discount)

            if user and not user.is_guest and (use_loyalty or pts_to_redeem > 0):
                user.refresh_from_db()
                avail_pts = user.loyalty_points
                actual_pts_redeemed = min(pts_to_redeem if pts_to_redeem > 0 else avail_pts, avail_pts, int(remaining_subtotal_after_coupon))
                if actual_pts_redeemed > 0:
                    loyalty_discount = Decimal(actual_pts_redeemed)

            total_discount = min(coupon_discount + loyalty_discount, subtotal)
            total = subtotal + delivery_fee - total_discount
            total = max(Decimal('0.00'), round(total, 2))

            # Create Order
            order = Order.objects.create(
                user=user,
                subtotal=subtotal,
                delivery_fee=delivery_fee,
                discount=total_discount,
                total=total,
                **validated_data
            )

            # Deduct loyalty points atomically if redeemed
            if user and not user.is_guest and actual_pts_redeemed > 0:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                updated_count = User.objects.filter(pk=user.pk, loyalty_points__gte=actual_pts_redeemed).update(
                    loyalty_points=F('loyalty_points') - actual_pts_redeemed
                )
                if updated_count == 0:
                    raise serializers.ValidationError("Insufficient loyalty points balance.")
                    
                from users.models import LoyaltyTransaction
                LoyaltyTransaction.objects.create(
                    user=user,
                    order=order,
                    points=actual_pts_redeemed,
                    transaction_type='redeemed',
                    description=f"Redeemed {actual_pts_redeemed} points for Rs. {actual_pts_redeemed} discount on Order #{order.id}"
                )

            # --- ATOMIC COUPON USAGE INCREMENT ---
            if coupon_obj:
                updated_rows = Coupon.objects.filter(
                    pk=coupon_obj.pk,
                    is_active=True,
                    times_used__lt=F('usage_limit')
                ).update(times_used=F('times_used') + 1)

                if updated_rows == 0:
                    raise serializers.ValidationError("Coupon usage limit reached during checkout. Please remove the coupon and try again.")

                CouponUsage.objects.create(
                    coupon=coupon_obj,
                    user=user if (user and not user.is_guest) else None,
                    order=order
                )

            # Auto-assign branch if unassigned
            if not order.branch:
                from config.admin_utils import resolve_branch_for_order
                assigned_branch = resolve_branch_for_order(
                    restaurant,
                    order.delivery_address,
                    order.delivery_lat,
                    order.delivery_lng
                )
                if assigned_branch:
                    order.branch = assigned_branch
                    order.save(update_fields=['branch'])

            # Create OrderItems
            for item in order_items_to_create:
                OrderItem.objects.create(order=order, **item)

            # Award loyalty points on net total
            if user and not user.is_guest:
                ratio = getattr(restaurant, 'loyalty_points_ratio', 100)
                if ratio > 0:
                    earned_points = int(total // ratio)
                    if earned_points > 0:
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        User.objects.filter(pk=user.pk).update(
                            loyalty_points=F('loyalty_points') + earned_points
                        )
                        from users.models import LoyaltyTransaction
                        LoyaltyTransaction.objects.create(
                            user=user,
                            order=order,
                            points=earned_points,
                            transaction_type='earned',
                            description=f"Points earned on Order #{order.id} (Ratio: 1 point per Rs. {ratio})"
                        )

            return order
```

---

### Step 3: Enhance `CouponValidateSerializer` & `CouponValidateView` (`backend/promotions/serializers.py` & `views.py`)

#### Serializer Update (`backend/promotions/serializers.py`):
```python
class CouponValidateSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=30)
    subtotal = serializers.DecimalField(max_digits=10, decimal_places=2)
    restaurant_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate(self, data):
        code = data.get('code')
        try:
            coupon = Coupon.objects.get(code__iexact=code.strip())
        except Coupon.DoesNotExist:
            raise serializers.ValidationError("Invalid coupon code.")
            
        request = self.context.get('request')
        user = request.user if (request and request.user and request.user.is_authenticated) else None
        
        is_valid, err_msg = coupon.is_valid_for(
            subtotal=data.get('subtotal'),
            user=user,
            restaurant_id=data.get('restaurant_id')
        )
        if not is_valid:
            raise serializers.ValidationError(err_msg)
            
        data['coupon_obj'] = coupon
        return data
```

#### View Update (`backend/promotions/views.py`):
```python
class CouponValidateView(views.APIView):
    permission_classes = [permissions.AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = CouponValidateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        coupon = serializer.validated_data['coupon_obj']
        subtotal = serializer.validated_data['subtotal']
        discount = coupon.calculate_discount(subtotal)
        
        return Response({
            'valid': True,
            'code': coupon.code,
            'discount': float(discount),
            'discount_type': coupon.discount_type,
            'discount_value': float(coupon.discount_value),
            'min_subtotal': float(coupon.min_subtotal),
            'message': f"Coupon '{coupon.code}' applied! Saved Rs. {float(discount):.2f}"
        })
```

---

### Step 4: Mobile App UI & Store Wiring (`CheckoutScreen.tsx` & `orderSlice.ts`)

#### A. In `app/src/store/orderSlice.ts`:
Extend `placeOrder` payload interface to accept `coupon_code?: string`:
```typescript
export const placeOrder = createAsyncThunk(
  'order/placeOrder',
  async (orderData: {
    restaurant: number;
    branch?: number;
    guest_name?: string;
    guest_phone?: string;
    items: Array<{ menu_item: number; quantity: number; special_notes?: string; selected_options?: any[] }>;
    payment_method: string;
    delivery_address: string;
    special_instructions?: string;
    use_loyalty_points?: boolean;
    points_to_redeem?: number;
    coupon_code?: string;
  }, { dispatch, rejectWithValue }) => {
     ...
  }
);
```

#### B. In `app/src/screens/CheckoutScreen.tsx`:
Add Promo Coupon Input UI & Validation Logic:
```tsx
// State variables
const [couponCode, setCouponCode] = useState('');
const [appliedCoupon, setAppliedCoupon] = useState<{
  code: string;
  discount: number;
  discount_type: string;
  discount_value: number;
} | null>(null);
const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

const handleApplyCoupon = async () => {
  if (!couponCode.trim()) {
    showAlert('Promo Code', 'Please enter a valid promo code.');
    return;
  }
  setIsValidatingCoupon(true);
  try {
    const res = await api.post('/coupons/validate/', {
      code: couponCode.trim().toUpperCase(),
      subtotal: subtotal,
      restaurant_id: restaurantId,
    });
    const data = res.data || res;
    if (data.valid) {
      setAppliedCoupon(data);
      showAlert('Success!', data.message || `Coupon '${data.code}' applied successfully.`);
    } else {
      showAlert('Invalid Coupon', data.message || 'The coupon code is invalid or expired.');
    }
  } catch (err: any) {
    const errorMsg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || err.response?.data?.message || 'Invalid or expired coupon code.';
    showAlert('Coupon Error', errorMsg);
  } finally {
    setIsValidatingCoupon(false);
  }
};

const handleRemoveCoupon = () => {
  setAppliedCoupon(null);
  setCouponCode('');
};

// Pricing calculation updates
const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
const totalDiscount = discount + couponDiscount; // discount is loyalty points discount
const finalTotal = Math.max(0, subtotal + deliveryFee - totalDiscount);

// In handlePlaceOrder payload:
const orderData: any = {
  restaurant: restaurantId,
  branch: selectedBranchId || undefined,
  items: orderItems,
  payment_method: paymentMethod,
  delivery_address: address.trim(),
  special_instructions: finalInstructions || undefined,
  guest_name: effectiveName,
  guest_phone: effectivePhone,
  use_loyalty_points: useLoyaltyPoints,
  points_to_redeem: useLoyaltyPoints ? maxRedeemablePoints : 0,
  coupon_code: appliedCoupon ? appliedCoupon.code : undefined,
};
```

#### Coupon Input Section UI Card:
```tsx
{/* Promo Code / Coupon Section */}
<View style={styles.sectionCard}>
  <Text style={styles.sectionTitle}>Promo Code / Coupon</Text>

  {appliedCoupon ? (
    <View style={styles.appliedCouponContainer}>
      <View style={styles.appliedCouponInfo}>
        <Ionicons name="pricetag" size={20} color={COLORS.success} />
        <View style={{ marginLeft: 8 }}>
          <Text style={styles.appliedCouponCode}>{appliedCoupon.code}</Text>
          <Text style={styles.appliedCouponDiscount}>
            Discount Applied: -Rs. {appliedCoupon.discount.toFixed(2)}
          </Text>
        </View>
      </View>
      <TouchableOpacity activeOpacity={0.8} onPress={handleRemoveCoupon} style={styles.removeCouponBtn}>
        <Text style={styles.removeCouponText}>Remove</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <View style={styles.couponInputRow}>
      <TextInput
        style={[styles.input, { flex: 1, textTransform: 'uppercase', marginBottom: 0 }]}
        placeholder="Enter promo code (e.g. WELCOME10)"
        placeholderTextColor={COLORS.gray}
        value={couponCode}
        onChangeText={(txt) => setCouponCode(txt.toUpperCase())}
        autoCapitalize="characters"
      />
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.applyCouponBtn, isValidatingCoupon && { opacity: 0.7 }]}
        onPress={handleApplyCoupon}
        disabled={isValidatingCoupon}
      >
        {isValidatingCoupon ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <Text style={styles.applyCouponBtnText}>Apply</Text>
        )}
      </TouchableOpacity>
    </View>
  )}
</View>
```

---

## 3. Atomic ORM Update & Race Condition Safety

### Thread-Safe Counter Increment Logic
```python
updated_rows = Coupon.objects.filter(
    pk=coupon_obj.pk,
    is_active=True,
    times_used__lt=F('usage_limit')
).update(times_used=F('times_used') + 1)
```

1. **Why `F()` Expression?**: `F('times_used') + 1` performs the SQL arithmetic `SET times_used = times_used + 1` directly at the database level. It avoids Python-side read-modify-write race conditions under concurrent requests.
2. **Atomic Guard (`times_used__lt=F('usage_limit')`)**: The SQL `WHERE` clause enforces that `times_used < usage_limit` at the exact instant the `UPDATE` query executes in the database engine.
3. **Transaction Rollback on Zero Updates**: If 2 concurrent orders compete for the last available slot (`times_used = 99`, `usage_limit = 100`), thread A will update 1 row (`times_used` becomes 100). Thread B's query will evaluate `WHERE times_used < 100`, match 0 rows, and `update()` will return `0`. Catching `updated_rows == 0` and raising `serializers.ValidationError()` forces a clean transaction rollback for thread B.

---

## 4. Verification & Testing Plan

1. **Unit Test / Validation Scenarios**:
   - Submit order with valid active coupon code (`WELCOME10`) -> verify discount applied and `times_used` incremented by 1.
   - Submit order with expired coupon (`valid_to < now`) -> verify validation error "This coupon code has expired."
   - Submit order with subtotal below `min_subtotal` -> verify validation error "Minimum order subtotal of Rs. X is required."
   - Submit order when `times_used == usage_limit` -> verify validation error "This coupon code has reached its maximum usage limit."
   - Submit order for wrong restaurant -> verify validation error "This coupon code is not valid for the selected restaurant."
   - Simulate concurrent checkouts on single coupon limit -> verify atomic counter increment prevents over-subscription.

2. **Integration Verification Command**:
   - `python backend/manage.py test orders.tests`
   - `python backend/manage.py test promotions.tests`
