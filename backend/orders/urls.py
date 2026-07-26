from django.urls import path
from .views import OrderListCreateView, OrderDetailView, OrderTrackView, MyOrdersListView, PurgeOrdersView, OrderAssignRiderView
from .cash_register_views import BranchCashRegisterView, VerifyCashRegisterView

urlpatterns = [
    path('orders/', OrderListCreateView.as_view(), name='order_create'),
    path('orders/my-orders/', MyOrdersListView.as_view(), name='my_orders_list'),
    path('orders/purge-all/', PurgeOrdersView.as_view(), name='purge_all_orders'),
    path('orders/cash-register/', BranchCashRegisterView.as_view(), name='branch_cash_register'),
    path('orders/cash-register/<int:pk>/verify/', VerifyCashRegisterView.as_view(), name='verify_cash_register'),
    path('orders/<int:pk>/assign-rider/', OrderAssignRiderView.as_view(), name='order_assign_rider'),
    path('orders/<int:pk>/track/', OrderTrackView.as_view(), name='order_track'),
    path('orders/track/', OrderTrackView.as_view(), name='order_guest_track'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order_detail'),
]


