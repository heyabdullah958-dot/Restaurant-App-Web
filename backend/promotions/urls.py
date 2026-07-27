from django.urls import path
from .views import (
    CouponValidateView,
    CouponListCreateView,
    CouponDetailView,
    ActiveCouponsView,
    ActiveFlashDealsView,
    FlashDealDetailView
)

urlpatterns = [
    path('coupons/', CouponListCreateView.as_view(), name='coupon-list-create'),
    path('coupons/<int:pk>/', CouponDetailView.as_view(), name='coupon-detail'),
    path('coupons/validate/', CouponValidateView.as_view(), name='coupon-validate'),
    path('coupons/active/', ActiveCouponsView.as_view(), name='coupons-active'),
    path('deals/active/', ActiveFlashDealsView.as_view(), name='deals-active'),
    path('deals/<int:pk>/', FlashDealDetailView.as_view(), name='deal-detail'),
]
