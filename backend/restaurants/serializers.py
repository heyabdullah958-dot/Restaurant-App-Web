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
    
    # Fallback to backend domain if request context is not available
    from django.conf import settings
    backend_url = getattr(settings, 'BACKEND_URL', 'https://restaurant-app-web.onrender.com')
    if settings.DEBUG:
        backend_url = getattr(settings, 'BACKEND_URL', 'http://127.0.0.1:8000')
    
    if url.startswith('/') and backend_url.endswith('/'):
        return backend_url + url[1:]
    elif not url.startswith('/') and not backend_url.endswith('/'):
        return backend_url + '/' + url
    return backend_url + url


class MenuItemSerializer(serializers.ModelSerializer):
    # GET requests ke liye absolute URL return karta hai
    image_url = serializers.SerializerMethodField(read_only=True)
    # POST/PATCH ke liye writable ImageField
    image = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = MenuItem
        fields = ('id', 'category', 'name', 'description', 'price', 'image', 'image_url',
                  'is_available', 'is_featured', 'preparation_time', 'options')

    def get_image_url(self, obj):
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


class AdminMenuCategorySerializer(serializers.ModelSerializer):
    """Admin ke liye — ALL items (available + unavailable dono)"""
    items = serializers.SerializerMethodField()

    class Meta:
        model = MenuCategory
        fields = ('id', 'restaurant', 'name', 'icon', 'order', 'is_active', 'items')

    def get_items(self, obj):
        # NO is_available filter — admin ko sab items dikhne chahiye
        all_items = obj.items.all()
        return MenuItemSerializer(all_items, many=True, context=self.context).data


class AbsoluteImageField(serializers.ImageField):
    def to_representation(self, value):
        return build_absolute_image_url(value, self.context)


class RestaurantSerializer(serializers.ModelSerializer):
    logo = AbsoluteImageField(required=False, allow_null=True)
    cover_image = AbsoluteImageField(required=False, allow_null=True)
    banner_image = AbsoluteImageField(required=False, allow_null=True)

    class Meta:
        model = Restaurant
        fields = (
            'id', 'name', 'slug', 'cuisine_type', 'logo', 'cover_image', 'banner_image',
            'description', 'address', 'city', 'phone', 'is_active', 'is_featured',
            'opens_at', 'closes_at', 'delivery_time_min', 'delivery_time_max',
            'min_order_amount', 'delivery_fee', 'rating', 'total_reviews',
            'loyalty_points_ratio'
        )


class RestaurantDetailSerializer(serializers.ModelSerializer):
    logo = AbsoluteImageField(required=False, allow_null=True)
    cover_image = AbsoluteImageField(required=False, allow_null=True)
    banner_image = AbsoluteImageField(required=False, allow_null=True)
    categories = serializers.SerializerMethodField()

    class Meta:
        model = Restaurant
        fields = (
            'id', 'name', 'slug', 'cuisine_type', 'logo', 'cover_image', 'banner_image',
            'description', 'address', 'city', 'phone', 'is_active', 'is_featured',
            'opens_at', 'closes_at', 'delivery_time_min', 'delivery_time_max',
            'min_order_amount', 'delivery_fee', 'rating', 'total_reviews',
            'loyalty_points_ratio', 'categories'
        )

    def get_categories(self, obj):
        # Only return active categories
        active_cats = obj.categories.filter(is_active=True).order_by('order', 'name')
        return MenuCategorySerializer(active_cats, many=True, context=self.context).data
