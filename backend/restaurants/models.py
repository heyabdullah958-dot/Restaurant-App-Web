import logging
from decimal import Decimal
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db import models
from django.db.models import Avg, Count

logger = logging.getLogger(__name__)

class Restaurant(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    cuisine_type = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='restaurants/logos/', null=True, blank=True)
    cover_image = models.ImageField(upload_to='restaurants/covers/', null=True, blank=True)
    banner_image = models.ImageField(upload_to='restaurants/banners/', null=True, blank=True)
    description = models.TextField(blank=True)
    address = models.TextField()
    city = models.CharField(max_length=100, db_index=True)
    phone = models.CharField(max_length=20)
    is_active = models.BooleanField(default=True, db_index=True)
    is_force_closed = models.BooleanField(default=False, help_text="Super-Admin master override to force close the entire brand")
    is_featured = models.BooleanField(default=False, db_index=True)
    opens_at = models.TimeField()
    closes_at = models.TimeField()
    delivery_time_min = models.IntegerField(default=30)
    delivery_time_max = models.IntegerField(default=45)
    min_order_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_reviews = models.IntegerField(default=0)
    loyalty_points_ratio = models.IntegerField(default=100, help_text="Amount in Rupees required to earn 1 loyalty point. Set to 0 to disable.")
    is_dine_in_enabled = models.BooleanField(default=True, help_text="Enable Dine-In orders for this restaurant.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def update_rating(self):
        agg = self.reviews.aggregate(avg_rating=Avg('rating'), count=Count('id'))
        avg = agg['avg_rating']
        count = agg['count'] or 0
        if avg is not None:
            self.rating = round(Decimal(str(avg)), 2)
        else:
            self.rating = Decimal('0.00')
        self.total_reviews = count
        self.save(update_fields=['rating', 'total_reviews'])

    @property
    def is_open(self):
        if self.is_force_closed or not self.is_active:
            return False
        b_list = self.branches.all()
        if not b_list.exists():
            return True
        return b_list.filter(is_active=True).exists()

    def __str__(self):
        return self.name

class Branch(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, 
                                   related_name='branches')
    name = models.CharField(max_length=100)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    is_dine_in_enabled = models.BooleanField(default=True, help_text="Enable Dine-In orders for this branch.")
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    delivery_radius_km = models.DecimalField(max_digits=5, decimal_places=2, default=10.00)
    # For nearest-branch matching: map customer area keywords to this branch
    area_keywords = models.JSONField(
        default=list, blank=True,
        help_text="List of area/neighborhood keywords that map to this branch. "
                  "e.g. ['johar town', 'johar', 'jt']"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Branches'
        ordering = ['restaurant', 'name']

    def __str__(self):
        return f"{self.restaurant.name} — {self.name}"

class BranchRider(models.Model):
    STATUS_CHOICES = (
        ('AVAILABLE', 'Available'),
        ('ON_DELIVERY', 'On Delivery'),
        ('OFFLINE', 'Offline'),
    )
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='riders')
    name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    vehicle_type = models.CharField(max_length=50, default='BIKE')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE', db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['branch', 'name']
        unique_together = ('branch', 'phone')

    def __str__(self):
        return f"{self.name} ({self.branch.name}) — {self.status}"

class MenuCategory(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, related_name='categories')
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=100, null=True, blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'Menu Categories'
        ordering = ['order', 'name']

    def __str__(self):
        return f"{self.restaurant.name} - {self.name}"

class MenuItem(models.Model):
    category = models.ForeignKey(MenuCategory, on_delete=models.CASCADE, related_name='items')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='menu_items/', null=True, blank=True)
    is_available = models.BooleanField(default=True, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)
    preparation_time = models.IntegerField(default=15) # in minutes
    options = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"{self.category.name} - {self.name}"

class BranchMenuItemAvailability(models.Model):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='item_availabilities')
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name='branch_availabilities')
    is_available = models.BooleanField(default=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('branch', 'menu_item')
        verbose_name_plural = 'Branch Menu Item Availabilities'

    def __str__(self):
        return f"{self.branch.name} — {self.menu_item.name} (Available: {self.is_available})"


from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model

@receiver(post_save, sender=Restaurant)
def create_restaurant_manager_auth(sender, instance, created, **kwargs):
    if created:
        User = get_user_model()
        group_name = f"manager_{instance.slug}"
        username = f"manager_{instance.slug}"
        email = f"manager.{instance.slug}@foodsphere.com"
        password = f"{instance.slug}@2025"

        # 1. Create or get Group
        group, _ = Group.objects.get_or_create(name=group_name)

        # 2. Get content types and assign permissions
        try:
            from orders.models import Order, OrderItem
            restaurant_ct = ContentType.objects.get_for_model(Restaurant)
            category_ct = ContentType.objects.get_for_model(MenuCategory)
            item_ct = ContentType.objects.get_for_model(MenuItem)
            order_ct = ContentType.objects.get_for_model(Order)
            orderitem_ct = ContentType.objects.get_for_model(OrderItem)

            codenames = [
                # Restaurant
                ('view_restaurant', restaurant_ct),
                ('change_restaurant', restaurant_ct),
                # MenuCategory
                ('view_menucategory', category_ct),
                ('change_menucategory', category_ct),
                ('add_menucategory', category_ct),
                ('delete_menucategory', category_ct),
                # MenuItem
                ('view_menuitem', item_ct),
                ('change_menuitem', item_ct),
                ('add_menuitem', item_ct),
                ('delete_menuitem', item_ct),
                # Order
                ('view_order', order_ct),
                ('change_order', order_ct),
                # OrderItem
                ('view_orderitem', orderitem_ct),
            ]

            perms = []
            for codename, ct in codenames:
                try:
                    perms.append(Permission.objects.get(codename=codename, content_type=ct))
                except Permission.DoesNotExist:
                    pass
            group.permissions.set(perms)
        except Exception as e:
            logger.error(f"Error setting manager permissions: {e}")

        # 3. Create Manager User
        user, user_created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'is_staff': True,
                'is_active': True,
            }
        )
        user.set_password(password)
        user.is_staff = True
        user.is_active = True
        user.save()
        user.groups.add(group)


@receiver(post_delete, sender=Restaurant)
def delete_restaurant_manager_auth(sender, instance, **kwargs):
    User = get_user_model()
    group_name = f"manager_{instance.slug}"
    username = f"manager_{instance.slug}"

    # Delete User
    try:
        user = User.objects.get(username=username)
        user.delete()
    except User.DoesNotExist:
        pass

    # Delete Group
    try:
        group = Group.objects.get(name=group_name)
        group.delete()
    except Group.DoesNotExist:
        pass


class RestaurantReview(models.Model):
    restaurant = models.ForeignKey(
        Restaurant,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    order = models.OneToOneField(
        'orders.Order',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='review'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} - {self.restaurant.name} ({self.rating}★)"


@receiver([post_save, post_delete], sender=RestaurantReview)
def update_restaurant_rating_on_review_change(sender, instance, **kwargs):
    if instance.restaurant:
        instance.restaurant.update_rating()


class PlatformSettings(models.Model):
    """Singleton model holding global platform loyalty parameters."""
    loyalty_earn_rate_pkr = models.IntegerField(
        default=100,
        help_text="PKR spent to earn 1 loyalty point (e.g. 100 PKR = 1 pt)"
    )
    loyalty_point_value_pkr = models.IntegerField(
        default=1,
        help_text="PKR discount value per 1 loyalty point (e.g. 1 pt = 1 PKR)"
    )
    welcome_bonus_points = models.IntegerField(
        default=50,
        help_text="Loyalty points rewarded on new user registration"
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Platform Settings"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_settings(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


