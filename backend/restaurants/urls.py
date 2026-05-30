from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RestaurantListView, RestaurantDetailView, RestaurantMenuView,
    AdminRestaurantViewSet, AdminMenuCategoryViewSet, AdminMenuItemViewSet
)

router = DefaultRouter()
router.register('admin/restaurants', AdminRestaurantViewSet, basename='admin_restaurants')
router.register('admin/menu-categories', AdminMenuCategoryViewSet, basename='admin_categories')
router.register('admin/menu-items', AdminMenuItemViewSet, basename='admin_items')

urlpatterns = [
    path('restaurants/', RestaurantListView.as_view(), name='restaurant_list'),
    path('restaurants/<slug:slug>/', RestaurantDetailView.as_view(), name='restaurant_detail'),
    path('restaurants/<slug:slug>/menu/', RestaurantMenuView.as_view(), name='restaurant_menu'),
    path('', include(router.urls)),
]
