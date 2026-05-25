from django.urls import path
from .views import OrderCreateView, OrderDetailView, MyOrdersListView

urlpatterns = [
    path('orders/', OrderCreateView.as_view(), name='order_create'),
    path('orders/my-orders/', MyOrdersListView.as_view(), name='my_orders_list'),
    path('orders/<int:pk>/', OrderDetailView.as_view(), name='order_detail'),
]
