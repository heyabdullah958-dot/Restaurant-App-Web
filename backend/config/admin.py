"""
Config App Admin — FoodSphere
Registers the AdminAuditLog model with the Django admin site.
"""
from django.contrib import admin
from .models import AdminAuditLog, PlatformSettings


@admin.register(PlatformSettings)
class PlatformSettingsAdmin(admin.ModelAdmin):
    list_display = ('loyalty_points_per_dollar', 'loyalty_point_value_usd', 'welcome_bonus_points', 'updated_at')

    def has_add_permission(self, request):
        return not PlatformSettings.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(AdminAuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'action', 'model_name', 'object_repr', 'ip_address')
    list_filter = ('action', 'model_name', 'timestamp')
    search_fields = ('user__username', 'object_repr', 'ip_address')
    readonly_fields = (
        'user', 'action', 'model_name', 'object_id',
        'object_repr', 'changes', 'ip_address', 'timestamp'
    )
    date_hierarchy = 'timestamp'

    def has_add_permission(self, request):
        # Audit logs are immutable — no manual entry
        return False

    def has_change_permission(self, request, obj=None):
        return False  # Read-only

    def has_delete_permission(self, request, obj=None):
        # Only superusers can purge old audit logs
        return request.user.is_superuser
