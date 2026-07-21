from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model
from restaurants.models import Restaurant, Branch, MenuCategory, MenuItem
from orders.models import Order, OrderItem
from users.models import ManagerProfile


class Command(BaseCommand):
    help = (
        'Creates Django Groups and staff Users for each restaurant branch manager. '
        'If a restaurant has branches seeded, creates one manager per branch '
        'with a linked ManagerProfile. Falls back to one restaurant-level manager '
        'for restaurants without branches.'
    )

    def handle(self, *args, **options):
        User = get_user_model()

        # ── 1. Gather permission objects ───────────────────────────────────
        try:
            restaurant_ct = ContentType.objects.get_for_model(Restaurant)
            category_ct   = ContentType.objects.get_for_model(MenuCategory)
            item_ct        = ContentType.objects.get_for_model(MenuItem)
            order_ct       = ContentType.objects.get_for_model(Order)
            orderitem_ct   = ContentType.objects.get_for_model(OrderItem)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error fetching ContentTypes: {e}"))
            return

        try:
            permissions = [
                Permission.objects.get(codename='view_restaurant',   content_type=restaurant_ct),
                Permission.objects.get(codename='change_restaurant',  content_type=restaurant_ct),
                Permission.objects.get(codename='view_menucategory',  content_type=category_ct),
                Permission.objects.get(codename='change_menucategory',content_type=category_ct),
                Permission.objects.get(codename='add_menucategory',   content_type=category_ct),
                Permission.objects.get(codename='delete_menucategory',content_type=category_ct),
                Permission.objects.get(codename='view_menuitem',      content_type=item_ct),
                Permission.objects.get(codename='change_menuitem',    content_type=item_ct),
                Permission.objects.get(codename='add_menuitem',       content_type=item_ct),
                Permission.objects.get(codename='delete_menuitem',    content_type=item_ct),
                Permission.objects.get(codename='view_order',         content_type=order_ct),
                Permission.objects.get(codename='change_order',       content_type=order_ct),
                Permission.objects.get(codename='view_orderitem',     content_type=orderitem_ct),
            ]
        except Permission.DoesNotExist as e:
            self.stdout.write(self.style.ERROR(
                f"Required permission not found: {e}. Have migrations been run?"
            ))
            return

        # ── 2. Pre-hashed fallback passwords (restaurant-level accounts) ───
        #    These are only used for restaurant-level managers (no branches).
        #    Branch-level managers use auto-generated passwords set via set_password().
        HASHED_PASSWORDS = {
            'seenbanao':      'pbkdf2_sha256$1200000$bJ2RyRdMfKKDxg6R8Km3Wy$StWrxqqe6/zZ/2SPPENiP6JKzkfJ7MXljgdAHeiiIYg=',
            'dineatblue':     'pbkdf2_sha256$1200000$jwD8Ti6WP31mCIZY8toBYW$yO5ub2WRHRbNJMNNBKZ4OzyM6ydppk8ZfuU4KRYlpq8=',
            'jushhpk':        'pbkdf2_sha256$1200000$ip4tnzIuXVNGa7VYlhAo9C$Sf1K2ihNJtfyTn9euDYGqo0xC8JO8Y/+l2DiIX266MM=',
            'tandooristoppk': 'pbkdf2_sha256$1200000$4ilAxSVx1SwOSaI9YvJhGa$xKbCmZpHXL0vUqBKaK4liarc7OK+C3ANNL/ssKVeOac=',
            'sandmelts':      'pbkdf2_sha256$1200000$om7LOoSuZ0Ek1L3Pi1yrDB$XjxhYP0VCLTu6MOkq/qxrpv9Oo0sOg1UGTLcGRXmN/g=',
            'birdmanfoodspk': 'pbkdf2_sha256$1200000$cg6XBYZEZuxdB0DKmh9Yfh$lwqgJn+R/5tMQqUI+YZrM2GbHKlUggVwEsUSdgMKOtk=',
            'getafomo':       'pbkdf2_sha256$1200000$0cmjdwyJjy0KDs7YEzLgUC$UllA5bvxGEbYpjTNfQu0oRT9PWgZhU8raLgOFT0GsH8=',
        }

        # ── 3. Process each restaurant ─────────────────────────────────────
        restaurants = Restaurant.objects.prefetch_related('branches').all()
        if not restaurants.exists():
            self.stdout.write(self.style.WARNING(
                "No restaurants found. Run seed_restaurants first."
            ))
            return

        for rest in restaurants:
            # Shared group for this restaurant (all branch managers join it)
            group_name = f"manager_{rest.slug}"
            group, _ = Group.objects.get_or_create(name=group_name)
            group.permissions.set(permissions)

            branches = Branch.objects.filter(restaurant=rest, is_active=True)

            if branches.exists():
                # ── Branch-level managers ──────────────────────────────────
                for branch in branches:
                    branch_slug = branch.name.lower().replace(' ', '_')
                    username    = f"manager_{rest.slug}_{branch_slug}"
                    email       = f"manager.{rest.slug}.{branch_slug}@foodsphere.com"

                    user, created_user = User.objects.get_or_create(
                        username=username,
                        defaults={
                            'email':     email,
                            'is_staff':  True,
                            'is_active': True,
                        }
                    )

                    # Set a known default password on first creation only
                    if created_user:
                        default_password = f"Branch@{rest.slug[:6].capitalize()}2025!"
                        user.set_password(default_password)

                    user.is_staff  = True
                    user.is_active = True
                    user.save()
                    user.groups.add(group)

                    # Create or update ManagerProfile linking user -> branch
                    profile, created_profile = ManagerProfile.objects.update_or_create(
                        user=user,
                        defaults={
                            'restaurant':        rest,
                            'branch':            branch,
                            'notification_email': email,
                        }
                    )

                    self.stdout.write(self.style.SUCCESS(
                        f"  {'Created' if created_user else 'Updated'} branch manager "
                        f"'{username}' -> {rest.name} / {branch.name}"
                    ))

            else:
                # ── Restaurant-level fallback (no branches seeded yet) ─────
                username   = f"manager_{rest.slug}"
                email      = f"manager.{rest.slug}@foodsphere.com"
                hashed_pwd = HASHED_PASSWORDS.get(rest.slug, '')

                user, created_user = User.objects.get_or_create(
                    username=username,
                    defaults={
                        'email':     email,
                        'is_staff':  True,
                        'is_active': True,
                        'password':  hashed_pwd,
                    }
                )

                if created_user or not user.password or not user.password.startswith('pbkdf2_'):
                    user.password = hashed_pwd
                user.is_staff  = True
                user.is_active = True
                user.save()
                user.groups.add(group)

                self.stdout.write(self.style.SUCCESS(
                    f"  {'Created' if created_user else 'Updated'} restaurant-level manager "
                    f"'{username}' (no branches found for {rest.name})"
                ))

        self.stdout.write(self.style.SUCCESS("\ncreate_restaurant_managers completed successfully."))
