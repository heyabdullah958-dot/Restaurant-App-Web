from django.core.management.base import BaseCommand
from restaurants.models import Restaurant, Branch, MenuCategory, MenuItem, BranchMenuItemAvailability
import datetime

class Command(BaseCommand):
    help = 'Ensures strictly 4 brands (Jushh PK, Get A Fomo, Tandoori Stop, Blue) are active with valid covers, logos, branches, and full menus. Keeps other 3 brands hidden.'

    def handle(self, *args, **options):
        self.stdout.write("Synchronizing strictly 4 active brands...")

        # 1. Update brand metadata & active flags
        # BLUE
        blue = Restaurant.objects.filter(slug='dineatblue').first()
        if blue:
            blue.name = 'Blue'
            blue.is_active = True
            blue.is_force_closed = False
            blue.opens_at = datetime.time(0, 0)
            blue.closes_at = datetime.time(23, 59, 59)
            blue.cover_image = 'https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315657/foodsphere/dineatblue/blue_seafood_platter.png'
            blue.banner_image = 'https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315657/foodsphere/dineatblue/blue_seafood_platter.png'
            blue.logo = 'https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315655/foodsphere/dineatblue/logo.png'
            blue.save()
            self.stdout.write(self.style.SUCCESS(f"Updated Blue (ID: {blue.id}) to active with Cloudinary cover and logo."))

            # Ensure Gulberg branch
            branch, created = Branch.objects.get_or_create(
                restaurant=blue,
                name="Gulberg III Main Outlet",
                defaults={
                    'address': "94-B/2, MM Alam Road, Gulberg III, Lahore",
                    'phone': "0321-8484111",
                    'latitude': 31.5135,
                    'longitude': 74.3512,
                    'is_active': True,
                    'area_keywords': ["gulberg", "mm alam", "dha", "johar town", "lahore"]
                }
            )
            branch.is_active = True
            branch.latitude = 31.5135
            branch.longitude = 74.3512
            branch.address = "94-B/2, MM Alam Road, Gulberg III, Lahore"
            branch.phone = "0321-8484111"
            branch.save()

        # GET A FOMO
        fomo = Restaurant.objects.filter(slug='getafomo').first()
        if fomo:
            fomo.name = 'Get A Fomo'
            fomo.is_active = True
            fomo.is_force_closed = False
            fomo.opens_at = datetime.time(0, 0)
            fomo.closes_at = datetime.time(23, 59, 59)
            fomo.cover_image = 'https://res.cloudinary.com/depa8gfnk/image/upload/v1793266684/foodsphere/getafomo/cover.png'
            fomo.banner_image = 'https://res.cloudinary.com/depa8gfnk/image/upload/v1793266684/foodsphere/getafomo/cover.png'
            fomo.logo = 'https://res.cloudinary.com/depa8gfnk/image/upload/v1793266715/foodsphere/getafomo/logo.png'
            fomo.save()
            self.stdout.write(self.style.SUCCESS(f"Updated Get A Fomo (ID: {fomo.id}) to active with Cloudinary cover and logo."))

            branch, _ = Branch.objects.get_or_create(
                restaurant=fomo,
                name="Gulberg III",
                defaults={
                    'address': "65, Block D1 Gulberg III, Lahore, Pakistan",
                    'phone': "03212784841",
                    'latitude': 31.5100,
                    'longitude': 74.3500,
                    'is_active': True,
                    'area_keywords': ["gulberg", "lahore"]
                }
            )
            branch.is_active = True
            branch.save()

        # JUSHH PK
        jushh = Restaurant.objects.filter(slug='jushhpk').first()
        if jushh:
            jushh.name = 'Jushh PK'
            jushh.is_active = True
            jushh.save()
            self.stdout.write(self.style.SUCCESS("Updated Jushh PK name."))

        # TANDOORI STOP
        tandoori = Restaurant.objects.filter(slug='tandooristoppk').first()
        if tandoori:
            tandoori.name = 'Tandoori Stop'
            tandoori.is_active = True
            tandoori.save()
            self.stdout.write(self.style.SUCCESS("Updated Tandoori Stop name."))

        # STRICT INVARIANT: ONLY EXACTLY 4 BRANDS ARE ACTIVE, ALL OTHERS ARE INACTIVE
        allowed_active_slugs = ['dineatblue', 'jushhpk', 'tandooristoppk', 'getafomo']
        hidden_count = Restaurant.objects.exclude(slug__in=allowed_active_slugs).update(is_active=False)
        self.stdout.write(self.style.SUCCESS(f"Strictly hid all non-launch brands ({hidden_count} brands deactivated)."))

        # Seed full menu for Blue if missing items
        if blue and MenuItem.objects.filter(category__restaurant=blue).count() < 10:
            self.stdout.write("Seeding full Dine At Blue catalog...")
            from restaurants.management.commands.seed_restaurants import Command as SeedCommand
            # Populate Blue's categories and items
            blue_menu = {
                "SIGNATURE PLATTERS": [
                    {"name": "Blue Seafood Platter (Steamed)", "price": 4200.00, "desc": "Steamed lobster, prawns, fish fillet, mussels & grilled corn with garlic butter"},
                    {"name": "2 Person Platter", "price": 3500.00, "desc": "Grilled king prawns, calamari, battered fish fillet and herb rice"},
                    {"name": "Without Lobster", "price": 2800.00, "desc": "Pan-seared fish fillet, crispy butterfly prawns & dynamite dip"},
                    {"name": "With Lobster", "price": 4800.00, "desc": "Whole premium butterflied lobster with sautéed vegetables & herb rice"},
                    {"name": "2 Person Seafood & Chicken Platter", "price": 3600.00, "desc": "Combination of grilled prawns, chicken tenders, and herb rice"}
                ],
                "APPETIZERS": [
                    {"name": "Kunafa Prawns (3 pcs)", "price": 1450.00, "desc": "Crispy shredded pastry wrapped jumbo prawns with sweet chili dip"},
                    {"name": "Dynamite Prawns", "price": 1350.00, "desc": "Crispy battered prawns tossed in signature spicy dynamite sauce"},
                    {"name": "Seared Dumplings (6 pcs)", "price": 890.00, "desc": "Pan-seared chicken dumplings with soy sesame reduction"},
                    {"name": "Chicken Dumplings (6 pcs)", "price": 850.00, "desc": "Steamed dumplings stuffed with seasoned minced chicken"},
                    {"name": "Dynamite Chicken", "price": 990.00, "desc": "Crispy chicken bites coated in zesty dynamite mayo"},
                    {"name": "Honey Wings (6 pcs)", "price": 850.00, "desc": "Crispy wings glazed in sweet and sticky spicy honey sauce"},
                    {"name": "Fish & Chips", "price": 1250.00, "desc": "Crispy golden fried fish fillet served with tartar sauce and fries"}
                ],
                "SOUPS & SALADS": [
                    {"name": "19B Soup", "price": 650.00, "desc": "Signature rich dark soup with prawns, chicken and mushrooms"},
                    {"name": "Chicken Corn Soup", "price": 550.00, "desc": "Classic thick broth with sweet corn kernels and pulled chicken"},
                    {"name": "BBQ Prawn Salad", "price": 950.00, "desc": "Grilled prawns tossed with fresh greens, citrus vinaigrette & herbs"}
                ],
                "MAIN SEAFOOD": [
                    {"name": "Romesco Fish", "price": 1750.00, "desc": "Grilled fish fillet served on a rich almond & red pepper romesco sauce"},
                    {"name": "Umami Fish", "price": 1650.00, "desc": "Pan-seared fish glazed in savory sweet umami reduction"},
                    {"name": "Pamphlet Fish", "price": 2100.00, "desc": "Whole fried pomfret spiced with traditional coastal herbs"},
                    {"name": "Fish Chilli Dry", "price": 1450.00, "desc": "Wok-tossed fish cubes with green chilies, onions and capsicum"},
                    {"name": "Vietnamese Fish", "price": 1650.00, "desc": "Seared fish fillet with lemongrass, garlic and Vietnamese herbs"},
                    {"name": "Thermidor Lobster", "price": 4900.00, "desc": "Rich oven-baked lobster with creamy cheese mushroom sauce"},
                    {"name": "Grilled Lobster", "price": 4600.00, "desc": "Fresh whole lobster basted with lemon garlic herb butter"},
                    {"name": "BBQ Prawns", "price": 1950.00, "desc": "Charcoal grilled jumbo prawns served with spicy garlic dip"},
                    {"name": "Prawn Pasta", "price": 1550.00, "desc": "Fettuccine pasta tossed with juicy prawns in creamy parmesan sauce"},
                    {"name": "Steamed Crab", "price": 2400.00, "desc": "Fresh steamed sea crab served with melted butter and lemon"},
                    {"name": "Mud Crab", "price": 2600.00, "desc": "Spicy coastal wok-tossed mud crab in chili garlic sauce"},
                    {"name": "Grilled Fish", "price": 1550.00, "desc": "Tender grilled sole fish fillet served with butter garlic sauce"}
                ],
                "CHICKEN & MAINS": [
                    {"name": "Chilli Mint Chicken", "price": 1250.00, "desc": "Grilled chicken breast fillets topped with zesty mint chili glaze"},
                    {"name": "Cashew Nut Chicken", "price": 1350.00, "desc": "Stir-fried chicken tossed with roasted cashews and vegetables"},
                    {"name": "Korean Fried Chicken", "price": 1250.00, "desc": "Double fried crispy chicken tossed in sweet spicy gochujang glaze"},
                    {"name": "Chicken Chilli Dry", "price": 1150.00, "desc": "Wok-fried chicken slices with crisp green chilies and onions"},
                    {"name": "Sweet & Sour Chicken", "price": 1200.00, "desc": "Crispy chicken tossed with pineapple, capsicum in tangy glaze"},
                    {"name": "House Special Chicken", "price": 1390.00, "desc": "Chef's signature chicken with sauteed mushrooms & herb rice"}
                ],
                "BEVERAGES & SIDES": [
                    {"name": "Strawberry Mojito", "price": 450.00, "desc": "Refreshing muddled fresh mint, lime, and crushed strawberries"},
                    {"name": "Blueberry Mojito", "price": 450.00, "desc": "Wild blueberry puree with mint, lime and sparkling soda"},
                    {"name": "Peach Mojito", "price": 450.00, "desc": "Sweet juicy peach nectar with fresh mint and citrus"},
                    {"name": "Green Apple Mojito", "price": 450.00, "desc": "Crisp tart green apple with lime, soda, and fresh garden mint"},
                    {"name": "Fresh Lemonade", "price": 350.00, "desc": "Chilled freshly squeezed lemon juice with mint essence"},
                    {"name": "Pepsi / 7Up (Tin)", "price": 180.00, "desc": "Chilled beverage tin"},
                    {"name": "Mineral Water (Small)", "price": 90.00, "desc": "Pure bottled mineral water"},
                    {"name": "Butter Mushroom Rice", "price": 450.00, "desc": "Fragrant rice sauteed with button mushrooms and butter"},
                    {"name": "Steak Fries", "price": 380.00, "desc": "Thick-cut seasoned potato fries"}
                ]
            }

            blue_images = {
                "Blue Seafood Platter (Steamed)": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315657/foodsphere/dineatblue/blue_seafood_platter.png",
                "2 Person Platter": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315658/foodsphere/dineatblue/chicken_platter_2person.png",
                "Without Lobster": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315658/foodsphere/dineatblue/chicken_platter_2person.png",
                "With Lobster": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315657/foodsphere/dineatblue/blue_seafood_platter.png",
                "2 Person Seafood & Chicken Platter": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315658/foodsphere/dineatblue/chicken_platter_2person.png",
                "Kunafa Prawns (3 pcs)": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315659/foodsphere/dineatblue/kunafa_prawns.png",
                "Dynamite Prawns": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315660/foodsphere/dineatblue/dynamite_prawns.png",
                "Seared Dumplings (6 pcs)": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315660/foodsphere/dineatblue/seared_dumplings.png",
                "Chicken Dumplings (6 pcs)": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315661/foodsphere/dineatblue/chicken_dumplings.png",
                "Dynamite Chicken": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315660/foodsphere/dineatblue/dynamite_prawns.png",
                "Honey Wings (6 pcs)": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315662/foodsphere/dineatblue/honey_wings.png",
                "Fish & Chips": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315663/foodsphere/dineatblue/fish_and_chips.png",
                "19B Soup": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315665/foodsphere/dineatblue/soup_19b.png",
                "Chicken Corn Soup": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315664/foodsphere/dineatblue/chicken_corn_soup.png",
                "BBQ Prawn Salad": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315666/foodsphere/dineatblue/bbq_prawn_salad.png",
                "Romesco Fish": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315663/foodsphere/dineatblue/fish_and_chips.png",
                "Umami Fish": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315663/foodsphere/dineatblue/fish_and_chips.png",
                "Pamphlet Fish": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315663/foodsphere/dineatblue/fish_and_chips.png",
                "Fish Chilli Dry": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315663/foodsphere/dineatblue/fish_and_chips.png",
                "Vietnamese Fish": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315663/foodsphere/dineatblue/fish_and_chips.png",
                "Thermidor Lobster": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315657/foodsphere/dineatblue/blue_seafood_platter.png",
                "Grilled Lobster": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315657/foodsphere/dineatblue/blue_seafood_platter.png",
                "BBQ Prawns": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315666/foodsphere/dineatblue/bbq_prawn_salad.png",
                "Prawn Pasta": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315659/foodsphere/dineatblue/kunafa_prawns.png",
                "Steamed Crab": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315657/foodsphere/dineatblue/blue_seafood_platter.png",
                "Mud Crab": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315657/foodsphere/dineatblue/blue_seafood_platter.png",
                "Grilled Fish": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315663/foodsphere/dineatblue/fish_and_chips.png",
                "Chilli Mint Chicken": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315658/foodsphere/dineatblue/chicken_platter_2person.png",
                "Cashew Nut Chicken": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315658/foodsphere/dineatblue/chicken_platter_2person.png",
                "Korean Fried Chicken": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315662/foodsphere/dineatblue/honey_wings.png",
                "Chicken Chilli Dry": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315658/foodsphere/dineatblue/chicken_platter_2person.png",
                "Sweet & Sour Chicken": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315658/foodsphere/dineatblue/chicken_platter_2person.png",
                "House Special Chicken": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315658/foodsphere/dineatblue/chicken_platter_2person.png",
                "Strawberry Mojito": "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/strawberry_mojito.jpg",
                "Blueberry Mojito": "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/blueberry_mojito.jpg",
                "Peach Mojito": "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/peach_mojito.jpg",
                "Green Apple Mojito": "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/green_apple_mojito.jpg",
                "Fresh Lemonade": "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/lemon_mojito.jpg",
                "Pepsi / 7Up (Tin)": "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/soft_drink.jpg",
                "Mineral Water (Small)": "https://res.cloudinary.com/depa8gfnk/image/upload/v1/menu_items/water_bottle.jpg",
                "Butter Mushroom Rice": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315682/foodsphere/tandooristop/rice.jpg",
                "Steak Fries": "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315689/foodsphere/jushhpk/chicken_doner_fries.jpg",
            }

            cat_order = 1
            for cat_name, items in blue_menu.items():
                cat, _ = MenuCategory.objects.get_or_create(
                    restaurant=blue,
                    name=cat_name,
                    defaults={'order': cat_order, 'is_active': True}
                )
                cat.is_active = True
                cat.save()
                cat_order += 1

                for item_data in items:
                    img_url = blue_images.get(item_data["name"], "https://res.cloudinary.com/depa8gfnk/image/upload/f_auto,q_auto,w_800/v1792315655/foodsphere/dineatblue/logo.png")
                    it, _ = MenuItem.objects.get_or_create(
                        category=cat,
                        name=item_data["name"],
                        defaults={
                            'price': item_data["price"],
                            'description': item_data.get("desc", ""),
                            'image': img_url,
                            'is_available': True
                        }
                    )
                    it.price = item_data["price"]
                    it.description = item_data.get("desc", "")
                    it.image = img_url
                    it.is_available = True
                    it.save()

            self.stdout.write(self.style.SUCCESS(f"Seeded Blue menu: {MenuItem.objects.filter(category__restaurant=blue).count()} items."))

        # Print final verification
        active_restaurants = Restaurant.objects.filter(is_active=True)
        self.stdout.write(self.style.SUCCESS(f"Active Brands Count: {active_restaurants.count()}"))
        for r in active_restaurants:
            self.stdout.write(f" - {r.name} ({r.slug}): {r.branches.count()} branches, {MenuItem.objects.filter(category__restaurant=r).count()} items")
