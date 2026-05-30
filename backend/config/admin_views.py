"""
Admin Analytics View — FoodSphere
Custom Django admin view providing platform-wide analytics dashboard.
Requires staff login. Renders as a Jazzmin-compatible admin page.
"""
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render
from django.db.models import Sum, Avg
from django.utils import timezone
from datetime import timedelta
from orders.models import Order
from restaurants.models import Restaurant


@staff_member_required
def platform_analytics(request):
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

    # Per-restaurant breakdown (last 30 days)
    restaurant_stats = []
    for r in Restaurant.objects.filter(is_active=True):
        r_orders = Order.objects.filter(restaurant=r, created_at__date__gte=last_30)
        restaurant_stats.append({
            'name': r.name,
            'orders': r_orders.count(),
            'revenue': r_orders.aggregate(Sum('total'))['total__sum'] or 0,
            'avg_order': r_orders.aggregate(Avg('total'))['total__avg'] or 0,
        })

    # Daily order trend (last 7 days)
    daily_orders = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        count = Order.objects.filter(created_at__date=day).count()
        rev = Order.objects.filter(created_at__date=day).aggregate(Sum('total'))['total__sum'] or 0
        daily_orders.append({'date': day.strftime('%a %d'), 'orders': count, 'revenue': float(rev)})

    return render(request, 'admin/platform_analytics.html', {
        'stats': stats,
        'restaurant_stats': restaurant_stats,
        'daily_orders': daily_orders,
        'title': 'Platform Analytics',
    })
