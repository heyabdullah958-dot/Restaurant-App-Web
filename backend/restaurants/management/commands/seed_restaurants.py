import datetime
from django.core.management.base import BaseCommand
from django.utils.text import slugify
from restaurants.models import Restaurant, MenuCategory, MenuItem

class Command(BaseCommand):
    help = 'Seeds the database with the 7 restaurant brands and their menus'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force seed by clearing existing restaurants first',
        )

    def handle(self, *args, **options):
        self.stdout.write('Seeding restaurant data...')
        
        if options.get('force'):
            self.stdout.write('Force flag detected. Clearing existing restaurant data...')
            Restaurant.objects.all().delete()
        elif Restaurant.objects.exists():
            self.stdout.write(self.style.SUCCESS('Restaurant database already seeded. Skipping.'))
            return
        
        # Define the 7 brands and their data
        brands = [
            {
                "name": "SeenBanao",
                "cuisine_type": "Desi BBQ & Handi",
                "description": "Premium Desi BBQ, handi specialties, and traditional skewers cooked over live charcoal.",
                "address": "F-11 Markaz, Islamabad",
                "city": "Islamabad",
                "phone": "+923001234567",
                "opens_at": datetime.time(12, 0),
                "closes_at": datetime.time(23, 59),
                "delivery_time_min": 25,
                "delivery_time_max": 35,
                "min_order_amount": 500.00,
                "delivery_fee": 0.00,
                "rating": 4.7,
                "total_reviews": 200,
                "is_featured": True,
                "menu": {
                    "STARTER": [
                        {"name": "Fries", "price": 250.00, "desc": "Classic crispy golden french fries"},
                        {"name": "Bucket Fries", "price": 450.00, "desc": "Family portion of crispy golden fries"},
                        {"name": "BBQ Loaded Fries", "price": 750.00, "desc": "Fries loaded with cheese and BBQ chicken"},
                        {"name": "BBQ Grill Tenders (4pcs)", "price": 450.00, "desc": "Flame-grilled tender chicken strips"},
                        {"name": "Nablets (6pcs)", "price": 520.00, "desc": "Deep-fried breaded nuggets"},
                        {"name": "Butter Nablets (6pcs)", "price": 650.00, "desc": "Creamy butter-coated chicken nuggets"},
                        {"name": "Butter Kabab (4pcs)", "price": 999.00, "desc": "Rich butter-tossed seekh kababs"},
                        {"name": "Butter Malai Boti (5pcs)", "price": 650.00, "desc": "Butter-basted creamy malai botis"}
                    ],
                    "K ROLLS": [
                        {"name": "Brotien Kabab Roll Beef", "price": 650.00, "desc": "High protein beef kabab rolled in soft flatbread"}
                    ],
                    "P ROLLS": [
                        {"name": "Chicken Paratha Roll", "price": 450.00, "desc": "Classic chicken boti roll in paratha"},
                        {"name": "Malai Boti Paratha Roll", "price": 520.00, "desc": "Creamy malai boti roll in paratha"},
                        {"name": "Shish Taouk Paratha Roll", "price": 990.00, "desc": "Turkish style shish taouk in paratha"},
                        {"name": "Chicken Kabab Roll", "price": 400.00, "desc": "Chicken seekh kabab roll in paratha"},
                        {"name": "Adana Kabab Roll", "price": 990.00, "desc": "Spiced Turkish Adana kabab roll in paratha"}
                    ],
                    "P SLICES": [
                        {"name": "Chicken Slices", "price": 590.00, "desc": "Succulent chicken slices with special sauce"},
                        {"name": "Malai Boti Slices", "price": 690.00, "desc": "Creamy malai boti slices in signature bread"}
                    ],
                    "SEEN BOWLS": [
                        {"name": "Rice with Adana Kabab (1pc)", "price": 550.00, "desc": "Turkish rice bowl served with 1pc Adana kabab (Solo)"},
                        {"name": "Rice with Shish Taouk (2pcs)", "price": 600.00, "desc": "Turkish rice bowl served with 2pcs Shish Taouk (Solo)"},
                        {"name": "Rice with Adana Kabab (2pcs)", "price": 900.00, "desc": "Turkish rice bowl served with 2pcs Adana kabab (Combo)"},
                        {"name": "Rice with Shish Taouk (4pcs)", "price": 950.00, "desc": "Turkish rice bowl served with 4pcs Shish Taouk (Combo)"}
                    ],
                    "BBQ SPECIAL": [
                        {"name": "Kabab (4pcs)", "price": 650.00, "desc": "Flame-grilled chicken seekh kababs"},
                        {"name": "Tikka (5pcs)", "price": 490.00, "desc": "Classic fire-grilled chicken tikka pieces"},
                        {"name": "Malai Boti (5pcs)", "price": 550.00, "desc": "Creamy, melt-in-mouth chicken malai boti"},
                        {"name": "Shish Taouk (5pcs)", "price": 800.00, "desc": "Turkish style grilled chicken skewers"},
                        {"name": "Shish Taouk Abiad (5pcs)", "price": 900.00, "desc": "White spice marinade shish taouk"},
                        {"name": "Beef Adana Kabab (4pcs)", "price": 1050.00, "desc": "Authentic grilled Turkish beef Adana kababs"}
                    ],
                    "DRINKS": [
                        {"name": "Water", "price": 80.00, "desc": "Chilled mineral water"},
                        {"name": "Soft Drinks", "price": 120.00, "desc": "Coke, Sprite or Fanta"},
                        {"name": "Seen Special Flavor Drink", "price": 250.00, "desc": "SEEN signature refreshing beverage"}
                    ],
                    "ADD ONS": [
                        {"name": "Puri Paratha", "price": 150.00, "desc": "Flaky, deep-fried puri paratha"},
                        {"name": "Dips", "price": 80.00, "desc": "SEEN special garlic/mint dip"},
                        {"name": "Rice", "price": 200.00, "desc": "Extra portion of aromatic Turkish rice"},
                        {"name": "Cheese Slice", "price": 100.00, "desc": "Extra slice of cheddar cheese"}
                    ]
                }
            },
            {
                "name": "DineAtBlue",
                "cuisine_type": "Seafood Specialty",
                "description": "Premium fresh seafood grill, lobster, crab, and special fish platters.",
                "address": "DHA Phase 6, Karachi",
                "city": "Karachi",
                "phone": "+923007654321",
                "opens_at": datetime.time(16, 0),
                "closes_at": datetime.time(23, 30),
                "delivery_time_min": 30,
                "delivery_time_max": 40,
                "min_order_amount": 1000.00,
                "delivery_fee": 80.00,
                "rating": 4.8,
                "total_reviews": 120,
                "is_featured": False,
                "menu": {
                    "SPECIALS": [
                        {"name": "Mix Seafood Grill", "price": 2450.00, "desc": "Grilled fish, prawns, calamari served with garlic butter"},
                        {"name": "Fish & Chips", "price": 950.00, "desc": "Crispy battered fish fillet served with tartar sauce"}
                    ],
                    "DRINKS": [
                        {"name": "Blue Lagoon Mocktail", "price": 350.00, "desc": "Refreshing blue curacao drink"}
                    ]
                }
            },
            {
                "name": "JushhPK",
                "cuisine_type": "Turkish Doner & Shawarma",
                "description": "Authentic Turkish wraps, doner, shawarma specialties, and delicious desserts.",
                "logo": "menu_items/jushh_logo.jpg",
                "cover_image": "menu_items/jushh_banner_collage.jpg",
                "address": "G-11 Markaz, Islamabad",
                "city": "Islamabad",
                "phone": "+923112345678",
                "opens_at": datetime.time(11, 0),
                "closes_at": datetime.time(23, 0),
                "delivery_time_min": 20,
                "delivery_time_max": 30,
                "min_order_amount": 400.00,
                "delivery_fee": 50.00,
                "rating": 4.5,
                "total_reviews": 180,
                "is_featured": True,
                "menu": {
                    "APPETIZER": [
                        {"name": "Chicken Doner Fries", "price": 600.00, "desc": "Crispy fries topped with sliced chicken doner and sauces", "image": "menu_items/chicken_doner_fries.jpg"},
                        {"name": "Beef Doner Fries", "price": 750.00, "desc": "Crispy fries topped with sliced beef doner and signature sauces", "image": "menu_items/beef_doner_fries.jpg"}
                    ],
                    "TURKISH SPECIALS": [
                        {"name": "Chicken Grilled Sandwich", "price": 750.00, "desc": "Grilled chicken sandwich Turkish style", "image": "menu_items/chicken_grilled_sandwich.jpg"},
                        {"name": "Beef Grilled Sandwich", "price": 950.00, "desc": "Grilled beef sandwich Turkish style", "image": "menu_items/beef_grilled_sandwich.jpg"},
                        {"name": "Half Dubai Shawaya", "price": 1400.00, "desc": "Traditional roasted chicken shawaya half portion", "image": "menu_items/half_dubai_shawaya.jpg"},
                        {"name": "Full Dubai Shawaya", "price": 2500.00, "desc": "Traditional roasted chicken shawaya full portion", "image": "menu_items/full_dubai_shawaya.jpg"},
                        {"name": "Add-on Rice", "price": 300.00, "desc": "Spiced Arabic rice serving for Shawaya", "image": "menu_items/addon_rice.jpg"},
                        {"name": "Chicken Turkish Wrap", "price": 600.00, "desc": "Spiced chicken doner wrapped in soft flatbread", "image": "menu_items/chicken_turkish_wrap.jpg"},
                        {"name": "Beef Turkish Wrap", "price": 900.00, "desc": "Premium beef doner wrapped in soft flatbread", "image": "menu_items/beef_turkish_wrap.jpg"},
                        {"name": "Chicken Turkish Doner", "price": 850.00, "desc": "Traditional Turkish chicken doner in pita bread", "image": "menu_items/chicken_turkish_doner.jpg"},
                        {"name": "Beef Turkish Doner", "price": 1100.00, "desc": "Traditional Turkish beef doner in pita bread", "image": "menu_items/beef_turkish_doner.jpg"}
                    ],
                    "SHAWARMA": [
                        {"name": "Chicken Pouch Shawarma", "price": 450.00, "desc": "Pocket-style chicken shawarma pocket bread", "image": "menu_items/chicken_pouch_shawarma.jpg"},
                        {"name": "Beef Pouch Shawarma", "price": 700.00, "desc": "Pocket-style beef shawarma pocket bread", "image": "menu_items/beef_pouch_shawarma.jpg"},
                        {"name": "Chicken Shawarma", "price": 550.00, "desc": "Classic Lebanese chicken shawarma wrap", "image": "menu_items/chicken_turkish_wrap.jpg"},
                        {"name": "Beef Shawarma", "price": 750.00, "desc": "Classic Lebanese beef shawarma wrap", "image": "menu_items/beef_turkish_wrap.jpg"},
                        {"name": "Charcoal Shawarma Chicken", "price": 750.00, "desc": "Charcoal grilled chicken shawarma wrapped in flatbread", "image": "menu_items/charcoal_shawarma_chicken.jpg"},
                        {"name": "Chicken Shawarma Platter", "price": 900.00, "desc": "Deconstructed chicken shawarma served on a platter", "image": "menu_items/chicken_shawarma_platter.jpg"},
                        {"name": "Chicken Shawarma Platter (with cheese)", "price": 1000.00, "desc": "Deconstructed chicken shawarma topped with melted cheese", "image": "menu_items/chicken_shawarma_platter.jpg"}
                    ],
                    "DESSERTS": [
                        {"name": "Lotus Can Dessert", "price": 600.00, "desc": "Creamy Lotus Biscoff dessert served in a signature can"},
                        {"name": "Red Velvet Can Dessert", "price": 600.00, "desc": "Rich red velvet cake layered in a signature can"},
                        {"name": "Nutella Can Dessert", "price": 600.00, "desc": "Decadent Nutella chocolate dessert in a signature can"}
                    ],
                    "ADD ONS": [
                        {"name": "Cheese", "price": 90.00, "desc": "Extra melted cheese portion"},
                        {"name": "Dip", "price": 90.00, "desc": "Signature Jushh garlic or spicy dip", "image": "menu_items/garlic_dip.jpg"},
                        {"name": "Tortilla Bread", "price": 90.00, "desc": "Extra soft tortilla flatbread"},
                        {"name": "Pita Bread", "price": 60.00, "desc": "Extra Lebanese pita pocket bread", "image": "menu_items/pita_bread.jpg"},
                        {"name": "Plain Fries", "price": 150.00, "desc": "Golden salted french fries side"}
                    ],
                    "BEVERAGES": [
                        {"name": "Water", "price": 80.00, "desc": "Mineral water bottle", "image": "menu_items/water_bottle.jpg"},
                        {"name": "Soft Drink", "price": 150.00, "desc": "Chilled regular soft drink", "image": "menu_items/soft_drink.jpg"},
                        {"name": "Blueberry Mojito", "price": 290.00, "desc": "Refreshing blueberry mocktail", "image": "menu_items/blueberry_mojito.jpg"},
                        {"name": "Strawberry Mojito", "price": 290.00, "desc": "Refreshing strawberry mocktail", "image": "menu_items/strawberry_mojito.jpg"},
                        {"name": "Green Apple Mojito", "price": 290.00, "desc": "Refreshing green apple mocktail", "image": "menu_items/green_apple_mojito.jpg"},
                        {"name": "Peach Mojito", "price": 290.00, "desc": "Refreshing peach mocktail", "image": "menu_items/peach_mojito.jpg"},
                        {"name": "Lemon Mojito", "price": 290.00, "desc": "Refreshing lemon mint mocktail", "image": "menu_items/lemon_mojito.jpg"}
                    ]
                }
            },
            {
                "name": "TandooriStoppk",
                "cuisine_type": "Tandoori & Sajji",
                "description": "Tandoori items, slow-roasted sajji, handi, and naan counters.",
                "address": "Gulberg, Lahore",
                "city": "Lahore",
                "phone": "+923221234567",
                "opens_at": datetime.time(12, 0),
                "closes_at": datetime.time(23, 59),
                "delivery_time_min": 20,
                "delivery_time_max": 30,
                "min_order_amount": 500.00,
                "delivery_fee": 0.00,
                "rating": 4.6,
                "total_reviews": 90,
                "is_featured": False,
                "menu": {
                    "TANDOORI CHICKEN": [
                        {"name": "Tandoori Chicken Bone (Cheese Naan Single)", "price": 1150.00, "desc": "Tandoori chicken (with bone) served with 1 cheese naan"},
                        {"name": "Tandoori Chicken Boneless (Cheese Naan Single)", "price": 1350.00, "desc": "Boneless tandoori chicken served with 1 cheese naan"},
                        {"name": "Tandoori Chicken Bone (Cheese Naan Double)", "price": 1950.00, "desc": "Tandoori chicken (with bone) served with 2 cheese naans"},
                        {"name": "Tandoori Chicken Boneless (Cheese Naan Double)", "price": 2299.00, "desc": "Boneless tandoori chicken served with 2 cheese naans"},
                        {"name": "Tandoori Chicken Bone (With Rice)", "price": 980.00, "desc": "Tandoori chicken (with bone) served with aromatic rice"},
                        {"name": "Tandoori Chicken Boneless (With Rice)", "price": 780.00, "desc": "Boneless tandoori chicken served with aromatic rice"},
                        {"name": "Tandoori Chicken Bone (Plain)", "price": 750.00, "desc": "Traditional flame-grilled tandoori chicken (with bone)"},
                        {"name": "Tandoori Chicken Boneless (Plain)", "price": 899.00, "desc": "Traditional flame-grilled boneless tandoori chicken"}
                    ],
                    "CHICKEN SAJJI": [
                        {"name": "Quarter Sajji", "price": 799.00, "desc": "Slow-roasted quarter chicken sajji"},
                        {"name": "Half Sajji", "price": 1400.00, "desc": "Slow-roasted half chicken sajji"},
                        {"name": "Full Sajji", "price": 2500.00, "desc": "Slow-roasted full chicken sajji"},
                        {"name": "Peri Peri Quarter Sajji", "price": 900.00, "desc": "Spiced peri peri quarter chicken sajji"},
                        {"name": "Peri Peri Half Sajji", "price": 1600.00, "desc": "Spiced peri peri half chicken sajji"},
                        {"name": "Peri Peri Full Sajji", "price": 2900.00, "desc": "Spiced peri peri full chicken sajji"}
                    ],
                    "PARATHA ROLL": [
                        {"name": "Full Stop Roll", "price": 650.00, "desc": "TandooriStopp signature giant roll"},
                        {"name": "Tandoori Chicken Roll", "price": 520.00, "desc": "Tandoori chicken chunks wrapped in paratha"},
                        {"name": "Malai Boti Roll", "price": 550.00, "desc": "Creamy malai boti wrapped in paratha"},
                        {"name": "Chicken Paratha Roll", "price": 499.00, "desc": "Classic chicken paratha roll"}
                    ],
                    "TAWA CHICKEN": [
                        {"name": "Tawa Chicken", "price": 750.00, "desc": "Spicy stir-fried tawa chicken piece"},
                        {"name": "Tawa Chicken Platter with 2 Roti (Single Serving)", "price": 800.00, "desc": "Single serving of stir-fried tawa chicken platter"},
                        {"name": "Tawa Chicken Platter with 4 Roti (Double Serving)", "price": 1400.00, "desc": "Double serving of stir-fried tawa chicken platter"}
                    ],
                    "BBQ": [
                        {"name": "Malai Boti (Per Seekh)", "price": 450.00, "desc": "Single seekh of creamy grilled malai boti"},
                        {"name": "Malai Boti (Per KG)", "price": 2200.00, "desc": "One KG of creamy grilled malai boti"},
                        {"name": "Tikka Boti (Per Seekh)", "price": 400.00, "desc": "Single seekh of classic tikka boti"},
                        {"name": "Tikka Boti (Per KG)", "price": 1999.00, "desc": "One KG of classic tikka boti"},
                        {"name": "Seekh Kabab (Per Seekh)", "price": 250.00, "desc": "Single seekh of spiced chicken seekh kabab"},
                        {"name": "Seekh Kabab (Per KG)", "price": 1999.00, "desc": "One KG of spiced chicken seekh kabab"}
                    ],
                    "HANDI": [
                        {"name": "Nawabi Handi Boneless", "price": 2200.00, "desc": "Rich royal Nawabi handi boneless serving"},
                        {"name": "Shahi Kabab Masala Handi Boneless", "price": 1999.00, "desc": "Spiced shahi kabab masala handi boneless"},
                        {"name": "Mughlai Cheese Handi Boneless", "price": 1999.00, "desc": "Creamy Mughlai cheese handi boneless"},
                        {"name": "Reshmi Handi Boneless", "price": 1999.00, "desc": "Velvety reshmi handi boneless"},
                        {"name": "Sha Jahani Handi Boneless", "price": 1999.00, "desc": "Royal spice mix Sha Jahani handi boneless"}
                    ],
                    "KARAHI": [
                        {"name": "Chicken Karahi (Half)", "price": 1300.00, "desc": "Traditional wok chicken karahi half portion"},
                        {"name": "Chicken Karahi (Full)", "price": 2500.00, "desc": "Traditional wok chicken karahi full portion"},
                        {"name": "Chicken White Karahi (Half)", "price": 1500.00, "desc": "Creamy white chicken karahi half portion"},
                        {"name": "Chicken White Karahi (Full)", "price": 2700.00, "desc": "Creamy white chicken karahi full portion"},
                        {"name": "Chicken Kabab Masala (Half)", "price": 1350.00, "desc": "Chicken kabab masala half portion"},
                        {"name": "Chicken Kabab Masala (Full)", "price": 2600.00, "desc": "Chicken kabab masala full portion"}
                    ],
                    "FAMILY PLATTER": [
                        {"name": "Family Tandoori Platter", "price": 7000.00, "desc": "Half Sajji, 1 Handi, 4 Roti, 2 Malai Boti, 2 Tikka Boti, 4 Seekh Kabab, salad, raita, 6 mojitos"}
                    ],
                    "ADD ONS": [
                        {"name": "Roghni Naan", "price": 200.00, "desc": "Fluffy sesame roghni naan"},
                        {"name": "Butter Naan", "price": 350.00, "desc": "Buttery flatbread naan"},
                        {"name": "Cheese Naan", "price": 500.00, "desc": "Naan stuffed with melted cheese"},
                        {"name": "Rice", "price": 350.00, "desc": "Extra serving of aromatic rice"},
                        {"name": "Plain Roti", "price": 30.00, "desc": "Hot whole wheat roti"},
                        {"name": "Salad", "price": 350.00, "desc": "Fresh seasonal salad"},
                        {"name": "Raita", "price": 70.00, "desc": "Yogurt herb raita dip"},
                        {"name": "Puri Paratha", "price": 270.00, "desc": "Flaky deep-fried puri paratha"}
                    ],
                    "MOJITOS": [
                        {"name": "Blueberry Mojito", "price": 300.00, "desc": "Blueberry refreshing mocktail"},
                        {"name": "Strawberry Mojito", "price": 300.00, "desc": "Strawberry refreshing mocktail"},
                        {"name": "Peach Mojito", "price": 300.00, "desc": "Peach refreshing mocktail"},
                        {"name": "Apple Mojito", "price": 300.00, "desc": "Apple refreshing mocktail"}
                    ],
                    "SUNDAE": [
                        {"name": "Oreo Sundae", "price": 400.00, "desc": "Oreo cookies and vanilla ice cream sundae"},
                        {"name": "Lotus Three Sundae", "price": 400.00, "desc": "Lotus Biscoff crumbs and sauce sundae"},
                        {"name": "Nutella Sundae", "price": 400.00, "desc": "Nutella chocolate fudge sundae"}
                    ],
                    "DRINKS": [
                        {"name": "Water (Small)", "price": 80.00, "desc": "Chilled mineral water"},
                        {"name": "Soft Drink (300ml)", "price": 120.00, "desc": "Carbonated soft drink regular"},
                        {"name": "Soft Drink (Tin)", "price": 150.00, "desc": "Carbonated soft drink tin can"},
                        {"name": "Fresh Lime", "price": 350.00, "desc": "Zesty fresh lime soda"},
                        {"name": "Mint Margaritas", "price": 300.00, "desc": "Minty blended ice margarita"}
                    ]
                }
            },
            {
                "name": "SandMelts",
                "cuisine_type": "Sandwiches & Melts",
                "description": "Original American cheese steak sandwiches, melts & shakes.",
                "address": "DHA Phase 5, Lahore",
                "city": "Lahore",
                "phone": "+923331234567",
                "opens_at": datetime.time(11, 0),
                "closes_at": datetime.time(23, 0),
                "delivery_time_min": 15,
                "delivery_time_max": 25,
                "min_order_amount": 350.00,
                "delivery_fee": 0.00,
                "rating": 4.6,
                "total_reviews": 150,
                "is_featured": False,
                "menu": {
                    "STEAK SANDWICHES": [
                        {"name": "Chicken Black Pepper Sandwich", "price": 900.00, "desc": "Iceberg, black pepper, onions, mushrooms, Garlic Mayo, melted cheese"},
                        {"name": "Beef Black Pepper Sandwich", "price": 1300.00, "desc": "Iceberg, black pepper, onions, mushrooms, Garlic Mayo, melted cheese"},
                        {"name": "Chicken Fajita Cheese Steak", "price": 900.00, "desc": "Spicy Fajita Chicken, Capsicum, Onion, Tomato, Olives, Honey Mustard, melted Cheese"},
                        {"name": "Beef Fajita Cheese Steak", "price": 1300.00, "desc": "Spicy Fajita Beef, Capsicum, Onion, Tomato, Olives, Honey Mustard, melted Cheese"},
                        {"name": "Chicken Jalapeno Cheese Steak", "price": 900.00, "desc": "Iceberg, grilled onions, Green Pepper, jalapenos, creamy Jalapeno, melted cheese"},
                        {"name": "Beef Jalapeno Cheese Steak", "price": 1300.00, "desc": "Iceberg, grilled onions, Green Pepper, jalapenos, creamy Jalapeno, melted cheese"}
                    ],
                    "LOADED FRIES": [
                        {"name": "Saucy Fries", "price": 500.00, "desc": "All natural potatoes, homemade sauces, jalapenos and olives"},
                        {"name": "Chicken Steak Fries", "price": 600.00, "desc": "Diced chicken, jalapenos, bell peppers, olives, signature sauces"},
                        {"name": "Beef Steak Fries", "price": 750.00, "desc": "Beef steak chunks, olives, jalapenos, signature sauces"}
                    ],
                    "NEWYORK RICE": [
                        {"name": "Chicken Steak Rice", "price": 600.00, "desc": "Boneless chicken steak pcs with signature sauces & steamed rice"},
                        {"name": "Beef Steak Rice", "price": 750.00, "desc": "Boneless beef steak pcs with signature sauces & steamed rice"}
                    ],
                    "TORTILLA GRABS": [
                        {"name": "Chicken Grab", "price": 800.00, "desc": "Crispy fried chicken, Fries, Iceberg, homemade zesty sauces"},
                        {"name": "Beef Grab", "price": 1200.00, "desc": "Juicy beef steak chunks, fries, grilled capsicum, onion, Iceberg"}
                    ],
                    "BEVERAGES": [
                        {"name": "Water", "price": 100.00, "desc": "Chilled mineral water"},
                        {"name": "Can", "price": 150.00, "desc": "Soft drink can"},
                        {"name": "Coffee", "price": 350.00, "desc": "Brewed hot coffee"}
                    ],
                    "ADD ONS": [
                        {"name": "Garlic Sauce", "price": 100.00, "desc": "Premium garlic sauce dressing"},
                        {"name": "Jalapeno Sauce", "price": 100.00, "desc": "Creamy jalapeno dressing"},
                        {"name": "Honey Mustard Sauce", "price": 100.00, "desc": "Sweet honey mustard dressing"},
                        {"name": "Mint Sauce", "price": 100.00, "desc": "Cool mint dressing"},
                        {"name": "Chipotle Sauce", "price": 100.00, "desc": "Smoky chipotle dressing"},
                        {"name": "Green Atomic Sauce", "price": 100.00, "desc": "Spicy green atomic dressing"},
                        {"name": "Jalapeno", "price": 80.00, "desc": "Extra jalapeno slices portion"},
                        {"name": "Black Olives", "price": 80.00, "desc": "Extra black olives portion"}
                    ]
                }
            },
            {
                "name": "BirdmanFoodsPK",
                "cuisine_type": "Grilled & Fried Chicken",
                "description": "Crispy fried chicken, flame-grilled burgers, wings, and specialized catering.",
                "address": "Johar Town, Lahore",
                "city": "Lahore",
                "phone": "+923441234567",
                "opens_at": datetime.time(12, 0),
                "closes_at": datetime.time(23, 59),
                "delivery_time_min": 20,
                "delivery_time_max": 30,
                "min_order_amount": 400.00,
                "delivery_fee": 60.00,
                "rating": 4.4,
                "total_reviews": 82,
                "is_featured": False,
                "menu": {
                    "CHICKEN SPECIALS": [
                        {"name": "Crispy Fried Chicken (2pcs)", "price": 450.00, "desc": "Golden, crunchy, juice hand-breaded fried chicken"},
                        {"name": "Flame Grilled Burger", "price": 590.00, "desc": "Juicy grilled chicken breast with classic dressing"},
                        {"name": "Hot Wings (6pcs)", "price": 380.00, "desc": "Spicy buffalo wings served with ranch dip"}
                    ]
                }
            },
            {
                "name": "GetAFomo",
                "cuisine_type": "Trendy Cafe Items",
                "description": "Trendy cafe items, artisanal coffee, hot drinks, croissaints, and gourmet breakfast.",
                "address": "E-7, Islamabad",
                "city": "Islamabad",
                "phone": "+923551234567",
                "opens_at": datetime.time(8, 0),
                "closes_at": datetime.time(22, 0),
                "delivery_time_min": 15,
                "delivery_time_max": 25,
                "min_order_amount": 600.00,
                "delivery_fee": 70.00,
                "rating": 4.9,
                "total_reviews": 110,
                "is_featured": False,
                "menu": {
                    "ARTISANAL COFFEE": [
                        {"name": "Espresso Double", "price": 350.00, "desc": "Strong double shot of premium arabica coffee"},
                        {"name": "Spanish Latte Chilled", "price": 490.00, "desc": "Sweetened condensed milk mixed with bold espresso and ice"},
                        {"name": "Hazelnut Cappuccino", "price": 450.00, "desc": "Hot cappuccino infused with aromatic hazelnut syrup"}
                    ],
                    "BAKERY": [
                        {"name": "Butter Croissant", "price": 280.00, "desc": "Flaky French butter croissant freshly baked"},
                        {"name": "Chocolate Fudge Slice", "price": 450.00, "desc": "Decadent slice of chocolate fudge cake"}
                    ]
                }
            }
        ]
        
        restaurants_to_create = []
        menus_data = {}
        
        for brand_data in brands:
            menu = brand_data.pop("menu")
            name = brand_data["name"]
            slug = slugify(name)
            
            restaurant = Restaurant(
                slug=slug,
                **brand_data
            )
            restaurants_to_create.append(restaurant)
            menus_data[slug] = menu

        # Bulk create restaurants
        created_restaurants = Restaurant.objects.bulk_create(restaurants_to_create)
        restaurant_map = {r.slug: r for r in created_restaurants}
        self.stdout.write(f"Seeded {len(created_restaurants)} restaurants.")

        categories_to_create = []
        for slug, menu in menus_data.items():
            restaurant = restaurant_map[slug]
            cat_order = 1
            for cat_name in menu.keys():
                category = MenuCategory(
                    restaurant=restaurant,
                    name=cat_name,
                    order=cat_order,
                    is_active=True
                )
                categories_to_create.append(category)
                cat_order += 1

        # Bulk create categories
        created_categories = MenuCategory.objects.bulk_create(categories_to_create)
        category_map = {(c.restaurant_id, c.name): c for c in created_categories}
        self.stdout.write(f"Seeded {len(created_categories)} menu categories.")

        items_to_create = []
        for slug, menu in menus_data.items():
            restaurant = restaurant_map[slug]
            for cat_name, items in menu.items():
                category = category_map[(restaurant.id, cat_name)]
                for item_data in items:
                    item = MenuItem(
                        category=category,
                        name=item_data["name"],
                        price=item_data["price"],
                        description=item_data.get("desc", ""),
                        image=item_data.get("image", None),
                        is_available=True
                    )
                    items_to_create.append(item)

        # Bulk create menu items
        created_items = MenuItem.objects.bulk_create(items_to_create)
        self.stdout.write(f"Seeded {len(created_items)} menu items.")
        
        self.stdout.write(self.style.SUCCESS('Successfully seeded restaurant brands and menu items.'))
