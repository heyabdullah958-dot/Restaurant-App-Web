from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from restaurants.models import Restaurant, RestaurantReview
from orders.models import Order

User = get_user_model()

REVIEW_TEMPLATES = {
    'jushhpk': [
        {'rating': 5, 'comment': 'Best burgers in town! The smash burger was juicy and full of flavor.'},
        {'rating': 5, 'comment': 'Super fast delivery and food arrived piping hot. Highly recommended!'},
        {'rating': 4, 'comment': 'Great crispy chicken burger and awesome fries. Will order again.'},
        {'rating': 5, 'comment': 'Amazing combo deals. Loved the loaded fries and dip sauce.'},
        {'rating': 4, 'comment': 'Good quality ingredients and nice packaging.'},
    ],
    'tandooristoppk': [
        {'rating': 5, 'comment': 'Authentic tandoori flavor! The garlic naan and chicken boti were outstanding.'},
        {'rating': 5, 'comment': 'Piping hot naan delivered right to my door. Great portion size.'},
        {'rating': 4, 'comment': 'Delicious tandoori boti and crisp roghni naan. Excellent service.'},
        {'rating': 5, 'comment': 'The best BBQ and naan counter in Lahore. Always fresh!'},
        {'rating': 4, 'comment': 'Very good taste and fast delivery timing.'},
    ],
    'getafomo': [
        {'rating': 5, 'comment': 'Trendy cafe vibe and delicious artisanal coffee! Loved the iced Spanish latte.'},
        {'rating': 5, 'comment': 'Awesome dessert menu! The cheesecake and croissants are divine.'},
        {'rating': 4, 'comment': 'Great aesthetics and delicious sandwiches. Perfect spot to order from.'},
        {'rating': 5, 'comment': 'Prompt delivery and beautiful packaging. Everything tasted fresh!'},
        {'rating': 4, 'comment': 'Solid café items, coffee was fresh and rich.'},
    ],
}

class Command(BaseCommand):
    help = 'Seed realistic ratings and reviews for active launch restaurants (jushhpk, tandooristoppk, getafomo)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force re-seeding of reviews even if reviews already exist',
        )

    def handle(self, *args, **options):
        force = options.get('force', False)
        
        target_slugs = ['jushhpk', 'tandooristoppk', 'getafomo']
        
        # Check if reviews already exist
        existing_count = RestaurantReview.objects.count()
        if existing_count > 0 and not force:
            self.stdout.write(self.style.WARNING(f"Database already contains {existing_count} reviews. Use --force to re-seed."))
            return

        if force and existing_count > 0:
            RestaurantReview.objects.all().delete()
            self.stdout.write("Cleared existing reviews due to --force flag.")

        # Create or fetch demo reviewers
        reviewers = []
        reviewer_names = [
            ('ali_raza', 'ali.raza@example.com', 'Ali Raza'),
            ('sara_khan', 'sara.khan@example.com', 'Sara Khan'),
            ('usman_ahmed', 'usman.ahmed@example.com', 'Usman Ahmed'),
            ('zainab_fatima', 'zainab.fatima@example.com', 'Zainab Fatima'),
            ('hamza_tariq', 'hamza_tariq@example.com', 'Hamza Tariq'),
        ]

        for username, email, full_name in reviewer_names:
            first_name, last_name = full_name.split(' ', 1)
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'first_name': first_name,
                    'last_name': last_name,
                }
            )
            reviewers.append(user)

        total_seeded = 0

        for slug in target_slugs:
            try:
                restaurant = Restaurant.objects.get(slug=slug)
            except Restaurant.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"Restaurant with slug '{slug}' not found. Skipping."))
                continue

            templates = REVIEW_TEMPLATES.get(slug, [])
            
            # Find delivered orders for this restaurant or create review records
            delivered_orders = Order.objects.filter(restaurant=restaurant, status='delivered')

            for idx, item in enumerate(templates):
                user = reviewers[idx % len(reviewers)]
                order_obj = delivered_orders[idx] if idx < len(delivered_orders) else None

                review, created = RestaurantReview.objects.get_or_create(
                    restaurant=restaurant,
                    user=user,
                    comment=item['comment'],
                    defaults={
                        'rating': item['rating'],
                        'order': order_obj,
                    }
                )
                if created:
                    total_seeded += 1

            # Recalculate restaurant rating
            restaurant.update_rating()
            self.stdout.write(self.style.SUCCESS(f"Updated rating for {restaurant.name}: {restaurant.rating} / 5.0 ({restaurant.total_reviews} reviews)"))

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {total_seeded} reviews across launch restaurants!"))
