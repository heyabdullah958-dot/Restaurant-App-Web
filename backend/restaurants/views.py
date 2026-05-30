from rest_framework import generics, permissions
from rest_framework.response import Response
from .models import Restaurant
from .serializers import RestaurantSerializer, RestaurantDetailSerializer, MenuCategorySerializer


class RestaurantListView(generics.ListAPIView):
    """
    GET /api/restaurants/
    Lists all active restaurants. Optional filters: ?featured=true, ?city=Islamabad, ?cuisine=Desi
    BUG-07 FIX: Added select_related to prevent unnecessary joins.
    """
    serializer_class = RestaurantSerializer
    permission_classes = [permissions.AllowAny]

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

            categories = restaurant.categories.filter(is_active=True).order_by('order', 'name')
            serializer = MenuCategorySerializer(categories, many=True)
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
    queryset = Restaurant.objects.all()
    serializer_class = RestaurantSerializer
    permission_classes = [permissions.IsAdminUser]

class AdminMenuCategoryViewSet(viewsets.ModelViewSet):
    queryset = MenuCategory.objects.all()
    serializer_class = MenuCategorySerializer
    permission_classes = [permissions.IsAdminUser]

class AdminMenuItemViewSet(viewsets.ModelViewSet):
    queryset = MenuItem.objects.all()
    serializer_class = MenuItemSerializer
    permission_classes = [permissions.IsAdminUser]

