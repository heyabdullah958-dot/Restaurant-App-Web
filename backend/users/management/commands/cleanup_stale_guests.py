"""
Management command: cleanup_stale_guests
Removes guest users older than 30 days who have no associated orders.
Runs weekly via Render.com cron job.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Delete guest users older than 30 days with no orders'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=30,
            help='Delete guests older than this many days (default: 30)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without actually deleting'
        )

    def handle(self, *args, **options):
        days = options['days']
        dry_run = options['dry_run']
        
        cutoff_date = timezone.now() - timedelta(days=days)
        
        stale_guests = User.objects.filter(
            is_guest=True,
            date_joined__lt=cutoff_date,
            orders__isnull=True   # No orders placed
        ).distinct()
        
        count = stale_guests.count()
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would delete {count} stale guest users '
                    f'(older than {days} days with no orders)'
                )
            )
            return
        
        stale_guests.delete()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully deleted {count} stale guest users '
                f'(older than {days} days)'
            )
        )
