from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

class Command(BaseCommand):
    help = 'Delete guest users older than 30 days with no orders'
    
    def handle(self, *args, **kwargs):
        User = get_user_model()
        cutoff = timezone.now() - timedelta(days=30)
        stale_guests = User.objects.filter(
            is_guest=True,
            date_joined__lt=cutoff,
            orders__isnull=True  # No orders placed
        )
        count = stale_guests.count()
        stale_guests.delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {count} stale guest users."))
