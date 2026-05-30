"""
Analytics API Views — FoodSphere
REST endpoints consumed by the React admin dashboard.
Requires IsAdminUser (is_staff=True) permission.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db.models import Sum, Avg
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

        # Daily trend — last 7 days
        daily_trend = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_orders = Order.objects.filter(created_at__date=day)
            daily_trend.append({
                'date': day.strftime('%a'),
                'orders': day_orders.count(),
                'revenue': float(day_orders.aggregate(Sum('total'))['total__sum'] or 0),
            })

        # Per-restaurant breakdown (last 30 days)
        restaurant_breakdown = []
        for r in Restaurant.objects.filter(is_active=True):
            r_orders = Order.objects.filter(restaurant=r, created_at__date__gte=last_30)
            restaurant_breakdown.append({
                'id': r.id,
                'name': r.name,
                'slug': r.slug,
                'orders_30d': r_orders.count(),
                'revenue_30d': float(r_orders.aggregate(Sum('total'))['total__sum'] or 0),
                'avg_order': float(r_orders.aggregate(Avg('total'))['total__avg'] or 0),
            })

        # Order status breakdown (all time)
        status_breakdown = {}
        for status_choice in Order.STATUS_CHOICES:
            code = status_choice[0]
            status_breakdown[code] = Order.objects.filter(status=code).count()

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

        # Daily breakdown
        daily_trend = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_orders = orders_30d.filter(created_at__date=day)
            daily_trend.append({
                'date': day.strftime('%a'),
                'orders': day_orders.count(),
                'revenue': float(day_orders.aggregate(Sum('total'))['total__sum'] or 0),
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
