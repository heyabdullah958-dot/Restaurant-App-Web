from rest_framework import generics, permissions
from rest_framework.response import Response
from .models import Restaurant
from .serializers import RestaurantSerializer, RestaurantDetailSerializer, MenuCategorySerializer

class RestaurantListView(generics.ListAPIView):
    """
    GET /api/restaurants/
    Lists all active restaurants. Optional query filters: ?featured=true, ?city=Islamabad, ?cuisine=Desi
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
    Retrieves full details of a specific restaurant, including its active menu categories and items.
    """
    queryset = Restaurant.objects.filter(is_active=True)
    serializer_class = RestaurantDetailSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.AllowAny]

class RestaurantMenuView(generics.GenericAPIView):
    """
    GET /api/restaurants/{slug}/menu/
    Retrieves the list of menu categories and available menu items for a specific restaurant.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        try:
            restaurant = Restaurant.objects.get(slug=slug, is_active=True)
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
