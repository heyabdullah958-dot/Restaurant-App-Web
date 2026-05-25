from rest_framework import serializers
from .models import Order, OrderItem
from restaurants.models import MenuItem, Restaurant
from restaurants.serializers import RestaurantSerializer

class OrderItemSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source='menu_item.name', read_only=True)

    class Meta:
        model = OrderItem
        fields = ('id', 'menu_item', 'menu_item_name', 'quantity', 'unit_price', 'total_price', 'special_notes')
        read_only_fields = ('unit_price', 'total_price')

class OrderCreateItemSerializer(serializers.Serializer):
    menu_item = serializers.PrimaryKeyRelatedField(queryset=MenuItem.objects.all())
    quantity = serializers.IntegerField(min_value=1)
    special_notes = serializers.CharField(required=False, allow_blank=True, allow_null=True)

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
        request = self.context.get('request')
        if not request or not request.user or request.user.is_anonymous or (hasattr(request.user, 'is_guest') and request.user.is_guest):
            if not attrs.get('guest_name') or not attrs.get('guest_phone'):
                raise serializers.ValidationError("Guest name and phone are required for guest checkout.")
        
        if not attrs.get('items'):
            raise serializers.ValidationError("Order must have at least one menu item.")

        return attrs

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        restaurant = validated_data['restaurant']
        
        request = self.context.get('request')
        user = None
        if request and request.user and request.user.is_authenticated:
            user = request.user
            if user.is_guest:
                user.phone = validated_data.get('guest_phone', '')
                user.save()

        subtotal = 0
        order_items_to_create = []

        for item_data in items_data:
            menu_item = item_data['menu_item']
            quantity = item_data['quantity']
            
            if menu_item.category.restaurant != restaurant:
                raise serializers.ValidationError(f"Menu item {menu_item.name} does not belong to restaurant {restaurant.name}.")

            unit_price = menu_item.price
            total_price = unit_price * quantity
            subtotal += total_price

            order_items_to_create.append({
                'menu_item': menu_item,
                'quantity': quantity,
                'unit_price': unit_price,
                'total_price': total_price,
                'special_notes': item_data.get('special_notes', '')
            })

        delivery_fee = restaurant.delivery_fee
        discount = 0
        total = subtotal + delivery_fee - discount

        order = Order.objects.create(
            user=user,
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            discount=discount,
            total=total,
            **validated_data
        )

        for item in order_items_to_create:
            OrderItem.objects.create(order=order, **item)

        # Loyalty points calculation logic: Earn 1 point per 100 of total
        if user and not user.is_anonymous:
            earned_points = int(total // 100)
            if earned_points > 0:
                user.loyalty_points += earned_points
                user.save()
                
                from users.models import LoyaltyTransaction
                LoyaltyTransaction.objects.create(
                    user=user,
                    order=order,
                    points=earned_points,
                    transaction_type='earned',
                    description=f"Points earned on Order #{order.id}"
                )

        return order

class OrderListSerializer(serializers.ModelSerializer):
    restaurant_name = serializers.CharField(source='restaurant.name', read_only=True)
    restaurant_logo = serializers.ImageField(source='restaurant.logo', read_only=True)

    class Meta:
        model = Order
        fields = ('id', 'restaurant_name', 'restaurant_logo', 'status', 'total', 'created_at')

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
