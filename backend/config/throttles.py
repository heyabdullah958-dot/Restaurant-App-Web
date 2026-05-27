from rest_framework.throttling import AnonRateThrottle


class GuestAuthThrottle(AnonRateThrottle):
    """
    BUG-19 FIX: Stricter throttle for guest account creation.
    Limits to 5 guest accounts per IP per hour to prevent abuse.
    """
    rate = '5/hour'
