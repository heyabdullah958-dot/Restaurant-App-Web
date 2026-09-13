import os
import re
import unittest
from html.parser import HTMLParser

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TS_DIR = os.path.join(BASE_DIR, 'websites', 'tandooristoppk')
JUSHH_DIR = os.path.join(BASE_DIR, 'websites', 'jushhpk')

PAGES = ['index.html', 'menu.html', 'deals.html', 'about.html', 'locations.html']

TS_ITEMS = [
    "Traditional Chicken Sajji", "Peri Peri Chicken Sajji", "Tandoori Chicken (Cheese Naan Single)",
    "Tandoori Chicken (Cheese Naan Double)", "Tandoori Chicken (With Rice)", "Tandoori Chicken (Plain)",
    "Tawa Chicken", "Tawa Chicken Platter", "Chicken Karahi", "Chicken White Karahi", "Chicken Kabab Masala",
    "Nawabi Handi Boneless (2-Person)", "Shahi Kabab Masala Handi Boneless (2-Person)",
    "Mughlai Cheese Handi Boneless (2-Person)", "Reshmi Handi Boneless (2-Person)",
    "Sha Jahani Handi Boneless (2-Person)", "Malai Boti", "Tikka Boti", "Seekh Kabab", "Full Stop Roll",
    "Tandoori Chicken Roll", "Malai Boti Roll", "Chicken Paratha Roll", "Plain Naan", "Roghni Naan",
    "Butter Naan", "Cheese Naan", "Puri Paratha", "Plain Roti", "Rice", "Family Tandoori Platter",
    "Salad", "Raita", "Blueberry Mojito", "Strawberry Mojito", "Peach Mojito", "Apple Mojito",
    "Mint Margaritas", "Oreo Sundae", "Lotus Three Sundae", "Nutella Sundae"
]

JUSHH_ITEMS = [
    "Chicken Doner Fries", "Beef Doner Fries", "Plain Fries", "Chicken Grilled Sandwich",
    "Beef Grilled Sandwich", "Half Dubai Shawaya", "Full Dubai Shawaya", "Add-on Rice",
    "Chicken Turkish Wrap", "Beef Turkish Wrap", "Chicken Turkish Doner", "Beef Turkish Doner",
    "Chicken Pouch Shawarma", "Beef Pouch Shawarma", "Chicken Shawarma", "Beef Shawarma",
    "Charcoal Shawarma Chicken", "Chicken Shawarma Platter", "Chicken Shawarma Platter (with cheese)",
    "Lotus Can Dessert", "Red Velvet Can Dessert", "Nutella Can Dessert", "Cheese Add-on",
    "Dip Add-on", "Tortilla Bread", "Pita Bread", "Water", "Soft Drink", "Blueberry Mojito",
    "Strawberry Mojito", "Green Apple Mojito", "Peach Mojito", "Lemon Mojito"
]

class MobileNavParser(HTMLParser):
    def __init__(self, target_class):
        super().__init__()
        self.target_class = target_class
        self.in_target_div = False
        self.depth = 0
        self.items = []

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        classes = attr_dict.get('class', '').split()
        if tag == 'div' and self.target_class in classes:
            self.in_target_div = True
            self.depth = 1
            return

        if self.in_target_div:
            if tag == 'div':
                self.depth += 1
            if tag in ['a', 'button']:
                self.items.append((tag, attr_dict))

    def handle_endtag(self, tag):
        if self.in_target_div:
            if tag == 'div':
                self.depth -= 1
                if self.depth == 0:
                    self.in_target_div = False

class WebsiteUIAndMobileAudit(unittest.TestCase):

    def test_all_pages_exist(self):
        for page in PAGES:
            self.assertTrue(os.path.exists(os.path.join(TS_DIR, page)), f"Tandoori Stop missing {page}")
            self.assertTrue(os.path.exists(os.path.join(JUSHH_DIR, page)), f"Jushh PK missing {page}")

    def test_zero_unsplash_urls(self):
        for brand_dir in [TS_DIR, JUSHH_DIR]:
            for root, _, files in os.walk(brand_dir):
                for f in files:
                    if f.endswith(('.html', '.css', '.js')):
                        file_path = os.path.join(root, f)
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as fh:
                            content = fh.read()
                            self.assertNotIn('images.unsplash.com', content, f"Found unsplash URL in {file_path}")

    def test_zero_cross_brand_css_variable_bleed(self):
        # Tandoori stop should not use var(--jushh-...)
        for root, _, files in os.walk(TS_DIR):
            for f in files:
                if f.endswith(('.html', '.css')):
                    file_path = os.path.join(root, f)
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as fh:
                        content = fh.read()
                        matches = re.findall(r'var\(--jushh-[a-zA-Z0-9-]+\)', content)
                        self.assertEqual(len(matches), 0, f"Cross-brand leak in TS {file_path}: {matches}")

        # Jushh should not use var(--ts-...)
        for root, _, files in os.walk(JUSHH_DIR):
            for f in files:
                if f.endswith(('.html', '.css')):
                    file_path = os.path.join(root, f)
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as fh:
                        content = fh.read()
                        matches = re.findall(r'var\(--ts-[a-zA-Z0-9-]+\)', content)
                        self.assertEqual(len(matches), 0, f"Cross-brand leak in Jushh {file_path}: {matches}")

    def test_section_tag_balance(self):
        for brand_dir in [TS_DIR, JUSHH_DIR]:
            for page in PAGES:
                file_path = os.path.join(brand_dir, page)
                with open(file_path, 'r', encoding='utf-8') as fh:
                    content = fh.read()
                open_sections = len(re.findall(r'<section\b', content, re.IGNORECASE))
                close_sections = len(re.findall(r'</section>', content, re.IGNORECASE))
                self.assertEqual(open_sections, close_sections,
                                 f"Mismatched <section> tags in {file_path}: {open_sections} opens vs {close_sections} closes")

    def test_mobile_drawer_links_have_close_handler(self):
        for brand_dir, prefix in [(TS_DIR, 'ts'), (JUSHH_DIR, 'jushh')]:
            for page in PAGES:
                file_path = os.path.join(brand_dir, page)
                with open(file_path, 'r', encoding='utf-8') as fh:
                    content = fh.read()
                parser = MobileNavParser(f'{prefix}-mobile-nav')
                parser.feed(content)
                self.assertGreaterEqual(len(parser.items), 5, f"Mobile nav should have at least 5 links in {file_path}")
                for tag, attrs in parser.items:
                    onclick = attrs.get('onclick', '')
                    self.assertIn('closeMobileNav()', onclick,
                                  f"Interactive element <{tag}> in {file_path} mobile nav missing closeMobileNav(): {attrs}")

    def test_mobile_floating_button_no_collision(self):
        # Cart drawer float button should be at bottom: 76px on mobile
        for cd_path in [
            os.path.join(TS_DIR, 'cart_drawer.css'),
            os.path.join(JUSHH_DIR, 'cart_drawer.css'),
            os.path.join(BASE_DIR, 'websites', 'cart_drawer.css')
        ]:
            with open(cd_path, 'r', encoding='utf-8') as fh:
                content = fh.read()
            self.assertIn('bottom: 76px;', content, f"cd-float-btn should have bottom: 76px on mobile in {cd_path}")
            # Ensure no standalone bottom: 20px exists (avoid false positive on margin-bottom: 20px)
            collision_matches = re.findall(r'(?<![-a-zA-Z])bottom:\s*20px;', content)
            self.assertEqual(len(collision_matches), 0, f"cd-float-btn still has colliding bottom: 20px in {cd_path}")

    def test_branch_banner_and_selected_outlet_in_menu(self):
        # TS menu
        ts_menu_path = os.path.join(TS_DIR, 'menu.html')
        with open(ts_menu_path, 'r', encoding='utf-8') as fh:
            ts_content = fh.read()
        self.assertIn('id="ts-branch-banner"', ts_content)
        self.assertIn('id="ts-selected-branch-name"', ts_content)
        self.assertIn('foodsphere_selected_branch_tandooristoppk', ts_content)

        # Jushh menu
        jushh_menu_path = os.path.join(JUSHH_DIR, 'menu.html')
        with open(jushh_menu_path, 'r', encoding='utf-8') as fh:
            jushh_content = fh.read()
        self.assertIn('id="jushh-branch-banner"', jushh_content)
        self.assertIn('id="jushh-selected-branch-name"', jushh_content)
        self.assertIn('foodsphere_selected_branch_jushhpk', jushh_content)

    def test_cart_drawer_js_branch_hydration_and_export(self):
        for cd_js in [
            os.path.join(TS_DIR, 'cart_drawer.js'),
            os.path.join(JUSHH_DIR, 'cart_drawer.js'),
            os.path.join(BASE_DIR, 'websites', 'cart_drawer.js')
        ]:
            with open(cd_js, 'r', encoding='utf-8') as fh:
                content = fh.read()
            self.assertIn('foodsphere_selected_branch_', content, f"Missing branch hydration in {cd_js}")
            self.assertIn('setSelectedBranch', content, f"Missing setSelectedBranch in {cd_js}")
            self.assertIn('onchange="CartDrawer.setSelectedBranch(this.value)"', content, f"Missing onchange in {cd_js}")

    def test_css_mobile_responsiveness_rules(self):
        # Check theme_ts.css
        with open(os.path.join(TS_DIR, 'theme_ts.css'), 'r', encoding='utf-8') as fh:
            ts_css = fh.read()
        self.assertIn('.ts-hero-grid', ts_css)
        self.assertIn('.ts-about-grid', ts_css)
        self.assertIn('.ts-hero-img', ts_css)
        self.assertIn('.ts-form-row', ts_css)
        self.assertIn('overflow-y: auto;', ts_css)
        self.assertIn('-webkit-overflow-scrolling: touch;', ts_css)

        # Check theme_jushh.css
        with open(os.path.join(JUSHH_DIR, 'theme_jushh.css'), 'r', encoding='utf-8') as fh:
            jushh_css = fh.read()
        self.assertIn('.jushh-hero-grid', jushh_css)
        self.assertIn('.jushh-about-grid', jushh_css)
        self.assertIn('.jushh-hero-img', jushh_css)
        self.assertIn('.jushh-form-row', jushh_css)
        self.assertIn('overflow-y: auto;', jushh_css)
        self.assertIn('-webkit-overflow-scrolling: touch;', jushh_css)

    def test_item_counts_preserved(self):
        with open(os.path.join(TS_DIR, 'menu.html'), 'r', encoding='utf-8') as fh:
            ts_menu = fh.read()
        self.assertEqual(len(TS_ITEMS), 41)
        for item in TS_ITEMS:
            self.assertIn(item, ts_menu, f"Missing Tandoori Stop item: {item}")

        with open(os.path.join(JUSHH_DIR, 'menu.html'), 'r', encoding='utf-8') as fh:
            jushh_menu = fh.read()
        self.assertEqual(len(JUSHH_ITEMS), 33)
        for item in JUSHH_ITEMS:
            self.assertIn(item, jushh_menu, f"Missing Jushh PK item: {item}")

if __name__ == '__main__':
    unittest.main()
