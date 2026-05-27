from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from orders.models import Order
from .models import Payment
from .serializers import PaymentSerializer
import logging

logger = logging.getLogger(__name__)


class ConfirmCODPaymentView(APIView):
    """
    POST /api/payments/cod/confirm/
    Confirm COD checkout and generate a payment record for the order.
    BUG-06 FIX: Added ownership check + status guard.
    """
    permission_classes = [permissions.AllowAny]  # Kept for guest support

    def post(self, request):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({
                'success': False,
                'message': 'order_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(pk=order_id)

            # Ownership check — authenticated users can only confirm their own orders
            if request.user.is_authenticated:
                if order.user and order.user != request.user:
                    logger.warning(
                        f"User {request.user.id} attempted to confirm order {order_id} "
                        f"owned by user {order.user.id}"
                    )
                    return Response({
                        'success': False,
                        'message': 'You do not have permission to confirm this order.'
                    }, status=status.HTTP_403_FORBIDDEN)

            # Status guard — only confirm orders that are in 'received' status
            if order.status not in ('received', 'pending'):
                return Response({
                    'success': False,
                    'message': f"Order is already '{order.status}'. Cannot confirm again."
                }, status=status.HTTP_400_BAD_REQUEST)

            if order.payment_method != 'cod':
                return Response({
                    'success': False,
                    'message': f"Order payment method is '{order.payment_method}', not 'cod'."
                }, status=status.HTTP_400_BAD_REQUEST)

            payment, created = Payment.objects.get_or_create(
                order=order,
                method='cod',
                defaults={
                    'amount': order.total,
                    'status': 'completed',
                    'transaction_id': f"COD-{order.id}"
                }
            )

            return Response({
                'success': True,
                'message': 'COD Payment confirmed successfully',
                'data': PaymentSerializer(payment).data
            })

        except Order.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Order not found'
            }, status=status.HTTP_404_NOT_FOUND)


class CreateStripePaymentIntentView(APIView):
    """
    POST /api/payments/stripe/create/
    BUG-13 FIX: Returns 503 — Stripe not yet configured.
    Prevents users from thinking they paid when they haven't.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        return Response({
            'success': False,
            'message': (
                'Online card payments are not yet available. '
                'Please select Cash on Delivery (COD) to complete your order.'
            )
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)
