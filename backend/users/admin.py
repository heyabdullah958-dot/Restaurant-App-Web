from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, LoyaltyTransaction

class LoyaltyTransactionInline(admin.TabularInline):
    model = LoyaltyTransaction
    fields = ['points', 'transaction_type', 'description', 'order', 'created_at']
    readonly_fields = ['created_at']
    extra = 0


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'phone', 'is_guest', 'loyalty_points', 'is_staff', 'date_joined')
    list_filter = ('is_guest', 'is_staff', 'is_superuser', 'date_joined')
    search_fields = ('username', 'email', 'phone')
    readonly_fields = ('date_joined', 'last_login', 'loyalty_points')
    inlines = [LoyaltyTransactionInline]

    # Customize fieldsets to add custom fields
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'email', 'phone', 'profile_photo')}),
        ('Status', {'fields': ('is_guest', 'loyalty_points')}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important Dates', {'fields': ('last_login', 'date_joined')}),
    )

    def get_readonly_fields(self, request, obj=None):
        readonly = list(super().get_readonly_fields(request, obj))
        if not request.user.is_superuser:
            if 'loyalty_points' not in readonly:
                readonly.append('loyalty_points')
        else:
            if 'loyalty_points' in readonly:
                readonly.remove('loyalty_points')
        return tuple(readonly)

    def save_model(self, request, obj, form, change):
        if change and 'loyalty_points' in form.changed_data:
            try:
                old_points = User.objects.get(pk=obj.pk).loyalty_points
                new_points = obj.loyalty_points
                difference = new_points - old_points
                if difference != 0:
                    t_type = 'earned' if difference > 0 else 'redeemed'
                    desc = f"Updated by Admin ({request.user.username}): {old_points} -> {new_points}"
                    LoyaltyTransaction.objects.create(
                        user=obj,
                        points=abs(difference),
                        transaction_type=t_type,
                        description=desc
                    )
            except User.DoesNotExist:
                pass
        super().save_model(request, obj, form, change)

    def get_fieldsets(self, request, obj=None):
        fieldsets = super().get_fieldsets(request, obj)
        if not request.user.is_superuser:
            # Non-superusers should not see or change superuser status or permissions
            new_fieldsets = []
            for title, fields_dict in fieldsets:
                if title == 'Permissions':
                    fields = list(fields_dict.get('fields', []))
                    # Remove is_superuser and user_permissions from list
                    filtered_fields = [f for f in fields if f not in ['is_superuser', 'user_permissions']]
                    new_fieldsets.append((title, {'fields': filtered_fields}))
                else:
                    new_fieldsets.append((title, fields_dict))
            return tuple(new_fieldsets)
        return fieldsets

