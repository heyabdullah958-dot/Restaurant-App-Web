from rest_framework import serializers
from .models import Restaurant, MenuCategory, MenuItem


def build_absolute_image_url(image_field, context):
    """
    Return a proper absolute URL for an ImageField.
    - If Cloudinary: image_field.url is already absolute (https://res.cloudinary.com/...)
    - If local media: use request to build absolute URL
    - If None: return None
    """
    if not image_field:
        return None
    url = image_field.url
    # Already absolute (Cloudinary, S3, etc.)
    if url.startswith('http://') or url.startswith('https://'):
        return url
    # Relative path — make absolute using request context
    request = context.get('request') if context else None
    if request:
        return request.build_absolute_uri(url)
    return url


class MenuItemSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = MenuItem
        fields = ('id', 'category', 'name', 'description', 'price', 'image',
                  'is_available', 'is_featured', 'preparation_time', 'options')

    def get_image(self, obj):
        return build_absolute_image_url(obj.image, self.context)


class MenuCategorySerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    class Meta:
        model = MenuCategory
        fields = ('id', 'restaurant', 'name', 'icon', 'order', 'is_active', 'items')

    def get_items(self, obj):
        # Only show available items
        available_items = obj.items.filter(is_available=True)
        return MenuItemSerializer(available_items, many=True, context=self.context).data


class RestaurantSerializer(serializers.ModelSerializer):
    logo = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()

    class Meta:
        model = Restaurant
        fields = (
            'id', 'name', 'slug', 'cuisine_type', 'logo', 'cover_image',
            'description', 'address', 'city', 'phone', 'is_active', 'is_featured',
            'opens_at', 'closes_at', 'delivery_time_min', 'delivery_time_max',
            'min_order_amount', 'delivery_fee', 'rating', 'total_reviews',
            'loyalty_points_ratio'
        )

    def get_logo(self, obj):
        return build_absolute_image_url(obj.logo, self.context)

    def get_cover_image(self, obj):
        return build_absolute_image_url(obj.cover_image, self.context)


class RestaurantDetailSerializer(serializers.ModelSerializer):
    logo = serializers.SerializerMethodField()
    cover_image = serializers.SerializerMethodField()
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

    def get_logo(self, obj):
        return build_absolute_image_url(obj.logo, self.context)

    def get_cover_image(self, obj):
        return build_absolute_image_url(obj.cover_image, self.context)

    def get_categories(self, obj):
        # Only return active categories
        active_cats = obj.categories.filter(is_active=True).order_by('order', 'name')
        return MenuCategorySerializer(active_cats, many=True, context=self.context).data
