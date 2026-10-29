import logging
from concurrent.futures import ThreadPoolExecutor
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

logger = logging.getLogger(__name__)

# Non-blocking background worker pool for email and FCM notifications.
# Offloads slow Gmail SMTP / Firebase network latency to prevent blocking HTTP 201 responses.
_notification_executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="order_notify")


def _dispatch_order_notifications(
    order_id,
    restaurant_id,
    fcm_title,
    fcm_body,
    branch_subject,
    branch_message,
    branch_emails,
    rest_subject,
    rest_message,
    rest_emails,
):
    """
    Background worker function for FCM push and email dispatch.
    Runs asynchronously and logs errors defensively without impacting client order responses.
    """
    # 1. FCM Push Notification
    try:
        from config.notification_views import get_firebase_app
        app = get_firebase_app()
        if app:
            from firebase_admin import messaging
            topic = f'restaurant_{restaurant_id}'
            message = messaging.Message(
                notification=messaging.Notification(
                    title=fcm_title,
                    body=fcm_body,
                ),
                topic=topic,
            )
            messaging.send(message)
            logger.info(f"Order #{order_id} FCM dispatched to topic {topic}")
    except Exception as e:
        logger.error(f"Failed to send order FCM for Order #{order_id}: {e}")

    # 2. Email Notifications (Branch Manager & Restaurant Manager)
    try:
        from django.core.mail import send_mail
        from django.conf import settings

        if branch_emails and branch_subject and branch_message:
            send_mail(
                branch_subject,
                branch_message,
                settings.DEFAULT_FROM_EMAIL,
                branch_emails,
                fail_silently=True,
            )
            logger.info(f"Order #{order_id} branch email sent to: {branch_emails}")

        if rest_emails and rest_subject and rest_message:
            send_mail(
                rest_subject,
                rest_message,
                settings.DEFAULT_FROM_EMAIL,
                rest_emails,
                fail_silently=True,
            )
            logger.info(f"Order #{order_id} restaurant summary email sent to: {rest_emails}")
    except Exception as e:
        logger.error(f"Failed to send email notifications for Order #{order_id}: {e}")
    finally:
        try:
            from django.db import connection
            connection.close()
        except Exception:
            pass




from rest_framework_simplejwt.authentication import JWTAuthentication


class OptionalJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except Exception:
            return None


class OrderListCreateView(generics.ListCreateAPIView):
    """
    POST /api/orders/ - Place a new order (IsAuthenticated).
    GET /api/orders/ - List all orders (IsAdminUser) for dashboard sales aggregates.
    """
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return OrderCreateSerializer
        # Admin GET request -> full detail serializer
        return AdminOrderListSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]

    def get_throttles(self):
        if self.request.method == 'POST':
            from config.throttles import OrderCreateThrottle
            return [OrderCreateThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        user = self.request.user
        queryset = Order.objects.select_related('restaurant', 'branch', 'rider__branch__restaurant').prefetch_related('items__menu_item').order_by('-created_at')
        
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
            
            # Offload FCM and email notifications to non-blocking background thread pool
            try:
                customer_name = (
                    order.guest_name or 
                    getattr(order.user, 'username', 'Customer')
                )
                disp_order_id = order.display_order_id or f"#{order.id}"
                fcm_title = f"New Order {disp_order_id}"
                fcm_body = f"New order received from {customer_name} for Rs. {order.total}"

                order_items_text = '\n'.join([
                    f"  - {item.menu_item.name} x{item.quantity} = Rs. {item.total_price}"
                    for item in order.items.select_related('menu_item').all()
                ])

                # 1. Branch Manager Email Payload
                branch_emails = []
                branch_subject = None
                branch_message = None
                if order.branch:
                    from users.models import ManagerProfile
                    branch_managers = ManagerProfile.objects.filter(
                        branch=order.branch
                    ).select_related('user')
                    branch_emails = [
                        mp.notification_email 
                        for mp in branch_managers 
                        if mp.notification_email
                    ]
                    if branch_emails:
                        branch_subject = f"🛵 [Branch Order] Order {disp_order_id} — {order.branch.name} Branch"
                        branch_message = f"""New order received at your branch!

ORDER DETAILS
─────────────────────────────
Order #:     {disp_order_id}
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

                # 2. Restaurant Manager Email Payload
                from users.models import User
                rest_group_name = f"manager_{order.restaurant.slug}"
                rest_managers = User.objects.filter(
                    groups__name=rest_group_name,
                    is_staff=True
                ).exclude(manager_profile__isnull=False)
                rest_emails = [u.email for u in rest_managers if u.email]
                if not rest_emails:
                    rest_emails = [f"manager.{order.restaurant.slug}@foodsphere.com"]

                rest_subject = f"📊 [Restaurant Summary] Order {disp_order_id} — {order.restaurant.name}"
                rest_message = f"""New order placed across {order.restaurant.name}!

ORDER SUMMARY
─────────────────────────────
Order #:     {disp_order_id}
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

                _notification_executor.submit(
                    _dispatch_order_notifications,
                    order.id,
                    order.restaurant.id,
                    fcm_title,
                    fcm_body,
                    branch_subject,
                    branch_message,
                    branch_emails,
                    rest_subject,
                    rest_message,
                    rest_emails,
                )
            except Exception as e:
                logger.error(f"Failed to enqueue notifications for Order #{order.id}: {e}")

                    
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
    Redacts sensitive PII (phone & exact address) unless valid tracking_token or owner auth is present.
    """
    authentication_classes = [OptionalJWTAuthentication]
    permission_classes = [permissions.AllowAny]
    throttle_classes = []

    def get(self, request, pk=None):
        token = request.query_params.get('token') or request.query_params.get('tracking_token')
        
        try:
            if pk:
                from django.db.models import Q
                query = Q(display_order_id__iexact=str(pk).strip())
                if str(pk).isdigit():
                    query |= Q(pk=int(pk))
                order = Order.objects.select_related('restaurant', 'branch', 'rider__branch__restaurant').prefetch_related('items__menu_item').filter(query).order_by('-id').first()
                if not order:
                    return Response({'success': False, 'message': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
            elif token:
                order = Order.objects.select_related('restaurant', 'branch', 'rider').prefetch_related('items__menu_item').filter(tracking_token=str(token).strip()).first()
                if not order:
                    return Response({'success': False, 'message': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({'success': False, 'message': 'order_id or token required'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error fetching tracking data for pk={pk}: {e}")
            return Response({'success': False, 'message': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        data = OrderDetailSerializer(order, context={'request': request}).data

        # PII Protection: Redact phone & address if token is missing/invalid and user is not owner/staff
        user = request.user
        is_owner_or_staff = user and user.is_authenticated and (
            (order.user and order.user == user) or user.is_staff
        )
        has_valid_token = bool(order.tracking_token and token and str(order.tracking_token).strip() == str(token).strip())

        if not (is_owner_or_staff or has_valid_token):
            data['guest_phone'] = None
            data['delivery_address'] = "[Protected]"
            data['delivery_lat'] = None
            data['delivery_lng'] = None

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
                return queryset.filter(branch=managed_branch)
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
            has_valid_token = bool(obj.tracking_token and tracking_token and str(obj.tracking_token).strip() == str(tracking_token).strip())

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
                        pts_refund = abs(tx.points)
                        User.objects.filter(pk=instance.user.pk).update(loyalty_points=F('loyalty_points') + pts_refund)
                        LoyaltyTransaction.objects.create(
                            user=instance.user,
                            order=instance,
                            points=pts_refund,
                            transaction_type='earned',
                            description=f"Refunded {pts_refund} pts for cancelled Order #{instance.id}"
                        )
                    elif tx.transaction_type == 'earned':
                        pts_revert = abs(tx.points)
                        User.objects.filter(pk=instance.user.pk).update(loyalty_points=F('loyalty_points') - pts_revert)
                        LoyaltyTransaction.objects.create(
                            user=instance.user,
                            order=instance,
                            points=-pts_revert,
                            transaction_type='redeemed',
                            description=f"Reverted {pts_revert} earned pts for cancelled Order #{instance.id}"
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
    Order history strictly scoped to the authenticated customer.
    BUG-08 FIX: select_related('restaurant', 'branch', 'rider') — no N+1 per order row.
    """
    serializer_class = OrderListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user or not user.is_authenticated or getattr(user, 'is_guest', False):
            return Order.objects.none()

        return (
            Order.objects.filter(user=user)
            .select_related('restaurant', 'branch', 'rider__branch__restaurant')
            .prefetch_related('items__menu_item')
            .order_by('-created_at')
        )


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
    Payload: { "rider_id": 5, "allow_cross_branch": true, "is_hq_override": true } or { "rider_id": null }
    Supports numeric Order.id and string Order.display_order_id.
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        from django.db.models import Q
        query = Q(display_order_id__iexact=str(pk).strip())
        if str(pk).isdigit():
            query |= Q(pk=int(pk))
        
        order = Order.objects.select_related('restaurant', 'branch', 'rider').filter(query).order_by('-id').first()
        if not order:
            return Response({'error': 'Order not found'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        is_super = bool(user and user.is_superuser)

        # Enforce caller-to-order ownership: non-superusers can only manage orders for their assigned branch or restaurant
        if not is_super:
            from config.admin_utils import get_managed_branch, get_managed_restaurant
            managed_branch = get_managed_branch(user)
            managed_restaurant = get_managed_restaurant(user)
            if managed_branch:
                if order.branch != managed_branch:
                    return Response(
                        {'error': 'You can only assign riders to orders belonging to your assigned branch.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            elif managed_restaurant:
                if order.restaurant != managed_restaurant:
                    return Response(
                        {'error': 'You can only assign riders to orders belonging to your assigned restaurant.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            else:
                return Response(
                    {'error': 'You do not have permission to manage orders.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        rider_id = request.data.get('rider_id')
        if rider_id is None and 'rider' in request.data:
            rider_id = request.data.get('rider')

        if rider_id is None or rider_id == 0 or rider_id == '':
            if order.rider:
                old_rider = order.rider
                order.rider = None
                order.save(update_fields=['rider'])
                # Free old rider if no other active deliveries
                active_deliveries = Order.objects.filter(status='out_for_delivery', rider=old_rider).exclude(pk=order.pk).exists()
                if not active_deliveries:
                    old_rider.status = 'AVAILABLE'
                    old_rider.save(update_fields=['status'])
            return Response({
                'success': True,
                'message': 'Rider unassigned from order.',
                'hq_admin_override': is_super,
                'data': AdminOrderListSerializer(order).data
            })

        from restaurants.models import BranchRider
        try:
            rider = BranchRider.objects.select_related('branch', 'branch__restaurant').get(pk=rider_id)
        except (BranchRider.DoesNotExist, ValueError):
            return Response({'error': 'Rider not found'}, status=status.HTTP_404_NOT_FOUND)

        # 1. Inactive check
        if not rider.is_active:
            return Response({'error': f"Rider '{rider.name}' is inactive and cannot be assigned."}, status=status.HTTP_400_BAD_REQUEST)

        # 2. Availability Guard: Reject ON_DELIVERY or OFFLINE riders
        if rider.status == 'ON_DELIVERY' and order.rider != rider:
            return Response(
                {'error': f"Rider '{rider.name}' is currently on another active delivery (ON_DELIVERY). Please select an available rider."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if rider.status == 'OFFLINE':
            return Response(
                {'error': f"Rider '{rider.name}' is currently marked OFFLINE. Please select an active available rider or activate the rider first."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 3. Multi-Tenant Branch & Brand Scoping
        is_cross_brand = bool(order.restaurant and rider.branch and rider.branch.restaurant and order.restaurant != rider.branch.restaurant)
        is_cross_branch = bool(order.branch and rider.branch and order.branch != rider.branch)

        # Strict isolation: Riders cannot be assigned across different restaurant brands unless Super Admin
        if is_cross_brand and not is_super:
            return Response(
                {'error': f"Rider '{rider.name}' belongs to '{rider.branch.restaurant.name}'. Cross-brand dispatch is prohibited for branch manager accounts."},
                status=status.HTTP_403_FORBIDDEN
            )

        # Cross-branch fallback within same restaurant brand: Allowed for managers when local riders unavailable or allow_cross_branch requested
        if is_cross_branch and not is_super:
            exact_exists = BranchRider.objects.filter(branch=order.branch, status='AVAILABLE', is_active=True).exclude(pk=rider.pk).exists()
            if exact_exists and not (request.data.get('allow_cross_branch') or request.data.get('allow_fallback')):
                return Response(
                    {'error': f"Rider '{rider.name}' belongs to '{rider.branch.name}'. Available local riders exist for your branch."},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Unassign previous rider if order was already assigned to someone else
        if order.rider and order.rider != rider:
            prev_rider = order.rider
            active_other = Order.objects.filter(status='out_for_delivery', rider=prev_rider).exclude(pk=order.pk).exists()
            if not active_other:
                prev_rider.status = 'AVAILABLE'
                prev_rider.save(update_fields=['status'])

        order.rider = rider
        if order.status in ['pending', 'received', 'preparing']:
            order.status = 'out_for_delivery'
        order.save(update_fields=['rider', 'status'])

        rider.status = 'ON_DELIVERY'
        rider.save(update_fields=['status'])

        msg = f'Order #{order.id} assigned to rider {rider.name}.'
        if is_cross_branch or is_cross_brand or is_super:
            msg = f'⚡ [HQ Override] Order #{order.id} assigned to rider {rider.name} ({rider.branch.name} - {rider.branch.restaurant.name}).'

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

        # Enforce order ownership: user must own order or provide matching tracking_token
        tracking_token = request.data.get('tracking_token') or request.query_params.get('tracking_token')
        is_owner = bool(request.user and request.user.is_authenticated and order.user and order.user == request.user)
        has_valid_token = bool(order.tracking_token and tracking_token and str(order.tracking_token).strip() == str(tracking_token).strip())

        if not (is_owner or has_valid_token):
            return Response(
                {'error': 'You do not have permission to review this order.'},
                status=status.HTTP_403_FORBIDDEN
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


class AdminCashRegisterView(APIView):
    """
    GET /api/admin/cash-register/
    Provides drawer balance, per-rider unsettled COD wallets, on-the-road cash,
    and recent settlement audit logs.
    Permission: IsAdminUser (Super Admin gets platform/branch view; Branch Manager gets branch view).
    """
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from .models import CashSettlementLog
        from restaurants.models import BranchRider

        user = request.user
        branch_id = request.query_params.get('branch_id')
        restaurant_id = request.query_params.get('restaurant_id')

        # Base QuerySets
        orders_qs = Order.objects.filter(payment_method='cod')
        riders_qs = BranchRider.objects.filter(is_active=True).select_related('branch', 'branch__restaurant')
        settlements_qs = CashSettlementLog.objects.select_related('rider', 'branch', 'settled_by').all()

        if not user.is_superuser:
            from config.admin_utils import get_managed_branch, get_managed_restaurant
            mb = get_managed_branch(user)
            if mb:
                orders_qs = orders_qs.filter(branch=mb)
                riders_qs = riders_qs.filter(branch=mb)
                settlements_qs = settlements_qs.filter(branch=mb)
            else:
                mr = get_managed_restaurant(user)
                if mr:
                    orders_qs = orders_qs.filter(restaurant=mr)
                    riders_qs = riders_qs.filter(branch__restaurant=mr)
                    settlements_qs = settlements_qs.filter(branch__restaurant=mr)
                else:
                    return Response({
                        'summary': {
                            'total_drawer_cash': 0.0,
                            'unsettled_rider_cash': 0.0,
                            'on_the_road_cash': 0.0,
                            'settled_orders_count': 0,
                            'unsettled_orders_count': 0,
                        },
                        'riders': [],
                        'recent_settlements': [],
                    })
        else:
            if branch_id:
                orders_qs = orders_qs.filter(branch_id=branch_id)
                riders_qs = riders_qs.filter(branch_id=branch_id)
                settlements_qs = settlements_qs.filter(branch_id=branch_id)
            elif restaurant_id:
                orders_qs = orders_qs.filter(restaurant_id=restaurant_id)
                riders_qs = riders_qs.filter(branch__restaurant_id=restaurant_id)
                settlements_qs = settlements_qs.filter(branch__restaurant_id=restaurant_id)

        # 1. Physical Drawer Cash: COD orders that are delivered AND cod_settled = True
        settled_orders = orders_qs.filter(status='delivered', cod_settled=True)
        total_drawer_cash = sum([float(o.total) for o in settled_orders])

        # 2. Unsettled Rider Cash: COD orders that are delivered AND cod_settled = False
        unsettled_orders = orders_qs.filter(status='delivered', cod_settled=False)
        unsettled_rider_cash = sum([float(o.total) for o in unsettled_orders])

        # 3. On The Road: COD orders currently out_for_delivery
        road_orders = orders_qs.filter(status='out_for_delivery')
        on_the_road_cash = sum([float(o.total) for o in road_orders])

        # 4. Per-Rider Cash Breakdown
        riders_list = []
        for rider in riders_qs:
            rider_delivered_unsettled = unsettled_orders.filter(rider=rider)
            unsettled_amt = sum([float(o.total) for o in rider_delivered_unsettled])
            unsettled_count = rider_delivered_unsettled.count()
            unsettled_ids = list(rider_delivered_unsettled.values_list('id', flat=True))

            rider_road = road_orders.filter(rider=rider)
            road_amt = sum([float(o.total) for o in rider_road])

            last_log = settlements_qs.filter(rider=rider).first()

            riders_list.append({
                'id': rider.id,
                'name': rider.name,
                'phone': rider.phone,
                'vehicle_type': rider.vehicle_type,
                'status': rider.status,
                'branch_id': rider.branch_id,
                'branch_name': rider.branch.name if rider.branch else 'N/A',
                'restaurant_name': rider.branch.restaurant.name if rider.branch and rider.branch.restaurant else 'N/A',
                'unsettled_amount': round(unsettled_amt, 2),
                'unsettled_orders_count': unsettled_count,
                'unsettled_order_ids': unsettled_ids,
                'on_the_road_amount': round(road_amt, 2),
                'last_settled_at': last_log.created_at.isoformat() if last_log else None,
            })

        # 4b. Direct Outlet / Walk-In Orders (orders where rider is None)
        unassigned_delivered_unsettled = unsettled_orders.filter(rider__isnull=True)
        unassigned_road = road_orders.filter(rider__isnull=True)
        unassigned_amt = sum([float(o.total) for o in unassigned_delivered_unsettled])
        unassigned_count = unassigned_delivered_unsettled.count()
        unassigned_ids = list(unassigned_delivered_unsettled.values_list('id', flat=True))
        unassigned_road_amt = sum([float(o.total) for o in unassigned_road])

        if unassigned_amt > 0 or unassigned_road_amt > 0:
            last_unassigned_log = settlements_qs.filter(rider__isnull=True).first()
            target_branch_name = 'Branch Outlet'
            if branch_id:
                try:
                    from restaurants.models import Branch
                    b_obj = Branch.objects.filter(id=branch_id).first()
                    if b_obj:
                        target_branch_name = b_obj.name
                except Exception:
                    pass
            elif not user.is_superuser:
                from config.admin_utils import get_managed_branch
                mb = get_managed_branch(user)
                if mb:
                    target_branch_name = mb.name

            riders_list.append({
                'id': None,
                'name': 'Direct / Counter Orders',
                'phone': 'In-Store / Direct',
                'vehicle_type': 'DIRECT',
                'status': 'AVAILABLE',
                'branch_id': int(branch_id) if branch_id else None,
                'branch_name': target_branch_name,
                'restaurant_name': 'In-Store Cash',
                'unsettled_amount': round(unassigned_amt, 2),
                'unsettled_orders_count': unassigned_count,
                'unsettled_order_ids': unassigned_ids,
                'on_the_road_amount': round(unassigned_road_amt, 2),
                'last_settled_at': last_unassigned_log.created_at.isoformat() if last_unassigned_log else None,
            })

        # Sort riders: highest unsettled amount first
        riders_list.sort(key=lambda x: x['unsettled_amount'], reverse=True)

        # 5. Recent Settlement Logs (last 30)
        recent_logs = []
        for log in settlements_qs[:30]:
            recent_logs.append({
                'id': log.id,
                'rider_id': log.rider_id,
                'rider_name': log.rider.name if log.rider else 'In-Store / Direct Outlet',
                'branch_name': log.branch.name if log.branch else (log.rider.branch.name if log.rider and log.rider.branch else 'Main'),
                'settled_by_name': log.settled_by.username if log.settled_by else 'Admin',
                'order_ids': log.order_ids or [],
                'amount_settled': float(log.amount_settled),
                'notes': log.notes or '',
                'created_at': log.created_at.isoformat(),
            })

        return Response({
            'summary': {
                'total_drawer_cash': round(total_drawer_cash, 2),
                'unsettled_rider_cash': round(unsettled_rider_cash, 2),
                'on_the_road_cash': round(on_the_road_cash, 2),
                'settled_orders_count': settled_orders.count(),
                'unsettled_orders_count': unsettled_orders.count(),
                'on_the_road_orders_count': road_orders.count(),
            },
            'riders': riders_list,
            'recent_settlements': recent_logs,
        })


class AdminCashRegisterSettleView(APIView):
    """
    POST /api/admin/cash-register/settle/
    Atomically marks delivered COD orders for a rider as cod_settled=True,
    creates CashSettlementLog, and updates branch drawer balance.
    Body:
    {
        "rider_id": int,
        "order_ids": [optional list of ints],
        "notes": "EOD Handover"
    }
    """
    permission_classes = [permissions.IsAdminUser]

    def post(self, request):
        from django.db import transaction
        from django.utils import timezone
        from .models import CashSettlementLog
        from restaurants.models import BranchRider

        rider_id = request.data.get('rider_id')
        order_ids = request.data.get('order_ids')
        notes = (request.data.get('notes') or '').strip()

        if not rider_id and not order_ids:
            return Response(
                {'error': 'Either rider_id or order_ids is required for settlement.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            rider = None
            if rider_id:
                try:
                    rider = BranchRider.objects.select_for_update().get(pk=rider_id)
                except BranchRider.DoesNotExist:
                    return Response({'error': f'Rider #{rider_id} not found.'}, status=status.HTTP_404_NOT_FOUND)

            orders_to_settle = Order.objects.select_for_update().filter(
                payment_method='cod',
                status='delivered',
                cod_settled=False
            )

            # Permission check for branch managers
            if not request.user.is_superuser:
                from config.admin_utils import get_managed_branch, get_managed_restaurant
                mb = get_managed_branch(request.user)
                mr = get_managed_restaurant(request.user)
                if not mb and not mr:
                    return Response({'error': 'Unauthorized: no branch or restaurant management rights.'}, status=status.HTTP_403_FORBIDDEN)
                if mb:
                    if rider and rider.branch_id != mb.id:
                        return Response({'error': 'Unauthorized to settle cash for another branch.'}, status=status.HTTP_403_FORBIDDEN)
                    orders_to_settle = orders_to_settle.filter(branch=mb)
                elif mr:
                    if rider and rider.branch and rider.branch.restaurant_id != mr.id:
                        return Response({'error': 'Unauthorized to settle cash for another restaurant.'}, status=status.HTTP_403_FORBIDDEN)
                    orders_to_settle = orders_to_settle.filter(restaurant=mr)

            if rider:
                orders_to_settle = orders_to_settle.filter(rider=rider)

            if order_ids and isinstance(order_ids, list) and len(order_ids) > 0:
                orders_to_settle = orders_to_settle.filter(id__in=order_ids)

            order_list = list(orders_to_settle)
            if not order_list:
                return Response({
                    'success': False,
                    'message': 'No unsettled delivered COD orders found for the given criteria.'
                }, status=status.HTTP_400_BAD_REQUEST)

            settled_amount = sum([o.total for o in order_list])
            settled_ids = [o.id for o in order_list]
            now = timezone.now()

            orders_to_settle.update(cod_settled=True, cod_settled_at=now)

            # Resolve rider and branch for logging if not provided directly
            first_ord = order_list[0]
            log_rider = rider or first_ord.rider
            log_branch = (rider.branch if rider else None) or first_ord.branch

            settlement_log = CashSettlementLog.objects.create(
                rider=log_rider,
                branch=log_branch,
                settled_by=request.user,
                order_ids=settled_ids,
                amount_settled=settled_amount,
                notes=notes or f"Cash settlement for {len(settled_ids)} delivered COD orders."
            )

            return Response({
                'success': True,
                'log_id': settlement_log.id,
                'amount_settled': float(settled_amount),
                'settled_orders_count': len(settled_ids),
                'order_ids': settled_ids,
                'message': f"Successfully settled Rs. {settled_amount:.2f} ({len(settled_ids)} orders)."
            }, status=status.HTTP_200_OK)

