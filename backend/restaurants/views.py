from rest_framework import generics, permissions, viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Restaurant, RestaurantReview
from .serializers import (
    RestaurantSerializer, RestaurantDetailSerializer, MenuCategorySerializer,
    AdminMenuCategorySerializer, RestaurantReviewSerializer
)


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
        # Always return all restaurants so offline restaurants remain visible across UI with is_active=False status
        queryset = Restaurant.objects.all()

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
    queryset = Restaurant.objects.all().prefetch_related(
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
            ).get(slug=slug)

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

    def perform_update(self, serializer):
        user = self.request.user
        # Non-superusers (branch managers) cannot toggle is_force_closed or master is_active
        if not user.is_superuser:
            serializer.save(
                is_force_closed=serializer.instance.is_force_closed,
                is_active=serializer.instance.is_active
            )
        else:
            serializer.save()

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
    Lists all branches for a restaurant with live is_active status. Optional filter: ?restaurant_id=1 or ?restaurant_slug=tandooristoppk
    """
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get(self, request):
        qs = Branch.objects.all().select_related('restaurant')
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
                'is_active': b.is_active,
                'area_keywords': b.area_keywords,
                'latitude': float(b.latitude) if b.latitude is not None else None,
                'longitude': float(b.longitude) if b.longitude is not None else None,
                'delivery_radius_km': float(b.delivery_radius_km) if b.delivery_radius_km is not None else 10.0,
                'is_currently_open': BranchSerializer(b, context={'request': request}).data.get('is_currently_open', True),
            } for b in qs]
        })

from .serializers import BranchSerializer
from .models import BranchRider
from .serializers import BranchRiderSerializer

class AdminBranchViewSet(viewsets.ModelViewSet):
    serializer_class = BranchSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return Branch.objects.all()
        from config.admin_utils import get_managed_restaurant, get_managed_branch
        managed_branch = get_managed_branch(user)
        if managed_branch:
            return Branch.objects.filter(id=managed_branch.id)
        managed_restaurant = get_managed_restaurant(user)
        if managed_restaurant:
            return Branch.objects.filter(restaurant=managed_restaurant)
        return Branch.objects.none()

    def perform_update(self, serializer):
        user = self.request.user
        if not user.is_superuser:
            from config.admin_utils import get_managed_restaurant, get_managed_branch
            branch = self.get_object()
            managed_branch = get_managed_branch(user)
            if managed_branch and branch != managed_branch:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You do not manage this branch.")
            managed_restaurant = get_managed_restaurant(user)
            if not managed_branch and (not managed_restaurant or branch.restaurant != managed_restaurant):
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You do not manage this branch.")
        serializer.save()


class MyBranchView(APIView):
    """
    GET /api/restaurants/admin/my-branch/
    Returns ONLY the single Branch object assigned to the logged in Branch Manager.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        if user.is_superuser:
            first_branch = Branch.objects.first()
            if not first_branch:
                return Response({'detail': 'No branches configured.'}, status=404)
            return Response(BranchSerializer(first_branch, context={'request': request}).data)

        from config.admin_utils import get_managed_branch, get_managed_restaurant
        managed_branch = get_managed_branch(user)
        if managed_branch:
            return Response(BranchSerializer(managed_branch, context={'request': request}).data)

        managed_restaurant = get_managed_restaurant(user)
        if managed_restaurant:
            first_branch = Branch.objects.filter(restaurant=managed_restaurant).first()
            if first_branch:
                return Response(BranchSerializer(first_branch, context={'request': request}).data)

        return Response({'detail': 'No branch assigned to your user account.'}, status=404)


class AdminBranchRiderViewSet(viewsets.ModelViewSet):
    serializer_class = BranchRiderSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        user = self.request.user
        qs = BranchRider.objects.all().select_related('branch', 'branch__restaurant')
        
        branch_id = self.request.query_params.get('branch_id')
        restaurant_id = self.request.query_params.get('restaurant_id')
        status_param = self.request.query_params.get('status')

        if not user.is_superuser:
            from config.admin_utils import get_managed_restaurant, get_managed_branch
            managed_branch = get_managed_branch(user)
            if managed_branch:
                qs = qs.filter(branch=managed_branch)
            else:
                managed_restaurant = get_managed_restaurant(user)
                if managed_restaurant:
                    qs = qs.filter(branch__restaurant=managed_restaurant)
                else:
                    return BranchRider.objects.none()

        if branch_id:
            qs = qs.filter(branch_id=branch_id)
        if restaurant_id:
            qs = qs.filter(branch__restaurant_id=restaurant_id)
        if status_param:
            qs = qs.filter(status__iexact=status_param)

        return qs

    def perform_create(self, serializer):
        user = self.request.user
        if not user.is_superuser:
            from config.admin_utils import get_managed_branch, get_managed_restaurant
            managed_branch = get_managed_branch(user)
            branch = serializer.validated_data.get('branch')
            if managed_branch and branch != managed_branch:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied("You can only add riders for your managed branch.")
            elif not managed_branch:
                managed_restaurant = get_managed_restaurant(user)
                if not managed_restaurant or branch.restaurant != managed_restaurant:
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied("You can only add riders for branches of your managed restaurant.")
        serializer.save()


class BranchItemAvailabilityView(generics.GenericAPIView):
    """
    POST /api/restaurants/branch-item-availability/
    Allows branch managers or super admins to override is_available per branch.
    Payload: { "branch_id": 1, "menu_item_id": 5, "is_available": false }
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        branch_id = request.data.get('branch_id')
        menu_item_id = request.data.get('menu_item_id')
        is_available = request.data.get('is_available', True)

        if not branch_id or not menu_item_id:
            return Response({'error': 'branch_id and menu_item_id are required.'}, status=400)

        from .models import Branch, MenuItem, BranchMenuItemAvailability
        try:
            branch = Branch.objects.get(id=branch_id)
            menu_item = MenuItem.objects.get(id=menu_item_id)
        except (Branch.DoesNotExist, MenuItem.DoesNotExist):
            return Response({'error': 'Branch or MenuItem not found.'}, status=404)

        user = request.user
        if not user.is_superuser:
            from config.admin_utils import get_managed_branch
            managed_branch = get_managed_branch(user)
            if not managed_branch or managed_branch.id != branch.id:
                return Response({'error': 'You do not manage this branch.'}, status=403)

        override, created = BranchMenuItemAvailability.objects.update_or_create(
            branch=branch,
            menu_item=menu_item,
            defaults={'is_available': is_available}
        )

        return Response({
            'success': True,
            'branch_id': branch.id,
            'menu_item_id': menu_item.id,
            'is_available': override.is_available
        })


class RestaurantReviewViewSet(viewsets.ModelViewSet):
    serializer_class = RestaurantReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = RestaurantReview.objects.all().select_related('restaurant', 'user', 'order')

        slug = self.kwargs.get('slug')
        restaurant_id = self.kwargs.get('restaurant_id')

        param_restaurant = self.request.query_params.get('restaurant')
        param_slug = self.request.query_params.get('restaurant_slug')
        param_id = self.request.query_params.get('restaurant_id')

        if slug:
            qs = qs.filter(restaurant__slug=slug)
        elif restaurant_id:
            qs = qs.filter(restaurant_id=restaurant_id)
        elif param_slug:
            qs = qs.filter(restaurant__slug=param_slug)
        elif param_id:
            qs = qs.filter(restaurant_id=param_id)
        elif param_restaurant:
            if str(param_restaurant).isdigit():
                qs = qs.filter(restaurant_id=int(param_restaurant))
            else:
                qs = qs.filter(restaurant__slug=param_restaurant)

        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        from rest_framework.exceptions import ValidationError
        from orders.models import Order

        data = request.data.copy()
        order_id = data.get('order')
        restaurant_input = data.get('restaurant')
        slug = self.kwargs.get('slug')
        restaurant_id = self.kwargs.get('restaurant_id')

        order_obj = None
        restaurant_obj = None

        if order_id:
            try:
                order_obj = Order.objects.get(id=order_id)
            except Order.DoesNotExist:
                raise ValidationError({'order': 'Order not found.'})

            if order_obj.user and order_obj.user != request.user:
                raise ValidationError({'order': 'You can only review your own orders.'})

            if order_obj.status != 'delivered':
                raise ValidationError({'order': 'You can only review delivered orders.'})

            if RestaurantReview.objects.filter(order=order_obj).exists():
                raise ValidationError({'order': 'You have already reviewed this order.'})

            restaurant_obj = order_obj.restaurant

        if not restaurant_obj:
            if restaurant_input:
                if isinstance(restaurant_input, int) or (isinstance(restaurant_input, str) and str(restaurant_input).isdigit()):
                    restaurant_obj = Restaurant.objects.filter(id=int(restaurant_input)).first()
                else:
                    restaurant_obj = Restaurant.objects.filter(slug=restaurant_input).first()
            elif slug:
                restaurant_obj = Restaurant.objects.filter(slug=slug).first()
            elif restaurant_id:
                restaurant_obj = Restaurant.objects.filter(id=restaurant_id).first()

        if not restaurant_obj:
            raise ValidationError({'restaurant': 'Restaurant is required for review.'})

        if not order_id and RestaurantReview.objects.filter(user=request.user, restaurant=restaurant_obj, order__isnull=True).exists():
            raise ValidationError({'restaurant': 'You have already submitted a review for this restaurant.'})

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user, restaurant=restaurant_obj, order=order_obj)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class PlatformSettingsView(APIView):
    """
    GET /api/restaurants/platform-settings/
    PATCH /api/restaurants/platform-settings/
    Allows viewing platform settings for any caller, and updating for superusers.
    """
    def get_permissions(self):
        if self.request.method in ['PATCH', 'PUT', 'POST']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def get(self, request):
        settings_obj = PlatformSettings.get_settings()
        return Response({
            'success': True,
            'data': {
                'loyalty_earn_rate_pkr': settings_obj.loyalty_earn_rate_pkr,
                'loyalty_point_value_pkr': settings_obj.loyalty_point_value_pkr,
                'welcome_bonus_points': settings_obj.welcome_bonus_points,
                'updated_at': settings_obj.updated_at,
            }
        })

    def patch(self, request):
        if not request.user.is_superuser:
            return Response({'success': False, 'message': 'Superuser permission required.'}, status=403)

        settings_obj = PlatformSettings.get_settings()
        data = request.data
        if 'loyalty_earn_rate_pkr' in data and data['loyalty_earn_rate_pkr'] is not None:
            settings_obj.loyalty_earn_rate_pkr = int(data['loyalty_earn_rate_pkr'])
        if 'loyalty_point_value_pkr' in data and data['loyalty_point_value_pkr'] is not None:
            settings_obj.loyalty_point_value_pkr = int(data['loyalty_point_value_pkr'])
        if 'welcome_bonus_points' in data and data['welcome_bonus_points'] is not None:
            settings_obj.welcome_bonus_points = int(data['welcome_bonus_points'])

        settings_obj.save()
        return Response({
            'success': True,
            'message': 'Platform settings updated successfully',
            'data': {
                'loyalty_earn_rate_pkr': settings_obj.loyalty_earn_rate_pkr,
                'loyalty_point_value_pkr': settings_obj.loyalty_point_value_pkr,
                'welcome_bonus_points': settings_obj.welcome_bonus_points,
                'updated_at': settings_obj.updated_at,
            }
        })




