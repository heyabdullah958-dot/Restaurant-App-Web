# Technical Analysis Report: Ratings & Reviews System (Milestone 3 - R3)

## 1. Executive Summary
This report details the exact backend architecture and step-by-step implementation specification for the **Ratings & Reviews System** in the FoodSphere Django DRF backend (`backend/`).

The implementation covers:
1. **`RestaurantReview` Database Model**: Relational structure linking restaurants, optional delivered orders, users, integer ratings (1-5), comments, and timestamps in `backend/restaurants/models.py`.
2. **Automated Dynamic Statistics**: Dynamic recalculation of `rating` (average score rounded to 2 decimal places) and `total_reviews` count on the `Restaurant` model using Django signals (`post_save`, `post_delete`) and an explicit `update_rating()` instance method.
3. **DRF Serializers & ViewSets**: Writable/readable serializers (`RestaurantReviewSerializer`) and ViewSets supporting all standard routing patterns:
   - `GET /api/restaurants/{id_or_slug}/reviews/`
   - `POST /api/restaurants/{id_or_slug}/reviews/`
   - `GET /api/reviews/` & `POST /api/reviews/`
4. **Data Seeding Management Command**: `seed_reviews.py` command populating high-quality, realistic review data for active launch brands (`jushhpk`, `tandooristoppk`, `getafomo`).

---

## 2. Existing Codebase Assessment

| Component | File Path | Line Range | Current Status | Required Action |
|---|---|---|---|---|
| `Restaurant` Model | `backend/restaurants/models.py` | 3–39 | Contains `rating` (DecimalField) & `total_reviews` (IntegerField) | Add `update_rating()` method & `RestaurantReview` model |
| `Restaurant` Signals | `backend/restaurants/models.py` | 130–223 | Contains manager creation & cleanup signals | Add `post_save` & `post_delete` signals for `RestaurantReview` |
| `Order` Model | `backend/orders/models.py` | 6–81 | Has `status` choices (`delivered`, etc.), `user`, `restaurant` | Reference in `OneToOneField` on `RestaurantReview` |
| `RestaurantSerializer` | `backend/restaurants/serializers.py` | 145–175 | Exposes `rating` & `total_reviews` | Optionally add `average_rating` alias property |
| Restaurant Views | `backend/restaurants/views.py` | 1–348 | Generic views for restaurants, categories, items, branches | Add `RestaurantReviewViewSet` |
| Restaurant URLs | `backend/restaurants/urls.py` | 1–26 | DefaultRouter & explicit path mappings | Register `reviews` router & slug/id nested endpoints |

---

## 3. Data Model Architecture

### `RestaurantReview` Model
Location: `backend/restaurants/models.py`

```python
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator

class RestaurantReview(models.Model):
    restaurant = models.ForeignKey(
        'restaurants.Restaurant',
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    order = models.OneToOneField(
        'orders.Order',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='review',
        help_text="Optional link to a verified delivered order"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Rating score from 1 to 5 stars"
    )
    comment = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Restaurant Review'
        verbose_name_plural = 'Restaurant Reviews'

    def __str__(self):
        return f"{self.user} - {self.restaurant.name} ({self.rating} stars)"
```

### `update_rating()` Method on `Restaurant`
Location: `backend/restaurants/models.py` (inside `Restaurant` class)

```python
    def update_rating(self):
        from django.db.models import Avg, Count
        stats = self.reviews.aggregate(avg_rating=Avg('rating'), count=Count('id'))
        avg = stats['avg_rating']
        self.rating = round(float(avg), 2) if avg is not None else 0.00
        self.total_reviews = stats['count'] or 0
        self.save(update_fields=['rating', 'total_reviews'])
```

### Django Signal Recalculation
Location: `backend/restaurants/models.py` (at bottom of file)

```python
@receiver([post_save, post_delete], sender=RestaurantReview)
def update_restaurant_review_stats(sender, instance, **kwargs):
    if instance.restaurant_id:
        instance.restaurant.update_rating()
```

---

## 4. API Endpoints & DRF Layer

### Serializer Design (`RestaurantReviewSerializer`)
Location: `backend/restaurants/serializers.py`

```python
from .models import RestaurantReview

class RestaurantReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField(read_only=True)
    restaurant_name = serializers.ReadOnlyField(source='restaurant.name')

    class Meta:
        model = RestaurantReview
        fields = (
            'id', 'restaurant', 'restaurant_name', 'order', 'user',
            'user_name', 'rating', 'comment', 'created_at'
        )
        read_only_fields = ('id', 'user', 'created_at')

    def get_user_name(self, obj):
        if not obj.user:
            return "Anonymous"
        full_name = obj.user.get_full_name()
        return full_name if full_name and full_name.strip() else obj.user.username

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be an integer between 1 and 5.")
        return value
```

### ViewSet Design (`RestaurantReviewViewSet`)
Location: `backend/restaurants/views.py`

```python
from .models import RestaurantReview
from .serializers import RestaurantReviewSerializer

class RestaurantReviewViewSet(viewsets.ModelViewSet):
    """
    API ViewSet for managing Restaurant Reviews.
    Supports GET & POST via:
    - /api/restaurants/{id_or_slug}/reviews/
    - /api/reviews/
    """
    serializer_class = RestaurantReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = RestaurantReview.objects.all().select_related('user', 'restaurant', 'order')
        restaurant_param = self.kwargs.get('restaurant_id') or self.kwargs.get('slug')
        
        if not restaurant_param:
            restaurant_param = self.request.query_params.get('restaurant_id') or self.request.query_params.get('restaurant_slug')
        
        if restaurant_param:
            if str(restaurant_param).isdigit():
                qs = qs.filter(restaurant_id=restaurant_param)
            else:
                qs = qs.filter(restaurant__slug=restaurant_param)
        return qs

    def perform_create(self, serializer):
        restaurant_param = self.kwargs.get('restaurant_id') or self.kwargs.get('slug') or self.request.data.get('restaurant')
        restaurant = None
        if restaurant_param:
            if str(restaurant_param).isdigit():
                restaurant = Restaurant.objects.filter(id=restaurant_param).first()
            else:
                restaurant = Restaurant.objects.filter(slug=restaurant_param).first()
        
        if not restaurant:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({'restaurant': 'Valid restaurant ID or slug is required.'})

        order_id = self.request.data.get('order')
        order = None
        if order_id:
            from orders.models import Order
            order = Order.objects.filter(id=order_id).first()
            if not order:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'order': 'Specified order does not exist.'})
            if order.restaurant_id != restaurant.id:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'order': 'Order does not belong to this restaurant.'})
            if order.status != 'delivered':
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'order': 'Only delivered orders can be reviewed.'})
            if RestaurantReview.objects.filter(order=order).exists():
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'order': 'This order has already been reviewed.'})

        serializer.save(user=self.request.user, restaurant=restaurant, order=order)
```

### URL Mapping
Location: `backend/restaurants/urls.py`

```python
router.register('reviews', RestaurantReviewViewSet, basename='reviews')

urlpatterns = [
    # ... existing routes ...
    path('restaurants/<slug:slug>/reviews/', RestaurantReviewViewSet.as_view({'get': 'list', 'post': 'create'}), name='restaurant_reviews_slug'),
    path('restaurants/<int:restaurant_id>/reviews/', RestaurantReviewViewSet.as_view({'get': 'list', 'post': 'create'}), name='restaurant_reviews_id'),
    path('', include(router.urls)),
]
```

---

## 5. Seed Command Specification

Location: `backend/restaurants/management/commands/seed_reviews.py`

Key Features:
- `--force` argument to clear existing reviews and recalculate ratings.
- Filters active launch brands (`jushhpk`, `tandooristoppk`, `getafomo`).
- Creates sample customer accounts if absent (`customer_ali`, `customer_sara`, etc.).
- Creates 5 realistic reviews per active brand with realistic menu/cuisine feedback and ratings (4 to 5 stars).
- Calls `update_rating()` for each active brand to synchronize database fields.
