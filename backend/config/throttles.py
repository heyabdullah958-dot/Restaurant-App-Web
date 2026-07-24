from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

class GuestAuthThrottle(AnonRateThrottle):
    """
    Relaxed throttle for guest account creation to support mobile app usage and testing.
    Limits to 300 guest accounts per IP per hour.
    """
    rate = '300/hour'

class OrderCreateThrottle(UserRateThrottle):
    """
    Strict throttle class for limiting order creation requests.
    Uses 'order_create' scope defined in settings.py.
    """
    scope = 'order_create'
