from django.urls import path
from .views import (
    CouponValidateView,
    CouponListCreateView,
    CouponDetailView,
    ActiveCouponsView,
    ActiveFlashDealsView,
    FlashDealListCreateView,
    FlashDealDetailView
)

urlpatterns = [
    path('coupons/', CouponListCreateView.as_view(), name='coupon-list-create'),
    path('coupons/<int:pk>/', CouponDetailView.as_view(), name='coupon-detail'),
    path('coupons/validate/', CouponValidateView.as_view(), name='coupon-validate'),
    path('coupons/active/', ActiveCouponsView.as_view(), name='coupons-active'),
    path('deals/', FlashDealListCreateView.as_view(), name='deal-list-create'),
    path('deals/active/', ActiveFlashDealsView.as_view(), name='deals-active'),
    path('deals/<int:pk>/', FlashDealDetailView.as_view(), name='deal-detail'),
    path('flash-deals/', FlashDealListCreateView.as_view(), name='flash-deal-list-create'),
    path('flash-deals/<int:pk>/', FlashDealDetailView.as_view(), name='flash-deal-detail'),
]

