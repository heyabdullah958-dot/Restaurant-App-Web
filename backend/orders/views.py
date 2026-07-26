from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
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
        queryset = Order.objects.select_related('restaurant', 'branch', 'rider').prefetch_related('items__menu_item').order_by('-created_at')
        
        # If user is a branch manager (staff but not superuser), filter by their managed restaurant
        if user.is_authenticated and user.is_staff and not user.is_superuser:
            from config.admin_utils import get_managed_restaurant, get_managed_branch
            managed_branch = get_managed_branch(user)
            if managed_branch:
                queryset = queryset.filter(branch=managed_branch)
            else:
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
            
            # Send email notifications (Branch Manager: Full details | Restaurant Manager: Summary)
            try:
                from users.models import ManagerProfile, User
                from django.core.mail import send_mail
                from django.conf import settings
                import logging
                logger = logging.getLogger(__name__)
                
                customer_name = (
                    order.guest_name or 
                    getattr(order.user, 'username', 'Customer')
                )
                
                order_items_text = '\n'.join([
                    f"  - {item.menu_item.name} x{item.quantity} = Rs. {item.total_price}"
                    for item in order.items.select_related('menu_item').all()
                ])

                # 1. Branch Manager Email (Full Order Details)
                if order.branch:
                    branch_managers = ManagerProfile.objects.filter(
                        branch=order.branch
                    ).select_related('user')
                    
                    branch_emails = [
                        mp.notification_email 
                        for mp in branch_managers 
                        if mp.notification_email
                    ]
                    
                    if branch_emails:
                        branch_subject = f"🛵 [Branch Order] Order #{order.id} — {order.branch.name} Branch"
                        branch_message = f"""New order received at your branch!

ORDER DETAILS
─────────────────────────────
Order #:     {order.id}
Branch:      {order.branch.name}
Restaurant:  {order.restaurant.name}
Customer:    {customer_name}
Phone:       {order.guest_phone or getattr(order.user, 'phone', 'N/A')}
Payment:     {order.get_payment_method_display()}

ITEMS ORDERED
─────────────────────────────
{order_items_text}

TOTAL:       Rs. {order.total}
Delivery to: {order.delivery_address}

Special Notes: {order.special_instructions or 'None'}
─────────────────────────────
Placed at: {order.created_at.strftime('%d %b %Y, %I:%M %p')}

Log in to admin panel to update status:
https://foodsphere-admin.pages.dev

— FoodSphere Platform
"""
                        send_mail(
                            branch_subject,
                            branch_message,
                            settings.DEFAULT_FROM_EMAIL,
                            branch_emails,
                            fail_silently=True,
                        )
                        logger.info(f"Order #{order.id} branch email sent to: {branch_emails}")

                # 2. Restaurant Manager Email (Order Summary)
                rest_group_name = f"manager_{order.restaurant.slug}"
                rest_managers = User.objects.filter(
                    groups__name=rest_group_name,
                    is_staff=True
                ).exclude(manager_profile__isnull=False)
                
                rest_emails = [u.email for u in rest_managers if u.email]
                if not rest_emails:
                    rest_emails = [f"manager.{order.restaurant.slug}@foodsphere.com"]
                
                if rest_emails:
                    rest_subject = f"📊 [Restaurant Summary] Order #{order.id} — {order.restaurant.name}"
                    rest_message = f"""New order placed across {order.restaurant.name}!

ORDER SUMMARY
─────────────────────────────
Order #:     {order.id}
Restaurant:  {order.restaurant.name}
Branch:      {order.branch.name if order.branch else 'Unassigned'}
Customer:    {customer_name}
Total:       Rs. {order.total}
Payment:     {order.get_payment_method_display()}
Placed at:   {order.created_at.strftime('%d %b %Y, %I:%M %p')}
─────────────────────────────
Log in to FoodSphere Admin Panel:
https://foodsphere-admin.pages.dev

— FoodSphere Platform
"""
                    send_mail(
                        rest_subject,
                        rest_message,
                        settings.DEFAULT_FROM_EMAIL,
                        rest_emails,
                        fail_silently=True,
                    )
                    logger.info(f"Order #{order.id} restaurant summary email sent to: {rest_emails}")

            except Exception as e:
                import logging
                logging.getLogger(__name__).error(
                    f"Failed to send email notifications for Order #{order.id}: {e}"
                )

                    
            return Response({
                'success': True,
                'message': 'Order placed successfully',
                'data': OrderDetailSerializer(order).data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class OrderDetailView(generics.RetrieveUpdateAPIView):
    """
    GET /api/orders/{id}/ - Retrieve order details.
    Allows access only if:
      (a) request.user is authenticated and owns the order (order.user == request.user or request.user.is_staff), OR
      (b) request query parameter ?tracking_token=<uuid> matches order.tracking_token.
    PATCH /api/orders/{id}/ - Update order status (IsAdminUser).
    """
    serializer_class = OrderDetailSerializer

    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH']:
            return [permissions.IsAdminUser()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.select_related('restaurant', 'branch', 'rider').prefetch_related('items__menu_item')
        
        # If the user is a manager (is_staff and not is_superuser), restrict update operations to their managed restaurant/branch
        if user.is_authenticated and user.is_staff:
            from config.admin_utils import get_managed_restaurant, get_managed_branch
            from django.db.models import Q
            managed_branch = get_managed_branch(user)
            managed_restaurant = get_managed_restaurant(user)
            
            if managed_branch:
                return queryset.filter(Q(branch=managed_branch) | Q(restaurant=managed_branch.restaurant))
            elif managed_restaurant:
                return queryset.filter(restaurant=managed_restaurant)
            elif user.is_superuser:
                return queryset
            return Order.objects.none()
            
        return queryset

    def get_object(self):
        obj = super().get_object()
        request = self.request
        user = request.user

        if request.method == 'GET':
            tracking_token = request.query_params.get('tracking_token', '').strip()
            is_owner_or_staff = user.is_authenticated and (
                (obj.user and obj.user == user) or user.is_staff
            )
            has_valid_token = bool(tracking_token and str(obj.tracking_token) == tracking_token)

            if not (is_owner_or_staff or has_valid_token):
                raise PermissionDenied("You do not have permission to view this order.")

        return obj

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        user = request.user
        new_status = request.data.get('status')

        # Safeguard: Order status state machine transition matrix validation
        if new_status and new_status != instance.status and not getattr(user, 'is_superuser', False):
            INVALID_TRANSITIONS = {
                'delivered': ['pending', 'received', 'preparing', 'out_for_delivery'],
                'cancelled': ['pending', 'received', 'preparing', 'out_for_delivery', 'delivered'],
            }
            disallowed = INVALID_TRANSITIONS.get(instance.status, [])
            if new_status in disallowed:
                return Response(
                    {'error': f"Cannot transition order from '{instance.status}' to '{new_status}'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Safeguard 1: Blocking branch managers from cancelling delivered orders & Loyalty Point Reversals
        if new_status == 'cancelled' and instance.status != 'cancelled':
            cancellation_reason = request.data.get('cancellation_reason', '').strip()
            if not cancellation_reason:
                return Response(
                    {'error': 'cancellation_reason is required when cancelling an order.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if instance.status == 'delivered' and not getattr(user, 'is_superuser', False):
                return Response(
                    {'error': 'Only Super Admin can cancel an order that has already been delivered.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            instance.cancellation_reason = cancellation_reason
            instance.cancelled_by = user

            # Loyalty reversal engine
            if instance.user and not instance.user.is_guest:
                from users.models import LoyaltyTransaction, User
                from django.db.models import F
                existing_txs = list(LoyaltyTransaction.objects.filter(order=instance))
                for tx in existing_txs:
                    if tx.transaction_type == 'redeemed':
                        User.objects.filter(pk=instance.user.pk).update(loyalty_points=F('loyalty_points') + tx.points)
                        LoyaltyTransaction.objects.create(
                            user=instance.user,
                            order=instance,
                            points=tx.points,
                            transaction_type='earned',
                            description=f"Refunded {tx.points} pts for cancelled Order #{instance.id}"
                        )
                    elif tx.transaction_type == 'earned':
                        User.objects.filter(pk=instance.user.pk).update(loyalty_points=F('loyalty_points') - tx.points)
                        LoyaltyTransaction.objects.create(
                            user=instance.user,
                            order=instance,
                            points=tx.points,
                            transaction_type='redeemed',
                            description=f"Reverted {tx.points} earned pts for cancelled Order #{instance.id}"
                        )

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)


class MyOrdersListView(generics.ListAPIView):
    """
    GET /api/orders/my-orders/
    Order history for authenticated user.
    BUG-08 FIX: select_related('restaurant') — no N+1 per order row.
    """
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return Order.objects.filter(
            user=user
        ).select_related('restaurant').order_by('-created_at')


class PurgeOrdersView(APIView):
    """
    POST /api/orders/purge-all/
    Purge all orders from database (Super Admin only).
    """
    def get_permissions(self):
        from users.admin_views import IsSuperUser
        return [IsSuperUser()]

    def post(self, request):
        from payments.models import Payment
        Payment.objects.all().delete()
        count, _ = Order.objects.all().delete()
        return Response({
            'success': True,
            'message': f'Successfully purged all {count} order(s) and associated payments.'
        }, status=status.HTTP_200_OK)


class OrderAssignRiderView(APIView):
    """
    POST /api/orders/{id}/assign-rider/
    Assigns a BranchRider to an Order.
    Payload: { "rider_id": 5 } or { "rider_id": null }
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        rider_id = request.data.get('rider_id')
        if rider_id is None and 'rider' in request.data:
            rider_id = request.data.get('rider')

        if rider_id is None or rider_id == 0 or rider_id == '':
            order.rider = None
            order.save(update_fields=['rider'])
            return Response({
                'success': True,
                'message': 'Rider unassigned from order.',
                'data': AdminOrderListSerializer(order).data
            })

        from restaurants.models import BranchRider
        try:
            rider = BranchRider.objects.get(pk=rider_id)
        except BranchRider.DoesNotExist:
            return Response({'error': 'Rider not found'}, status=status.HTTP_404_NOT_FOUND)

        if not rider.is_active:
            return Response({'error': 'Rider is inactive.'}, status=status.HTTP_400_BAD_REQUEST)

        order.rider = rider
        if order.status == 'preparing':
            order.status = 'out_for_delivery'
        order.save(update_fields=['rider', 'status'])

        rider.status = 'ON_DELIVERY'
        rider.save(update_fields=['status'])

        return Response({
            'success': True,
            'message': f'Order #{order.id} assigned to rider {rider.name}.',
            'data': AdminOrderListSerializer(order).data
        })


