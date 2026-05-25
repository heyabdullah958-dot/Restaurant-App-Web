from django.urls import path
from .views import RestaurantListView, RestaurantDetailView, RestaurantMenuView

urlpatterns = [
    path('restaurants/', RestaurantListView.as_view(), name='restaurant_list'),
    path('restaurants/<slug:slug>/', RestaurantDetailView.as_view(), name='restaurant_detail'),
    path('restaurants/<slug:slug>/menu/', RestaurantMenuView.as_view(), name='restaurant_menu'),
]
