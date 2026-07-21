from django.core.management.base import BaseCommand
from restaurants.models import Restaurant, Branch
import logging

class Command(BaseCommand):
    help = 'Seed initial branch data for Tandoori Stop, Jush, and GetAFomo'

    def handle(self, *args, **options):
        seed_data = {
            'tandooristoppk': [
                {
                    'name': "Johar Town",
                    'address': "PIA Road, Hakim Chowk",
                    'phone': "0327-4945947",
                    'area_keywords': ["johar town", "johar", "jt", "johar twn"]
                },
                {
                    'name': "Lake City",
                    'address': "Opposite Lake City Mall",
                    'phone': "",
                    'area_keywords': ["lake city", "lake", "lc"]
                },
                {
                    'name': "GT Road Baghbanpura",
                    'address': "GT Road, Baghbanpura",
                    'phone': "0326-6811177",
                    'area_keywords': ["gt road", "baghbanpura", "gt", "bagbanpura"]
                }
            ],
            'jushhpk': [
                {
                    'name': "Johar Town",
                    'address': "Johar Town, Lahore",
                    'phone': "",
                    'area_keywords': ["johar town", "johar", "jt", "johar twn"]
                },
                {
                    'name': "DHA",
                    'address': "DHA, Lahore",
                    'phone': "",
                    'area_keywords': ["dha", "defence"]
                },
                {
                    'name': "Gulberg",
                    'address': "Gulberg, Lahore",
                    'phone': "",
                    'area_keywords': ["gulberg", "gulburg"]
                },
                {
                    'name': "Saddar",
                    'address': "Saddar, Lahore",
                    'phone': "",
                    'area_keywords': ["saddar", "sadder", "sadar"]
                }
            ],
            'getafomo': [
                {
                    'name': "Johar Town",
                    'address': "Johar Town, Lahore",
                    'phone': "",
                    'area_keywords': ["johar town", "johar", "jt", "johar twn"]
                },
                {
                    'name': "DHA",
                    'address': "DHA, Lahore",
                    'phone': "",
                    'area_keywords': ["dha", "defence"]
                },
                {
                    'name': "Gulberg",
                    'address': "Gulberg, Lahore",
                    'phone': "",
                    'area_keywords': ["gulberg", "gulburg"]
                }
            ]
        }

        for slug, branches in seed_data.items():
            try:
                restaurant = Restaurant.objects.get(slug=slug)
            except Restaurant.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"Restaurant with slug '{slug}' does not exist. Skipping."))
                continue

            for branch_data in branches:
                branch, created = Branch.objects.get_or_create(
                    restaurant=restaurant,
                    name=branch_data['name'],
                    defaults={
                        'address': branch_data['address'],
                        'phone': branch_data['phone'],
                        'area_keywords': branch_data['area_keywords']
                    }
                )

                if created:
                    self.stdout.write(self.style.SUCCESS(f"Created branch '{branch.name}' for restaurant '{restaurant.name}'"))
                else:
                    # Update fields just in case they changed
                    branch.address = branch_data['address']
                    branch.phone = branch_data['phone']
                    branch.area_keywords = branch_data['area_keywords']
                    branch.save(update_fields=['address', 'phone', 'area_keywords'])
                    self.stdout.write(self.style.SUCCESS(f"Updated branch '{branch.name}' for restaurant '{restaurant.name}'"))

        self.stdout.write(self.style.SUCCESS("Seed branches completed."))
