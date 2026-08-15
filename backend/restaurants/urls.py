from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RestaurantListView, RestaurantDetailView, RestaurantMenuView, BranchListView,
    AdminRestaurantViewSet, AdminMenuCategoryViewSet, AdminMenuItemViewSet, AdminBranchViewSet,
    AdminBranchRiderViewSet, BranchItemAvailabilityView, RestaurantReviewViewSet, PlatformSettingsView, MyBranchView,
    PopularTagsView, PublicSearchView
)

router = DefaultRouter()
router.register('admin/restaurants', AdminRestaurantViewSet, basename='admin_restaurants')
router.register('admin/branches', AdminBranchViewSet, basename='admin_branches')
router.register('admin/riders', AdminBranchRiderViewSet, basename='admin_riders')
router.register('admin/menu-categories', AdminMenuCategoryViewSet, basename='admin_categories')
router.register('admin/menu-items', AdminMenuItemViewSet, basename='admin_items')
router.register('admin/reviews', RestaurantReviewViewSet, basename='admin_reviews')
router.register('reviews', RestaurantReviewViewSet, basename='restaurant_reviews')


urlpatterns = [
    path('admin/my-branch/', MyBranchView.as_view(), name='my_branch'),
    path('branches/', BranchListView.as_view(), name='branch_list'),
    path('restaurants/platform-settings/', PlatformSettingsView.as_view(), name='platform_settings'),
    path('restaurants/branch-item-availability/', BranchItemAvailabilityView.as_view(), name='branch_item_availability'),
    path('restaurants/popular-tags/', PopularTagsView.as_view(), name='popular_tags'),
    path('restaurants/search/', PublicSearchView.as_view(), name='public_search'),
    path('restaurants/', RestaurantListView.as_view(), name='restaurant_list'),
    path('restaurants/<slug:slug>/reviews/', RestaurantReviewViewSet.as_view({'get': 'list', 'post': 'create'}), name='restaurant_slug_reviews'),
    path('restaurants/<int:restaurant_id>/reviews/', RestaurantReviewViewSet.as_view({'get': 'list', 'post': 'create'}), name='restaurant_id_reviews'),
    path('restaurants/<slug:slug>/', RestaurantDetailView.as_view(), name='restaurant_detail'),
    path('restaurants/<slug:slug>/menu/', RestaurantMenuView.as_view(), name='restaurant_menu'),
    path('', include(router.urls)),
]



