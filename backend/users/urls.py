from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import UserRegisterView, GuestAuthView, UserProfileView, LoyaltyHistoryView, CustomTokenObtainPairView, LogoutView
from .admin_views import AdminCustomerListView, AdminCustomerLoyaltyView, AdminCustomerDetailView
from config.analytics_views import PlatformAnalyticsView, RestaurantAnalyticsView
from config.notification_views import SendNotificationView

urlpatterns = [
    # Auth endpoints
    path('auth/register/', UserRegisterView.as_view(), name='auth_register'),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='auth_login'),
    path('auth/guest/', GuestAuthView.as_view(), name='auth_guest'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='auth_logout'),


    # User profile & loyalty
    path('users/profile/', UserProfileView.as_view(), name='user_profile'),
    path('users/loyalty/', LoyaltyHistoryView.as_view(), name='user_loyalty'),

    # ── Admin Customer Management ──────────────────────────
    path('admin/customers/', AdminCustomerListView.as_view(), name='admin_customer_list'),
    path('admin/customers/<int:pk>/', AdminCustomerDetailView.as_view(), name='admin_customer_detail'),
    path('admin/customers/<int:pk>/loyalty/', AdminCustomerLoyaltyView.as_view(), name='admin_customer_loyalty'),

    # ── Analytics API ──────────────────────────────────────
    path('analytics/platform/', PlatformAnalyticsView.as_view(), name='analytics_platform'),
    path('analytics/restaurant/<int:restaurant_id>/', RestaurantAnalyticsView.as_view(), name='analytics_restaurant'),

    # ── Notifications ──────────────────────────────────────
    path('admin/notifications/send/', SendNotificationView.as_view(), name='admin_notify_send'),
]
