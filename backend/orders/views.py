from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Order
from .serializers import OrderCreateSerializer, OrderDetailSerializer, OrderListSerializer


class OrderListCreateView(generics.ListCreateAPIView):
    """
    POST /api/orders/ - Place a new order (AllowAny).
    GET /api/orders/ - List all orders (IsAdminUser) for dashboard sales aggregates.
    """
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return OrderCreateSerializer
        return OrderListSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_queryset(self):
        return Order.objects.select_related('restaurant').prefetch_related('items__menu_item').order_by('-created_at')

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
    Retrieve order details and tracking status.
    BUG-08 FIX: select_related to avoid N+1 on restaurant.
    """
    queryset = Order.objects.select_related('restaurant').prefetch_related('items__menu_item')
    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.AllowAny]  # Guest order tracking allowed


class MyOrdersListView(generics.ListAPIView):
    """
    GET /api/orders/my-orders/
    Order history for authenticated user.
    BUG-08 FIX: select_related('restaurant') — no N+1 per order row.
    """
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(
            user=self.request.user
        ).select_related('restaurant').order_by('-created_at')
