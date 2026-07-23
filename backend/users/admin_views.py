"""
Admin Customer Management Views — FoodSphere
API endpoints for the React admin dashboard's Customer Management view.
Super admin only (IsAdminUser).
"""
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions
from django.db.models import Sum, Count
from .models import User, LoyaltyTransaction
from .serializers import UserSerializer


class IsSuperUser(permissions.BasePermission):
    """
    Allows access only to superusers.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)

class AdminCustomerListView(generics.ListAPIView):
    """
    GET /api/admin/customers/
    Returns paginated list of all non-staff customers with order counts and loyalty points.
    Super admin only.
    """
    serializer_class = UserSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        from django.db.models import Q
        qs = User.objects.filter(is_staff=False)
        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(phone__icontains=search)
            )
        return qs.order_by('-date_joined')

    def list(self, request, *args, **kwargs):
        page_size = min(int(request.query_params.get('page_size', 50)), 200)
        page = max(int(request.query_params.get('page', 1)), 1)
        offset = (page - 1) * page_size
        
        queryset = self.get_queryset().annotate(
            total_orders_count=Count('orders')
        )
        
        total = queryset.count()
        users_page = queryset[offset:offset + page_size]
        
        results = []
        for user in users_page:
            results.append({
                'id': user.id,
                'username': user.username,
                'email': user.email or '',
                'phone': user.phone or '',
                'loyalty_points': user.loyalty_points,
                'is_guest': user.is_guest,
                'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                'total_orders': user.total_orders_count,
            })
        
        return Response({
            'count': total,
            'page': page,
            'page_size': page_size,
            'total_pages': (total + page_size - 1) // page_size,
            'results': results,
        })


class AdminCustomerLoyaltyView(APIView):
    """
    PATCH /api/admin/customers/<pk>/loyalty/
    Manually adjust a customer's loyalty points. Creates a LoyaltyTransaction record.
    Super admin only.

    Body:
        { "loyalty_points": 500, "reason": "Compensation for late order" }
    """
    permission_classes = [IsSuperUser]

    def patch(self, request, pk):
        try:
            user = User.objects.get(pk=pk, is_staff=False)
        except User.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=404)

        new_points = request.data.get('loyalty_points')
        reason = request.data.get('reason', 'Admin manual adjustment')

        if new_points is None:
            return Response({'error': 'loyalty_points is required'}, status=400)

        try:
            new_points = int(new_points)
        except (ValueError, TypeError):
            return Response({'error': 'loyalty_points must be an integer'}, status=400)

        if new_points < 0:
            return Response({'error': 'loyalty_points cannot be negative'}, status=400)

        old_points = user.loyalty_points
        diff = new_points - old_points
        user.loyalty_points = new_points
        user.save(update_fields=['loyalty_points'])

        if diff != 0:
            LoyaltyTransaction.objects.create(
                user=user,
                points=abs(diff),
                transaction_type='earned' if diff > 0 else 'redeemed',
                description=f"Admin adjustment: {reason} (by {request.user.username})"
            )

        return Response({
            'success': True,
            'user_id': user.id,
            'username': user.username,
            'old_points': old_points,
            'new_points': user.loyalty_points,
            'diff': diff,
        })


class AdminCustomerDetailView(APIView):
    """
    GET /api/admin/customers/<pk>/
    Returns detailed profile + loyalty transaction history for a single customer.
    """
    permission_classes = [IsSuperUser]

    def get(self, request, pk):
        try:
            user = User.objects.get(pk=pk, is_staff=False)
        except User.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=404)

        transactions = LoyaltyTransaction.objects.filter(user=user).order_by('-created_at')[:20]

        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email or '',
            'phone': user.phone or '',
            'loyalty_points': user.loyalty_points,
            'is_guest': user.is_guest,
            'date_joined': user.date_joined.isoformat() if user.date_joined else None,
            'total_orders': user.orders.count() if hasattr(user, 'orders') else 0,
            'loyalty_history': [{
                'id': t.id,
                'points': t.points,
                'transaction_type': t.transaction_type,
                'description': t.description,
                'created_at': t.created_at.isoformat(),
            } for t in transactions],
        })


from config.admin_utils import get_managed_restaurant

class AdminManagerCreateView(APIView):
    """
    POST /api/admin/managers/create/
    Creates a branch manager user + ManagerProfile.
    Body: { 
      "restaurant_id": int, 
      "branch_id": int, 
      "notification_email": str,
      "password": str (optional, auto-generated if not provided)
    }
    Super admin only.
    """
    permission_classes = [IsSuperUser]

    def post(self, request):
        from restaurants.models import Restaurant, Branch
        from users.models import ManagerProfile
        from django.contrib.auth.models import Group
        import secrets
        
        restaurant_id = request.data.get('restaurant_id')
        branch_id = request.data.get('branch_id')
        notification_email = request.data.get('notification_email', '').strip()
        password = request.data.get('password', '').strip() or secrets.token_urlsafe(12)
        
        if not restaurant_id or not branch_id:
            return Response({'error': 'restaurant_id and branch_id are required.'}, status=400)
        if not notification_email:
            return Response({'error': 'notification_email is required.'}, status=400)
        
        try:
            restaurant = Restaurant.objects.get(pk=restaurant_id)
            branch = Branch.objects.get(pk=branch_id, restaurant=restaurant)
        except Restaurant.DoesNotExist:
            return Response({'error': 'Restaurant not found.'}, status=404)
        except Branch.DoesNotExist:
            return Response({'error': 'Branch not found or does not belong to this restaurant.'}, status=404)
        
        # Username: manager_{restaurant_slug}_{branch_name_slug}
        import re
        branch_slug = re.sub(r'[^a-z0-9]+', '_', branch.name.lower()).strip('_')
        username = f"manager_{restaurant.slug}_{branch_slug}"
        
        User = get_user_model()
        if User.objects.filter(username=username).exists():
            return Response({'error': f'Manager account already exists: {username}'}, status=409)
        
        # Create user
        user = User.objects.create_user(
            username=username,
            email=notification_email,
            password=password,
            is_staff=True,
            is_active=True,
        )
        
        # Add to restaurant manager group (preserve existing group-based auth)
        group_name = f"manager_{restaurant.slug}"
        group, _ = Group.objects.get_or_create(name=group_name)
        user.groups.add(group)
        
        # Create ManagerProfile
        ManagerProfile.objects.create(
            user=user,
            restaurant=restaurant,
            branch=branch,
            notification_email=notification_email,
        )
        
        return Response({
            'success': True,
            'username': username,
            'password': password,
            'restaurant': restaurant.name,
            'branch': branch.name,
            'notification_email': notification_email,
            'message': f'Manager account created. Save the password — it is shown only once.'
        }, status=201)


class AdminBranchListView(APIView):
    """
    GET /api/admin/branches/?restaurant_id=<id>
    Returns all branches for a restaurant.
    Super admin only.
    """
    permission_classes = [IsSuperUser]

    def get(self, request):
        from restaurants.models import Branch
        restaurant_id = request.query_params.get('restaurant_id')
        qs = Branch.objects.select_related('restaurant')
        if restaurant_id:
            qs = qs.filter(restaurant_id=restaurant_id)
        return Response([{
            'id': b.id,
            'name': b.name,
            'address': b.address,
            'phone': b.phone,
            'is_active': b.is_active,
            'restaurant_id': b.restaurant_id,
            'restaurant_name': b.restaurant.name,
        } for b in qs])


class AdminManagerListView(APIView):
    """
    GET /api/admin/managers/
    Returns list of all restaurant managers with their assigned restaurants.
    Super admin only.
    """
    permission_classes = [IsSuperUser]

    def get(self, request):
        from django.contrib.auth.models import Group
        from restaurants.models import Restaurant
        
        # Fetch manager groups and user relations
        manager_groups = Group.objects.filter(
            name__startswith='manager_'
        ).prefetch_related('user_set')
        
        # Slug -> Restaurant mapping in one query
        slugs = [g.name.replace('manager_', '') for g in manager_groups]
        restaurants_map = {
            r.slug: r 
            for r in Restaurant.objects.filter(slug__in=slugs)
        }
        
        # Fetch managers and prefetch groups
        managers = User.objects.filter(
            is_staff=True, 
            is_superuser=False
        ).prefetch_related('groups').order_by('username')
        
        LAUNCH_SLUGS = {'tandooristoppk', 'jushhpk', 'getafomo'}
        results = []
        for u in managers:
            restaurant = None
            for group in u.groups.all():
                if group.name.startswith('manager_'):
                    slug = group.name.replace('manager_', '')
                    restaurant = restaurants_map.get(slug)
                    break
            
            if not restaurant or restaurant.slug not in LAUNCH_SLUGS:
                continue
                
            results.append({
                'id': u.id,
                'username': u.username,
                'email': u.email or '',
                'restaurant_name': restaurant.name,
                'restaurant_id': restaurant.id,
                'branch_name': (u.manager_profile.branch.name 
                                if hasattr(u, 'manager_profile') else ''),
                'branch_id': (u.manager_profile.branch_id 
                              if hasattr(u, 'manager_profile') else None),
                'notification_email': (u.manager_profile.notification_email 
                                       if hasattr(u, 'manager_profile') else u.email or ''),
            })
        return Response(results)


class AdminManagerChangePasswordView(APIView):
    """
    POST /api/admin/managers/<pk>/change-password/
    Change password for a restaurant manager.
    Super admin only.
    """
    permission_classes = [IsSuperUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk, is_staff=True, is_superuser=False)
        except User.DoesNotExist:
            return Response({'error': 'Manager not found'}, status=404)

        new_password = request.data.get('password', '').strip()
        if not new_password:
            return Response({'error': 'Password is required.'}, status=400)

        user.set_password(new_password)
        user.save()

        return Response({
            'success': True,
            'message': f"Password for {user.username} has been changed successfully!"
        })
