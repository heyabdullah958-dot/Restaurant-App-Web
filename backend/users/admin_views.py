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


class AdminCustomerListView(generics.ListAPIView):
    """
    GET /api/admin/customers/
    Returns paginated list of all non-staff customers with order counts and loyalty points.
    Super admin only.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]

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
        queryset = self.get_queryset().annotate(
            total_orders_count=Count('orders')
        )
        # Augment with stats
        results = []
        for user in queryset[:100]:  # Cap at 100 for performance
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
            'count': queryset.count(),
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
    permission_classes = [permissions.IsAdminUser]

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
    permission_classes = [permissions.IsAdminUser]

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

class AdminManagerListView(APIView):
    """
    GET /api/admin/managers/
    Returns list of all restaurant managers with their assigned restaurants.
    Super admin only.
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        managers = User.objects.filter(is_staff=True, is_superuser=False).order_by('username')
        results = []
        for u in managers:
            managed = get_managed_restaurant(u)
            if not managed:
                continue
            results.append({
                'id': u.id,
                'username': u.username,
                'email': u.email or '',
                'restaurant_name': managed.name if managed else 'None',
                'restaurant_id': managed.id if managed else None,
            })
        return Response(results)


class AdminManagerChangePasswordView(APIView):
    """
    POST /api/admin/managers/<pk>/change-password/
    Change password for a restaurant manager.
    Super admin only.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            user = User.objects.get(pk=pk, is_staff=True, is_superuser=False)
        except User.DoesNotExist:
            return Response({'error': 'Manager not found'}, status=404)

        new_password = request.data.get('password')
        if not new_password or len(new_password.strip()) < 6:
            return Response({'error': 'Password must be at least 6 characters long'}, status=400)

        user.set_password(new_password.strip())
        user.save()

        return Response({
            'success': True,
            'message': f"Password for {user.username} has been changed successfully!"
        })
