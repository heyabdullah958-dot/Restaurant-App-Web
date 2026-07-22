from django.urls import path
from .views import OrderListCreateView, OrderDetailView, MyOrdersListView, PurgeOrdersView

urlpatterns = [
    path('orders/', OrderListCreateView.as_view(), name='order_create'),
    path('orders/my-orders/', MyOrdersListView.as_view(), name='my_orders_list'),
    path('orders/purge-all/', PurgeOrdersView.as_view(), name='purge_all_orders'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order_detail'),
]

