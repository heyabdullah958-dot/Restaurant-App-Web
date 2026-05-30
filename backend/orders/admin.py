from django.contrib import admin
from django.utils.safestring import mark_safe
import urllib.parse
from .models import Order, OrderItem
from config.admin_utils import get_managed_restaurant
from import_export import resources
from import_export.admin import ExportMixin


class OrderResource(resources.ModelResource):
    """Defines which fields are exported when downloading CSV/Excel from admin."""
    class Meta:
        model = Order
        fields = (
            'id', 'restaurant__name', 'guest_name', 'guest_phone',
            'status', 'payment_method', 'subtotal', 'delivery_fee',
            'total', 'delivery_address', 'created_at'
        )
        export_order = fields


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
class OrderAdmin(ExportMixin, admin.ModelAdmin):
    resource_classes = [OrderResource]
    list_display = ('id', 'restaurant', 'user_or_guest', 'status', 'payment_method', 'total', 'created_at', 'send_to_rider_whatsapp')
    list_filter = ('status', 'payment_method', 'restaurant', 'created_at')
    search_fields = ('id', 'guest_name', 'guest_phone', 'user__username')
    list_editable = ('status',)
    readonly_fields = ('subtotal', 'delivery_fee', 'discount', 'total', 'created_at', 'updated_at', 'send_to_rider_whatsapp')
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
            'fields': ('delivery_address', 'special_instructions', 'send_to_rider_whatsapp')
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

    def send_to_rider_whatsapp(self, obj):
        if not obj.pk:
            return ""
        name = obj.guest_name
        if not name and obj.user:
            name = f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username
        if not name:
            name = "Guest"
        
        phone = obj.guest_phone
        if not phone and obj.user:
            phone = obj.user.phone
        if not phone:
            phone = "N/A"
            
        if obj.delivery_lat and obj.delivery_lng:
            location_link = f"https://maps.google.com/?q={obj.delivery_lat},{obj.delivery_lng}"
        else:
            location_link = f"https://maps.google.com/?q={urllib.parse.quote(obj.delivery_address)}"
            
        message = (
            f"Rider Bhai, ye order deliver karna hai:\n"
            f"Naam: {name}\n"
            f"Phone: {phone}\n"
            f"Address: {obj.delivery_address or ''}\n"
            f"Location Link: {location_link}"
        )
        encoded_message = urllib.parse.quote(message)
        from django.conf import settings
        rider_phone = getattr(settings, 'RIDER_WHATSAPP', '923090349090')
        whatsapp_url = f"https://wa.me/{rider_phone}?text={encoded_message}"
        return mark_safe(
            f'<a href="{whatsapp_url}" target="_blank" '
            f'style="background-color: #25D366; color: white; padding: 4px 8px; border-radius: 4px; '
            f'text-decoration: none; font-weight: bold; font-size: 11px; display: inline-block;">'
            f'Send to Rider'
            f'</a>'
        )
    send_to_rider_whatsapp.short_description = 'WhatsApp Dispatch'

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
