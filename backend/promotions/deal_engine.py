from datetime import datetime, timedelta, date, time
from decimal import Decimal
try:
    from zoneinfo import ZoneInfo
except ImportError:
    from django.utils.timezone import get_current_timezone as ZoneInfo
from django.utils import timezone as dj_tz
from promotions.models import FlashDeal


def compute_window_ends_at(deal, current_dt=None):
    """Calculates the ISO timestamp when the current active window will close."""
    tz_name = deal.get_effective_timezone()
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = dj_tz.get_current_timezone()

    now = dj_tz.localtime(current_dt or dj_tz.now(), tz)

    if deal.timing_type == 'ONE_TIME':
        if deal.end_time:
            et = dj_tz.localtime(deal.end_time, tz) if dj_tz.is_aware(deal.end_time) else deal.end_time.replace(tzinfo=tz)
            return et.isoformat()
        return None

    # RECURRING_DAILY
    if not deal.daily_start_time or not deal.daily_end_time:
        return None

    current_time = now.time()
    today = now.date()

    if deal.daily_start_time <= deal.daily_end_time:
        # Standard daytime window ending today at daily_end_time
        end_dt = datetime.combine(today, deal.daily_end_time).replace(tzinfo=tz)
        return end_dt.isoformat()
    else:
        # Rollover window
        if current_time >= deal.daily_start_time:
            # First half (e.g. 23:30) -> closes tomorrow morning at daily_end_time
            end_dt = datetime.combine(today + timedelta(days=1), deal.daily_end_time).replace(tzinfo=tz)
            return end_dt.isoformat()
        elif current_time <= deal.daily_end_time:
            # Second half (e.g. 01:30) -> closes today at daily_end_time
            end_dt = datetime.combine(today, deal.daily_end_time).replace(tzinfo=tz)
            return end_dt.isoformat()
        return None


def resolve_active_deal_for_item(menu_item, order_mode='ALL', branch_id=None, current_dt=None, preloaded_deals=None):
    """
    Finds the highest-priority active flash deal applicable to a specific menu item.
    Applies 3-level deterministic precedence:
      1. priority score (higher wins)
      2. specificity score (SPECIFIC_ITEMS > CATEGORY > ENTIRE_MENU, Branch > Brand > Global)
      3. highest absolute discount for customer
    """
    if not menu_item:
        return None

    restaurant = getattr(menu_item.category, 'restaurant', None)
    restaurant_id = restaurant.id if restaurant else None
    category_id = menu_item.category_id

    # Fetch candidate active flash deals
    deals = preloaded_deals if preloaded_deals is not None else FlashDeal.objects.filter(is_active=True).prefetch_related('categories', 'menu_items')
    
    applicable_candidates = []
    
    for deal in deals:
        if not deal.is_currently_active(current_dt=current_dt):
            continue

        # 1. Target Scope Check
        if deal.restaurant_id and deal.restaurant_id != restaurant_id:
            continue

        if deal.branch_id and branch_id:
            if str(deal.branch_id) != str(branch_id):
                continue

        if deal.order_mode != 'ALL' and order_mode != 'ALL':
            if deal.order_mode != order_mode:
                continue

        # 2. Item Scope Check
        is_item_match = False
        scope_score = 0
        
        if deal.item_scope_type == 'ENTIRE_MENU':
            is_item_match = True
            scope_score = 1
        elif deal.item_scope_type == 'CATEGORY':
            if deal.categories.filter(id=category_id).exists():
                is_item_match = True
                scope_score = 2
        elif deal.item_scope_type == 'SPECIFIC_ITEMS':
            if deal.menu_items.filter(id=menu_item.id).exists():
                is_item_match = True
                scope_score = 3

        if not is_item_match:
            continue

        # Target specificity bonus
        if deal.branch_id:
            scope_score += 2
        elif deal.restaurant_id:
            scope_score += 1

        # 3. Calculate Discount
        orig_price = Decimal(str(menu_item.price or 0))
        discount_amount = Decimal('0.00')

        if deal.deal_type == 'percentage':
            discount_amount = (orig_price * Decimal(str(deal.discount_value))) / Decimal('100.00')
            if deal.max_discount and deal.max_discount > 0:
                discount_amount = min(discount_amount, Decimal(str(deal.max_discount)))
        elif deal.deal_type == 'flat':
            discount_amount = min(orig_price, Decimal(str(deal.discount_value)))
        elif deal.deal_type == 'bogo':
            # Buy 1 Get 1 = effective 50% discount per item or tagged as BOGO
            discount_amount = orig_price / Decimal('2.00')

        discounted_price = max(Decimal('0.00'), orig_price - discount_amount)

        # Generate Badge Text
        if deal.deal_type == 'percentage':
            badge_text = f"⚡ {int(deal.discount_value)}% OFF"
        elif deal.deal_type == 'flat':
            badge_text = f"⚡ Flat Rs. {int(deal.discount_value)} OFF"
        elif deal.deal_type == 'bogo':
            badge_text = "⚡ BUY 1 GET 1"
        else:
            badge_text = f"⚡ {deal.title}"

        window_ends = compute_window_ends_at(deal, current_dt=current_dt)

        candidate = {
            'deal_id': deal.id,
            'title': deal.title,
            'description': deal.description,
            'badge': badge_text,
            'deal_type': deal.deal_type,
            'discount_value': deal.discount_value,
            'original_price': float(orig_price),
            'discount_amount': float(discount_amount),
            'discounted_price': float(discounted_price),
            'window_ends_at': window_ends,
            'priority': deal.priority,
            'scope_score': scope_score,
        }
        applicable_candidates.append(candidate)

    if not applicable_candidates:
        return None

    # Sort by: (1) priority DESC, (2) scope_score DESC, (3) discount_amount DESC
    applicable_candidates.sort(
        key=lambda c: (c['priority'], c['scope_score'], c['discount_amount']),
        reverse=True
    )

    return applicable_candidates[0]
