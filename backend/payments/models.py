from django.db import models


class Payment(models.Model):
    PAYMENT_METHODS = (
        ('cod', 'Cash on Delivery'),
        ('stripe', 'Stripe'),
        ('payfast', 'PayFast'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )

    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='payments')
    method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    gateway_response = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # BUG-22 FIX: Prevent duplicate payment records for same order+method
        unique_together = ('order', 'method')

    def __str__(self):
        return f"Payment #{self.pk} for Order #{self.order.pk} - {self.method} ({self.status})"
