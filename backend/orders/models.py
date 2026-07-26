import uuid
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class Order(models.Model):
    STATUS_CHOICES = (
        ('received', 'Received'),
        ('preparing', 'Preparing'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    )
    
    PAYMENT_METHODS = (
        ('cod', 'Cash on Delivery'),
        ('stripe', 'Stripe'),
        ('payfast', 'PayFast'),
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders'
    )
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        related_name='orders'
    )
    branch = models.ForeignKey(
        'restaurants.Branch',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
        help_text="Auto-assigned branch based on customer delivery area."
    )
    rider = models.ForeignKey(
        'restaurants.BranchRider',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
        help_text="Assigned rider for delivery."
    )
    tracking_token = models.UUIDField(
        default=uuid.uuid4,
        db_index=True,
        editable=False,
        help_text="Secure token for guest order tracking. Returned at order creation and stored client-side."
    )
    guest_name = models.CharField(max_length=100, blank=True, null=True)
    guest_phone = models.CharField(max_length=20, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='received', db_index=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='cod', db_index=True)
    delivery_address = models.TextField()
    delivery_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    special_instructions = models.TextField(blank=True, null=True)
    cancellation_reason = models.TextField(blank=True, null=True, help_text="Reason recorded if order is cancelled.")
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelled_orders'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        from restaurants.models import BranchRider
        is_new = self.pk is None
        old_status = None
        old_rider_id = None

        if not is_new:
            try:
                orig = Order.objects.get(pk=self.pk)
                old_status = orig.status
                old_rider_id = orig.rider_id
            except Order.DoesNotExist:
                pass

        super().save(*args, **kwargs)

        # 1. Auto-release rider if order status transitions to delivered or cancelled
        if self.status in ['delivered', 'cancelled']:
            rider_to_check_id = self.rider_id or old_rider_id
            if rider_to_check_id:
                has_active = Order.objects.filter(rider_id=rider_to_check_id, status='out_for_delivery').exclude(pk=self.pk).exists()
                if not has_active:
                    BranchRider.objects.filter(pk=rider_to_check_id).update(status='AVAILABLE')

        # 2. Handle rider unassignment or reassignment
        if old_rider_id and old_rider_id != self.rider_id:
            has_active = Order.objects.filter(rider_id=old_rider_id, status='out_for_delivery').exclude(pk=self.pk).exists()
            if not has_active:
                BranchRider.objects.filter(pk=old_rider_id).update(status='AVAILABLE')

        # 3. If assigned rider & order status is out_for_delivery, mark rider ON_DELIVERY
        if self.rider_id and self.status == 'out_for_delivery':
            BranchRider.objects.filter(pk=self.rider_id).update(status='ON_DELIVERY')

        # 4. Automated "Post-Delivery Feedback" Push Notification trigger
        if self.status == 'delivered' and old_status != 'delivered':
            try:
                from config.notification_views import send_post_delivery_push_notification
                send_post_delivery_push_notification(self)
            except Exception as notif_err:
                import logging
                logging.getLogger(__name__).error(f"Failed to dispatch post-delivery push notification: {notif_err}")


    def __str__(self):
        return f"Order #{self.id or self.pk or 'new'} - {self.restaurant.name} ({self.status})"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey('restaurants.MenuItem', on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(100)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    special_notes = models.TextField(blank=True, null=True)
    selected_options = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.quantity} x {self.menu_item.name} for Order #{self.order.id or self.order.pk or 'new'}"

class BranchCashRegister(models.Model):
    """
    Daily EOD (End of Day) Cash Reconciliation register for branch managers.
    Tracks total COD cash collected vs turned over to Super Admin.
    """
    branch = models.ForeignKey(
        'restaurants.Branch',
        on_delete=models.CASCADE,
        related_name='cash_registers'
    )
    date = models.DateField(db_index=True)
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='submitted_cash_registers'
    )
    total_orders_count = models.IntegerField(default=0)
    total_cod_collected = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_cod_handed_over = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discrepancy_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    is_verified_by_admin = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_cash_registers'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('branch', 'date')
        verbose_name = 'Branch Cash Register'
        verbose_name_plural = 'Branch Cash Registers'
        ordering = ['-date']

    def save(self, *args, **kwargs):
        self.discrepancy_amount = self.total_cod_handed_over - self.total_cod_collected
        super().save(*args, **kwargs)

    def __str__(self):
        return f"CashRegister ({self.branch.name} - {self.date}): Collected Rs. {self.total_cod_collected}, Handed Over Rs. {self.total_cod_handed_over}"

