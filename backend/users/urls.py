from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import UserRegisterView, GuestAuthView, UserProfileView, LoyaltyHistoryView

urlpatterns = [
    # Auth endpoints
    path('auth/register/', UserRegisterView.as_view(), name='auth_register'),
    path('auth/login/', TokenObtainPairView.as_view(), name='auth_login'),
    path('auth/guest/', GuestAuthView.as_view(), name='auth_guest'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth_refresh'),
    
    # User profile & loyalty
    path('users/profile/', UserProfileView.as_view(), name='user_profile'),
    path('users/loyalty/', LoyaltyHistoryView.as_view(), name='user_loyalty'),
]
