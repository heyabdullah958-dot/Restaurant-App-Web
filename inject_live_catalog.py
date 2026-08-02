import os
import shutil
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

WEBSITES_DIR = "websites"
BRAND_SLUGS = [
    "seenbanao",
    "dineatblue",
    "jushhpk",
    "tandooristoppk",
    "sandmelts",
    "birdmanfoodspk",
    "getafomo"
]

SOURCE_JS = os.path.join(WEBSITES_DIR, "live_catalog.js")

def inject_catalog():
    if not os.path.exists(SOURCE_JS):
        print(f"❌ Source live_catalog.js not found at {SOURCE_JS}")
        return

    print("🚀 Injecting Live Catalog Synchronization into 7 Brand Websites...")

    for slug in BRAND_SLUGS:
        brand_dir = os.path.join(WEBSITES_DIR, slug)
        html_path = os.path.join(brand_dir, "index.html")
        target_js = os.path.join(brand_dir, "live_catalog.js")

        if not os.path.exists(html_path):
            print(f"⚠️ {slug}: index.html missing at {html_path}")
            continue

        # Copy live_catalog.js into brand website directory
        shutil.copyfile(SOURCE_JS, target_js)
        print(f"📁 Copied live_catalog.js to {target_js}")

        with open(html_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Check if already injected
        script_tag = f'<script>window.BRAND_SLUG = "{slug}";</script>\n<script src="live_catalog.js?v=20260802_v3" defer></script>'
        if "window.BRAND_SLUG" not in content:
            # Inject before </body>
            if "</body>" in content:
                content = content.replace("</body>", f"{script_tag}\n</body>")
            else:
                content += f"\n{script_tag}"

            with open(html_path, "w", encoding="utf-8") as f:
                f.write(content)
            print(f"✅ {slug}: Injected BRAND_SLUG script into index.html")
        else:
            print(f"ℹ️ {slug}: Already has BRAND_SLUG script tag.")

    print("\n🎉 All 7 brand websites updated with live product catalog synchronization!")

if __name__ == "__main__":
    inject_catalog()
