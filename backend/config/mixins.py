"""
AuditLogMixin — FoodSphere Admin
Mixin for Django ModelAdmin classes to automatically log save and delete actions.
"""
from config.models import AdminAuditLog


class AuditLogMixin:
    """
    Mix into any ModelAdmin to auto-log creates, updates, and deletes.
    Usage:
        class MyModelAdmin(AuditLogMixin, admin.ModelAdmin):
            ...
    """

    def save_model(self, request, obj, form, change):
        """Log create/update before calling the real save."""
        changed_fields = {}
        if change:
            for field in form.changed_data:
                changed_fields[field] = {
                    'from': str(form.initial.get(field, 'N/A')),
                    'to': str(form.cleaned_data.get(field, 'N/A'))
                }
        AdminAuditLog.objects.create(
            user=request.user,
            action='update' if change else 'create',
            model_name=obj.__class__.__name__,
            object_id=obj.pk,
            object_repr=str(obj),
            changes=changed_fields,
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        super().save_model(request, obj, form, change)

    def delete_model(self, request, obj):
        """Log delete PEHLE karo, phir actual delete."""
        obj_pk = obj.pk
        obj_repr = str(obj)  # Delete se pehle capture karein
        
        AdminAuditLog.objects.create(
            user=request.user,
            action='delete',
            model_name=obj.__class__.__name__,
            object_id=obj_pk,
            object_repr=obj_repr,
            changes={},
            ip_address=request.META.get('REMOTE_ADDR'),
        )
        super().delete_model(request, obj)
