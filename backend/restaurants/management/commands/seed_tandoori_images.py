from django.core.management.base import BaseCommand
from restaurants.models import Restaurant, MenuItem


class Command(BaseCommand):
    help = 'Seeds Tandoori Stop Cloudinary images for logo, cover, banner, and menu items'

    def handle(self, *args, **options):
        try:
            rest = Restaurant.objects.get(slug='tandooristoppk')
        except Restaurant.DoesNotExist:
            self.stdout.write(self.style.WARNING("Tandoori Stop restaurant not found."))
            return

        # 1. Logos & Banner Cloudinary URLs
        rest.logo = "restaurants/logos/tandoori_stop_logo_x5zwz7"
        rest.cover_image = "restaurants/covers/tandoori_stop_cover_jnfd2d"
        rest.banner_image = "restaurants/banners/tandoori_stop_banner_fwhufe"
        rest.save()
        self.stdout.write(self.style.SUCCESS("Updated Tandoori Stop logo, cover, and banner."))

        # 2. Menu Item Cloudinary Mappings
        cloudinary_map = {
            # Breads
            'Cheese Naan': 'menu_items/ts_1329_IMG_7581.JPG_p8inf5',
            'Roghni Naan': 'menu_items/ts_1327_IMG_7582.JPG_xohvv8',
            'Butter Naan': 'menu_items/ts_1328_IMG_7582.JPG_ds5jeq',
            'Plain Roti': 'menu_items/ts_1331_IMG_7582.JPG_f1ie9j',
            'Puri Paratha': 'menu_items/ts_1334_IMG_7580.JPG_cr8hod',
            'Rice': 'menu_items/ts_1330_IMG_7579.JPG_nsb0dw',

            # Combos & Tandoori Chicken
            'Tandoori Chicken Bone (Cheese Naan Single)': 'menu_items/ts_1288_IMG_7585.JPG_xhiffo',
            'Tandoori Chicken Boneless (Cheese Naan Single)': 'menu_items/ts_1289_IMG_7585.JPG_cxjp6v',
            'Tandoori Chicken Bone (Cheese Naan Double)': 'menu_items/ts_1290_IMG_7589.JPG_ylld2e',
            'Tandoori Chicken Boneless (Cheese Naan Double)': 'menu_items/ts_1291_IMG_7589.JPG_of3jsh',
            'Tandoori Chicken Bone (With Rice)': 'menu_items/ts_1292_IMG_7586.JPG_vjhc9h',
            'Tandoori Chicken Boneless (With Rice)': 'menu_items/ts_1293_IMG_7586.JPG_jazoj8',
            'Tandoori Chicken Bone (Plain)': 'menu_items/ts_1294_IMG_7590.JPG_ree9bg',
            'Tandoori Chicken Boneless (Plain)': 'menu_items/ts_1295_IMG_7590.JPG_edtoye',

            # BBQ
            'Seekh Kabab (Per Seekh)': 'menu_items/ts_1313_IMG_7578.JPG_cilvdf',
            'Tikka Boti (Per Seekh)': 'menu_items/ts_1311_IMG_7583.JPG_khkxj9',
            'Malai Boti (Per Seekh)': 'menu_items/ts_1309_IMG_7584.JPG_sxoyyb',

            # Sajji
            'Quarter Sajji': 'menu_items/ts_1296_IMG_7587.JPG_cbsi5z',
            'Half Sajji': 'menu_items/ts_1297_IMG_7587.JPG_s9a0wa',
            'Full Sajji': 'menu_items/ts_1298_IMG_7587.JPG_ozqr4i',
            'Peri Peri Quarter Sajji': 'menu_items/ts_1299_IMG_7587.JPG_ia9lxc',
            'Peri Peri Half Sajji': 'menu_items/ts_1300_IMG_7587.JPG_iyvbn9',
            'Peri Peri Full Sajji': 'menu_items/ts_1301_IMG_7587.JPG_irp4qj',

            # Rolls
            'Chicken Paratha Roll': 'menu_items/ts_1305_IMG_7588.JPG_h1xhsz',
            'Full Stop Roll': 'menu_items/ts_1302_IMG_7591.JPG_veizgo',
            'Tandoori Chicken Roll': 'menu_items/ts_1303_IMG_7591.JPG_kooigy',
            'Malai Boti Roll': 'menu_items/ts_1304_IMG_7592.JPG_fupdwk',

            # Drinks & Mojitos
            'Blueberry Mojito': 'menu_items/ts_1335_IMG_7576.JPG_ncny4r',
            'Strawberry Mojito': 'menu_items/ts_1336_IMG_7576.JPG_ihc3zw',
            'Peach Mojito': 'menu_items/ts_1337_IMG_7576.JPG_ssjsaq',
            'Apple Mojito': 'menu_items/ts_1338_IMG_7576.JPG_b0buvx',
            'Mint Margaritas': 'menu_items/ts_1346_IMG_7577.JPG_faehdg',
        }

        updated_items = 0
        for name_query, image_key in cloudinary_map.items():
            items = MenuItem.objects.filter(category__restaurant=rest, name__icontains=name_query)
            for item in items:
                item.image = image_key
                item.save()
                updated_items += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully attached Cloudinary images to {updated_items} menu items."))
