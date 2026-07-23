from django.core.management.base import BaseCommand
from restaurants.models import Restaurant, Branch
import logging

class Command(BaseCommand):
    help = 'Seed initial branch data with comprehensive Lahore area keywords for Tandoori Stop, Jush, and GetAFomo'

    def handle(self, *args, **options):
        # Comprehensive area keyword maps for Lahore neighborhoods
        JOHAR_TOWN_KEYWORDS = [
            "johar town", "johar", "jt", "johar twn",
            "wafaqi colony", "wafaqi", "wafaqicolony", "wafaqi-colony",
            "faisal town", "township", "model town", "pia road", "hakim chowk",
            "khayaban-e-firdousi", "khayaban e firdousi", "khayaban-e-jinnah", "khayaban e jinnah",
            "g1", "g-1", "g2", "g-2", "g3", "g-3", "g4", "g-4",
            "h1", "h-1", "h2", "h-2", "h3", "h-3",
            "j1", "j-1", "j2", "j-2", "j3", "j-3",
            "r1", "r-1", "r2", "r-2", "f1", "f-1", "f2", "f-2", "e1", "e-1", "e2", "e-2",
            "doctors hospital", "emporium", "emporium mall", "uet", "umt", "central park",
            "wapda town", "valencia", "tarogill", "thokar", "thokar niaz baig", "canal bank", "canal road",
            "expo center", "shaukat khanum", "allama iqbal town", "iqbal town", "mustafa town",
            "pcsir", "tech society", "engineers town", "nisaar colony", "green town", "kot lakhpat"
        ]

        LAKE_CITY_KEYWORDS = [
            "lake city", "lake", "lc", "lake city mall", "khayaban-e-amin", "khayaban e amin",
            "bahria town", "bahria", "raiwind", "raiwind road", "addah plot", "adda plot",
            "safari garden", "chinar bagh", "halloki", "pine avenue"
        ]

        BAGHBANPURA_KEYWORDS = [
            "gt road", "baghbanpura", "gt", "bagbanpura", "shalimar", "shalimar garden", "shalimar gardens",
            "singhpura", "daroghawala", "mughalpura", "harbanspura", "manawan", "salamatpura",
            "bhatta chowk", "press club colony", "mehmood booti", "gari shahu", "garhi shahu"
        ]

        DHA_KEYWORDS = [
            "dha", "defence", "dha phase 1", "dha phase 2", "dha phase 3", "dha phase 4",
            "dha phase 5", "dha phase 6", "dha phase 7", "dha phase 8", "dha phase 9",
            "phase 1", "phase 2", "phase 3", "phase 4", "phase 5", "phase 6", "phase 7",
            "phase 8", "phase 9", "askari 10", "askari 11", "bedian road", "cavalry ground",
            "cavalry", "walton", "walton road"
        ]

        GULBERG_KEYWORDS = [
            "gulberg", "gulburg", "gulberg 1", "gulberg 2", "gulberg 3", "main boulevard",
            "mm alam", "mm alam road", "jail road", "liberty", "liberty market", "garden town",
            "shadman", "mozang"
        ]

        SADDAR_KEYWORDS = [
            "saddar", "sadder", "sadar", "cantt", "lahore cantt", "raza abad", "mian mir",
            "sarwar road", "mall road"
        ]

        seed_data = {
            'tandooristoppk': [
                {
                    'name': "Johar Town",
                    'address': "PIA Road, Hakim Chowk, Johar Town, Lahore",
                    'phone': "0327-4945947",
                    'area_keywords': JOHAR_TOWN_KEYWORDS
                },
                {
                    'name': "Lake City",
                    'address': "Opposite Lake City Mall, Raiwind Road, Lahore",
                    'phone': "",
                    'area_keywords': LAKE_CITY_KEYWORDS
                },
                {
                    'name': "GT Road Baghbanpura",
                    'address': "GT Road, Baghbanpura, Lahore",
                    'phone': "0326-6811177",
                    'area_keywords': BAGHBANPURA_KEYWORDS
                }
            ],
            'jushhpk': [
                {
                    'name': "Johar Town",
                    'address': "Johar Town, Lahore",
                    'phone': "",
                    'area_keywords': JOHAR_TOWN_KEYWORDS
                },
                {
                    'name': "DHA",
                    'address': "DHA Phase 3, Lahore",
                    'phone': "",
                    'area_keywords': DHA_KEYWORDS
                },
                {
                    'name': "Gulberg",
                    'address': "Gulberg III, Main Boulevard, Lahore",
                    'phone': "",
                    'area_keywords': GULBERG_KEYWORDS
                },
                {
                    'name': "Saddar",
                    'address': "Saddar Cantt, Lahore",
                    'phone': "",
                    'area_keywords': SADDAR_KEYWORDS
                }
            ],
            'getafomo': [
                {
                    'name': "Johar Town",
                    'address': "Johar Town, Lahore",
                    'phone': "",
                    'area_keywords': JOHAR_TOWN_KEYWORDS
                },
                {
                    'name': "DHA",
                    'address': "DHA Phase 5, Lahore",
                    'phone': "",
                    'area_keywords': DHA_KEYWORDS
                },
                {
                    'name': "Gulberg",
                    'address': "Gulberg II, MM Alam Road, Lahore",
                    'phone': "",
                    'area_keywords': GULBERG_KEYWORDS
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
                    branch.address = branch_data['address']
                    branch.phone = branch_data['phone']
                    branch.area_keywords = branch_data['area_keywords']
                    branch.save(update_fields=['address', 'phone', 'area_keywords'])
                    self.stdout.write(self.style.SUCCESS(f"Updated branch '{branch.name}' for restaurant '{restaurant.name}'"))

        self.stdout.write(self.style.SUCCESS("Seed branches completed successfully with expanded area keywords."))
