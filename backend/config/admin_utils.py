def get_managed_restaurant(user):
    """
    Returns the Restaurant instance managed by the user, based on their Django group.
    Returns None if the user is a superuser, anonymous, or doesn't belong to any manager group.
    """
    if not user or user.is_anonymous or user.is_superuser:
        return None
        
    for group in user.groups.all():
        if group.name.startswith('manager_'):
            slug = group.name.replace('manager_', '')
            from restaurants.models import Restaurant
            try:
                return Restaurant.objects.get(slug=slug)
            except Restaurant.DoesNotExist:
                return None
                
    return None


def get_managed_branch(user):
    """
    Returns the Branch instance managed by the user via their ManagerProfile.
    Returns None if user is superuser, anonymous, or has no ManagerProfile.
    """
    if not user or user.is_anonymous or user.is_superuser:
        return None
    try:
        return user.manager_profile.branch
    except Exception:
        return None


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance in kilometers between two points
    on the earth (specified in decimal degrees).
    """
    import math
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
    except (ValueError, TypeError):
        return float('inf')
        
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2.0)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


# Known coordinates (lat, lng) for Lahore restaurant branches
BRANCH_COORDINATES = {
    'johar town': (31.4690, 74.2917),
    'johar': (31.4690, 74.2917),
    'lake city': (31.3650, 74.2480),
    'gt road baghbanpura': (31.5714, 74.3800),
    'baghbanpura': (31.5714, 74.3800),
    'dha': (31.4700, 74.3750),
    'gulberg': (31.5150, 74.3450),
    'saddar': (31.5350, 74.3700),
}


def resolve_branch_for_order(restaurant, delivery_address, delivery_lat=None, delivery_lng=None):
    """
    Matches a delivery_address string or lat/lng to the nearest branch.
    1. If delivery_lat and delivery_lng are provided, uses Haversine distance.
    2. Otherwise, matches delivery_address to area_keywords.
    3. Falls back to Johar Town branch (primary HQ) or first active branch.
    Returns a Branch instance or None.
    """
    if not restaurant:
        return None
    
    from restaurants.models import Branch
    branches = list(Branch.objects.filter(restaurant=restaurant, is_active=True))
    
    if not branches:
        return None

    # 1. Geolocation / Haversine Distance resolution
    if delivery_lat is not None and delivery_lng is not None:
        try:
            cust_lat = float(delivery_lat)
            cust_lng = float(delivery_lng)
            best_branch = None
            min_dist = float('inf')
            
            for branch in branches:
                b_name_lower = branch.name.lower().strip()
                coords = BRANCH_COORDINATES.get(b_name_lower)
                if not coords:
                    for key, val in BRANCH_COORDINATES.items():
                        if key in b_name_lower:
                            coords = val
                            break
                if coords:
                    dist = haversine_distance(cust_lat, cust_lng, coords[0], coords[1])
                    if dist < min_dist:
                        min_dist = dist
                        best_branch = branch
            
            if best_branch:
                return best_branch
        except (ValueError, TypeError):
            pass

    # 2. Text Keyword Matching
    address_lower = (delivery_address or '').lower().strip()
    if address_lower:
        for branch in branches:
            keywords = branch.area_keywords or []
            for keyword in keywords:
                kw = keyword.lower().strip()
                if kw and kw in address_lower:
                    return branch

    # 3. Default HQ Fallback: Prefer "Johar Town" branch if present, otherwise first active branch
    johar_branch = next((b for b in branches if 'johar' in b.name.lower()), None)
    if johar_branch:
        return johar_branch

    return branches[0]

