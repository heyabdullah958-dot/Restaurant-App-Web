from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model
from restaurants.models import Restaurant, MenuCategory, MenuItem
from orders.models import Order, OrderItem

class Command(BaseCommand):
    help = 'Creates Django Groups and staff Users for each Restaurant manager with granular permissions'

    def handle(self, *args, **options):
        User = get_user_model()
        
        # 1. Get model content types
        try:
            restaurant_ct = ContentType.objects.get_for_model(Restaurant)
            category_ct = ContentType.objects.get_for_model(MenuCategory)
            item_ct = ContentType.objects.get_for_model(MenuItem)
            order_ct = ContentType.objects.get_for_model(Order)
            orderitem_ct = ContentType.objects.get_for_model(OrderItem)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error fetching ContentTypes: {e}"))
            return

        # 2. Get specific permissions
        try:
            permissions = [
                # Restaurant
                Permission.objects.get(codename='view_restaurant', content_type=restaurant_ct),
                Permission.objects.get(codename='change_restaurant', content_type=restaurant_ct),
                # MenuCategory
                Permission.objects.get(codename='view_menucategory', content_type=category_ct),
                Permission.objects.get(codename='change_menucategory', content_type=category_ct),
                Permission.objects.get(codename='add_menucategory', content_type=category_ct),
                Permission.objects.get(codename='delete_menucategory', content_type=category_ct),
                # MenuItem
                Permission.objects.get(codename='view_menuitem', content_type=item_ct),
                Permission.objects.get(codename='change_menuitem', content_type=item_ct),
                Permission.objects.get(codename='add_menuitem', content_type=item_ct),
                Permission.objects.get(codename='delete_menuitem', content_type=item_ct),
                # Order
                Permission.objects.get(codename='view_order', content_type=order_ct),
                Permission.objects.get(codename='change_order', content_type=order_ct),
                # OrderItem
                Permission.objects.get(codename='view_orderitem', content_type=orderitem_ct),
            ]
        except Permission.DoesNotExist as e:
            self.stdout.write(self.style.ERROR(f"Required permission not found in database: {e}. Has migrations been run?"))
            return

        # 3. Process each Restaurant
        restaurants = Restaurant.objects.all()
        if not restaurants.exists():
            self.stdout.write(self.style.WARNING("No restaurants found in database. Please add restaurants first."))
            return

        HASHED_PASSWORDS = {
            'seenbanao': 'pbkdf2_sha256$1200000$bJ2RyRdMfKKDxg6R8Km3Wy$StWrxqqe6/zZ/2SPPENiP6JKzkfJ7MXljgdAHeiiIYg=',
            'dineatblue': 'pbkdf2_sha256$1200000$jwD8Ti6WP31mCIZY8toBYW$yO5ub2WRHRbNJMNNBKZ4OzyM6ydppk8ZfuU4KRYlpq8=',
            'jushhpk': 'pbkdf2_sha256$1200000$ip4tnzIuXVNGa7VYlhAo9C$Sf1K2ihNJtfyTn9euDYGqo0xC8JO8Y/+l2DiIX266MM=',
            'tandooristoppk': 'pbkdf2_sha256$1200000$4ilAxSVx1SwOSaI9YvJhGa$xKbCmZpHXL0vUqBKaK4liarc7OK+C3ANNL/ssKVeOac=',
            'sandmelts': 'pbkdf2_sha256$1200000$om7LOoSuZ0Ek1L3Pi1yrDB$XjxhYP0VCLTu6MOkq/qxrpv9Oo0sOg1UGTLcGRXmN/g=',
            'birdmanfoodspk': 'pbkdf2_sha256$1200000$cg6XBYZEZuxdB0DKmh9Yfh$lwqgJn+R/5tMQqUI+YZrM2GbHKlUggVwEsUSdgMKOtk=',
            'getafomo': 'pbkdf2_sha256$1200000$0cmjdwyJjy0KDs7YEzLgUC$UllA5bvxGEbYpjTNfQu0oRT9PWgZhU8raLgOFT0GsH8='
        }

        for rest in restaurants:
            group_name = f"manager_{rest.slug}"
            username = f"manager_{rest.slug}"
            email = f"manager.{rest.slug}@foodsphere.com"
            hashed_pwd = HASHED_PASSWORDS.get(rest.slug, '')

            # Create Group
            group, created_group = Group.objects.get_or_create(name=group_name)
            group.permissions.set(permissions)
            
            # Create User
            user, created_user = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'is_staff': True,
                    'is_active': True,
                    'password': hashed_pwd,
                }
            )

            # Apply pre-hashed password if missing or not PBKDF2 format
            if created_user or not user.password or not user.password.startswith('pbkdf2_'):
                user.password = hashed_pwd
            user.is_staff = True  # Ensure staff is active
            user.is_active = True
            user.save()
            user.groups.add(group)

            self.stdout.write(self.style.SUCCESS(
                f"{'Created' if created_group else 'Updated'} Group '{group_name}' | "
                f"{'Created' if created_user else 'Updated'} User '{username}'"
            ))
