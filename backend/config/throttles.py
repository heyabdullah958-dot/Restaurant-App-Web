from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

class GuestAuthThrottle(AnonRateThrottle):
    """
    BUG-19 FIX: Stricter throttle for guest account creation.
    Limits to 5 guest accounts per IP per hour to prevent abuse.
    """
    rate = '5/hour'

class OrderCreateThrottle(UserRateThrottle):
    """
    Strict throttle class for limiting order creation requests.
    Uses 'order_create' scope defined in settings.py.
    """
    scope = 'order_create'
