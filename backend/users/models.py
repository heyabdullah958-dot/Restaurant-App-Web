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

class ManagerProfile(models.Model):
    """
    Links a staff user to a specific restaurant branch.
    One ManagerProfile per branch manager.
    """
    user = models.OneToOneField(
        'users.User',
        on_delete=models.CASCADE,
        related_name='manager_profile'
    )
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        related_name='managers'
    )
    branch = models.ForeignKey(
        'restaurants.Branch',
        on_delete=models.CASCADE,
        related_name='managers'
    )
    notification_email = models.EmailField(
        help_text="Email address to receive new order notifications for this branch."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Manager Profile'
        verbose_name_plural = 'Manager Profiles'

    def __str__(self):
        return f"{self.user.username} → {self.restaurant.name} / {self.branch.name}"
