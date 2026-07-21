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


def resolve_branch_for_order(restaurant, delivery_address):
    """
    Matches a delivery_address string to the nearest branch using area_keywords.
    Falls back to the first active branch of the restaurant if no keyword matches.
    Returns a Branch instance or None.
    """
    if not restaurant:
        return None
    
    from restaurants.models import Branch
    branches = Branch.objects.filter(restaurant=restaurant, is_active=True)
    
    if not branches.exists():
        return None
    
    address_lower = (delivery_address or '').lower()
    
    # First pass: keyword match
    for branch in branches:
        keywords = branch.area_keywords or []
        for keyword in keywords:
            if keyword.lower() in address_lower:
                return branch
    
    # Fallback: first active branch
    return branches.first()
