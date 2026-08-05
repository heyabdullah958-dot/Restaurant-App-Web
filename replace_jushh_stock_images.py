import os
import shutil

base_dir = r'websites\jushhpk\images'
logo_src = os.path.join(base_dir, 'jushh_logo.jpg')

targets = [
    'lotus_can_dessert.jpg',
    'red_velvet_can_dessert.jpg',
    'nutella_can_dessert.jpg',
    'cheese_addon.jpg'
]

if os.path.exists(logo_src):
    for t in targets:
        dst = os.path.join(base_dir, t)
        shutil.copyfile(logo_src, dst)
        print(f"[REPLACED] Overwrote {dst} with official jushh_logo.jpg")

# Update index.html menuData JSON entries for desserts
index_path = r'websites\jushhpk\index.html'
with open(index_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('"./images/lotus_can_dessert.jpg"', '"./images/jushh_logo.jpg"')
content = content.replace('"./images/red_velvet_can_dessert.jpg"', '"./images/jushh_logo.jpg"')
content = content.replace('"./images/nutella_can_dessert.jpg"', '"./images/jushh_logo.jpg"')
content = content.replace('"./images/cheese_addon.jpg"', '"./images/jushh_logo.jpg"')

with open(index_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("[UPDATED] websites/jushhpk/index.html menuData image paths updated to jushh_logo.jpg")
