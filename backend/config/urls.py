"""URL configuration for FoodSphere backend."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from config.views import health_check, db_debug, root_view, trigger_seed, init_db
from config.admin_views import platform_analytics

urlpatterns = [
    path('', root_view, name='root'),
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
    path('api/health/', health_check, name='api_health_check'),
    path('api/db-debug/', db_debug, name='db_debug'),
    path('api/seed/', trigger_seed, name='trigger_seed'),
    path('api/init-db/', init_db, name='init_db'),

    # API App Routes
    path('api/', include('users.urls')),
    path('api/', include('restaurants.urls')),
    path('api/', include('orders.urls')),
    path('api/', include('payments.urls')),

    # Admin extras
    path('admin/analytics/', platform_analytics, name='admin_analytics'),
]

# BUG-17 FIX: Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
