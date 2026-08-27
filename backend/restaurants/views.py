from django.db.models import Q
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
    GET /api/restaurants/{slug_or_id}/
    BUG-07 FIX: prefetch_related('categories__items') reduces N+1 to 3 queries max.
    Supports both restaurant slug and numeric restaurant ID lookups.
    """
    queryset = Restaurant.objects.all().prefetch_related(
        'branches',
        'categories',
        'categories__items'
    )
    serializer_class = RestaurantDetailSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.AllowAny]

    def get_object(self):
        slug_or_id = self.kwargs.get('slug')
        queryset = self.get_queryset()
        if str(slug_or_id).isdigit():
            obj = queryset.filter(id=int(slug_or_id)).first()
            if obj:
                return obj
        obj = queryset.filter(slug__iexact=slug_or_id).first()
        if not obj:
            from django.http import Http404
            raise Http404(f"Restaurant '{slug_or_id}' not found")
        return obj


class RestaurantMenuView(generics.GenericAPIView):
    """
    GET /api/restaurants/{slug_or_id}/menu/
    BUG-07 FIX: prefetch_related on categories and items.
    Supports both restaurant slug and numeric restaurant ID lookups.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        try:
            base_qs = Restaurant.objects.prefetch_related(
                'categories',
                'categories__items'
            )
            restaurant = None
            if str(slug).isdigit():
                restaurant = base_qs.filter(id=int(slug)).first()
            if not restaurant:
                restaurant = base_qs.filter(slug__iexact=slug).first()

            if not restaurant:
                return Response({
                    'success': False,
                    'message': f'Restaurant "{slug}" not found'
                }, status=404)

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
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=500)


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
    Lists all branches for a specific restaurant with live is_active status.
    Requires ?restaurant_id=1, ?restaurant_slug=tandooristoppk, or ?all=true.
    If no filter is provided, returns empty list [] to prevent tenant leakage.
    """
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get(self, request):
        restaurant_id = request.query_params.get('restaurant_id')
        restaurant_slug = request.query_params.get('restaurant_slug')
        show_all = request.query_params.get('all') in ('true', '1')

        qs = Branch.objects.all().select_related('restaurant')
        if restaurant_id:
            qs = qs.filter(restaurant_id=restaurant_id)
        elif restaurant_slug:
            qs = qs.filter(restaurant__slug=restaurant_slug)
        elif not show_all:
            return Response({
                'success': True,
                'data': []
            })

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
        
        # Auto-heal riders stuck on ON_DELIVERY who have 0 active out_for_delivery orders
        try:
            from orders.models import Order
            active_rider_ids = list(Order.objects.filter(status='out_for_delivery', rider__isnull=False).values_list('rider_id', flat=True))
            BranchRider.objects.filter(status='ON_DELIVERY').exclude(id__in=active_rider_ids).update(status='AVAILABLE')
        except Exception:
            pass

        base_qs = BranchRider.objects.all().select_related('branch', 'branch__restaurant')
        
        branch_id = self.request.query_params.get('branch_id')
        restaurant_id = self.request.query_params.get('restaurant_id')
        status_param = self.request.query_params.get('status')
        is_active_param = self.request.query_params.get('is_active')
        allow_global_param = self.request.query_params.get('allow_global')

        if not user.is_superuser:
            from config.admin_utils import get_managed_restaurant, get_managed_branch
            managed_branch = get_managed_branch(user)
            managed_restaurant = get_managed_restaurant(user)
            if allow_global_param in ['true', '1']:
                pass
            elif managed_branch and not branch_id:
                base_qs = base_qs.filter(branch=managed_branch)
            elif managed_restaurant and not restaurant_id:
                base_qs = base_qs.filter(branch__restaurant=managed_restaurant)
            elif managed_branch:
                base_qs = base_qs.filter(branch=managed_branch)
            elif managed_restaurant:
                base_qs = base_qs.filter(branch__restaurant=managed_restaurant)

        status_filter = status_param.upper() if status_param else None
        is_act_filter = True if (is_active_param and is_active_param.lower() in ['true', '1']) else (False if (is_active_param and is_active_param.lower() in ['false', '0']) else None)

        if branch_id:
            val = str(branch_id).strip()
            if val.isdigit():
                branch_q = Q(branch_id=int(val))
            else:
                branch_q = Q(branch__slug__iexact=val) | Q(branch__name__iexact=val)
            
            t1_qs = base_qs.filter(branch_q)
            if status_filter:
                t1_qs = t1_qs.filter(status__iexact=status_filter)
            if is_act_filter is not None:
                t1_qs = t1_qs.filter(is_active=is_act_filter)
            # Return branch-scoped queryset directly unless global fallback is explicitly requested
            if t1_qs.exists() or allow_global_param not in ['true', '1']:
                return t1_qs

        if restaurant_id:
            val_r = str(restaurant_id).strip()
            if val_r.isdigit():
                rest_q = Q(branch__restaurant_id=int(val_r))
            else:
                rest_q = Q(branch__restaurant__slug__iexact=val_r)
            
            t2_qs = base_qs.filter(rest_q)
            if status_filter:
                t2_qs = t2_qs.filter(status__iexact=status_filter)
            if is_act_filter is not None:
                t2_qs = t2_qs.filter(is_active=is_act_filter)
            # Return restaurant-scoped queryset directly unless global fallback is explicitly requested
            if t2_qs.exists() or allow_global_param not in ['true', '1']:
                return t2_qs

        qs = base_qs
        if status_filter:
            qs = qs.filter(status__iexact=status_filter)
        if is_act_filter is not None:
            qs = qs.filter(is_active=is_act_filter)

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
            from config.admin_utils import get_managed_branch, get_managed_restaurant
            managed_branch = get_managed_branch(user)
            managed_restaurant = get_managed_restaurant(user)
            has_permission = False
            if managed_branch and managed_branch.id == branch.id:
                has_permission = True
            elif managed_restaurant and branch.restaurant_id == managed_restaurant.id:
                has_permission = True
            elif user.is_staff and (
                user.groups.filter(name__icontains=branch.restaurant.slug).exists() or
                (hasattr(user, 'manager_profile') and user.manager_profile and user.manager_profile.branch_id == branch.id)
            ):
                has_permission = True

            if not has_permission:
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

        data['restaurant'] = restaurant_obj.id

        user_obj = request.user if (request.user and request.user.is_authenticated) else None

        if not order_id and user_obj and RestaurantReview.objects.filter(user=user_obj, restaurant=restaurant_obj, order__isnull=True).exists():
            raise ValidationError({'restaurant': 'You have already submitted a review for this restaurant.'})

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=user_obj, restaurant=restaurant_obj, order=order_obj)
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


from django.db.models import Q, Count

class PopularTagsView(APIView):
    """
    GET /api/v1/search/popular-tags/
    GET /api/restaurants/popular-tags/
    Dynamically returns top 6-8 active menu items from live database menu across active tenant restaurants.
    Excludes out-of-stock items (is_available=False) and inactive restaurants.
    Permission: AllowAny (Unauthenticated/Guest allowed).
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]


    def get(self, request):
        try:
            items_qs = MenuItem.objects.filter(
                is_available=True,
                category__is_active=True,
                category__restaurant__is_active=True,
                category__restaurant__is_force_closed=False
            ).select_related('category', 'category__restaurant')

            # Order by order count or item ID to get popular active dishes
            items_qs = items_qs.annotate(order_count=Count('items')).order_by('-order_count', 'id')

            tags = []
            seen_names = set()
            for item in items_qs:
                clean_name = item.name.strip()
                if clean_name.lower() not in seen_names:
                    seen_names.add(clean_name.lower())
                    img_url = ""
                    try:
                        if item.image:
                            img_url = item.image.url
                    except (ValueError, AttributeError):
                        pass

                    tags.append({
                        'id': item.id,
                        'name': clean_name,
                        'category': item.category.name,
                        'restaurant_id': item.category.restaurant.id,
                        'restaurant_name': item.category.restaurant.name,
                        'restaurant_slug': item.category.restaurant.slug,
                        'price': float(item.price),
                        'image_url': img_url
                    })
                if len(tags) >= 8:
                    break

            return Response({
                'success': True,
                'results': tags,
                'tags': [t['name'] for t in tags]
            })
        except Exception as e:
            return Response({
                'success': True,
                'results': [],
                'tags': ['Tandoori Chicken', 'Reshmi Kabab', 'Double Smash Burger', 'Special Roghani Naan']
            })


class PublicSearchView(APIView):
    """
    GET /api/v1/search/?q={query}
    GET /api/restaurants/search/?q={query}
    Public search API for dishes & restaurants across all active tenants.
    Permission: AllowAny (Unauthenticated/Guest allowed).
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]


    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'success': True, 'restaurants': [], 'dishes': []})

        try:
            matching_restaurants = Restaurant.objects.filter(
                is_active=True,
                is_force_closed=False
            ).filter(
                Q(name__icontains=query) | Q(cuisine_type__icontains=query) | Q(description__icontains=query)
            )

            matching_dishes = MenuItem.objects.filter(
                is_available=True,
                category__is_active=True,
                category__restaurant__is_active=True,
                category__restaurant__is_force_closed=False
            ).filter(
                Q(name__icontains=query) | Q(description__icontains=query) | Q(category__name__icontains=query)
            ).select_related('category', 'category__restaurant')[:20]

            serialized_restaurants = RestaurantSerializer(matching_restaurants, many=True, context={'request': request}).data

            dishes_data = []
            for item in matching_dishes:
                img_url = ""
                try:
                    if item.image:
                        img_url = item.image.url
                except (ValueError, AttributeError):
                    pass

                dishes_data.append({
                    'id': item.id,
                    'name': item.name,
                    'description': item.description,
                    'price': float(item.price),
                    'image_url': img_url,
                    'category_name': item.category.name,
                    'restaurant_name': item.category.restaurant.name,
                    'restaurant_slug': item.category.restaurant.slug,
                })

            return Response({
                'success': True,
                'restaurants': serialized_restaurants,
                'dishes': dishes_data
            })
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)






