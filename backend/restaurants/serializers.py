from rest_framework import serializers
from .models import Restaurant, MenuCategory, MenuItem, Branch, BranchRider, RestaurantReview


def build_absolute_image_url(image_field, context):
    """
    Return a proper absolute URL for an ImageField.
    - If Cloudinary: image_field.url is already absolute (https://res.cloudinary.com/...)
    - If local media: use request to build absolute URL
    - If None: return None
    """
    if not image_field:
        return None
    
    name = getattr(image_field, 'name', '')
    if name and (name.startswith('http://') or name.startswith('https://')):
        return name

    url = getattr(image_field, 'url', '')
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
    is_available = serializers.SerializerMethodField()

    class Meta:
        model = MenuItem
        fields = ('id', 'category', 'name', 'description', 'price', 'image', 'image_url',
                  'is_available', 'is_featured', 'preparation_time', 'options')

    def get_image_url(self, obj):
        return build_absolute_image_url(obj.image, self.context)

    def get_is_available(self, obj):
        if not obj.is_available:
            return False
        request = self.context.get('request') if self.context else None
        branch_id = None
        if request:
            branch_id = request.query_params.get('branch_id') or request.query_params.get('branch')
        if not branch_id and self.context:
            branch_id = self.context.get('branch_id')
            
        if branch_id:
            from .models import BranchMenuItemAvailability
            override = BranchMenuItemAvailability.objects.filter(branch_id=branch_id, menu_item=obj).first()
            if override:
                return override.is_available
        return True


class MenuCategorySerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    class Meta:
        model = MenuCategory
        fields = ('id', 'restaurant', 'name', 'icon', 'order', 'is_active', 'items')

    def get_items(self, obj):
        # Return all items with their is_available status so frontend apps can render out-of-stock badges
        all_items = obj.items.all()
        return MenuItemSerializer(all_items, many=True, context=self.context).data


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
        # FIX 2B: Guard against Cloudinary SDK errors (misconfigured credentials,
        # deleted asset, no .url property) which would raise 500 instead of returning None.
        if not value:
            return None
        try:
            return build_absolute_image_url(value, self.context)
        except Exception:
            return None


class BranchSerializer(serializers.ModelSerializer):
    is_currently_open = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = ('id', 'restaurant', 'name', 'address', 'phone', 'is_active', 'is_dine_in_enabled', 'area_keywords', 'latitude', 'longitude', 'delivery_radius_km', 'is_currently_open')

    def get_is_currently_open(self, obj):
        restaurant = obj.restaurant
        if getattr(restaurant, 'is_force_closed', False) or not getattr(restaurant, 'is_active', True) or not obj.is_active:
            return False
        opens_at = getattr(restaurant, 'opens_at', None)
        closes_at = getattr(restaurant, 'closes_at', None)
        if not opens_at or not closes_at:
            return True
        from django.utils import timezone
        now_time = timezone.localtime().time()
        if opens_at <= closes_at:
            return opens_at <= now_time <= closes_at
        return now_time >= opens_at or now_time <= closes_at


class BranchRiderSerializer(serializers.ModelSerializer):
    branch_name = serializers.ReadOnlyField(source='branch.name')
    restaurant_id = serializers.ReadOnlyField(source='branch.restaurant.id')
    restaurant_name = serializers.ReadOnlyField(source='branch.restaurant.name')
    is_cross_branch = serializers.SerializerMethodField()
    is_cross_brand = serializers.SerializerMethodField()

    class Meta:
        model = BranchRider
        fields = ('id', 'branch', 'branch_name', 'restaurant_id', 'restaurant_name', 'name', 'phone', 'vehicle_type', 'status', 'is_active', 'is_cross_branch', 'is_cross_brand', 'created_at')
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=BranchRider.objects.all(),
                fields=['branch', 'phone'],
                message="A rider with this phone number already exists for this branch."
            )
        ]

    def get_is_cross_branch(self, obj):
        try:
            request = self.context.get('request')
            if not request:
                return getattr(obj, '_is_cross_branch', False)
            target_branch = request.query_params.get('branch_id')
            if not target_branch:
                return getattr(obj, '_is_cross_branch', False)
            
            target_str = str(target_branch).lower().strip()
            b_id = str(obj.branch_id) if obj.branch_id is not None else ''
            b_slug = str(obj.branch.slug).lower() if (obj.branch and getattr(obj.branch, 'slug', None)) else ''
            b_name = str(obj.branch.name).lower() if (obj.branch and getattr(obj.branch, 'name', None)) else ''
            
            is_match = (target_str == b_id or target_str == b_slug or target_str == b_name)
            return not is_match
        except Exception:
            return False

    def get_is_cross_brand(self, obj):
        try:
            request = self.context.get('request')
            if not request:
                return getattr(obj, '_is_cross_brand', False)
            target_rest = request.query_params.get('restaurant_id')
            if not target_rest and request.query_params.get('branch_id'):
                target_branch = request.query_params.get('branch_id')
                if str(target_branch).isdigit():
                    from restaurants.models import Branch
                    b = Branch.objects.filter(id=int(target_branch)).first()
                    if b:
                        target_rest = b.restaurant_id
            if not target_rest:
                return getattr(obj, '_is_cross_brand', False)

            target_str = str(target_rest).lower().strip()
            r_id = str(obj.branch.restaurant_id) if (obj.branch and getattr(obj.branch, 'restaurant_id', None)) else ''
            r_slug = str(obj.branch.restaurant.slug).lower() if (obj.branch and getattr(obj.branch, 'restaurant', None) and getattr(obj.branch.restaurant, 'slug', None)) else ''
            r_name = str(obj.branch.restaurant.name).lower() if (obj.branch and getattr(obj.branch, 'restaurant', None) and getattr(obj.branch.restaurant, 'name', None)) else ''

            is_match = (target_str == r_id or target_str == r_slug or target_str == r_name)
            return not is_match
        except Exception:
            return False

    def validate_phone(self, value):
        cleaned = value.strip()
        if not cleaned:
            raise serializers.ValidationError("Phone number cannot be blank.")
        return cleaned


class RestaurantSerializer(serializers.ModelSerializer):
    logo = AbsoluteImageField(required=False, allow_null=True)
    cover_image = AbsoluteImageField(required=False, allow_null=True)
    banner_image = AbsoluteImageField(required=False, allow_null=True)
    branches = BranchSerializer(many=True, read_only=True)
    is_open = serializers.BooleanField(read_only=True)
    is_currently_open = serializers.SerializerMethodField()

    class Meta:
        model = Restaurant
        fields = (
            'id', 'name', 'slug', 'cuisine_type', 'logo', 'cover_image', 'banner_image',
            'description', 'address', 'city', 'phone', 'is_active', 'is_force_closed', 'is_dine_in_enabled', 'is_open', 'is_currently_open',
            'is_featured', 'opens_at', 'closes_at', 'delivery_time_min', 'delivery_time_max',
            'min_order_amount', 'delivery_fee', 'rating', 'total_reviews',
            'loyalty_points_ratio', 'branches'
        )

    def get_is_currently_open(self, obj):
        if getattr(obj, 'is_force_closed', False) or not getattr(obj, 'is_active', True):
            return False
        opens_at = getattr(obj, 'opens_at', None)
        closes_at = getattr(obj, 'closes_at', None)
        if not opens_at or not closes_at:
            return True
        from django.utils import timezone
        now_time = timezone.localtime().time()
        if opens_at <= closes_at:
            return opens_at <= now_time <= closes_at
        return now_time >= opens_at or now_time <= closes_at


class RestaurantDetailSerializer(serializers.ModelSerializer):
    logo = AbsoluteImageField(required=False, allow_null=True)
    cover_image = AbsoluteImageField(required=False, allow_null=True)
    banner_image = AbsoluteImageField(required=False, allow_null=True)
    categories = serializers.SerializerMethodField()
    branches = BranchSerializer(many=True, read_only=True)
    is_open = serializers.BooleanField(read_only=True)
    is_currently_open = serializers.SerializerMethodField()

    class Meta:
        model = Restaurant
        fields = (
            'id', 'name', 'slug', 'cuisine_type', 'logo', 'cover_image', 'banner_image',
            'description', 'address', 'city', 'phone', 'is_active', 'is_force_closed', 'is_open', 'is_currently_open',
            'is_featured', 'opens_at', 'closes_at', 'delivery_time_min', 'delivery_time_max',
            'min_order_amount', 'delivery_fee', 'rating', 'total_reviews',
            'loyalty_points_ratio', 'branches', 'categories'
        )

    def get_is_currently_open(self, obj):
        if getattr(obj, 'is_force_closed', False) or not getattr(obj, 'is_active', True):
            return False
        opens_at = getattr(obj, 'opens_at', None)
        closes_at = getattr(obj, 'closes_at', None)
        if not opens_at or not closes_at:
            return True
        from django.utils import timezone
        now_time = timezone.localtime().time()
        if opens_at <= closes_at:
            return opens_at <= now_time <= closes_at
        return now_time >= opens_at or now_time <= closes_at

    def get_categories(self, obj):
        # Use prefetched categories to avoid extra database query
        all_cats = obj.categories.all()
        active_cats = [cat for cat in all_cats if cat.is_active]
        active_cats.sort(key=lambda c: (c.order, c.name))
        return MenuCategorySerializer(active_cats, many=True, context=self.context).data


class RestaurantReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    restaurant_name = serializers.ReadOnlyField(source='restaurant.name')
    restaurant = serializers.PrimaryKeyRelatedField(
        queryset=Restaurant.objects.all(),
        required=False
    )

    class Meta:
        model = RestaurantReview
        fields = (
            'id', 'restaurant', 'restaurant_name', 'order', 'user', 'user_name',
            'rating', 'comment', 'created_at'
        )
        read_only_fields = ('id', 'user', 'created_at')

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return 'Anonymous'

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

    def validate(self, attrs):
        order = attrs.get('order')
        restaurant = attrs.get('restaurant')

        if not restaurant and order and hasattr(order, 'restaurant'):
            attrs['restaurant'] = order.restaurant
            restaurant = order.restaurant

        if not restaurant:
            raise serializers.ValidationError({"restaurant": "This field is required."})

        return super().validate(attrs)

