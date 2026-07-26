# Handoff Report: Ratings & Reviews Backend Investigation (Milestone 3 - R3)

**Working Directory**: `d:/sitesdata/Resturent App/.agents/explorer_m3_1/`  
**Target Milestone**: Milestone 3 (R3: Ratings, Loyalty & Admin Settings)  
**Task**: Backend Investigation for Ratings & Reviews System  

---

## 1. Observation

### Existing Codebase Observations
1. **`backend/restaurants/models.py`**:
   - `Restaurant` model exists at line 3.
   - Lines 23-24 currently define persistent rating fields:
     - `rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)`
     - `total_reviews = models.IntegerField(default=0)`
   - `RestaurantReview` model is **not yet present** in `models.py`.
   - Django signal receivers are attached at the bottom of the file (lines 136–223) for manager creation/deletion.

2. **`backend/orders/models.py`**:
   - `Order` model exists at line 6 with `STATUS_CHOICES` including `'delivered'` (line 12).
   - Foreign key relationships to `User` (`settings.AUTH_USER_MODEL`) and `Restaurant` are established.

3. **`backend/restaurants/serializers.py`**:
   - `RestaurantSerializer` (line 145) and `RestaurantDetailSerializer` (line 177) currently expose `rating` and `total_reviews` in `fields`.
   - `RestaurantReviewSerializer` does **not yet exist**.

4. **`backend/restaurants/views.py`**:
   - `RestaurantListView` (line 7), `RestaurantDetailView` (line 35), and `RestaurantMenuView` (line 50) handle read-only restaurant queries.
   - `AdminRestaurantViewSet`, `AdminMenuCategoryViewSet`, `AdminMenuItemViewSet`, `AdminBranchViewSet`, `AdminBranchRiderViewSet` handle admin CRUD.
   - `RestaurantReviewViewSet` does **not yet exist**.

5. **`backend/restaurants/urls.py`**:
   - Includes DefaultRouter registered routes (lines 10–14) and explicit `path()` patterns (lines 18–24).
   - `path('api/', include('restaurants.urls'))` is registered in `backend/config/urls.py` (line 38).

6. **`backend/restaurants/management/commands/`**:
   - Existing seed commands (`seed_restaurants.py`, `seed_branches.py`, `seed_tandoori_images.py`) follow standard Django `BaseCommand` patterns with optional `--force` argument.
   - `seed_reviews.py` does **not yet exist**.

---

## 2. Logic Chain

1. **Model & Rating Sync Logic**:
   - `Restaurant` model already has `rating` and `total_reviews` fields.
   - Adding `RestaurantReview` model with `OneToOneField(Order, null=True, blank=True)` ensures an order can be linked to a review at most once.
   - Adding an instance method `update_rating(self)` on `Restaurant` uses `self.reviews.aggregate(avg_rating=Avg('rating'), count=Count('id'))` to compute `avg_rating` and `count`, updating `self.rating` and `self.total_reviews` in the database.
   - Connecting `post_save` and `post_delete` signals on `RestaurantReview` ensures every new review or review deletion immediately updates `Restaurant.rating` and `Restaurant.total_reviews` without requiring on-the-fly aggregation during listing queries (preventing N+1 database queries).

2. **DRF API & Routing Logic**:
   - Creating `RestaurantReviewSerializer` with rating validation (1 to 5) and readable user/restaurant details satisfies client UI requirements.
   - `RestaurantReviewViewSet` supports listing and creating reviews.
   - Supporting both slug (`/api/restaurants/jushhpk/reviews/`) and ID (`/api/restaurants/3/reviews/`) as well as query parameters (`/api/reviews/?restaurant_id=3`) ensures max flexibility for Mobile App (React Native) and Website/Admin (React Vite).
   - Validating order status (`order.status == 'delivered'`) and preventing duplicate reviews for the same order maintains data integrity.

3. **Seeding Logic**:
   - Active launch brands (`jushhpk`, `tandooristoppk`, `getafomo`) require initial realistic review data to demonstrate the UI features.
   - Management command `seed_reviews.py` populates 5 realistic reviews per active launch restaurant, creates test user profiles if absent, and calls `update_rating()` to synchronize stats.

---

## 3. Caveats

1. **Guest User Reviews**: `Order` supports guest ordering (`guest_name`, `guest_phone`, `tracking_token`). However, reviews currently require `user` FK (`IsAuthenticatedOrReadOnly`). If guest reviews are needed in the future, `user` can be `null=True, blank=True` with `guest_name` fallback. For Milestone 3, `user` FK is specified as required.
2. **Order Verification**: Order link is optional (`null=True, blank=True`). If `order` is provided, validation MUST enforce that the order status is `delivered`, belongs to the ordering user, and has not been reviewed before.
3. **No Code Written in Project**: Explorer 1 is operating under read-only rules. All code snippets provided in this handoff and `analysis.md` are exact specifications for the Worker.

---

## 4. Conclusion & Concrete Action Steps for Worker

The implementation plan is clear, modular, and fully aligned with project guidelines. The Worker should perform the following steps:

### Step 1: Update `backend/restaurants/models.py`
1. Add `RestaurantReview` model:
   - `restaurant` = `ForeignKey('restaurants.Restaurant', on_delete=CASCADE, related_name='reviews')`
   - `order` = `OneToOneField('orders.Order', on_delete=SET_NULL, null=True, blank=True, related_name='review')`
   - `user` = `ForeignKey(settings.AUTH_USER_MODEL, on_delete=CASCADE, related_name='reviews')`
   - `rating` = `IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])`
   - `comment` = `TextField(blank=True, default="")`
   - `created_at` = `DateTimeField(auto_now_add=True, db_index=True)`
2. Add `update_rating(self)` method to `Restaurant` class:
   ```python
   def update_rating(self):
       from django.db.models import Avg, Count
       stats = self.reviews.aggregate(avg_rating=Avg('rating'), count=Count('id'))
       avg = stats['avg_rating']
       self.rating = round(float(avg), 2) if avg is not None else 0.00
       self.total_reviews = stats['count'] or 0
       self.save(update_fields=['rating', 'total_reviews'])
   ```
3. Add signal receiver:
   ```python
   @receiver([post_save, post_delete], sender=RestaurantReview)
   def update_restaurant_review_stats(sender, instance, **kwargs):
       if instance.restaurant_id:
           instance.restaurant.update_rating()
   ```

### Step 2: Run Database Migrations
Run in terminal:
```bash
python manage.py makemigrations restaurants
python manage.py migrate
```

### Step 3: Add Serializers in `backend/restaurants/serializers.py`
Add `RestaurantReviewSerializer`:
```python
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

### Step 4: Add Views & URLs
1. In `backend/restaurants/views.py`:
   Add `RestaurantReviewViewSet` supporting `IsAuthenticatedOrReadOnly`, validating `order` status (`delivered`), user ownership, duplicate check, and setting `user=request.user`.
2. In `backend/restaurants/urls.py`:
   - Register `router.register('reviews', RestaurantReviewViewSet, basename='reviews')`
   - Add routes:
     `path('restaurants/<slug:slug>/reviews/', RestaurantReviewViewSet.as_view({'get': 'list', 'post': 'create'}), name='restaurant_reviews_slug')`
     `path('restaurants/<int:restaurant_id>/reviews/', RestaurantReviewViewSet.as_view({'get': 'list', 'post': 'create'}), name='restaurant_reviews_id')`

### Step 5: Add Seeding Command `backend/restaurants/management/commands/seed_reviews.py`
Create `seed_reviews.py` implementing `BaseCommand`:
- Populates realistic 4 & 5-star reviews for `jushhpk`, `tandooristoppk`, `getafomo`.
- Creates sample customer accounts if needed.
- Recalculates stats via `restaurant.update_rating()`.

---

## 5. Verification Method

To independently verify the implementation after Worker finishes:

1. **Database Migration Check**:
   ```bash
   python manage.py showmigrations restaurants
   ```
   Confirm new migration file is applied.

2. **Seeding Command Check**:
   ```bash
   python manage.py seed_reviews --force
   ```
   Confirm output displays `Successfully seeded restaurant reviews.` and lists updated ratings for `jushhpk`, `tandooristoppk`, `getafomo`.

3. **API Endpoint Verification**:
   - `GET /api/restaurants/jushhpk/reviews/`: Returns HTTP 200 with list of reviews for JushhPK.
   - `GET /api/restaurants/`: Returns HTTP 200 and each restaurant object contains non-zero `rating` and `total_reviews`.
   - `POST /api/restaurants/jushhpk/reviews/` (Authenticated user context):
     Payload: `{"rating": 5, "comment": "Amazing Turkish taste!"}`
     Returns HTTP 201 Created and updates `rating` & `total_reviews`.

4. **Automated Test Command**:
   Run Django test runner on restaurants app:
   ```bash
   python manage.py test restaurants
   ```
