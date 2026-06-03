from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    phone = models.CharField(max_length=20, blank=True, null=True)
    profile_photo = models.ImageField(upload_to='profiles/', blank=True, null=True)
    loyalty_points = models.IntegerField(default=0)
    is_guest = models.BooleanField(default=False, db_index=True)

    def __str__(self):
        if self.is_guest:
            return f"Guest_{self.id or self.pk or 'new'}"
        return self.username or self.email or f"User_{self.id or self.pk}"

class LoyaltyTransaction(models.Model):
    TRANSACTION_TYPES = (
        ('earned', 'Earned'),
        ('redeemed', 'Redeemed'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='loyalty_transactions')
    order = models.ForeignKey('orders.Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='loyalty_transactions')
    points = models.IntegerField()
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES)
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} - {self.points} points ({self.transaction_type})"
