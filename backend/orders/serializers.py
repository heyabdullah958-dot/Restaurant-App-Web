from decimal import Decimal
from rest_framework import serializers
from django.db import transaction
from django.db.models import F
from .models import Order, OrderItem
from restaurants.models import MenuItem, Restaurant
from restaurants.serializers import RestaurantSerializer, build_absolute_image_url


class OrderItemSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source='menu_item.name', read_only=True)

    class Meta:
        model = OrderItem
        fields = ('id', 'menu_item', 'menu_item_name', 'quantity', 'unit_price', 'total_price', 'special_notes', 'selected_options')
        read_only_fields = ('unit_price', 'total_price')


class OrderCreateItemSerializer(serializers.Serializer):
    menu_item = serializers.PrimaryKeyRelatedField(queryset=MenuItem.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    special_notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    selected_options = serializers.JSONField(required=False, default=list)


class OrderCreateSerializer(serializers.ModelSerializer):
    items = OrderCreateItemSerializer(many=True, write_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'restaurant', 'guest_name', 'guest_phone', 'payment_method',
            'delivery_address', 'delivery_lat', 'delivery_lng', 'special_instructions',
            'items', 'subtotal', 'delivery_fee', 'discount', 'total'
        )
        read_only_fields = ('id', 'subtotal', 'delivery_fee', 'discount', 'total')

    def validate(self, attrs):
        """
        BUG-04/09/10: Validate guest fields, item availability, and min order amount.
        """
        request = self.context.get('request')

        # Require phone for all users (either via payload or existing user profile)
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

        # BUG-09: Validate each item is currently available
        restaurant = attrs.get('restaurant')
        items = attrs.get('items', [])
        for item_data in items:
            menu_item = item_data['menu_item']
            if not menu_item.is_available:
                raise serializers.ValidationError(
                    f"'{menu_item.name}' is currently unavailable. "
                    f"Please remove it from your cart and try again."
                )

        # BUG-10: Validate minimum order amount
        if restaurant and restaurant.min_order_amount > 0:
            subtotal = 0
            for item in items:
                item_price = item['menu_item'].price
                selected_opts = item.get('selected_options', [])
                price_modifier_sum = 0
                for opt in selected_opts:
                    if isinstance(opt, dict):
                        try:
                            price_modifier_sum += float(opt.get('price_modifier', 0) or 0)
                        except (ValueError, TypeError):
                            pass
                item_price += Decimal(price_modifier_sum)
                subtotal += item_price * item['quantity']

            if subtotal < restaurant.min_order_amount:
                raise serializers.ValidationError(
                    f"Minimum order amount for {restaurant.name} is "
                    f"Rs. {restaurant.min_order_amount:.0f}. "
                    f"Your subtotal is Rs. {subtotal:.0f}."
                )

        return attrs

    def create(self, validated_data):
        """
        BUG-04: Wrapped in transaction.atomic() — if any step fails, entire order rolls back.
        BUG-05: Loyalty points updated using atomic F() expression — no race condition.
        BUG-11: Loyalty points only awarded to registered (non-guest) users.
        """
        with transaction.atomic():
            items_data = validated_data.pop('items')
            restaurant = validated_data['restaurant']

            request = self.context.get('request')
            user = None
            if request and request.user and request.user.is_authenticated:
                user = request.user
                # Save phone number to user profile if missing or if guest
                if (user.is_guest or not user.phone) and validated_data.get('guest_phone'):
                    user.phone = validated_data.get('guest_phone', '')
                    user.save()

            subtotal = 0
            order_items_to_create = []

            for item_data in items_data:
                menu_item = item_data['menu_item']
                quantity = item_data['quantity']

                # Validate item belongs to the correct restaurant
                if menu_item.category.restaurant != restaurant:
                    raise serializers.ValidationError(
                        f"Menu item '{menu_item.name}' does not belong to restaurant '{restaurant.name}'."
                    )

                unit_price = menu_item.price
                selected_opts = item_data.get('selected_options', [])
                price_modifier_sum = 0
                for opt in selected_opts:
                    if isinstance(opt, dict):
                        try:
                            price_modifier_sum += float(opt.get('price_modifier', 0) or 0)
                        except (ValueError, TypeError):
                            pass
                unit_price += Decimal(price_modifier_sum)
                total_price = unit_price * quantity
                subtotal += total_price

                order_items_to_create.append({
                    'menu_item': menu_item,
                    'quantity': quantity,
                    'unit_price': unit_price,
                    'total_price': total_price,
                    'special_notes': item_data.get('special_notes', ''),
                    'selected_options': selected_opts
                })

            delivery_fee = restaurant.delivery_fee
            discount = 0
            total = subtotal + delivery_fee - discount

            # Create the Order record
            order = Order.objects.create(
                user=user,
                subtotal=subtotal,
                delivery_fee=delivery_fee,
                discount=discount,
                total=total,
                **validated_data
            )

            # Create all OrderItem records
            for item in order_items_to_create:
                OrderItem.objects.create(order=order, **item)

            # BUG-11 + BUG-05: Award loyalty points ONLY to registered (non-guest) users
            # Using F() expression for atomic update — no race condition
            if user and not user.is_guest:
                ratio = getattr(restaurant, 'loyalty_points_ratio', 100)
                if ratio > 0:
                    earned_points = int(total // ratio)
                    if earned_points > 0:
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        # BUG-05: Atomic F() update — safe under concurrent load
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


class OrderListSerializer(serializers.ModelSerializer):
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)
    restaurant_logo = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ('id', 'restaurant', 'restaurant_name', 'restaurant_logo', 'status', 'total', 'created_at')

    def get_restaurant_logo(self, obj):
        return build_absolute_image_url(obj.restaurant.logo, self.context)


class AdminOrderListSerializer(serializers.ModelSerializer):
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'restaurant', 'restaurant_name',
            'guest_name', 'guest_phone',
            'status', 'payment_method',
            'delivery_address',
            'subtotal', 'delivery_fee', 'discount', 'total',
            'special_instructions',
            'items',
            'created_at', 'updated_at',
        )



class OrderDetailSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    restaurant = RestaurantSerializer(read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'restaurant', 'guest_name', 'guest_phone', 'status', 'payment_method',
            'delivery_address', 'delivery_lat', 'delivery_lng', 'subtotal', 'delivery_fee',
            'discount', 'total', 'special_instructions', 'items', 'created_at', 'updated_at'
        )

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
        # Propagate request context for absolute image/logo URL resolution
        request = self.context.get('request')
        if request:
            ret['restaurant'] = RestaurantSerializer(
                instance.restaurant,
                context={'request': request}
            ).data
        return ret
