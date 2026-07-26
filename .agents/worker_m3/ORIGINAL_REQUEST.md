## 2026-07-26T20:01:29Z

<USER_REQUEST>
You are Worker 1 for Milestone 3 (R3: Ratings, Loyalty & Admin Settings).
Your working directory is `d:/sitesdata/Resturent App/.agents/worker_m3/`. Create this directory if it doesn't exist.

TASK: Execute all code changes for Milestone 3 (R3: Ratings, Loyalty & Admin Settings) across Django Backend, Admin HQ React Dashboard, and Mobile App React Native as instructed below.

### MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

---

### Implementation Instructions:

#### 1. Ratings & Reviews System (Django Backend):
- Update `backend/restaurants/models.py`:
  - Create `RestaurantReview` model with fields: `restaurant` (FK to Restaurant, related_name='reviews', CASCADE), `order` (OneToOneField to Order, null=True, blank=True, related_name='review', SET_NULL), `user` (FK to AUTH_USER_MODEL, related_name='reviews', CASCADE), `rating` (IntegerField, validators 1 to 5), `comment` (TextField, blank=True), `created_at` (DateTimeField auto_now_add=True).
  - Add instance method `update_rating(self)` on `Restaurant` model to recalculate `rating` (Decimal rounded to 2 decimal places) and `total_reviews` (count) from `self.reviews.aggregate()`.
  - Add signal receiver `@receiver([post_save, post_delete], sender=RestaurantReview)` to update `instance.restaurant.update_rating()`.
- Run migrations: `python manage.py makemigrations restaurants` and `python manage.py migrate`.
- Update `backend/restaurants/serializers.py`: Add `RestaurantReviewSerializer` with rating validation (1-5), `user_name` SerializerMethodField, and `restaurant_name` ReadOnlyField.
- Update `backend/restaurants/views.py`: Add `RestaurantReviewViewSet` supporting `IsAuthenticatedOrReadOnly`, list review filtering by restaurant (slug, ID, query param), order validation (must be `status == 'delivered'`), duplicate review check, and assigning `user = request.user`.
- Update `backend/restaurants/urls.py`: Register router route `reviews` and URL patterns for `/api/restaurants/<slug:slug>/reviews/` and `/api/restaurants/<int:restaurant_id>/reviews/`.
- Create `backend/restaurants/management/commands/seed_reviews.py`: Management command implementing `--force` option to populate realistic ratings & reviews for active launch restaurants (`jushhpk`, `tandooristoppk`, `getafomo`) and update ratings.
- Run `python manage.py seed_reviews --force`.

#### 2. PlatformSettings Singleton & Welcome Bonus (Django Backend & Admin HQ):
- Update `backend/config/models.py`: Add `PlatformSettings` singleton model with fields `loyalty_points_per_dollar` (default 10), `loyalty_point_value_usd` (default 0.01), `welcome_bonus_points` (default 100), `created_at`, `updated_at`. Enforce `pk=1` in `save()`, pass in `delete()`, and provide `get_solo(cls)` classmethod.
- Update `backend/config/admin.py`: Register `PlatformSettings` in Django Admin.
- Run migrations: `python manage.py makemigrations config` and `python manage.py migrate`.
- Update `backend/config/views.py`: Add `PlatformSettingsSerializer` and `PlatformSettingsView` (APIView restricted to `IsSuperUser`) supporting `GET`, `PUT`, `PATCH`.
- Update `backend/users/urls.py`: Add URL pattern `path('config/settings/', PlatformSettingsView.as_view(), name='platform_settings')`.
- Update `backend/users/serializers.py`: In `UserRegisterSerializer.create()`, check `PlatformSettings.get_solo().welcome_bonus_points` and credit initial loyalty points to `User.loyalty_points`. Also create a `LoyaltyTransaction` record (`points=welcome_bonus`, `transaction_type='earned'`, `description='Welcome bonus on registration'`).
- Update Admin HQ (`admin/src/`):
  - In `admin/src/types.ts`: Add `PlatformSettings` interface.
  - In `admin/src/services/api.ts`: Add `fetchPlatformSettings` and `updatePlatformSettings` functions.
  - Create `admin/src/views/PlatformSettings.tsx`: Settings view with editable inputs for welcome bonus, earn rate, point USD value, live calculator, save button with toast notifications.
  - In `admin/src/components/Sidebar.tsx`: Add "Platform Settings" nav item under SuperAdmin menu.
  - In `admin/src/App.tsx`: Import `PlatformSettings` view and route `activeView === 'platform_settings'`.

#### 3. Mobile App Ratings & Reviews UI (`app/src/`):
- Create `app/src/components/ReviewModal.tsx`: Modal component with 5-star rating selector, multiline comment input, submit button, cancel button, and error handling.
- Update `app/src/store/restaurantSlice.ts`: Add `fetchRestaurantReviews` and `submitReview` async thunks, and handle extraReducers.
- Update `app/src/screens/TrackingScreen.tsx`: Add "Rate Your Order" button on delivered status card (`activeStep === 4`) that triggers `ReviewModal`.
- Update `app/src/screens/OrdersScreen.tsx`: Add "Rate" button for delivered orders (`item.status === 'delivered'`) that triggers `ReviewModal`.
- Update `app/src/screens/HomeScreen.tsx`: Enhance `RestaurantCard` rating badge to display total review count e.g. `⭐ 4.8 (245)`.
- Update `app/src/screens/RestaurantScreen.tsx`: Add a Reviews tab / dedicated customer reviews list section displaying customer ratings, user names, dates, and comments.

#### 4. Run Verification Tests:
- Run `python manage.py test` in `backend/` to verify all backend tests pass with 0 errors.

Write a detailed completion report and handoff in `d:/sitesdata/Resturent App/.agents/worker_m3/handoff.md`.
Communicate completion back to parent via `send_message`.
</USER_REQUEST>
