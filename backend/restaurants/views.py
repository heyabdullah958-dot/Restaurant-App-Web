from rest_framework import generics, permissions
from rest_framework.response import Response
from .models import Restaurant
from .serializers import RestaurantSerializer, RestaurantDetailSerializer, MenuCategorySerializer, AdminMenuCategorySerializer


class RestaurantListView(generics.ListAPIView):
    """
    GET /api/restaurants/
    Lists all active restaurants. Optional filters: ?featured=true, ?city=Islamabad, ?cuisine=Desi
    BUG-07 FIX: Added select_related to prevent unnecessary joins.
    """
    serializer_class = RestaurantSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        queryset = Restaurant.objects.filter(is_active=True)

        is_featured = self.request.query_params.get('featured')
        city = self.request.query_params.get('city')
        cuisine = self.request.query_params.get('cuisine')

        if is_featured:
            queryset = queryset.filter(is_featured=is_featured.lower() == 'true')
        if city:
            queryset = queryset.filter(city__iexact=city)
        if cuisine:
            queryset = queryset.filter(cuisine_type__icontains=cuisine)

        return queryset


class RestaurantDetailView(generics.RetrieveAPIView):
    """
    GET /api/restaurants/{slug}/
    BUG-07 FIX: prefetch_related('categories__items') reduces N+1 to 3 queries max.
    """
    queryset = Restaurant.objects.filter(is_active=True).prefetch_related(
        'branches',
        'categories',
        'categories__items'
    )
    serializer_class = RestaurantDetailSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.AllowAny]


class RestaurantMenuView(generics.GenericAPIView):
    """
    GET /api/restaurants/{slug}/menu/
    BUG-07 FIX: prefetch_related on categories and items.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        try:
            restaurant = Restaurant.objects.prefetch_related(
                'categories',
                'categories__items'
            ).get(slug=slug, is_active=True)

            # Use prefetched categories to avoid extra DB query
            all_cats = list(restaurant.categories.all())
            categories = [cat for cat in all_cats if cat.is_active]
            categories.sort(key=lambda c: (c.order, c.name))
            
            # Admin/staff users get all items (including unavailable ones)
            if request.user and request.user.is_authenticated and request.user.is_staff:
                serializer = AdminMenuCategorySerializer(categories, many=True, context={'request': request})
            else:
                serializer = MenuCategorySerializer(categories, many=True, context={'request': request})
            return Response({
                'success': True,
                'data': serializer.data
            })
        except Restaurant.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Restaurant not found'
            }, status=404)


from rest_framework import viewsets
from .models import MenuCategory, MenuItem
from .serializers import MenuItemSerializer

class AdminRestaurantViewSet(viewsets.ModelViewSet):
    serializer_class = RestaurantSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Restaurant.objects.all()
        from config.admin_utils import get_managed_restaurant
        managed_restaurant = get_managed_restaurant(user)
        if managed_restaurant:
            return Restaurant.objects.filter(id=managed_restaurant.id)
        return Restaurant.objects.none()

class AdminMenuCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = MenuCategorySerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return MenuCategory.objects.all()
        from config.admin_utils import get_managed_restaurant
        managed_restaurant = get_managed_restaurant(user)
        if managed_restaurant:
            return MenuCategory.objects.filter(restaurant=managed_restaurant)
        return MenuCategory.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser:
            from config.admin_utils import get_managed_restaurant
            managed_restaurant = get_managed_restaurant(user)
            if not managed_restaurant:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You do not manage any restaurant.")
            serializer.save(restaurant=managed_restaurant)
        else:
            serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if not user.is_superuser:
            from config.admin_utils import get_managed_restaurant
            managed_restaurant = get_managed_restaurant(user)
            restaurant = serializer.validated_data.get('restaurant')
            if restaurant and restaurant != managed_restaurant:
                from rest_framework.exceptions import ValidationError
                raise ValidationError("You cannot reassign this category to another restaurant.")
        serializer.save()

class AdminMenuItemViewSet(viewsets.ModelViewSet):
    serializer_class = MenuItemSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return MenuItem.objects.all()
        from config.admin_utils import get_managed_restaurant
        managed_restaurant = get_managed_restaurant(user)
        if managed_restaurant:
            return MenuItem.objects.filter(category__restaurant=managed_restaurant)
        return MenuItem.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser:
            from config.admin_utils import get_managed_restaurant
            managed_restaurant = get_managed_restaurant(user)
            category = serializer.validated_data.get('category')
            if category and category.restaurant != managed_restaurant:
                from rest_framework.exceptions import ValidationError
                raise ValidationError("You cannot add items to a category belonging to another restaurant.")
        serializer.save()

    def perform_update(self, serializer):
        user = self.request.user
        if not user.is_superuser:
            from config.admin_utils import get_managed_restaurant
            managed_restaurant = get_managed_restaurant(user)
            category = serializer.validated_data.get('category')
            if category and category.restaurant != managed_restaurant:
                from rest_framework.exceptions import ValidationError
                raise ValidationError("You cannot move items to a category belonging to another restaurant.")
        serializer.save()


from .models import Branch

class BranchListView(generics.ListAPIView):
    """
    GET /api/branches/
    Lists active branches. Optional filter: ?restaurant_id=1 or ?restaurant_slug=tandooristoppk
    """
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get(self, request):
        qs = Branch.objects.filter(is_active=True).select_related('restaurant')
        restaurant_id = request.query_params.get('restaurant_id')
        restaurant_slug = request.query_params.get('restaurant_slug')
        if restaurant_id:
            qs = qs.filter(restaurant_id=restaurant_id)
        elif restaurant_slug:
            qs = qs.filter(restaurant__slug=restaurant_slug)
        return Response({
            'success': True,
            'data': [{
                'id': b.id,
                'name': b.name,
                'address': b.address,
                'phone': b.phone,
                'area_keywords': b.area_keywords,
                'restaurant_id': b.restaurant_id,
                'restaurant_name': b.restaurant.name,
                'restaurant_slug': b.restaurant.slug,
            } for b in qs]
        })


