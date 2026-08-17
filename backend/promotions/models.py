from datetime import timedelta, date, time
from decimal import Decimal
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from django.utils.timezone import get_current_timezone as ZoneInfo
from django.db import models
from django.utils import timezone
from django.utils import timezone as dj_tz
from config.mixins import AuditLogMixin


class Coupon(AuditLogMixin, models.Model):
    DISCOUNT_TYPES = [('percentage', '%'), ('flat', 'Flat Rs.')]
    
    code = models.CharField(max_length=30, unique=True, db_index=True)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    min_subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    restaurant = models.ForeignKey('restaurants.Restaurant', on_delete=models.CASCADE, null=True, blank=True, related_name='coupons')
    branch = models.ForeignKey('restaurants.Branch', on_delete=models.CASCADE, null=True, blank=True, related_name='coupons')
    is_dine_in_only = models.BooleanField(default=False, help_text="Exclusively available for Dine-In orders.")
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_to = models.DateTimeField(null=True, blank=True)
    usage_limit = models.IntegerField(default=100)
    times_used = models.IntegerField(default=0, db_index=True)
    per_user_limit = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.code} ({self.discount_type})"
        
    def is_valid(self):
        now = timezone.now()
        if not self.is_active:
            return False
        if self.valid_from and now < self.valid_from:
            return False
        if self.valid_to and now > self.valid_to:
            return False
        return True


class CouponUsage(models.Model):
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages')
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='coupon_usages')
    used_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.coupon.code} used on order #{self.order_id}"


class FlashDeal(AuditLogMixin, models.Model):
    DEAL_TYPES = [
        ('percentage', '% Off'),
        ('flat', 'Flat Rs. Off'),
        ('bogo', 'Buy 1 Get 1 Free'),
        ('combo', 'Combo Bundle'),
    ]
    ORDER_MODES = [
        ('ALL', 'All Order Modes'),
        ('DELIVERY', 'Delivery & Takeaway Only'),
        ('DINE_IN', 'Dine-In Exclusive'),
    ]
    ITEM_SCOPES = [
        ('ENTIRE_MENU', 'Entire Store Menu'),
        ('CATEGORY', 'Specific Categories'),
        ('SPECIFIC_ITEMS', 'Specific Menu Items'),
    ]
    TIMING_TYPES = [
        ('ONE_TIME', 'One-Time Window'),
        ('RECURRING_DAILY', 'Recurring Daily Schedule'),
    ]
    RESET_FREQUENCIES = [
        ('DAILY', 'Daily Reset'),
        ('LIFETIME', 'Lifetime Cap'),
    ]

    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    deal_type = models.CharField(max_length=20, choices=DEAL_TYPES, default='percentage')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    min_subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # Target Tenancy Scope
    restaurant = models.ForeignKey('restaurants.Restaurant', on_delete=models.CASCADE, null=True, blank=True, related_name='flash_deals')
    branch = models.ForeignKey('restaurants.Branch', on_delete=models.CASCADE, null=True, blank=True, related_name='flash_deals')
    order_mode = models.CharField(max_length=20, choices=ORDER_MODES, default='ALL')

    # Item / Menu Scope
    item_scope_type = models.CharField(max_length=20, choices=ITEM_SCOPES, default='ENTIRE_MENU')
    categories = models.ManyToManyField('restaurants.MenuCategory', blank=True, related_name='flash_deals')
    menu_items = models.ManyToManyField('restaurants.MenuItem', blank=True, related_name='flash_deals')

    # Timing & Recurrence
    timing_type = models.CharField(max_length=20, choices=TIMING_TYPES, default='ONE_TIME')
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    daily_start_time = models.TimeField(null=True, blank=True)
    daily_end_time = models.TimeField(null=True, blank=True)
    active_days = models.JSONField(default=list, blank=True)  # e.g. ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    valid_from = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)
    timezone = models.CharField(max_length=50, default='Asia/Karachi')

    # Inventory, Priority & Status
    max_orders = models.IntegerField(default=0, help_text="0 = unlimited")
    orders_used = models.IntegerField(default=0, help_text="Legacy counter, computed dynamically from redemptions")
    redemption_reset_frequency = models.CharField(max_length=20, choices=RESET_FREQUENCIES, default='DAILY')
    priority = models.IntegerField(default=0, help_text="Higher priority overrides overlapping deals")
    image = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.get_deal_type_display()})"

    @property
    def is_dine_in_only(self):
        """Backward compatibility property."""
        return self.order_mode == 'DINE_IN'

    def get_effective_timezone(self):
        return self.timezone or 'Asia/Karachi'

    def current_redemption_count(self):
        """Returns total redeemed orders count based on reset frequency."""
        if not self.pk:
            return 0
        if self.redemption_reset_frequency == 'LIFETIME':
            return self.redemptions.count()
        
        # DAILY Reset
        tz_name = self.get_effective_timezone()
        try:
            tz = ZoneInfo(tz_name)
        except Exception:
            tz = dj_tz.get_current_timezone()
        
        today = dj_tz.localtime(dj_tz.now(), tz).date()
        return self.redemptions.filter(redeemed_at__date=today).count()

    def _within_valid_range(self, effective_date):
        if self.valid_from and effective_date < self.valid_from:
            return False
        if self.valid_until and effective_date > self.valid_until:
            return False
        return True

    def is_currently_active(self, current_dt=None):
        """Evaluates whether the deal is currently active considering timezones and midnight rollover."""
        if not self.is_active:
            return False
        
        # Check max orders limit
        if self.max_orders > 0 and self.current_redemption_count() >= self.max_orders:
            return False

        tz_name = self.get_effective_timezone()
        try:
            tz = ZoneInfo(tz_name)
        except Exception:
            tz = dj_tz.get_current_timezone()

        now = dj_tz.localtime(current_dt or dj_tz.now(), tz)

        if self.timing_type == 'ONE_TIME':
            if not self.start_time or not self.end_time:
                return False
            # Ensure localized comparison
            st = dj_tz.localtime(self.start_time, tz) if dj_tz.is_aware(self.start_time) else self.start_time.replace(tzinfo=tz)
            et = dj_tz.localtime(self.end_time, tz) if dj_tz.is_aware(self.end_time) else self.end_time.replace(tzinfo=tz)
            return st <= now <= et

        # RECURRING_DAILY
        if not self.daily_start_time or not self.daily_end_time:
            return False

        current_time = now.time()
        day_abbr = now.strftime('%a').upper()[:3]
        active_days_list = [d.upper()[:3] for d in (self.active_days or ['MON','TUE','WED','THU','FRI','SAT','SUN'])]

        if self.daily_start_time <= self.daily_end_time:
            # Standard daytime window (e.g. 14:00 to 18:00)
            effective_date = now.date()
            if day_abbr not in active_days_list:
                return False
            if not self._within_valid_range(effective_date):
                return False
            return self.daily_start_time <= current_time <= self.daily_end_time
        else:
            # Midnight rollover window (e.g. 22:00 to 02:00)
            if current_time >= self.daily_start_time:
                # First half (e.g. 23:30 Monday night) -> belongs to today
                effective_date = now.date()
                effective_day = day_abbr
            elif current_time <= self.daily_end_time:
                # Second half (e.g. 01:30 Tuesday morning) -> belongs to yesterday (Monday)
                yesterday = now - timedelta(days=1)
                effective_date = yesterday.date()
                effective_day = yesterday.strftime('%a').upper()[:3]
            else:
                return False

            if effective_day not in active_days_list:
                return False
            if not self._within_valid_range(effective_date):
                return False
            return True


class FlashDealRedemption(models.Model):
    flash_deal = models.ForeignKey(FlashDeal, on_delete=models.CASCADE, related_name='redemptions')
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='deal_redemptions')
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    discount_applied = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    redeemed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-redeemed_at']
        indexes = [
            models.Index(fields=['flash_deal', 'redeemed_at']),
        ]

    def __str__(self):
        return f"Redemption for Deal #{self.flash_deal_id} on Order #{self.order_id}"
