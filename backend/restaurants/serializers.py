from rest_framework import serializers
from .models import Restaurant, MenuCategory, MenuItem

class MenuItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItem
        fields = ('id', 'category', 'name', 'description', 'price', 'image', 'is_available', 'is_featured', 'preparation_time', 'options')

class MenuCategorySerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    class Meta:
        model = MenuCategory
        fields = ('id', 'restaurant', 'name', 'icon', 'order', 'is_active', 'items')

    def get_items(self, obj):
        # Only show available items for frontend, but return all items when needed
        available_items = obj.items.all()
        return MenuItemSerializer(available_items, many=True).data

class RestaurantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Restaurant
        fields = (
            'id', 'name', 'slug', 'cuisine_type', 'logo', 'cover_image',
            'description', 'address', 'city', 'phone', 'is_active', 'is_featured',
            'opens_at', 'closes_at', 'delivery_time_min', 'delivery_time_max',
            'min_order_amount', 'delivery_fee', 'rating', 'total_reviews',
            'loyalty_points_ratio'
        )

class RestaurantDetailSerializer(serializers.ModelSerializer):
    categories = serializers.SerializerMethodField()

    class Meta:
        model = Restaurant
        fields = (
            'id', 'name', 'slug', 'cuisine_type', 'logo', 'cover_image',
            'description', 'address', 'city', 'phone', 'is_active', 'is_featured',
            'opens_at', 'closes_at', 'delivery_time_min', 'delivery_time_max',
            'min_order_amount', 'delivery_fee', 'rating', 'total_reviews',
            'loyalty_points_ratio', 'categories'
        )

    def get_categories(self, obj):
        # Only return active categories
        active_cats = obj.categories.filter(is_active=True).order_by('order', 'name')
        return MenuCategorySerializer(active_cats, many=True).data
