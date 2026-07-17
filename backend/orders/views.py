from rest_framework import generics, permissions, status
from rest_framework.response import Response
from .models import Order
from .serializers import OrderCreateSerializer, OrderDetailSerializer, OrderListSerializer, AdminOrderListSerializer


class OrderListCreateView(generics.ListCreateAPIView):
    """
    POST /api/orders/ - Place a new order (AllowAny).
    GET /api/orders/ - List all orders (IsAdminUser) for dashboard sales aggregates.
    """
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return OrderCreateSerializer
        # Admin GET request -> full detail serializer
        return AdminOrderListSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get_throttles(self):
        if self.request.method == 'POST':
            from config.throttles import OrderCreateThrottle
            return [OrderCreateThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.select_related('restaurant').prefetch_related('items__menu_item').order_by('-created_at')
        
        # If user is a branch manager (staff but not superuser), filter by their managed restaurant
        if user.is_authenticated and user.is_staff and not user.is_superuser:
            from config.admin_utils import get_managed_restaurant
            managed = get_managed_restaurant(user)
            if managed:
                queryset = queryset.filter(restaurant=managed)
            else:
                queryset = queryset.none()
                
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            order = serializer.save()
            
            # Send FCM push notification
            from config.notification_views import get_firebase_app
            app = get_firebase_app()
            if app:
                from firebase_admin import messaging
                try:
                    topic = f'restaurant_{order.restaurant.id}'
                    message = messaging.Message(
                        notification=messaging.Notification(
                            title=f"New Order #{order.id}",
                            body=f"New order received from {order.guest_name or getattr(order.user, 'username', 'Customer')} for Rs. {order.total}"
                        ),
                        topic=topic,
                    )
                    messaging.send(message)
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"Failed to send order FCM: {e}")
                    
            return Response({
                'success': True,
                'message': 'Order placed successfully',
                'data': OrderDetailSerializer(order).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OrderDetailView(generics.RetrieveUpdateAPIView):
    """
    GET /api/orders/{id}/ - Retrieve order details (AllowAny).
    PATCH /api/orders/{id}/ - Update order status (IsAdminUser).
    """
    serializer_class = OrderDetailSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.select_related('restaurant').prefetch_related('items__menu_item')
        
        # If superuser, allow all
        if user.is_authenticated and user.is_superuser:
            return queryset
            
        # If the user is a manager (is_staff and not is_superuser), restrict queryset to their managed restaurant
        if user.is_authenticated and user.is_staff:
            from config.admin_utils import get_managed_restaurant
            managed = get_managed_restaurant(user)
            if managed:
                return queryset.filter(restaurant=managed)
            return Order.objects.none()
            
        # If ordinary authenticated user, restrict strictly to their own orders
        if user.is_authenticated:
            return queryset.filter(user=user)
            
        # If anonymous (no token attached), restrict to guest orders where phone matches
        guest_phone = self.request.query_params.get('phone', '')
        if guest_phone:
            return queryset.filter(guest_phone=guest_phone)
        
        return Order.objects.none()


class MyOrdersListView(generics.ListAPIView):
    """
    GET /api/orders/my-orders/
    Order history for authenticated user.
    BUG-08 FIX: select_related('restaurant') — no N+1 per order row.
    """
    serializer_class = OrderListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Order.objects.filter(
                user=user
            ).select_related('restaurant').order_by('-created_at')
            
        guest_phone = self.request.query_params.get('phone', '')
        if guest_phone:
            return Order.objects.filter(
                guest_phone=guest_phone
            ).select_related('restaurant').order_by('-created_at')
            
        return Order.objects.none()
