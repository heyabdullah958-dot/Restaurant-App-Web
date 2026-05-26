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
