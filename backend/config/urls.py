"""URL configuration for FoodSphere backend."""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from config.views import health_check, db_debug, root_view, trigger_seed, init_db
from config.admin_views import platform_analytics

from django.contrib.auth.views import PasswordChangeView
from django.core.exceptions import PermissionDenied

def custom_admin_password_change(request, *args, **kwargs):
    if request.user.is_authenticated and request.user.is_staff and not request.user.is_superuser:
        raise PermissionDenied("Managers are not allowed to change their own passwords.")
    return PasswordChangeView.as_view(success_url='/admin/')(request, *args, **kwargs)

urlpatterns = [
    path('', root_view, name='root'),
    path('admin/password_change/', custom_admin_password_change, name='admin_password_change'),
    path('admin/analytics/', platform_analytics, name='admin_analytics'),
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
]

# BUG-17 FIX: Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
