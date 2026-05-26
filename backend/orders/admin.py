from django.contrib import admin
from .models import Order, OrderItem
from config.admin_utils import get_managed_restaurant

class OrderItemInline(admin.StackedInline):
    model = OrderItem
    fields = ['menu_item', 'quantity', 'unit_price', 'total_price', 'special_notes']
    readonly_fields = ['unit_price', 'total_price']
    extra = 1

    def get_readonly_fields(self, request, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        if not request.user.is_superuser:
            # For restaurant managers, all inline items fields are read-only
            for field in ['menu_item', 'quantity', 'unit_price', 'total_price', 'special_notes']:
                if field not in readonly:
                    readonly.append(field)
        return readonly

    def has_add_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "menu_item" and not request.user.is_superuser:
            managed_restaurant = get_managed_restaurant(request.user)
            if managed_restaurant:
                kwargs["queryset"] = db_field.related_model.objects.filter(category__restaurant=managed_restaurant)
            else:
                kwargs["queryset"] = db_field.related_model.objects.none()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'restaurant', 'user_or_guest', 'status', 'payment_method', 'total', 'created_at')
    list_filter = ('status', 'payment_method', 'restaurant', 'created_at')
    search_fields = ('id', 'guest_name', 'guest_phone', 'user__username')
    list_editable = ('status',)
    readonly_fields = ('subtotal', 'delivery_fee', 'discount', 'total', 'created_at', 'updated_at')
    date_hierarchy = 'created_at'
    inlines = [OrderItemInline]

    fieldsets = (
        ('Order Info', {
            'fields': ('restaurant', 'status', 'payment_method')
        }),
        ('Customer', {
            'fields': ('user', 'guest_name', 'guest_phone')
        }),
        ('Delivery', {
            'fields': ('delivery_address', 'special_instructions')
        }),
        ('Pricing', {
            'fields': ('subtotal', 'delivery_fee', 'discount', 'total')
        }),
    )

    def user_or_guest(self, obj):
        if obj.user:
            return obj.user.username
        return f"{obj.guest_name or 'Guest'} (Guest)"
    user_or_guest.short_description = 'Customer'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        managed_restaurant = get_managed_restaurant(request.user)
        if managed_restaurant:
            return qs.filter(restaurant=managed_restaurant)
        return qs.none()

    def get_readonly_fields(self, request, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        if not request.user.is_superuser:
            # For restaurant managers, all fields except 'status' are read-only
            all_fields = [f.name for f in self.model._meta.fields]
            for field in all_fields:
                if field != 'status' and field not in readonly:
                    readonly.append(field)
        return readonly

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == "restaurant" and not request.user.is_superuser:
            managed_restaurant = get_managed_restaurant(request.user)
            if managed_restaurant:
                kwargs["queryset"] = db_field.related_model.objects.filter(id=managed_restaurant.id)
            else:
                kwargs["queryset"] = db_field.related_model.objects.none()
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
