from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Order
from .serializers import OrderCreateSerializer, OrderDetailSerializer, OrderListSerializer

class OrderCreateView(generics.CreateAPIView):
    """
    POST /api/orders/
    Place a new order. Supports both authenticated checkouts and guest checkouts.
    """
    serializer_class = OrderCreateSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            order = serializer.save()
            return Response({
                'success': True,
                'message': 'Order placed successfully',
                'data': OrderDetailSerializer(order).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class OrderDetailView(generics.RetrieveAPIView):
    """
    GET /api/orders/{id}/
    Retrieve specific order details and tracking status.
    """
    queryset = Order.objects.all()
    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.AllowAny]  # Allowed for tracking guest orders easily

class MyOrdersListView(generics.ListAPIView):
    """
    GET /api/orders/my-orders/
    Retrieve order history for the authenticated user.
    """
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).order_by('-created_at')
