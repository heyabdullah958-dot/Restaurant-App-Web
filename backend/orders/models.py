from django.db import models
from django.conf import settings

class Order(models.Model):
    STATUS_CHOICES = (
        ('received', 'Received'),
        ('preparing', 'Preparing'),
        ('out_for_delivery', 'Out for Delivery'),
        ('delivered', 'Delivered'),
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
    guest_name = models.CharField(max_length=100, blank=True, null=True)
    guest_phone = models.CharField(max_length=20, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='received', db_index=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='cod')
    delivery_address = models.TextField()
    delivery_lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    special_instructions = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.id or self.pk or 'new'} - {self.restaurant.name} ({self.status})"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    menu_item = models.ForeignKey('restaurants.MenuItem', on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    special_notes = models.TextField(blank=True, null=True)
    selected_options = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.quantity} x {self.menu_item.name} for Order #{self.order.id or self.order.pk or 'new'}"
