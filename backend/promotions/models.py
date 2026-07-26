from django.db import models
from django.utils import timezone
from config.mixins import AuditLogMixin

class Coupon(AuditLogMixin, models.Model):
    DISCOUNT_TYPES = [('percentage', '%'), ('flat', 'Flat Rs.')]
    
    code = models.CharField(max_length=30, unique=True, db_index=True)
    discount_type = models.CharField(max_length=20, choices=DISCOUNT_TYPES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2)
    min_subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    restaurant = models.ForeignKey('restaurants.Restaurant', on_delete=models.CASCADE, null=True, blank=True)
    valid_from = models.DateTimeField()
    valid_to = models.DateTimeField()
    usage_limit = models.IntegerField(default=100)
    times_used = models.IntegerField(default=0, db_index=True)
    per_user_limit = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.code} ({self.discount_type})"
        
    def is_valid(self):
        now = timezone.now()
        return self.is_active and self.valid_from <= now <= self.valid_to

class CouponUsage(models.Model):
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='usages')
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='coupon_usages')
    used_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.coupon.code} used on order #{self.order_id}"

class FlashDeal(AuditLogMixin, models.Model):
    DEAL_TYPES = [
        ('bogo', 'Buy 1 Get 1'),
        ('percentage', '% Off'),
        ('flat', 'Flat Rs. Off'),
        ('combo', 'Combo Deal'),
    ]
    
    title = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    deal_type = models.CharField(max_length=20, choices=DEAL_TYPES)
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    restaurant = models.ForeignKey('restaurants.Restaurant', on_delete=models.CASCADE, null=True, blank=True)
    menu_items = models.ManyToManyField('restaurants.MenuItem', blank=True)
    image = models.URLField(blank=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    max_orders = models.IntegerField(default=0)
    orders_used = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title
