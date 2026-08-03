from decimal import Decimal
from rest_framework import serializers
from django.db import transaction
from django.db.models import F
from .models import Order, OrderItem
from restaurants.models import MenuItem, Restaurant, BranchRider
from restaurants.serializers import RestaurantSerializer, build_absolute_image_url, BranchRiderSerializer
from promotions.models import Coupon, CouponUsage


class OrderItemSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source='menu_item.name', read_only=True)

    class Meta:
        model = OrderItem
        fields = ('id', 'menu_item', 'menu_item_name', 'quantity', 'unit_price', 'total_price', 'special_notes', 'selected_options')
        read_only_fields = ('unit_price', 'total_price')


class OrderCreateItemSerializer(serializers.Serializer):
    menu_item = serializers.PrimaryKeyRelatedField(
        queryset=MenuItem.objects.select_related('category__restaurant')
    )
    quantity = serializers.IntegerField(min_value=1, max_value=100)
    special_notes = serializers.CharField(
        required=False, 
        allow_blank=True, 
        allow_null=True,
        max_length=500
    )
    selected_options = serializers.JSONField(required=False, default=list)


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderCreateItemSerializer(many=True, write_only=True)
    use_loyalty_points = serializers.BooleanField(required=False, default=False, write_only=True)
    points_to_redeem = serializers.IntegerField(required=False, default=0, min_value=0, write_only=True)
    coupon_code = serializers.CharField(required=False, allow_blank=True, allow_null=True, write_only=True)
    delivery_address = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    delivery_lat = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True, coerce_to_string=False)
    delivery_lng = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True, coerce_to_string=False)
    order_type = serializers.CharField(required=False, default='DELIVERY')
    table_number = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            for coord_key in ('delivery_lat', 'delivery_lng'):
                val = data.get(coord_key)
                if val is not None and isinstance(val, (float, int, str)):
                    try:
                        data[coord_key] = round(float(val), 6)
                    except (ValueError, TypeError):
                        pass
        return super().to_internal_value(data)

    class Meta:
        model = Order
        fields = (
            'id', 'display_order_id', 'tracking_token', 'restaurant', 'branch', 'guest_name', 'guest_phone', 'payment_method',
            'order_type', 'table_number', 'delivery_address', 'delivery_lat', 'delivery_lng', 'special_instructions',
            'items', 'subtotal', 'delivery_fee', 'discount', 'total',
            'use_loyalty_points', 'points_to_redeem', 'coupon_code'
        )
        read_only_fields = ('id', 'tracking_token', 'subtotal', 'delivery_fee', 'discount', 'total')

    def validate(self, attrs):
        """
        Validate guest fields, operating hours, distance radius, coupon validity, min order amount, and loyalty redemption.
        """
        request = self.context.get('request')

        # Require phone for all users
        is_guest_or_anon = (
            not request or
            not request.user or
            request.user.is_anonymous or
            (hasattr(request.user, 'is_guest') and request.user.is_guest)
        )
        
        has_phone = bool(attrs.get('guest_phone')) or (not is_guest_or_anon and getattr(request.user, 'phone', None))
        if not has_phone:
            raise serializers.ValidationError(
                "A contact phone number is required to place an order."
            )

        if is_guest_or_anon and not attrs.get('guest_name'):
            raise serializers.ValidationError(
                "Guest name is required for guest checkout."
            )

        # Must have at least one item
        if not attrs.get('items'):
            raise serializers.ValidationError("Order must have at least one menu item.")

        restaurant = attrs.get('restaurant')

        # Task 3: Operating Hours Enforcement
        if restaurant:
            if getattr(restaurant, 'is_force_closed', False) or not getattr(restaurant, 'is_active', True):
                raise serializers.ValidationError(f"{restaurant.name} is currently closed.")
            opens_at = getattr(restaurant, 'opens_at', None)
            closes_at = getattr(restaurant, 'closes_at', None)
            if opens_at and closes_at:
                from django.utils import timezone
                now_time = timezone.localtime().time()
                is_currently_open = (opens_at <= now_time <= closes_at) if opens_at <= closes_at else (now_time >= opens_at or now_time <= closes_at)
                if not is_currently_open:
                    raise serializers.ValidationError(f"{restaurant.name} is currently closed and not accepting orders.")

        # Validate loyalty points redemption
        use_loyalty = attrs.get('use_loyalty_points', False)
        pts_to_redeem = attrs.get('points_to_redeem', 0)
        if use_loyalty or pts_to_redeem > 0:
            if is_guest_or_anon:
                raise serializers.ValidationError(
                    "Loyalty points can only be redeemed by registered accounts. Please log in or register."
                )
            user_pts = getattr(request.user, 'loyalty_points', 0)
            if pts_to_redeem > user_pts:
                raise serializers.ValidationError(
                    f"You only have {user_pts} loyalty points available (requested {pts_to_redeem})."
                )

        items = attrs.get('items', [])
        for item_data in items:
            menu_item = item_data['menu_item']
            if not menu_item.is_available:
                raise serializers.ValidationError(
                    f"'{menu_item.name}' is currently unavailable. "
                    f"Please remove it from your cart and try again."
                )

        # Minimum order amount validation
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

        if restaurant and restaurant.min_order_amount > 0:
            if subtotal < restaurant.min_order_amount:
                raise serializers.ValidationError(
                    f"Minimum order amount for {restaurant.name} is "
                    f"Rs. {restaurant.min_order_amount:.0f}. "
                    f"Your subtotal is Rs. {subtotal:.0f}."
                )

        # Task 2: Delivery Radius Enforcement (DELIVERY mode only)
        delivery_lat = attrs.get('delivery_lat')
        delivery_lng = attrs.get('delivery_lng')
        branch = attrs.get('branch')
        ord_type_val = str(attrs.get('order_type') or 'DELIVERY').upper()
        if ord_type_val == 'DELIVERY' and delivery_lat is not None and delivery_lng is not None and restaurant:
            if not branch:
                from config.admin_utils import resolve_branch_for_order
                branch = resolve_branch_for_order(
                    restaurant,
                    attrs.get('delivery_address', ''),
                    delivery_lat,
                    delivery_lng
                )
            if branch:
                b_lat = branch.latitude
                b_lng = branch.longitude
                if b_lat is None or b_lng is None:
                    from config.admin_utils import BRANCH_COORDINATES
                    b_name_lower = branch.name.lower().strip()
                    coords = BRANCH_COORDINATES.get(b_name_lower)
                    if not coords:
                        for key, val in BRANCH_COORDINATES.items():
                            if key in b_name_lower:
                                coords = val
                                break
                    if coords:
                        b_lat, b_lng = coords[0], coords[1]
                if b_lat is not None and b_lng is not None:
                    from config.admin_utils import haversine_distance
                    dist_km = haversine_distance(delivery_lat, delivery_lng, b_lat, b_lng)
                    max_radius = float(branch.delivery_radius_km) if branch.delivery_radius_km else 10.0
                    if dist_km > max_radius:
                        raise serializers.ValidationError(
                            f"Delivery address is outside our service area for {branch.name} "
                            f"({dist_km:.1f} km away, maximum radius is {max_radius:.1f} km)."
                        )

        # Task 4: Coupon Validation
        coupon_code = attrs.get('coupon_code')
        if coupon_code:
            from promotions.models import Coupon, CouponUsage
            try:
                coupon = Coupon.objects.get(code__iexact=str(coupon_code).strip())
            except Coupon.DoesNotExist:
                raise serializers.ValidationError("Invalid promo code.")

            if not coupon.is_valid():
                raise serializers.ValidationError("Promo code is expired or inactive.")

            if coupon.usage_limit > 0 and coupon.times_used >= coupon.usage_limit:
                raise serializers.ValidationError("Promo code usage limit has been reached.")

            if coupon.restaurant and restaurant and coupon.restaurant != restaurant:
                raise serializers.ValidationError(f"Promo code is not valid for {restaurant.name}.")

            branch = attrs.get('branch')
            if coupon.branch and branch and coupon.branch != branch:
                raise serializers.ValidationError(f"Promo code is not valid for branch '{branch.name}'.")

            if subtotal < coupon.min_subtotal:
                raise serializers.ValidationError(
                    f"Minimum subtotal of Rs. {coupon.min_subtotal:.0f} required to use promo code '{coupon.code}'."
                )

            if not is_guest_or_anon and request and request.user:
                user_usage_count = CouponUsage.objects.filter(coupon=coupon, user=request.user).count()
                if user_usage_count >= coupon.per_user_limit:
                    raise serializers.ValidationError("You have already used this promo code the maximum allowed times.")
            elif attrs.get('guest_phone'):
                phone = str(attrs.get('guest_phone')).strip()
                phone_usage_count = CouponUsage.objects.filter(coupon=coupon, order__guest_phone=phone).count()
                if phone_usage_count >= coupon.per_user_limit:
                    raise serializers.ValidationError("This phone number has already used this promo code the maximum allowed times.")

            attrs['_validated_coupon'] = coupon

        return attrs

    def create(self, validated_data):
        with transaction.atomic():
            items_data = validated_data.pop('items')
            use_loyalty = validated_data.pop('use_loyalty_points', False)
            pts_to_redeem = validated_data.pop('points_to_redeem', 0)
            coupon = validated_data.pop('_validated_coupon', None)
            coupon_code_param = validated_data.pop('coupon_code', None)
            restaurant = validated_data['restaurant']

            if not coupon and coupon_code_param:
                coupon = Coupon.objects.filter(code__iexact=str(coupon_code_param).strip(), is_active=True).first()

            request = self.context.get('request')
            user = None
            if request and request.user and request.user.is_authenticated:
                user = request.user
                if (user.is_guest or not user.phone) and validated_data.get('guest_phone'):
                    user.phone = validated_data.get('guest_phone', '')
                    user.save()

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
            ord_type = str(validated_data.get('order_type', 'DELIVERY')).upper()
            validated_data['order_type'] = ord_type

            if ord_type in ['DINE_IN', 'TAKEAWAY']:
                delivery_fee = Decimal('0.00')

            curr_addr = validated_data.get('delivery_address')
            if ord_type == 'DINE_IN' and (not curr_addr or curr_addr in ['Address Provided via Phone', 'PICKUP AT OUTLET']):
                tbl = validated_data.get('table_number') or 'N/A'
                br_obj = validated_data.get('branch')
                br_title = br_obj.name if br_obj else restaurant.name
                validated_data['delivery_address'] = f"Dine-In (Table #{tbl}) - {br_title}"
            elif ord_type == 'TAKEAWAY' and (not curr_addr or curr_addr in ['Address Provided via Phone', 'PICKUP AT OUTLET']):
                br_obj = validated_data.get('branch')
                br_title = br_obj.name if br_obj else restaurant.name
                validated_data['delivery_address'] = f"Takeaway Pickup - {br_title}"

            # Coupon discount calculation
            coupon_discount = Decimal('0.00')
            if coupon:
                if coupon.discount_type == 'percentage':
                    coupon_discount = subtotal * (coupon.discount_value / Decimal('100.00'))
                    if coupon.max_discount:
                        coupon_discount = min(coupon_discount, coupon.max_discount)
                else:
                    coupon_discount = coupon.discount_value
                coupon_discount = min(coupon_discount, subtotal)

                # Atomic increment of times_used
                updated = Coupon.objects.filter(
                    pk=coupon.pk,
                    is_active=True,
                    times_used__lt=F('usage_limit')
                ).update(times_used=F('times_used') + 1)

                if updated == 0 and coupon.usage_limit > 0:
                    raise serializers.ValidationError("Coupon usage limit has been reached.")

            # Loyalty Points Redemption
            loyalty_discount = Decimal('0.00')
            actual_pts_redeemed = 0
            if user and not user.is_guest and (use_loyalty or pts_to_redeem > 0):
                user.refresh_from_db()
                avail_pts = user.loyalty_points
                rem_subtotal = max(Decimal('0.00'), subtotal - coupon_discount)
                actual_pts_redeemed = min(pts_to_redeem if pts_to_redeem > 0 else avail_pts, avail_pts, int(rem_subtotal))
                if actual_pts_redeemed > 0:
                    loyalty_discount = Decimal(actual_pts_redeemed)

            discount = coupon_discount + loyalty_discount
            total = subtotal + delivery_fee - discount
            total = max(Decimal('0.00'), round(total, 2))

            # Create Order
            order = Order.objects.create(
                user=user,
                subtotal=subtotal,
                delivery_fee=delivery_fee,
                discount=discount,
                total=total,
                **validated_data
            )

            # Record CouponUsage
            if coupon:
                from promotions.models import CouponUsage
                CouponUsage.objects.create(
                    coupon=coupon,
                    user=user if user and not user.is_guest else None,
                    order=order
                )

            # Deduct loyalty points if redeemed
            if user and not user.is_guest and actual_pts_redeemed > 0:
                from django.contrib.auth import get_user_model
                User = get_user_model()
                updated_count = User.objects.filter(pk=user.pk, loyalty_points__gte=actual_pts_redeemed).update(
                    loyalty_points=F('loyalty_points') - actual_pts_redeemed
                )
                if updated_count > 0:
                    from users.models import LoyaltyTransaction
                    LoyaltyTransaction.objects.create(
                        user=user,
                        order=order,
                        points=-actual_pts_redeemed,
                        transaction_type='redeemed',
                        description=f"Redeemed on Order #{order.id}"
                    )

            # Calculate and award earned loyalty points if configured
            ratio = getattr(restaurant, 'loyalty_points_ratio', 100)
            if ratio and ratio > 0 and user and not user.is_guest:
                earned_points = int(subtotal // ratio)
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

            # Auto-assign branch if not provided
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

            return order


class OrderListSerializer(serializers.ModelSerializer):
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)
    restaurant_logo = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ('id', 'display_order_id', 'tracking_token', 'restaurant', 'restaurant_name', 'restaurant_logo', 'order_type', 'table_number', 'status', 'total', 'created_at')
        read_only_fields = ('id', 'display_order_id', 'tracking_token', 'restaurant', 'restaurant_name', 'restaurant_logo', 'order_type', 'table_number', 'status', 'total', 'created_at')

    def get_restaurant_logo(self, obj):
        return build_absolute_image_url(obj.restaurant.logo, self.context)


class AdminOrderListSerializer(serializers.ModelSerializer):
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)
    branch_name = serializers.SerializerMethodField()
    branch_id = serializers.SerializerMethodField()
    rider = BranchRiderSerializer(read_only=True)
    rider_id = serializers.PrimaryKeyRelatedField(queryset=BranchRider.objects.all(), source='rider', required=False, allow_null=True)
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'display_order_id', 'restaurant', 'restaurant_name',
            'branch_id', 'branch_name',
            'rider', 'rider_id',
            'guest_name', 'guest_phone',
            'order_type', 'table_number',
            'status', 'payment_method',
            'delivery_address', 'delivery_lat', 'delivery_lng',
            'subtotal', 'delivery_fee', 'discount', 'total',
            'special_instructions',
            'items',
            'created_at', 'updated_at',
        )

    def get_branch_name(self, obj):
        return obj.branch.name if obj.branch else None

    def get_branch_id(self, obj):
        return obj.branch.id if obj.branch else None


class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    restaurant = RestaurantSerializer(read_only=True)
    rider = BranchRiderSerializer(read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'display_order_id', 'tracking_token', 'restaurant', 'rider', 'guest_name', 'guest_phone', 'order_type', 'table_number', 'status', 'payment_method',
            'delivery_address', 'delivery_lat', 'delivery_lng', 'subtotal', 'delivery_fee',
            'discount', 'total', 'special_instructions', 'items', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'display_order_id', 'tracking_token')

    def validate(self, attrs):
        # State transition validation (lock delivered orders / block invalid cancellations)
        if 'status' in attrs:
            new_status = attrs['status']
            if self.instance:
                current_status = self.instance.status
                if current_status == 'delivered':
                    raise serializers.ValidationError(
                        f"This order has already been delivered. You cannot change its status from '{current_status}' to '{new_status}'."
                    )
                if new_status == 'cancelled' and current_status in ['out_for_delivery', 'delivered']:
                    raise serializers.ValidationError(
                        f"This order is already {current_status.replace('_', ' ')}. You cannot cancel it now."
                    )
        return attrs

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        request = self.context.get('request')
        if request:
            ret['restaurant'] = RestaurantSerializer(
                instance.restaurant,
                context={'request': request}
            ).data
        # Backend Serializer Protection: Omit rider details unless order status is out_for_delivery or delivered
        if instance.status not in ['out_for_delivery', 'delivered']:
            ret['rider'] = None
        return ret
