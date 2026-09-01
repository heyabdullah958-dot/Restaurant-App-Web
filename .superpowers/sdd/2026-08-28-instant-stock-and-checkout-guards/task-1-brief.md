# Task 1: Backend Data Schema & Batch Availability Serialization

## Objective
Update `backend/restaurants/serializers.py` and `backend/restaurants/views.py` so that:
1. `MenuItemSerializer` includes two new computed fields:
   - `branch_availability_map`: `{ [branch_id: str/int]: boolean }` mapping every branch of the restaurant to its stock status for this item.
   - `other_available_branches`: `[{ id: int, name: str }]` listing all other active operational branches of this restaurant where `is_available = True` when the item is marked out of stock at the active/requested branch.
2. In `RestaurantDetailSerializer.get_categories` and `RestaurantMenuView.get`, prefetch all `BranchMenuItemAvailability` records for the restaurant in a single batch query (`BranchMenuItemAvailability.objects.filter(branch__restaurant=obj).values('branch_id', 'menu_item_id', 'is_available')`). Pass `branch_overrides_map` (mapping `(branch_id, menu_item_id) -> is_available`) in serializer context to guarantee zero N+1 queries.
3. Update `test_backend_local.py` with unit and integration tests verifying `branch_availability_map` and `other_available_branches` outputs. Run `backend\venv\Scripts\python.exe test_backend_local.py` and ensure all 24+ tests pass.
4. Commit the changes.
