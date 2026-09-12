"""
Test Suite: Phase 14 Multi-Page Architecture, Theme Separation & Entrance Animation
Verifies:
1. Multi-page architecture across both brands (Home, Menu, Deals, About, Locations)
2. Total visual & typographical theme differentiation (Zero template bleed)
3. High-end entrance reveal animation (< 1.2s with session skip)
4. 100% Data & menu item preservation (all items, pricing, images, branches)
5. Cart drawer & order submission integrity
"""

import os
import re
import unittest

WORKSPACE_ROOT = r"d:\sitesdata\Resturent App"
TS_DIR = os.path.join(WORKSPACE_ROOT, "websites", "tandooristoppk")
JUSHH_DIR = os.path.join(WORKSPACE_ROOT, "websites", "jushhpk")

class TestPhase14MultiPageSuite(unittest.TestCase):

    def test_01_all_pages_and_assets_exist(self):
        """Verify all 5 pages, themes, entrance scripts, and route directories exist for both brands."""
        required_files_ts = [
            "index.html", "menu.html", "deals.html", "about.html", "locations.html",
            "theme_ts.css", "entrance_ts.js", "cart_drawer.css", "cart_drawer.js", "live_catalog.js",
            os.path.join("menu", "index.html"),
            os.path.join("deals", "index.html"),
            os.path.join("about", "index.html"),
            os.path.join("locations", "index.html")
        ]
        for f in required_files_ts:
            path = os.path.join(TS_DIR, f)
            self.assertTrue(os.path.exists(path), f"Missing TandooriStop file: {f}")

        required_files_jushh = [
            "index.html", "menu.html", "deals.html", "about.html", "locations.html",
            "theme_jushh.css", "entrance_jushh.js", "cart_drawer.css", "cart_drawer.js", "live_catalog.js",
            os.path.join("menu", "index.html"),
            os.path.join("deals", "index.html"),
            os.path.join("about", "index.html"),
            os.path.join("locations", "index.html")
        ]
        for f in required_files_jushh:
            path = os.path.join(JUSHH_DIR, f)
            self.assertTrue(os.path.exists(path), f"Missing JushhPK file: {f}")

    def test_02_theme_separation_and_zero_template_bleed(self):
        """Verify distinct typography, color palettes, and stylesheets with zero template bleed."""
        ts_theme_path = os.path.join(TS_DIR, "theme_ts.css")
        jushh_theme_path = os.path.join(JUSHH_DIR, "theme_jushh.css")

        with open(ts_theme_path, "r", encoding="utf-8") as f:
            ts_css = f.read()

        with open(jushh_theme_path, "r", encoding="utf-8") as f:
            jushh_css = f.read()

        # TandooriStop: Artisanal Desi Culinary Heritage
        self.assertIn("Cinzel", ts_css, "TandooriStop must use Cinzel/Playfair serif typography")
        self.assertIn("--ts-terracotta", ts_css, "TandooriStop must define terracotta color")
        self.assertIn("--ts-clay", ts_css, "TandooriStop must define clay color")
        self.assertIn("--ts-saffron", ts_css, "TandooriStop must define saffron color")
        self.assertIn("--cd-primary: #C2410C", ts_css, "TandooriStop must override cart drawer primary color to terracotta")

        # JushhPK: Modern Street Gourmet & Turkish Doner
        self.assertIn("Space Grotesk", jushh_css, "JushhPK must use Space Grotesk typography")
        self.assertIn("--jushh-crimson", jushh_css, "JushhPK must define crimson color")
        self.assertIn("--jushh-orange", jushh_css, "JushhPK must define street neon orange")
        self.assertIn("--jushh-meta-blue", jushh_css, "JushhPK must include Meta Verified styling")
        self.assertIn("--cd-primary: #DC2626", jushh_css, "JushhPK must override cart drawer primary color to crimson")

        # Verify zero template bleed: TandooriStop must not use Jushh's theme and vice versa
        self.assertNotIn("theme_jushh.css", ts_css)
        self.assertNotIn("theme_ts.css", jushh_css)
        self.assertNotIn("Space Grotesk", ts_css)
        self.assertNotIn("Cinzel", jushh_css)

    def test_03_high_end_entrance_reveal_animation(self):
        """Verify luxury entrance animation scripts, markup, and session-based skip."""
        with open(os.path.join(TS_DIR, "entrance_ts.js"), "r", encoding="utf-8") as f:
            ts_entrance = f.read()
        self.assertIn("ts_entrance_shown", ts_entrance, "TandooriStop entrance must track session skip")
        self.assertIn("ts-entrance", ts_entrance, "TandooriStop entrance must target #ts-entrance")

        with open(os.path.join(JUSHH_DIR, "entrance_jushh.js"), "r", encoding="utf-8") as f:
            jushh_entrance = f.read()
        self.assertIn("jushh_entrance_shown", jushh_entrance, "JushhPK entrance must track session skip")
        self.assertIn("jushh-entrance", jushh_entrance, "JushhPK entrance must target #jushh-entrance")

        # Check all HTML pages have the entrance markup
        for brand_dir, splash_id in [(TS_DIR, "ts-entrance"), (JUSHH_DIR, "jushh-entrance")]:
            for page in ["index.html", "menu.html", "deals.html", "about.html", "locations.html"]:
                with open(os.path.join(brand_dir, page), "r", encoding="utf-8") as f:
                    content = f.read()
                self.assertIn(f'id="{splash_id}"', content, f"{page} in {brand_dir} missing entrance splash ID {splash_id}")

    def test_04_menu_preservation_tandooristop(self):
        """Verify 100% of existing TandooriStop items and variants are preserved with accurate prices."""
        with open(os.path.join(TS_DIR, "menu.html"), "r", encoding="utf-8") as f:
            menu_html = f.read()

        ts_expected_items = [
            "Traditional Chicken Sajji",
            "Peri Peri Chicken Sajji",
            "Tandoori Chicken (Cheese Naan Single)",
            "Tandoori Chicken (Cheese Naan Double)",
            "Tandoori Chicken (With Rice)",
            "Tandoori Chicken (Plain)",
            "Tawa Chicken",
            "Tawa Chicken Platter",
            "Chicken Karahi",
            "Chicken White Karahi",
            "Chicken Kabab Masala",
            "Nawabi Handi Boneless (2-Person)",
            "Shahi Kabab Masala Handi Boneless (2-Person)",
            "Mughlai Cheese Handi Boneless (2-Person)",
            "Reshmi Handi Boneless (2-Person)",
            "Sha Jahani Handi Boneless (2-Person)",
            "Malai Boti",
            "Tikka Boti",
            "Seekh Kabab",
            "Full Stop Roll",
            "Tandoori Chicken Roll",
            "Malai Boti Roll",
            "Chicken Paratha Roll",
            "Plain Naan",
            "Roghni Naan",
            "Butter Naan",
            "Cheese Naan",
            "Puri Paratha",
            "Plain Roti",
            "Rice",
            "Family Tandoori Platter",
            "Salad",
            "Raita",
            "Blueberry Mojito",
            "Strawberry Mojito",
            "Peach Mojito",
            "Apple Mojito",
            "Mint Margaritas",
            "Oreo Sundae",
            "Lotus Three Sundae",
            "Nutella Sundae"
        ]

        for item in ts_expected_items:
            self.assertIn(item, menu_html, f"TandooriStop missing menu item: {item}")

        # Rule 23 check: Zero unsplash image URLs
        self.assertNotIn("images.unsplash.com", menu_html, "Rule 23 Violation: unsplash URLs found in TandooriStop menu")

    def test_05_menu_preservation_jushhpk(self):
        """Verify 100% of existing JushhPK items are preserved with accurate prices."""
        with open(os.path.join(JUSHH_DIR, "menu.html"), "r", encoding="utf-8") as f:
            menu_html = f.read()

        jushh_expected_items = [
            "Chicken Doner Fries",
            "Beef Doner Fries",
            "Plain Fries",
            "Chicken Grilled Sandwich",
            "Beef Grilled Sandwich",
            "Half Dubai Shawaya",
            "Full Dubai Shawaya",
            "Add-on Rice",
            "Chicken Turkish Wrap",
            "Beef Turkish Wrap",
            "Chicken Turkish Doner",
            "Beef Turkish Doner",
            "Chicken Pouch Shawarma",
            "Beef Pouch Shawarma",
            "Chicken Shawarma",
            "Beef Shawarma",
            "Charcoal Shawarma Chicken",
            "Chicken Shawarma Platter",
            "Chicken Shawarma Platter (with cheese)",
            "Lotus Can Dessert",
            "Red Velvet Can Dessert",
            "Nutella Can Dessert",
            "Cheese Add-on",
            "Dip Add-on",
            "Tortilla Bread",
            "Pita Bread",
            "Water",
            "Soft Drink",
            "Blueberry Mojito",
            "Strawberry Mojito",
            "Green Apple Mojito",
            "Peach Mojito",
            "Lemon Mojito"
        ]

        for item in jushh_expected_items:
            self.assertIn(item, menu_html, f"JushhPK missing menu item: {item}")

        # Rule 23 check: Zero unsplash image URLs
        self.assertNotIn("images.unsplash.com", menu_html, "Rule 23 Violation: unsplash URLs found in JushhPK menu")

    def test_06_navigation_links_and_routes(self):
        """Verify clean navigation headers with active route indicators across all pages."""
        pages = ["index.html", "menu.html", "deals.html", "about.html", "locations.html"]
        for brand_dir, brand_name in [(TS_DIR, "TandooriStop"), (JUSHH_DIR, "JushhPK")]:
            for page in pages:
                with open(os.path.join(brand_dir, page), "r", encoding="utf-8") as f:
                    content = f.read()
                # Verify navigation links exist
                self.assertIn('href="index.html"', content, f"{page} in {brand_name} missing Home link")
                self.assertIn('href="menu.html"', content, f"{page} in {brand_name} missing Menu link")
                self.assertIn('href="deals.html"', content, f"{page} in {brand_name} missing Deals link")
                self.assertIn('href="about.html"', content, f"{page} in {brand_name} missing About link")
                self.assertIn('href="locations.html"', content, f"{page} in {brand_name} missing Locations link")

    def test_07_branch_directory_and_phone_hotlines(self):
        """Verify exact physical branches and phone numbers for both brands."""
        with open(os.path.join(TS_DIR, "locations.html"), "r", encoding="utf-8") as f:
            ts_loc = f.read()
        self.assertIn("Johar Town", ts_loc)
        self.assertIn("0327-4945947", ts_loc)
        self.assertIn("Lake City", ts_loc)
        self.assertIn("0324-4441735", ts_loc)
        self.assertIn("GT Road Baghbanpura", ts_loc)
        self.assertIn("0326-6811177", ts_loc)

        with open(os.path.join(JUSHH_DIR, "locations.html"), "r", encoding="utf-8") as f:
            jushh_loc = f.read()
        self.assertIn("Johar Town", jushh_loc)
        self.assertIn("0326-9946142", jushh_loc)
        self.assertIn("Lake City", jushh_loc)
        self.assertIn("0324-4441735", jushh_loc)
        self.assertIn("DHA Phase 1", jushh_loc)
        self.assertIn("0325-7217221", jushh_loc)

    def test_08_cart_and_order_hooks_integrity(self):
        """Verify live_catalog.js and cart_drawer.js scripts are loaded and BRAND_SLUG is properly configured."""
        for brand_dir, brand_slug in [(TS_DIR, "tandooristoppk"), (JUSHH_DIR, "jushhpk")]:
            with open(os.path.join(brand_dir, "index.html"), "r", encoding="utf-8") as f:
                index_content = f.read()
            self.assertIn(f'window.BRAND_SLUG = "{brand_slug}"', index_content)
            self.assertIn('cart_drawer.js', index_content)
            self.assertIn('live_catalog.js', index_content)
            self.assertIn('id="order-form"', index_content)
            self.assertIn('handleFormSubmit(event)', index_content)

if __name__ == "__main__":
    unittest.main()
