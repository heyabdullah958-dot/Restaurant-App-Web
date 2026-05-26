from django.contrib import admin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'method', 'amount', 'status', 'created_at')
    list_filter = ('method', 'status', 'created_at')
    search_fields = ('order__id', 'transaction_id')

    # Payments must be read-only in the admin panel
    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields] + ['gateway_response']

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        # We allow view/change permission so admins can view details,
        # but because all fields are read-only, they cannot edit anything.
        return True
