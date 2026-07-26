## 2026-07-26T20:00:10Z
You are Explorer 1 for Milestone 3 (R3: Ratings, Loyalty & Admin Settings).
Your working directory is `d:/sitesdata/Resturent App/.agents/explorer_m3_1/`. Create this directory if it doesn't exist.

TASK: Investigate the backend implementation details for the Ratings & Reviews system:
1. `RestaurantReview` model in `backend/restaurants/models.py`:
   - Fields: `restaurant` (FK to Restaurant), `order` (OneToOneField to Order, null=True/blank=True), `user` (FK to User), `rating` (IntegerField 1 to 5), `comment` (TextField), `created_at` (DateTimeField).
   - Dynamic or calculated `average_rating` and `total_reviews` on `Restaurant` model or `RestaurantSerializer` / `RestaurantDetailSerializer`.
2. DRF ViewSet & Endpoints:
   - `POST /api/restaurants/{id}/reviews/` (or `/api/reviews/`) to submit a review for an order/restaurant.
   - `GET /api/restaurants/{id}/reviews/` to list reviews for a restaurant.
3. Seeding command `python manage.py seed_reviews`:
   - Management command in `backend/restaurants/management/commands/seed_reviews.py` that populates realistic reviews for active launch restaurants (`jushhpk`, `tandooristoppk`, `getafomo`).

Investigate existing code, models, serializers, views, and URLs.
Write a detailed investigation report and handoff to `d:/sitesdata/Resturent App/.agents/explorer_m3_1/handoff.md`. Include exact line numbers, code structures, and step-by-step implementation recommendations for the Worker.
Communicate completion back to parent via `send_message`.
