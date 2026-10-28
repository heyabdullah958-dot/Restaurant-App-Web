import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Creates a superuser if it does not already exist'

    def handle(self, *args, **kwargs):
        User = get_user_model()
        username = os.environ.get('DJANGO_SUPERUSER_USERNAME', 'admin')
        password = os.environ.get('DJANGO_SUPERUSER_PASSWORD', 'admin123')
        email = os.environ.get('DJANGO_SUPERUSER_EMAIL', 'admin@foodsphere.com')

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'is_superuser': True,
                'is_staff': True,
                'is_active': True,
                'password': 'pbkdf2_sha256$1200000$P1wI1Uvu2CjLa6wiNfpL3v$VKBtoJMpWSJthLp7haZpqZdXLalt3iM6uYkb9mgjCMs='
            }
        )
        
        if not created:
            user.password = 'pbkdf2_sha256$1200000$P1wI1Uvu2CjLa6wiNfpL3v$VKBtoJMpWSJthLp7haZpqZdXLalt3iM6uYkb9mgjCMs='
            user.is_superuser = True
            user.is_staff = True
            user.is_active = True
            user.save()
            self.stdout.write(self.style.SUCCESS(f'Superuser "{username}" updated successfully.'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Superuser "{username}" created successfully.'))
