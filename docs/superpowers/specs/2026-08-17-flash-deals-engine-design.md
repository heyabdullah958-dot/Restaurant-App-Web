# FoodSphere — Flash Deals Engine: Technical Design Specification (v2.0)
**Date:** 2026-08-17  
**Status:** Approved for Implementation  
**Target Subsystems:** `backend` (DRF API & Models), `admin-app` (Expo Management App), `admin` (React HQ Dashboard), `app` (Customer Expo App)

---

## 1. Overview & Business Intent

Upgrade FoodSphere's promotional flash deals subsystem from a basic percentage/date modal into an enterprise-grade, multi-tenant Flash Deals Engine matching industry leaders (FoodPanda, Talabat, DoorDash).

The upgraded engine supports:
1. **Multi-Tenant Target Scoping:** Global Platform-wide, Brand-wide (all branches), or Branch-specific deals, with order mode filtering (`ALL`, `DELIVERY`, `DINE_IN`).
2. **Granular Item / Catalog Scoping:** Entire Store Menu, Specific Menu Categories (e.g. Smash Burgers), or Specific Menu Items (e.g. Mighty Beef Burger) with live search selection.
3. **Flexible Deal Mechanics:** `% Off` (with optional max discount cap), `Flat Rs. Off`, `Buy 1 Get 1 Free (BOGO)`, and `Minimum Order Subtotal`.
4. **Recurring Daily Windows & Midnight Rollovers:** Seamless support for recurring campaigns (e.g., Midnight 12 AM – 6 AM deals) across specific days of the week, with timezone-aware midnight rollover handling and optional seasonal date ranges.
5. **Redemption Ledger & Daily Cap Reset:** Audit-ready `FlashDealRedemption` table supporting daily reset caps (e.g., "50 burgers per night") without fragile background cron jobs.
6. **Customer Experience & Item Badging:** Dynamic `⚡ 30% FLASH DEAL` badges and strike-through pricing on menu cards, real-time hero banner countdowns, and limited stock progress bars.

---

## 2. Architecture & Data Model Changes

### 2.1 `promotions.FlashDeal` (Updated Model)

```python
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

    # Target Tenancy Scope
    restaurant = models.ForeignKey('restaurants.Restaurant', on_delete=models.CASCADE, null=True, blank=True, related_name='flash_deals')
    branch = models.ForeignKey('restaurants.Branch', on_delete=models.CASCADE, null=True, blank=True, related_name='flash_deals')
    order_mode = models.CharField(max_length=20, choices=ORDER_MODES, default='ALL')

    # Item / Menu Scope
    item_scope_type = models.CharField(max_length=20, choices=ITEM_SCOPES, default='ENTIRE_MENU')
    categories = models.ManyToManyField('restaurants.MenuCategory', blank=True, related_name='flash_deals')
    menu_items = models.ManyToManyField('restaurants.MenuItem', blank=True, related_name='flash_deals')

    # Timing & Recurrence
    timing_type = models.CharField(max_length=20, choices=TIMING_TYPES, default='ONE_TIME')
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    daily_start_time = models.TimeField(null=True, blank=True)
    daily_end_time = models.TimeField(null=True, blank=True)
    active_days = models.JSONField(default=list, blank=True)  # e.g. ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
    valid_from = models.DateField(null=True, blank=True)
    valid_until = models.DateField(null=True, blank=True)
    timezone = models.CharField(max_length=50, default='Asia/Karachi')

    # Inventory & Priority
    max_orders = models.IntegerField(default=0, help_text="0 = unlimited")
    redemption_reset_frequency = models.CharField(max_length=20, choices=RESET_FREQUENCIES, default='DAILY')
    priority = models.IntegerField(default=0, help_text="Higher priority overrides overlapping deals")
    image = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

### 2.2 `promotions.FlashDealRedemption` (New Audit & Ledger Model)

```python
class FlashDealRedemption(models.Model):
    flash_deal = models.ForeignKey(FlashDeal, on_delete=models.CASCADE, related_name='redemptions')
    order = models.ForeignKey('orders.Order', on_delete=models.CASCADE, related_name='deal_redemptions')
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    discount_applied = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    redeemed_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-redeemed_at']
```

---

## 3. Core Business Logic & Algorithms

### 3.1 Active Window & Timezone-Aware Midnight Rollover Check

```python
def is_currently_active(self, current_dt=None):
    if not self.is_active:
        return False
    if self.max_orders > 0 and self.current_redemption_count() >= self.max_orders:
        return False

    tz_name = self.timezone or 'Asia/Karachi'
    try:
        import pytz
        tz = pytz.timezone(tz_name)
    except Exception:
        tz = dj_tz.get_current_timezone()

    now = dj_tz.localtime(current_dt or dj_tz.now(), tz)

    if self.timing_type == 'ONE_TIME':
        if not self.start_time or not self.end_time:
            return False
        return self.start_time <= now <= self.end_time

    # RECURRING_DAILY
    if not self.daily_start_time or not self.daily_end_time:
        return False

    current_time = now.time()
    day_abbr = now.strftime('%a').upper()[:3]
    active_days_list = [d.upper()[:3] for d in (self.active_days or ['MON','TUE','WED','THU','FRI','SAT','SUN'])]

    if self.daily_start_time <= self.daily_end_time:
        # Standard daytime window (e.g. 14:00 to 18:00)
        effective_date = now.date()
        if day_abbr not in active_days_list:
            return False
        if not self._within_valid_range(effective_date):
            return False
        return self.daily_start_time <= current_time <= self.daily_end_time
    else:
        # Midnight rollover window (e.g. 22:00 to 02:00)
        if current_time >= self.daily_start_time:
            effective_date = now.date()
            effective_day = day_abbr
        elif current_time <= self.daily_end_time:
            yesterday = now - timedelta(days=1)
            effective_date = yesterday.date()
            effective_day = yesterday.strftime('%a').upper()[:3]
        else:
            return False

        if effective_day not in active_days_list:
            return False
        if not self._within_valid_range(effective_date):
            return False
        return True

def _within_valid_range(self, effective_date):
    if self.valid_from and effective_date < self.valid_from:
        return False
    if self.valid_until and effective_date > self.valid_until:
        return False
    return True

def current_redemption_count(self):
    if self.redemption_reset_frequency == 'LIFETIME':
        return self.redemptions.count()
    
    # DAILY Reset
    tz_name = self.timezone or 'Asia/Karachi'
    try:
        import pytz
        tz = pytz.timezone(tz_name)
    except Exception:
        tz = dj_tz.get_current_timezone()
    
    today = dj_tz.localtime(dj_tz.now(), tz).date()
    return self.redemptions.filter(redeemed_at__date=today).count()
```

### 3.2 Overlapping Deals & Conflict Precedence

When multiple deals apply to the same menu item simultaneously:
1. **Priority Score:** Deal with highest `priority` integer wins.
2. **Specificity:** `SPECIFIC_ITEMS` > `CATEGORY` > `ENTIRE_MENU`; `Branch` > `Brand` > `Global`.
3. **Discount Value:** If still tied, the deal yielding the largest absolute customer discount wins.

---

## 4. API Layer & Serializer Specifications

### 4.1 `GET /api/promotions/flash-deals/` (Active Deals)
* **Permissions:** `AllowAny`
* **Query Parameters:** `restaurant_id`, `branch_id`, `order_mode` (`ALL`/`DELIVERY`/`DINE_IN`), `category_id`, `item_id`.
* **Output:** List of active flash deal objects with computed fields:
  * `is_currently_active`: `true`
  * `discount_display_text`: `"30% OFF (Max Rs. 200)"` or `"Flat Rs. 250 OFF"`
  * `redemptions_left`: `12` (if `max_orders = 50` and `current_redemption_count = 38`)
  * `window_ends_at`: ISO timestamp of the current active window expiration for live countdown tickers.

### 4.2 `GET /api/restaurants/{slug}/menu/` (Menu Item Badging)
Each item in the serialized category tree includes an annotated `active_flash_deal` field:
```json
{
  "id": 105,
  "name": "Mighty Beef Burger",
  "price": 850.0,
  "active_flash_deal": {
    "deal_id": 14,
    "title": "Midnight Smash 30% Off",
    "badge": "⚡ 30% OFF",
    "deal_type": "percentage",
    "discount_value": 30.0,
    "original_price": 850.0,
    "discounted_price": 595.0,
    "window_ends_at": "2026-08-18T06:00:00+05:00"
  }
}
```

### 4.3 `POST /api/orders/` (Atomic Deal Redemption)
When an order containing a flash deal is placed:
1. Backend recalculates and verifies flash deal eligibility atomically.
2. Inserts a `FlashDealRedemption` record linked to `order` and `flash_deal`.
3. If order placement causes `current_redemption_count == max_orders`, subsequent requests immediately see deal as exhausted.

---

## 5. User Interface & Workflow Specs

### 5.1 Admin Management Interfaces (`admin-app` & `admin` Web)

**Progressive Creation Modal (6 Steps):**
1. **Deal Identity:** Title, Description, Image Upload (Cloudinary preset with URL/file fallback).
2. **Tenancy & Order Mode Scope:**
   - Brand Selector (Global / Tandoori Stop / Jush PK / Get A Fomo)
   - Cascading Branch Selector (All Branches vs Specific Branch)
   - Order Mode Chips (`All Orders`, `Delivery Only`, `Dine-In Exclusive`)
3. **Item Scope Selector (Progressive Disclosure):**
   - Radio selection: `Entire Menu` | `By Category` | `By Specific Items`
   - When `By Category`: Multi-select pill chips of categories from selected brand.
   - When `By Specific Items`: Searchable list of dishes with checkboxes, category tags, and prices.
4. **Mechanics, Caps & Inventory:**
   - Deal Type: `% Off` (with Max Cap input) | `Flat Rs. Off` | `Buy 1 Get 1`
   - Min Order Subtotal (optional)
   - Max Orders Cap (e.g. 50) + Reset Frequency toggle (`Nightly/Daily Reset` vs `Lifetime Cap`)
5. **Schedule & Recurrence Engine:**
   - Timing Switch: `One-Time Window` vs `Recurring Daily Schedule`
   - If One-Time: Start & End DateTime picker modals with `minDate` past guards.
   - If Recurring:
     - Daily Start & End Time selectors (supports 12:00 AM – 6:00 AM midnight rollover).
     - Active Day chips with 1-tap presets: `[Every Day]`, `[Weekdays]`, `[Weekends]`.
     - Optional Date Range bounds (`Valid From` / `Valid Until`).
     - Priority integer slider/input (0–100).
6. **Live Preview Card:**
   - Customer mobile card mockup with live countdown simulation and badge preview before saving.

### 5.2 Customer Mobile App (`app`)
1. **Hero Banner Carousel (`HomeScreen.tsx`):**
   - Automatically renders active deals (including recurring daily specials currently in active window).
   - Tapping "Claim Deal & Order" navigates directly to the target restaurant with the promotion staged.
2. **Menu Item Cards (`MenuItemCard.tsx` & `RestaurantScreen.tsx`):**
   - Items with active flash deals display a `⚡ 30% OFF` flash sticker badge.
   - Prices show strike-through original and highlighted discounted price (~~Rs. 850~~ **Rs. 595**).
3. **Flash Deals Showcase (`FlashDealsScreen.tsx`):**
   - Categorized by brand and schedule type (`⚡ Active Now`, `🌙 Midnight Specials`).
   - Claim button applies promo and transitions to brand menu with active discount banner.

---

## 6. Migration Plan & Data Safety

1. **Schema Migration:**
   - Add fields to `FlashDeal`: `order_mode`, `item_scope_type`, `daily_start_time`, `daily_end_time`, `active_days`, `valid_from`, `valid_until`, `timezone`, `redemption_reset_frequency`, `priority`.
   - Add M2M relationships: `categories`, `menu_items`.
   - Create `FlashDealRedemption` table.
2. **Data Migration:**
   - For existing rows: `is_dine_in_only = True` -> `order_mode = 'DINE_IN'`; `is_dine_in_only = False` -> `order_mode = 'ALL'`.
   - Backfill existing `orders_used` values into `FlashDealRedemption` records or initialize clean ledger.
3. **Backward Compatibility:**
   - Serializers maintain backward-compatible field aliases (`is_dine_in_only` property mapping to `order_mode == 'DINE_IN'`).

---

## 7. Verification & Automated Test Strategy

1. **Unit & Integration Suite (`test_flash_deals_v2_engine_suite.py`):**
   - Test 1: Brand & Branch cascading scope enforcement.
   - Test 2: Item-level and category-level discount application and strike-through calculation.
   - Test 3: Standard recurring daily time windows and Day-of-Week filtering.
   - Test 4: Midnight rollover window logic (e.g. 10 PM – 2 AM across day boundaries).
   - Test 5: `FlashDealRedemption` ledger logging and daily cap reset verification.
   - Test 6: Overlapping deal priority resolution.
2. **Client Build Checks:**
   - TypeScript compilation (`npx tsc --noEmit`) in `app/`, `admin/`, and `admin-app/`.
   - Full regression run of `test_backend_local.py`.
