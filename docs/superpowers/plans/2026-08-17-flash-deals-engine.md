# Flash Deals Engine v2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade FoodSphere's promotional flash deals subsystem into an enterprise-grade multi-tenant Flash Deals Engine with cascading brand/branch scoping, granular item/category targeting, recurring daily schedules (including midnight rollovers), and a resilient `FlashDealRedemption` ledger.

**Architecture:** Extend `promotions.FlashDeal` with 3-way `order_mode`, `item_scope_type`, `categories` M2M, `daily_start_time`/`daily_end_time`, `active_days`, `timezone`, and `priority`. Introduce `FlashDealRedemption` for deterministic daily vs lifetime cap enforcement. Expose multi-step creation workflows across Admin mobile and web portals, and dynamically annotate menu item payloads with flash badges (`⚡ 30% OFF`) and strike-through pricing in customer apps.

**Tech Stack:** Django REST Framework, PostgreSQL/SQLite, PyTZ/Django Timezones, React Native / Expo, React Vite Tailwind.

## Global Constraints

- Legacy data must safely migrate (`is_dine_in_only=True` → `order_mode='DINE_IN'`, `False` → `order_mode='ALL'`).
- Timezone defaults to `'Asia/Karachi'`.
- Midnight rollovers (e.g. `22:00` to `02:00`) must evaluate effective deal date against yesterday during the second half of the window.
- Overlapping deals resolve deterministically: `priority` → specificity (`SPECIFIC_ITEMS` > `CATEGORY` > `ENTIRE_MENU`) → largest customer discount.
- TypeScript compilation across `app/`, `admin/`, and `admin-app/` must have 0 errors (`npx tsc --noEmit`).

---

### Task 1: Schema Migration & Redemption Ledger Model

**Files:**
- Modify: `backend/promotions/models.py`
- Create: `backend/promotions/migrations/0004_flash_deals_engine_v2.py`
- Test: `test_flash_deals_v2_engine_suite.py`

**Interfaces:**
- Consumes: Existing `FlashDeal`, `Restaurant`, `Branch`, `MenuCategory`, `MenuItem`, `Order` models.
- Produces: `promotions.FlashDeal` with all v2 fields and `promotions.FlashDealRedemption` model with compound index `(flash_deal, redeemed_at)`.

- [ ] **Step 1: Write the failing unit test for the new schema and model attributes**

```python
# test_task1_schema.py
import os, sys, unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django; django.setup()
from promotions.models import FlashDeal, FlashDealRedemption

class TestFlashDealSchema(unittest.TestCase):
    def test_schema_fields_exist(self):
        fields = [f.name for f in FlashDeal._meta.get_fields()]
        self.assertIn('order_mode', fields)
        self.assertIn('item_scope_type', fields)
        self.assertIn('categories', fields)
        self.assertIn('daily_start_time', fields)
        self.assertIn('daily_end_time', fields)
        self.assertIn('active_days', fields)
        self.assertIn('timezone', fields)
        self.assertIn('redemption_reset_frequency', fields)
        self.assertIn('priority', fields)
        self.assertTrue(hasattr(FlashDealRedemption, 'flash_deal'))
        self.assertTrue(hasattr(FlashDealRedemption, 'order'))

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `backend\venv\Scripts\python.exe test_task1_schema.py`  
Expected: FAIL with `AttributeError` or missing fields.

- [ ] **Step 3: Update `backend/promotions/models.py` and run migrations**

```python
# backend/promotions/models.py
class FlashDeal(AuditLogMixin, models.Model):
    DEAL_TYPES = [
        ('percentage', '% Off'),
        ('flat', 'Flat Rs. Off'),
        ('bogo', 'Buy 1 Get 1 Free'),
        ('combo', 'Combo Bundle'),
    ]
    ORDER_MODES = [
        ('ALL', 'All Order Modes'),
        ('DELIVERY', 'Delivery & Takeaway Only'),
        ('DINE_IN', 'Dine-In Exclusive'),
    ]
    ITEM_SCOPES = [
        ('ENTIRE_MENU', 'Entire Store Menu'),
        ('CATEGORY', 'Specific Categories'),
        ('SPECIFIC_ITEMS', 'Specific Menu Items'),
    ]
    TIMING_TYPES = [
        ('ONE_TIME', 'One-Time Window'),
        ('RECURRING_DAILY', 'Recurring Daily Schedule'),
    ]
    RESET_FREQUENCIES = [
        ('DAILY', 'Daily Reset'),
        ('LIFETIME', 'Lifetime Cap'),
    ]

    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    deal_type = models.CharField(max_length=20, choices=DEAL_TYPES, default='percentage')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    max_discount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    min_subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    restaurant = models.ForeignKey('restaurants.Restaurant', on_delete=models.CASCADE, null=True, blank=True, related_name='flash_deals')
    branch = models.ForeignKey('restaurants.Branch', on_delete=models.CASCADE, null=True, blank=True, related_name='flash_deals')
    order_mode = models.CharField(max_length=20, choices=ORDER_MODES, default='ALL')

    item_scope_type = models.CharField(max_length=20, choices=ITEM_SCOPES, default='ENTIRE_MENU')
    categories = models.ManyToManyField('restaurants.MenuCategory', blank=True, related_name='flash_deals')
    menu_items = models.ManyToManyField('restaurants.MenuItem', blank=True, related_name='flash_deals')

    timing_type = models.CharField(max_length=20, choices=TIMING_TYPES, default='ONE_TIME')
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    daily_start_time = models.TimeField(null=True, blank=True)
    daily_end_time = models.TimeField(null=True, blank=True)
    active_days = models.JSONField(default=list, blank=True)
    valid_from = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)
    timezone = models.CharField(max_length=50, default='Asia/Karachi')

    max_orders = models.IntegerField(default=0, help_text="0 = unlimited")
    redemption_reset_frequency = models.CharField(max_length=20, choices=RESET_FREQUENCIES, default='DAILY')
    priority = models.IntegerField(default=0)
    image = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)


class FlashDealRedemption(models.Model):
    flash_deal = models.ForeignKey(FlashDeal, on_delete=models.CASCADE, related_name='redemptions')
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='deal_redemptions')
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    discount_applied = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    redeemed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-redeemed_at']
        indexes = [
            models.Index(fields=['flash_deal', 'redeemed_at']),
        ]
```

Run: `backend\venv\Scripts\python.exe backend/manage.py makemigrations promotions`  
Run: `backend\venv\Scripts\python.exe backend/manage.py migrate`

- [ ] **Step 4: Run test to verify it passes**

Run: `backend\venv\Scripts\python.exe test_task1_schema.py`  
Expected: PASS (Exit code 0).

- [ ] **Step 5: Commit**

```bash
git add backend/promotions/models.py backend/promotions/migrations/
git commit -m "feat(promotions): add v2 FlashDeal schema and FlashDealRedemption model"
```

---

### Task 2: Core Active Window, Rollover Evaluation & Priority Resolver

**Files:**
- Modify: `backend/promotions/models.py`
- Create: `backend/promotions/deal_engine.py`
- Test: `test_flash_deals_engine_logic.py`

**Interfaces:**
- Consumes: `FlashDeal`, `FlashDealRedemption`, `MenuItem`, `Restaurant`, `Branch`.
- Produces: `FlashDeal.is_currently_active(current_dt=None)`, `FlashDeal.current_redemption_count()`, `resolve_active_deal_for_item(menu_item, order_mode, branch_id, current_dt=None)`.

- [ ] **Step 1: Write comprehensive failing unit tests for standard windows, rollover windows, date boundaries, and priority resolution**

```python
# test_flash_deals_engine_logic.py
import os, sys, unittest
from datetime import datetime, time, date, timedelta
from decimal import Decimal
import pytz

sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
import django; django.setup()

from promotions.models import FlashDeal
from promotions.deal_engine import resolve_active_deal_for_item
from restaurants.models import Restaurant, MenuItem, MenuCategory

class TestFlashDealsEngineLogic(unittest.TestCase):
    def setUp(self):
        self.tz = pytz.timezone('Asia/Karachi')
        self.restaurant = Restaurant.objects.filter(slug='jushhpk').first()
        if not self.restaurant:
            self.restaurant = Restaurant.objects.create(name='Jush PK', slug='jushhpk')
        self.cat = MenuCategory.objects.create(restaurant=self.restaurant, name='Burgers')
        self.item = MenuItem.objects.create(category=self.cat, name='Mighty Burger', price=Decimal('850.00'))

    def tearDown(self):
        FlashDeal.objects.filter(title__startswith='TEST_').delete()
        self.item.delete()
        self.cat.delete()

    def test_standard_window_active(self):
        deal = FlashDeal.objects.create(
            title='TEST_Standard',
            deal_type='percentage',
            discount_value=Decimal('20.00'),
            timing_type='RECURRING_DAILY',
            daily_start_time=time(14, 0),
            daily_end_time=time(18, 0),
            active_days=['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
            timezone='Asia/Karachi'
        )
        test_dt = self.tz.localize(datetime(2026, 8, 17, 15, 30)) # 3:30 PM
        self.assertTrue(deal.is_currently_active(test_dt))
        
        test_dt_out = self.tz.localize(datetime(2026, 8, 17, 19, 0)) # 7:00 PM
        self.assertFalse(deal.is_currently_active(test_dt_out))

    def test_midnight_rollover_window(self):
        # 10:00 PM to 02:00 AM deal on Monday
        deal = FlashDeal.objects.create(
            title='TEST_Midnight',
            deal_type='percentage',
            discount_value=Decimal('30.00'),
            timing_type='RECURRING_DAILY',
            daily_start_time=time(22, 0),
            daily_end_time=time(2, 0),
            active_days=['MON'],
            valid_until=date(2026, 8, 17),
            timezone='Asia/Karachi'
        )
        # 11:30 PM on Monday night (Aug 17) -> First half -> Active
        dt_mon_night = self.tz.localize(datetime(2026, 8, 17, 23, 30))
        self.assertTrue(deal.is_currently_active(dt_mon_night))

        # 1:30 AM on Tuesday morning (Aug 18) -> Second half belonging to Mon deal -> Active & Valid
        dt_tue_early = self.tz.localize(datetime(2026, 8, 18, 1, 30))
        self.assertTrue(deal.is_currently_active(dt_tue_early))

        # 2:30 AM on Tuesday morning (Aug 18) -> After window -> Inactive
        dt_tue_late = self.tz.localize(datetime(2026, 8, 18, 2, 30))
        self.assertFalse(deal.is_currently_active(dt_tue_late))

    def test_priority_overlap_resolution(self):
        deal_menu = FlashDeal.objects.create(
            title='TEST_MenuWide',
            deal_type='percentage',
            discount_value=Decimal('10.00'),
            item_scope_type='ENTIRE_MENU',
            restaurant=self.restaurant,
            timing_type='ONE_TIME',
            start_time=self.tz.localize(datetime(2026, 8, 1, 0, 0)),
            end_time=self.tz.localize(datetime(2026, 8, 30, 0, 0)),
            priority=0
        )
        deal_item = FlashDeal.objects.create(
            title='TEST_ItemSpecific',
            deal_type='percentage',
            discount_value=Decimal('30.00'),
            item_scope_type='SPECIFIC_ITEMS',
            restaurant=self.restaurant,
            timing_type='ONE_TIME',
            start_time=self.tz.localize(datetime(2026, 8, 1, 0, 0)),
            end_time=self.tz.localize(datetime(2026, 8, 30, 0, 0)),
            priority=10
        )
        deal_item.menu_items.add(self.item)

        best_deal = resolve_active_deal_for_item(self.item, order_mode='ALL', current_dt=self.tz.localize(datetime(2026, 8, 17, 12, 0)))
        self.assertIsNotNone(best_deal)
        self.assertEqual(best_deal['deal_id'], deal_item.id)
        self.assertEqual(best_deal['discount_value'], Decimal('30.00'))
        self.assertEqual(best_deal['discounted_price'], Decimal('595.00'))

if __name__ == '__main__':
    unittest.main()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `backend\venv\Scripts\python.exe test_flash_deals_engine_logic.py`  
Expected: FAIL with `ModuleNotFoundError: No module named 'promotions.deal_engine'` or missing methods.

- [ ] **Step 3: Implement methods on `FlashDeal` model and `deal_engine.py`**

Implement `is_currently_active()`, `_within_valid_range()`, and `current_redemption_count()` in `backend/promotions/models.py`.  
Create `backend/promotions/deal_engine.py` implementing `resolve_active_deal_for_item()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `backend\venv\Scripts\python.exe test_flash_deals_engine_logic.py`  
Expected: PASS (Exit code 0).

- [ ] **Step 5: Commit**

```bash
git add backend/promotions/models.py backend/promotions/deal_engine.py test_flash_deals_engine_logic.py
git commit -m "feat(promotions): implement active window, timezone midnight rollover, and priority resolution engine"
```

---

### Task 3: DRF Serializers, Admin CRUD Endpoints & Menu Flash Badging

**Files:**
- Modify: `backend/promotions/serializers.py`
- Modify: `backend/promotions/views.py`
- Modify: `backend/promotions/urls.py`
- Modify: `backend/restaurants/serializers.py`
- Modify: `backend/orders/serializers.py`
- Test: `test_flash_deals_api_suite.py`

**Interfaces:**
- Consumes: `FlashDeal`, `deal_engine.resolve_active_deal_for_item`, `MenuItemSerializer`.
- Produces: `GET /api/promotions/flash-deals/`, `POST /api/promotions/flash-deals/`, `GET /api/restaurants/{slug}/menu/` with `active_flash_deal` object per item, `OrderCreateSerializer` creating `FlashDealRedemption`.

- [ ] **Step 1: Write the failing API test**

Write `test_flash_deals_api_suite.py` testing creation of recurring deals via POST, retrieval via GET with calculated `window_ends_at`, menu serialization badging, and atomic redemption insertion on order checkout.

- [ ] **Step 2: Run test to verify it fails**

Run: `backend\venv\Scripts\python.exe test_flash_deals_api_suite.py`  
Expected: FAIL.

- [ ] **Step 3: Implement Serializers and Views**

Update `FlashDealSerializer` to handle all scoping fields.  
Update `MenuItemSerializer` to annotate `active_flash_deal`.  
Update `OrderCreateSerializer` to insert `FlashDealRedemption` on order placement.

- [ ] **Step 4: Run test to verify it passes**

Run: `backend\venv\Scripts\python.exe test_flash_deals_api_suite.py`  
Expected: PASS (Exit code 0).

- [ ] **Step 5: Commit**

```bash
git add backend/promotions/serializers.py backend/promotions/views.py backend/restaurants/serializers.py backend/orders/serializers.py
git commit -m "feat(api): connect flash deal serializers, menu badging, and atomic checkout redemptions"
```

---

### Task 4: Admin Management Portals (Mobile App & Web HQ)

**Files:**
- Modify: `admin-app/src/screens/placeholders/FlashDealManagementScreen.tsx`
- Modify: `admin/src/views/FlashDealManagement.tsx`
- Modify: `admin-app/src/services/api.ts`
- Modify: `admin/src/services/api.ts`
- Test: `npx tsc --noEmit` in `admin-app/` and `admin/`

**Interfaces:**
- Consumes: `GET /api/restaurants/`, `GET /api/restaurants/{id}/menu/`, `POST /api/promotions/flash-deals/`.
- Produces: 6-step progressive modal with cascading brand/branch selection, item search checklist, recurring daily presets, and live badge preview.

- [ ] **Step 1: Build progressive creation modal components in `admin-app`**

Implement Brand & Branch cascading pickers, 3-way Order Mode chips, Item Scope (Entire Menu / Category chips / Searchable Dish checklist), Mechanics (% Off, Flat Rs. Off, BOGO, Caps), Schedule (One-Time vs Recurring Daily with quick presets `[Every Day]`, `[Weekdays]`, `[Weekends]`, and Timezone pickers).

- [ ] **Step 2: Update Web Admin HQ (`admin/src/views/FlashDealManagement.tsx`)**

Replicate the comprehensive 6-step creation and editing flow in the web dashboard.

- [ ] **Step 3: Run TypeScript compiler across `admin-app` and `admin`**

Run: `npx tsc --noEmit` in `admin-app/`  
Run: `npx tsc --noEmit` in `admin/`  
Expected: 0 errors (Code 0).

- [ ] **Step 4: Commit**

```bash
git add admin-app/src/screens/placeholders/FlashDealManagementScreen.tsx admin/src/views/FlashDealManagement.tsx admin-app/src/services/api.ts admin/src/services/api.ts
git commit -m "feat(admin): progressive 6-step Flash Deal creation modal with brand, branch, item scope, and recurring schedule pickers"
```

---

### Task 5: Customer App Badging, Dynamic Countdown Banners & Cart Sync

**Files:**
- Modify: `app/src/components/MenuItemCard.tsx`
- Modify: `app/src/screens/RestaurantScreen.tsx`
- Modify: `app/src/screens/HomeScreen.tsx`
- Modify: `app/src/screens/FlashDealsScreen.tsx`
- Modify: `app/src/store/cartSlice.ts`
- Test: `npx tsc --noEmit` in `app/`

**Interfaces:**
- Consumes: `item.active_flash_deal` from menu endpoint, `GET /api/promotions/flash-deals/`.
- Produces: `⚡ 30% OFF` sticker badge on dishes, strike-through pricing (~Rs. 850~ **Rs. 595**), countdown banner to `window_ends_at`, limited stock bar, and automatic discounted cart calculations.

- [ ] **Step 1: Implement item-level flash deal badge & strike-through pricing in `MenuItemCard.tsx`**

Render badge tag and discounted price when `item.active_flash_deal` is present.

- [ ] **Step 2: Update `HomeScreen.tsx` Dynamic Hero Banner & `FlashDealsScreen.tsx`**

Handle `window_ends_at` countdowns for recurring deals, live limited stock progress (`12/50 left`), and filter chips.

- [ ] **Step 3: Run TypeScript compiler in `app`**

Run: `npx tsc --noEmit` in `app/`  
Expected: 0 errors (Code 0).

- [ ] **Step 4: Commit**

```bash
git add app/src/components/MenuItemCard.tsx app/src/screens/RestaurantScreen.tsx app/src/screens/HomeScreen.tsx app/src/screens/FlashDealsScreen.tsx app/src/store/cartSlice.ts
git commit -m "feat(app): menu item flash deal badging, strike-through pricing, and recurring window countdown banners"
```

---

### Task 6: Comprehensive Automated End-to-End Test Suite

**Files:**
- Create: `test_flash_deals_v2_engine_suite.py`
- Test: `backend\venv\Scripts\python.exe test_flash_deals_v2_engine_suite.py` & `test_backend_local.py`

**Interfaces:**
- Consumes: All updated DRF endpoints, models, serializers, and customer app contracts.
- Produces: 100% passing automated test suite verifying all 6 phases and edge cases.

- [ ] **Step 1: Write `test_flash_deals_v2_engine_suite.py`**

Covers:
1. Brand & Branch scoping verification.
2. Item and Category-level targeting and strike-through pricing.
3. Standard daytime recurring windows and day-of-week filters.
4. Midnight rollover windows (e.g. 10 PM – 2 AM) across date boundaries.
5. Redemption logging and daily vs lifetime cap resets.
6. Overlapping deals priority resolution.
7. Atomic redemption insertion during checkout.

- [ ] **Step 2: Execute all test suites**

Run: `backend\venv\Scripts\python.exe test_flash_deals_v2_engine_suite.py`  
Run: `backend\venv\Scripts\python.exe test_backend_local.py`  
Run: `npx tsc --noEmit` in `app/`, `admin/`, `admin-app/`  
Expected: All tests pass (100% OK), 0 TypeScript errors.

- [ ] **Step 3: Update MD Documentation Files**

Update `FRONTEND.md`, `BACKEND.md`, `BUGS.md`, `CHANGELOG.md`, `LESSONS.md`.

- [ ] **Step 4: Commit and Push**

```bash
git add test_flash_deals_v2_engine_suite.py FRONTEND.md BACKEND.md BUGS.md CHANGELOG.md LESSONS.md
git commit -m "test: comprehensive Flash Deals Engine v2.0 verification suite and documentation"
git push origin main
```
