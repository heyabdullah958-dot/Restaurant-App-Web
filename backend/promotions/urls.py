from django.urls import path
from .views import CouponValidateView, ActiveCouponsView, ActiveFlashDealsView, FlashDealDetailView

urlpatterns = [
    path('coupons/validate/', CouponValidateView.as_view(), name='coupon-validate'),
    path('coupons/active/', ActiveCouponsView.as_view(), name='coupons-active'),
    path('deals/active/', ActiveFlashDealsView.as_view(), name='deals-active'),
    path('deals/<int:pk>/', FlashDealDetailView.as_view(), name='deal-detail'),
]
