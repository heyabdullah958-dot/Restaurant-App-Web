from django.urls import path
from .views import (
    OrderListCreateView, OrderDetailView, OrderTrackView, MyOrdersListView,
    PurgeOrdersView, OrderAssignRiderView, ReorderView, OrderReviewView,
    RestaurantReviewsView
)
from .cash_register_views import BranchCashRegisterView, VerifyCashRegisterView

urlpatterns = [
    path('orders/', OrderListCreateView.as_view(), name='order_create'),
    path('orders/my-orders/', MyOrdersListView.as_view(), name='my_orders_list'),
    path('orders/purge-all/', PurgeOrdersView.as_view(), name='purge_all_orders'),
    path('orders/cash-register/', BranchCashRegisterView.as_view(), name='branch_cash_register'),
    path('orders/cash-register/<int:pk>/verify/', VerifyCashRegisterView.as_view(), name='verify_cash_register'),
    path('orders/<str:pk>/assign-rider/', OrderAssignRiderView.as_view(), name='order_assign_rider'),
    path('orders/<str:pk>/track/', OrderTrackView.as_view(), name='order_track'),
    path('orders/track/', OrderTrackView.as_view(), name='order_guest_track'),
    path('orders/<str:pk>/reorder/', ReorderView.as_view(), name='order_reorder'),
    path('orders/<str:pk>/review/', OrderReviewView.as_view(), name='order_review'),
    path('orders/<str:pk>/', OrderDetailView.as_view(), name='order_detail'),
    path('restaurants/<slug:slug>/reviews/', RestaurantReviewsView.as_view(), name='restaurant_reviews'),
]
