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


class OrderTrackingThrottle(AnonRateThrottle):
    """
    Throttles unauthenticated or guest order tracking lookups to prevent brute-force order scraping.
    Allows up to 120 requests/minute per IP (supports polling while blocking bots).
    """
    rate = '120/minute'


class RegistrationRateThrottle(AnonRateThrottle):
    """
    Prevents scripted bot registration and welcome bonus point farming.
    Limits to 30 registrations per IP per hour.
    """
    rate = '30/hour'


class PasswordResetRateThrottle(AnonRateThrottle):
    """
    Prevents automated password reset email bombing and SMTP resource exhaustion.
    Limits to 10 password reset requests per IP per hour.
    """
    rate = '10/hour'

