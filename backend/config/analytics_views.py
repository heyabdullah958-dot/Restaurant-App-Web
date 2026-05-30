"""
Analytics API Views — FoodSphere
REST endpoints consumed by the React admin dashboard.
Requires IsAdminUser (is_staff=True) permission.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db.models import Sum, Avg, Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from orders.models import Order
from restaurants.models import Restaurant
from users.models import User


class PlatformAnalyticsView(APIView):
    """
    GET /api/analytics/platform/
    Returns platform-wide summary stats, daily trend, and per-restaurant breakdown.
    Admin/staff access only.
    """
    permission_classes = [IsAdminUser]

    def get(self, request):
        today = timezone.now().date()
        last_7 = today - timedelta(days=7)
        last_30 = today - timedelta(days=30)

        # Daily trend — last 7 days (efficient single-query approach)
        orders_7d_stats = Order.objects.filter(
            created_at__date__gte=today - timedelta(days=6)
        ).annotate(
            date_only=TruncDate('created_at')
        ).values('date_only').annotate(
            order_count=Count('id'),
            revenue_sum=Sum('total')
        )
        stats_map = {stat['date_only']: stat for stat in orders_7d_stats}

        daily_trend = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            stat = stats_map.get(day)
            daily_trend.append({
                'date': day.strftime('%a'),
                'orders': stat['order_count'] if stat else 0,
                'revenue': float(stat['revenue_sum'] or 0) if stat else 0.0,
            })

        # Per-restaurant breakdown (last 30 days & all-time) in a single aggregated query
        restaurant_stats = Restaurant.objects.annotate(
            orders_30d=Count(
                'orders',
                filter=Q(orders__created_at__date__gte=last_30),
                distinct=True
            ),
            revenue_30d=Sum(
                'orders__total',
                filter=Q(orders__created_at__date__gte=last_30)
            ),
            orders_all_time=Count('orders', distinct=True),
            revenue_all_time=Sum('orders__total'),
            avg_order=Avg('orders__total'),
        ).values(
            'id', 'name', 'slug',
            'orders_30d', 'revenue_30d',
            'orders_all_time', 'revenue_all_time', 'avg_order'
        )

        restaurant_breakdown = [{
            'id': r['id'],
            'name': r['name'],
            'slug': r['slug'],
            'orders_30d': r['orders_30d'] or 0,
            'revenue_30d': float(r['revenue_30d'] or 0),
            'orders_all_time': r['orders_all_time'] or 0,
            'revenue_all_time': float(r['revenue_all_time'] or 0),
            'avg_order': float(r['avg_order'] or 0),
        } for r in restaurant_stats]

        # Order status breakdown (all time) in a single query
        status_counts = Order.objects.values('status').annotate(count=Count('id'))
        status_map_db = {item['status']: item['count'] for item in status_counts}
        status_breakdown = {status_choice[0]: status_map_db.get(status_choice[0], 0) for status_choice in Order.STATUS_CHOICES}

        return Response({
            'summary': {
                'orders_today': Order.objects.filter(created_at__date=today).count(),
                'revenue_today': float(
                    Order.objects.filter(created_at__date=today)
                    .aggregate(Sum('total'))['total__sum'] or 0
                ),
                'orders_7d': Order.objects.filter(created_at__date__gte=last_7).count(),
                'revenue_7d': float(
                    Order.objects.filter(created_at__date__gte=last_7)
                    .aggregate(Sum('total'))['total__sum'] or 0
                ),
                'orders_30d': Order.objects.filter(created_at__date__gte=last_30).count(),
                'revenue_30d': float(
                    Order.objects.filter(created_at__date__gte=last_30)
                    .aggregate(Sum('total'))['total__sum'] or 0
                ),
                'orders_all_time': Order.objects.count(),
                'revenue_all_time': float(Order.objects.aggregate(Sum('total'))['total__sum'] or 0),
                'total_customers': User.objects.filter(is_guest=False, is_staff=False).count(),
                'total_guests': User.objects.filter(is_guest=True).count(),
                'total_loyalty_points': int(
                    User.objects.aggregate(Sum('loyalty_points'))['loyalty_points__sum'] or 0
                ),
                'total_restaurants': Restaurant.objects.filter(is_active=True).count(),
            },
            'daily_trend': daily_trend,
            'restaurant_breakdown': restaurant_breakdown,
            'status_breakdown': status_breakdown,
        })


class RestaurantAnalyticsView(APIView):
    """
    GET /api/analytics/restaurant/<restaurant_id>/
    Returns per-restaurant stats for the last 30 days.
    Admin/staff access only.
    """
    permission_classes = [IsAdminUser]

    def get(self, request, restaurant_id):
        today = timezone.now().date()
        last_7 = today - timedelta(days=7)
        last_30 = today - timedelta(days=30)

        try:
            restaurant = Restaurant.objects.get(pk=restaurant_id)
        except Restaurant.DoesNotExist:
            return Response({'error': 'Restaurant not found'}, status=404)

        orders_30d = Order.objects.filter(restaurant=restaurant, created_at__date__gte=last_30)

        # Daily breakdown (efficient single-query approach)
        restaurant_orders_7d = Order.objects.filter(
            restaurant=restaurant,
            created_at__date__gte=today - timedelta(days=6)
        ).annotate(
            date_only=TruncDate('created_at')
        ).values('date_only').annotate(
            order_count=Count('id'),
            revenue_sum=Sum('total')
        )
        stats_map = {stat['date_only']: stat for stat in restaurant_orders_7d}

        daily_trend = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            stat = stats_map.get(day)
            daily_trend.append({
                'date': day.strftime('%a'),
                'orders': stat['order_count'] if stat else 0,
                'revenue': float(stat['revenue_sum'] or 0) if stat else 0.0,
            })

        return Response({
            'restaurant': {'id': restaurant.id, 'name': restaurant.name, 'slug': restaurant.slug},
            'summary': {
                'orders_today': Order.objects.filter(restaurant=restaurant, created_at__date=today).count(),
                'orders_7d': Order.objects.filter(restaurant=restaurant, created_at__date__gte=last_7).count(),
                'orders_30d': orders_30d.count(),
                'revenue_30d': float(orders_30d.aggregate(Sum('total'))['total__sum'] or 0),
                'avg_order': float(orders_30d.aggregate(Avg('total'))['total__avg'] or 0),
            },
            'daily_trend': daily_trend,
        })

