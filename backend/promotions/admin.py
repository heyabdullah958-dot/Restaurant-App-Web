from django.contrib import admin
from config.mixins import AuditLogMixin
from .models import Coupon, CouponUsage, FlashDeal

@admin.register(Coupon)
class CouponAdmin(AuditLogMixin, admin.ModelAdmin):
    list_display = ('code', 'discount_type', 'discount_value', 'valid_from', 'valid_to', 'is_active')
    search_fields = ('code',)

@admin.register(CouponUsage)
class CouponUsageAdmin(AuditLogMixin, admin.ModelAdmin):
    list_display = ('coupon', 'user', 'order', 'used_at')

@admin.register(FlashDeal)
class FlashDealAdmin(AuditLogMixin, admin.ModelAdmin):
    list_display = ('title', 'deal_type', 'start_time', 'end_time', 'is_active')
