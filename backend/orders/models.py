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

    ORDER_TYPES = (
        ('DELIVERY', 'Delivery'),
        ('TAKEAWAY', 'Takeaway'),
        ('DINE_IN', 'Dine-In'),
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
    display_order_id = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        db_index=True,
        help_text="Tenant and branch scoped human-readable order ID (e.g., TS-LC-1001)."
    )
    order_type = models.CharField(max_length=20, choices=ORDER_TYPES, default='DELIVERY', db_index=True)
    table_number = models.CharField(max_length=30, blank=True, null=True, help_text="Table number for Dine-In orders.")
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

    def generate_display_order_id(self):
        brand_map = {
            'seenbanao': 'SB',
            'dineatblue': 'DB',
            'jushhpk': 'JK',
            'tandooristoppk': 'TS',
            'sandmelts': 'SM',
            'birdmanfoodspk': 'BM',
            'getafomo': 'GF',
        }
        
        branch_map = {
            'johar town': 'JT',
            'lake city': 'LC',
            'dha phase 1': 'DHA1',
            'gt road baghbanpura': 'GTR',
            'baghbanpura': 'BP',
            'mozang chungi': 'MC',
            'mozang': 'MC',
            'gulberg iii': 'G3',
        }

        brand_code = 'FS'
        if self.restaurant:
            handle = (getattr(self.restaurant, 'handle', None) or '').lower().replace(' ', '')
            name = (self.restaurant.name or '').lower().replace(' ', '')
            brand_code = brand_map.get(handle) or brand_map.get(name)
            if not brand_code:
                words = [w for w in (self.restaurant.name or '').split() if w]
                brand_code = ''.join([w[0].upper() for w in words[:3]]) or 'FS'

        branch_code = 'MAIN'
        if self.branch:
            bname = (self.branch.name or '').strip().lower()
            branch_code = branch_map.get(bname)
            if not branch_code:
                words = [w for w in (self.branch.name or '').split() if w]
                branch_code = ''.join([w[0].upper() for w in words[:3]]) or 'MAIN'

        if self.branch_id:
            existing_orders = Order.objects.filter(branch_id=self.branch_id).exclude(display_order_id='').exclude(display_order_id__isnull=True)
        elif self.restaurant_id:
            existing_orders = Order.objects.filter(restaurant_id=self.restaurant_id).exclude(display_order_id='').exclude(display_order_id__isnull=True)
        else:
            existing_orders = Order.objects.none()

        max_seq = 1000
        for ord_obj in existing_orders.only('display_order_id', 'id'):
            if ord_obj.display_order_id:
                parts = ord_obj.display_order_id.split('-')
                if parts and parts[-1].isdigit():
                    val = int(parts[-1])
                    if val > max_seq:
                        max_seq = val

        next_seq = max_seq + 1
        return f"{brand_code}-{branch_code}-{next_seq}"

    def save(self, *args, **kwargs):
        from restaurants.models import BranchRider
        is_new = self.pk is None
        old_status = None
        old_rider_id = None

        if not self.display_order_id:
            self.display_order_id = self.generate_display_order_id()

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

        # 5. Automated "Out For Delivery" Push Notification trigger
        if self.status == 'out_for_delivery' and old_status != 'out_for_delivery':
            try:
                from config.notification_views import send_out_for_delivery_push_notification
                send_out_for_delivery_push_notification(self)
            except Exception as notif_err:
                import logging
                logging.getLogger(__name__).error(f"Failed to dispatch out-for-delivery push notification: {notif_err}")



    def __str__(self):
        disp = self.display_order_id or f"#{self.id or self.pk or 'new'}"
        rname = self.restaurant.name if self.restaurant else 'Unknown'
        return f"Order {disp} - {rname} ({self.status})"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey('restaurants.MenuItem', on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(100)])
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    special_notes = models.TextField(blank=True, null=True)
    selected_options = models.JSONField(default=list, blank=True)

    def __str__(self):
        disp = self.order.display_order_id or f"#{self.order.id or self.order.pk or 'new'}"
        return f"{self.quantity} x {self.menu_item.name} for Order {disp}"

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
