from django.db import models

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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Branch(models.Model):
    restaurant = models.ForeignKey(Restaurant, on_delete=models.CASCADE, 
                                   related_name='branches')
    name = models.CharField(max_length=100)
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
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
            print(f"Error setting manager permissions: {e}")

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
