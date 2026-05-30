from django.db import models

class Restaurant(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, max_length=255)
    cuisine_type = models.CharField(max_length=255)
    logo = models.ImageField(upload_to='restaurants/logos/', null=True, blank=True)
    cover_image = models.ImageField(upload_to='restaurants/covers/', null=True, blank=True)
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
