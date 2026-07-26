from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone
from .models import BranchCashRegister, Order
from config.admin_utils import get_managed_branch, get_managed_restaurant
from users.admin_views import IsSuperUser

class BranchCashRegisterView(APIView):
    """
    GET /api/orders/cash-register/
      Query params: date (YYYY-MM-DD), branch_id
      Branch Managers get their assigned branch; Super Admin gets all.

    POST /api/orders/cash-register/
      Body: {
        "branch_id": int,
        "date": "YYYY-MM-DD",
        "total_cod_handed_over": 15500.00,
        "notes": "Rider cash turned over to HQ"
      }
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        user = request.user
        branch_id = request.query_params.get('branch_id')
        date_str = request.query_params.get('date', timezone.now().strftime('%Y-%m-%d'))

        qs = BranchCashRegister.objects.select_related('branch', 'submitted_by', 'verified_by')

        if not user.is_superuser:
            managed_branch = get_managed_branch(user)
            if managed_branch:
                qs = qs.filter(branch=managed_branch)
            else:
                managed_rest = get_managed_restaurant(user)
                if managed_rest:
                    qs = qs.filter(branch__restaurant=managed_rest)
                else:
                    return Response([])
        elif branch_id:
            qs = qs.filter(branch_id=branch_id)

        if date_str:
            qs = qs.filter(date=date_str)

        results = []
        for cr in qs:
            results.append({
                'id': cr.id,
                'branch_id': cr.branch_id,
                'branch_name': cr.branch.name,
                'restaurant_name': cr.branch.restaurant.name,
                'date': str(cr.date),
                'submitted_by': cr.submitted_by.username if cr.submitted_by else 'N/A',
                'total_orders_count': cr.total_orders_count,
                'total_cod_collected': str(cr.total_cod_collected),
                'total_cod_handed_over': str(cr.total_cod_handed_over),
                'discrepancy_amount': str(cr.discrepancy_amount),
                'is_verified_by_admin': cr.is_verified_by_admin,
                'verified_by': cr.verified_by.username if cr.verified_by else None,
                'verified_at': cr.verified_at.isoformat() if cr.verified_at else None,
                'notes': cr.notes or '',
            })

        return Response(results)

    def post(self, request):
        user = request.user
        branch_id = request.data.get('branch_id')
        date_str = request.data.get('date', timezone.now().strftime('%Y-%m-%d'))
        handed_over = request.data.get('total_cod_handed_over')
        notes = request.data.get('notes', '').strip()

        if not branch_id or handed_over is None:
            return Response({'error': 'branch_id and total_cod_handed_over are required.'}, status=status.HTTP_400_BAD_REQUEST)

        # Enforce branch scope for staff managers
        if not user.is_superuser:
            managed_branch = get_managed_branch(user)
            if managed_branch and str(managed_branch.id) != str(branch_id):
                return Response({'error': 'Unauthorized to submit cash register for another branch.'}, status=status.HTTP_403_FORBIDDEN)

        # Calculate actual COD collected for this branch and date from Delivered COD orders
        orders_qs = Order.objects.filter(
            branch_id=branch_id,
            payment_method='cod',
            status='delivered',
            created_at__date=date_str
        )
        total_orders = orders_qs.count()
        total_collected = sum([o.total for o in orders_qs])

        register, created = BranchCashRegister.objects.get_or_create(
            branch_id=branch_id,
            date=date_str,
            defaults={
                'submitted_by': user,
                'total_orders_count': total_orders,
                'total_cod_collected': total_collected,
                'total_cod_handed_over': handed_over,
                'notes': notes,
            }
        )

        if not created:
            register.submitted_by = user
            register.total_orders_count = total_orders
            register.total_cod_collected = total_collected
            register.total_cod_handed_over = handed_over
            register.notes = notes
            register.save()

        return Response({
            'success': True,
            'id': register.id,
            'branch_name': register.branch.name,
            'date': str(register.date),
            'total_cod_collected': str(register.total_cod_collected),
            'total_cod_handed_over': str(register.total_cod_handed_over),
            'discrepancy_amount': str(register.discrepancy_amount),
            'is_verified_by_admin': register.is_verified_by_admin,
            'message': 'Daily Branch Cash Register saved successfully.'
        })


class VerifyCashRegisterView(APIView):
    """
    POST /api/orders/cash-register/<pk>/verify/
    Super Admin confirmation of branch cash register.
    """
    permission_classes = [IsSuperUser]

    def post(self, request, pk):
        try:
            register = BranchCashRegister.objects.get(pk=pk)
        except BranchCashRegister.DoesNotExist:
            return Response({'error': 'Cash register entry not found.'}, status=status.HTTP_404_NOT_FOUND)

        register.is_verified_by_admin = True
        register.verified_by = request.user
        register.verified_at = timezone.now()
        register.save()

        return Response({
            'success': True,
            'message': f'Cash register for {register.branch.name} ({register.date}) verified successfully by Super Admin.'
        })
