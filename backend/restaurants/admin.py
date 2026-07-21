from django.contrib import admin
from .models import Restaurant, MenuCategory, MenuItem, Branch
from config.admin_utils import get_managed_restaurant
from config.mixins import AuditLogMixin

class MenuCategoryInline(admin.TabularInline):
    model = MenuCategory
    fields = ['name', 'icon', 'order', 'is_active']
    extra = 1

class BranchInline(admin.TabularInline):
    model = Branch
    fields = ['name', 'address', 'phone', 'is_active', 'area_keywords']
    extra = 1

@admin.register(Restaurant)
class RestaurantAdmin(AuditLogMixin, admin.ModelAdmin):
    list_display = ('name', 'city', 'cuisine_type', 'loyalty_points_ratio', 'is_active', 'is_featured', 'rating', 'delivery_fee')
    list_filter = ('city', 'is_active', 'is_featured', 'cuisine_type')
    search_fields = ('name', 'city', 'address')
    list_editable = ('is_active', 'is_featured')
    readonly_fields = ('rating', 'total_reviews', 'created_at', 'updated_at')
    prepopulated_fields = {'slug': ('name',)}
    inlines = [BranchInline, MenuCategoryInline]

    fieldsets = (
        ('Basic Info', {
            'fields': ('name', 'slug', 'cuisine_type', 'description')
        }),
        ('Contact', {
            'fields': ('address', 'city', 'phone')
        }),
        ('Timings', {
            'fields': ('opens_at', 'closes_at', 'delivery_time_min', 'delivery_time_max')
        }),
        ('Business', {
            'fields': ('min_order_amount', 'delivery_fee', 'loyalty_points_ratio', 'is_active', 'is_featured')
        }),
        ('Media', {
            'fields': ('logo', 'cover_image')
        }),
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        managed_restaurant = get_managed_restaurant(request.user)
        if managed_restaurant:
            return qs.filter(id=managed_restaurant.id)
        return qs.none()

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


@admin.register(Branch)
class BranchAdmin(AuditLogMixin, admin.ModelAdmin):
    list_display = ('restaurant', 'name', 'address', 'phone', 'is_active')
    list_filter = ('restaurant', 'is_active')
    search_fields = ('name', 'address', 'restaurant__name')
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        managed_restaurant = get_managed_restaurant(request.user)
        if managed_restaurant:
            return qs.filter(restaurant=managed_restaurant)
        return qs.none()


@admin.register(MenuItem)
class MenuItemAdmin(AuditLogMixin, admin.ModelAdmin):
    list_display = ('name', 'category', 'get_restaurant', 'price', 'is_available', 'is_featured')
    list_filter = ('category__restaurant', 'is_available', 'is_featured')
    search_fields = ('name', 'category__name', 'category__restaurant__name')
    list_editable = ('price', 'is_available')

    def get_list_filter(self, request):
        if request.user.is_superuser:
            return ('category__restaurant', 'is_available', 'is_featured')
        return ('is_available', 'is_featured')


    def get_restaurant(self, obj):
        return obj.category.restaurant.name
    get_restaurant.short_description = 'Restaurant'
    get_restaurant.admin_order_field = 'category__restaurant__name'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        managed_restaurant = get_managed_restaurant(request.user)
        if managed_restaurant:
            return qs.filter(category__restaurant=managed_restaurant)
        return qs.none()

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "category" and not request.user.is_superuser:
            managed_restaurant = get_managed_restaurant(request.user)
            if managed_restaurant:
                kwargs["queryset"] = db_field.related_model.objects.filter(restaurant=managed_restaurant)
            else:
                kwargs["queryset"] = db_field.related_model.objects.none()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
