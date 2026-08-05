from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Order
from restaurants.models import RestaurantReview
from restaurants.serializers import RestaurantReviewSerializer
from .serializers import (
    OrderCreateSerializer, OrderDetailSerializer, OrderListSerializer,
    AdminOrderListSerializer
)



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
        
        # If user is a branch manager (staff but not superuser), filter by their managed restaurant/branch
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
        elif user.is_authenticated and user.is_superuser:
            # Super-Admin global scope override with optional query parameter filtering
            restaurant_id = self.request.query_params.get('restaurant_id') or self.request.query_params.get('tenant_id')
            branch_id = self.request.query_params.get('branch_id')
            if restaurant_id:
                if str(restaurant_id).isdigit():
                    queryset = queryset.filter(restaurant_id=int(restaurant_id))
                else:
                    queryset = queryset.filter(restaurant__slug=restaurant_id)
            if branch_id:
                if str(branch_id).isdigit():
                    queryset = queryset.filter(branch_id=int(branch_id))
                else:
                    queryset = queryset.filter(branch__slug=branch_id)
                
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


class OrderTrackView(APIView):
    """
    GET /api/orders/<pk>/track/ or GET /api/v1/orders/<pk>/track/
    Universal Live Order Status Tracking Endpoint.
    Allows any customer (authenticated or guest) to query live status, step, rider details,
    estimated time, and restaurant/branch info for Order #<pk> without authorization restrictions.
    """
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk=None):
        token = request.query_params.get('token') or request.query_params.get('tracking_token')
        
        try:
            if pk:
                from django.db.models import Q
                query = Q(display_order_id__iexact=str(pk).strip())
                if str(pk).isdigit():
                    query |= Q(pk=int(pk))
                order = Order.objects.select_related('restaurant', 'branch', 'rider').prefetch_related('items__menu_item').get(query)
            elif token:
                order = Order.objects.select_related('restaurant', 'branch', 'rider').prefetch_related('items__menu_item').get(tracking_token=token)
            else:
                return Response({'success': False, 'message': 'order_id or token required'}, status=status.HTTP_400_BAD_REQUEST)
        except Order.DoesNotExist:
            return Response({'success': False, 'message': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        data = OrderDetailSerializer(order).data
        return Response({
            'success': True,
            'message': 'Live tracking data fetched',
            'data': data
        }, status=status.HTTP_200_OK)


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
        
        # If the user is a superuser, grant full global access to all orders
        if user.is_authenticated and user.is_superuser:
            return queryset

        # If the user is a branch manager (is_staff and not is_superuser), restrict operations to their managed branch/restaurant
        if user.is_authenticated and user.is_staff:
            from config.admin_utils import get_managed_restaurant, get_managed_branch
            from django.db.models import Q
            managed_branch = get_managed_branch(user)
            managed_restaurant = get_managed_restaurant(user)
            
            if managed_branch:
                return queryset.filter(Q(branch=managed_branch) | Q(restaurant=managed_branch.restaurant))
            elif managed_restaurant:
                return queryset.filter(restaurant=managed_restaurant)
            return Order.objects.none()
            
        return queryset

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        pk = self.kwargs.get('pk')
        from django.db.models import Q
        from rest_framework.generics import get_object_or_404
        query = Q(display_order_id__iexact=str(pk).strip())
        if str(pk).isdigit():
            query |= Q(pk=int(pk))
        
        obj = get_object_or_404(queryset, query)
        self.check_object_permissions(self.request, obj)
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

        # Broadcast live status update to order-specific topic
        try:
            from config.notification_views import get_firebase_app
            app = get_firebase_app()
            if app:
                from firebase_admin import messaging
                topic = f"order_{instance.id}"
                message = messaging.Message(
                    notification=messaging.Notification(
                        title=f"Order #{instance.id} Status: {instance.get_status_display()}",
                        body=f"Your order status from {instance.restaurant.name} has been updated to {instance.get_status_display()}."
                    ),
                    data={
                        'type': 'ORDER_STATUS_UPDATE',
                        'order_id': str(instance.id),
                        'status': instance.status,
                        'screen': 'OrderTracking'
                    },
                    topic=topic,
                )
                messaging.send(message)
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to send order status broadcast for Order #{instance.id}: {e}")

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
    Payload: { "rider_id": 5, "is_hq_override": true } or { "rider_id": null }
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        is_super = getattr(user, 'is_superuser', False) or bool(request.data.get('is_hq_override'))

        rider_id = request.data.get('rider_id')
        if rider_id is None and 'rider' in request.data:
            rider_id = request.data.get('rider')

        if rider_id is None or rider_id == 0 or rider_id == '':
            order.rider = None
            order.save(update_fields=['rider'])
            return Response({
                'success': True,
                'message': 'Rider unassigned from order.',
                'hq_admin_override': is_super,
                'data': AdminOrderListSerializer(order).data
            })

        from restaurants.models import BranchRider
        try:
            rider = BranchRider.objects.get(pk=rider_id)
        except BranchRider.DoesNotExist:
            return Response({'error': 'Rider not found'}, status=status.HTTP_404_NOT_FOUND)

        if not rider.is_active:
            return Response({'error': 'Rider is inactive.'}, status=status.HTTP_400_BAD_REQUEST)

        # Cross-branch / Cross-brand check
        is_cross_branch = bool(order.branch and rider.branch and order.branch != rider.branch)
        is_cross_brand = bool(order.restaurant and rider.branch and rider.branch.restaurant and order.restaurant != rider.branch.restaurant)
        
        if (is_cross_branch or is_cross_brand) and not is_super:
            exact_exists = BranchRider.objects.filter(branch=order.branch, status='AVAILABLE', is_active=True).exists()
            if exact_exists and not request.data.get('allow_cross_branch'):
                return Response(
                    {'error': f"Rider '{rider.name}' belongs to '{rider.branch.name}' ({rider.branch.restaurant.name}). Please select a rider assigned to your branch."},
                    status=status.HTTP_403_FORBIDDEN
                )

        order.rider = rider
        if order.status == 'preparing':
            order.status = 'out_for_delivery'
        order.save(update_fields=['rider', 'status'])

        rider.status = 'ON_DELIVERY'
        rider.save(update_fields=['status'])

        msg = f'Order #{order.id} assigned to rider {rider.name}.'
        if is_cross_branch or is_cross_brand or is_super:
            msg = f'⚡ [HQ Fallback Override] Order #{order.id} assigned to rider {rider.name} ({rider.branch.name} - {rider.branch.restaurant.name}).'

        responseData = AdminOrderListSerializer(order).data
        responseData['hq_admin_override'] = is_super or is_cross_branch or is_cross_brand

        return Response({
            'success': True,
            'message': msg,
            'hq_admin_override': is_super or is_cross_branch or is_cross_brand,
            'data': responseData
        })


class ReorderView(APIView):
    """
    POST /api/orders/<pk>/reorder/
    Returns a structured cart payload from a past order for 1-tap reorder.
    Validates item availability against current DB state.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            order = Order.objects.prefetch_related(
                'items__menu_item'
            ).get(pk=pk, user=request.user)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        available_items = []
        unavailable_items = []

        for item in order.items.all():
            mi = item.menu_item
            if not mi.is_available:
                unavailable_items.append({
                    'menu_item_id': mi.id,
                    'name': mi.name,
                    'reason': 'out_of_stock',
                })
            else:
                available_items.append({
                    'menu_item_id': mi.id,
                    'name': mi.name,
                    'quantity': item.quantity,
                    'price': float(mi.price),
                    'image': mi.image or '',
                    'selected_options': item.selected_options or [],
                })

        return Response({
            'restaurant_id': order.restaurant_id,
            'restaurant_name': order.restaurant.name,
            'items': available_items,
            'unavailable_items': unavailable_items,
        })


class OrderReviewView(APIView):
    """
    POST /api/orders/<pk>/review/ — Submit review for a delivered order.
    GET  /api/orders/<pk>/review/ — Get review for an order.
    Only allowed for delivered orders. One review per order.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)

        if order.status != 'delivered':
            return Response(
                {'error': 'Reviews can only be submitted for delivered orders.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if hasattr(order, 'review') and order.review is not None:
            return Response(
                {'error': 'A review has already been submitted for this order.'},
                status=status.HTTP_409_CONFLICT
            )

        serializer = RestaurantReviewSerializer(data={
            **request.data,
            'order': pk,
            'restaurant': order.restaurant_id,
        })
        if serializer.is_valid():
            review = serializer.save(
                user=request.user if request.user.is_authenticated else None
            )
            return Response(RestaurantReviewSerializer(review).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get(self, request, pk):
        try:
            order = Order.objects.get(pk=pk)
            if not hasattr(order, 'review') or order.review is None:
                return Response({'error': 'Review not found.'}, status=status.HTTP_404_NOT_FOUND)
            return Response(RestaurantReviewSerializer(order.review).data)
        except Order.DoesNotExist:
            return Response({'error': 'Order not found.'}, status=status.HTTP_404_NOT_FOUND)


class RestaurantReviewsView(generics.ListAPIView):
    """
    GET /api/restaurants/<slug>/reviews/
    Paginated list of reviews for a restaurant (most recent first).
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = RestaurantReviewSerializer

    def get_queryset(self):
        slug = self.kwargs.get('slug')
        return RestaurantReview.objects.filter(
            restaurant__slug=slug
        ).select_related('order', 'user').order_by('-created_at')
