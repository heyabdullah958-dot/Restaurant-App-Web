from rest_framework import status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from orders.models import Order
from .models import Payment
from .serializers import PaymentSerializer

class ConfirmCODPaymentView(APIView):
    """
    POST /api/payments/cod/confirm/
    Confirm COD checkout and generate a completed payment record for the order.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        order_id = request.data.get('order_id')
        if not order_id:
            return Response({
                'success': False,
                'message': 'order_id is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            order = Order.objects.get(pk=order_id)
            
            if order.payment_method != 'cod':
                return Response({
                    'success': False,
                    'message': f"Order payment method is {order.payment_method}, not 'cod'."
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
    Mock Stripe PaymentIntent creation for API testing. (Fully implemented in Phase 6).
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        return Response({
            'success': True,
            'message': 'Stripe payment intent mock created (Phase 6 placeholder)',
            'data': {
                'client_secret': 'pi_mock_secret_12345abcde',
                'amount': request.data.get('amount', 0.00)
            }
        })
