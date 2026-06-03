"""
Admin Analytics View — FoodSphere
Custom Django admin view providing platform-wide analytics dashboard.
Requires staff login. Renders as a Jazzmin-compatible admin page.
"""
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render
from django.db.models import Sum, Avg, Count, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from datetime import timedelta
from orders.models import Order
from restaurants.models import Restaurant
import traceback
from django.http import HttpResponse
import logging

logger = logging.getLogger('django')

@staff_member_required
def platform_analytics(request):
    try:
        today = timezone.now().date()
        last_7 = today - timedelta(days=7)
        last_30 = today - timedelta(days=30)

        stats = {
            'orders_today': Order.objects.filter(created_at__date=today).count(),
            'revenue_today': Order.objects.filter(created_at__date=today).aggregate(Sum('total'))['total__sum'] or 0,
            'orders_7d': Order.objects.filter(created_at__date__gte=last_7).count(),
            'revenue_7d': Order.objects.filter(created_at__date__gte=last_7).aggregate(Sum('total'))['total__sum'] or 0,
            'orders_30d': Order.objects.filter(created_at__date__gte=last_30).count(),
            'revenue_30d': Order.objects.filter(created_at__date__gte=last_30).aggregate(Sum('total'))['total__sum'] or 0,
        }

        # Per-restaurant breakdown (last 30 days) — optimized single query using annotations
        restaurant_stats_qs = Restaurant.objects.filter(is_active=True).annotate(
            orders_30d_count=Count(
                'orders',
                filter=Q(orders__created_at__date__gte=last_30),
                distinct=True
            ),
            revenue_30d_sum=Sum(
                'orders__total',
                filter=Q(orders__created_at__date__gte=last_30)
            ),
            avg_order_val=Avg(
                'orders__total',
                filter=Q(orders__created_at__date__gte=last_30)
            ),
        ).values('name', 'orders_30d_count', 'revenue_30d_sum', 'avg_order_val')
        
        restaurant_stats = [{
            'name': r['name'],
            'orders': r['orders_30d_count'] or 0,
            'revenue': float(r['revenue_30d_sum'] or 0),
            'avg_order': float(r['avg_order_val'] or 0),
        } for r in restaurant_stats_qs]

        # Daily order trend — optimized single query for 7-day trend instead of 14 queries in a loop
        orders_7d_stats = Order.objects.filter(
            created_at__date__gte=today - timedelta(days=6)
        ).annotate(
            date_only=TruncDate('created_at')
        ).values('date_only').annotate(
            order_count=Count('id'),
            revenue_sum=Sum('total')
        )
        stats_map = {stat['date_only']: stat for stat in orders_7d_stats}
        
        daily_orders = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            stat = stats_map.get(day)
            daily_orders.append({
                'date': day.strftime('%a %d'),
                'orders': stat['order_count'] if stat else 0,
                'revenue': float(stat['revenue_sum'] or 0) if stat else 0.0
            })

        return render(request, 'admin/platform_analytics.html', {
            'stats': stats,
            'restaurant_stats': restaurant_stats,
            'daily_orders': daily_orders,
            'title': 'Platform Analytics',
        })
    except Exception as e:
        tb = traceback.format_exc()
        logger.error(f"[Platform Analytics Error] {tb}")
        if request.user.is_superuser:
            return HttpResponse(
                f"<h1>Platform Analytics Error (Superuser Diagnostic)</h1>"
                f"<p>This error info is shown only to Superusers.</p>"
                f"<pre>{tb}</pre>",
                status=500
            )
        raise e
