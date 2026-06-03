import requests
import os
import re

live_urls = {
    "Admin Panel": "https://foodsphere-admin.pages.dev",
    "SeenBanao": "https://seenbanao-foodsphere.pages.dev",
    "DineAtBlue": "https://dineatblue-foodsphere.pages.dev",
    "JushhPK": "https://jushhpk-foodsphere.pages.dev",
    "TandooriStoppk": "https://tandooristoppk-foodsphere.pages.dev",
    "SandMelts": "https://sandmelts-foodsphere.pages.dev",
    "BirdmanFoodsPK": "https://birdmanfoodspk-foodsphere.pages.dev",
    "GetAFomo": "https://getafomo-foodsphere.pages.dev"
}

def test_ui_ux():
    print("--- [5] UI/UX & FRONTEND INTEGRITY SCAN ---")
    
    # 1. Check live URLs
    print("Checking availability of live frontends...")
    for name, url in live_urls.items():
        try:
            res = requests.get(url, timeout=10)
            print(f"  {name} ({url}): {res.status_code}")
            if res.status_code != 200:
                print(f"  WARNING: {name} returned status code {res.status_code}")
        except Exception as e:
            print(f"  ERROR: Could not connect to {name} ({url}): {e}")
            
    # 2. Scan local website directories for asset integrity
    print("\nScanning local static site HTML files for broken references...")
    websites_dir = "websites"
    if not os.path.exists(websites_dir):
        print(f"ERROR: {websites_dir} directory not found.")
        return
        
    brands = [d for d in os.listdir(websites_dir) if os.path.isdir(os.path.join(websites_dir, d))]
    
    for brand in brands:
        html_path = os.path.join(websites_dir, brand, "index.html")
        if not os.path.exists(html_path):
            continue
            
        print(f"\nAuditing {brand}/index.html:")
        with open(html_path, "r", encoding="utf-8") as f:
            html = f.read()
            
        # Find local stylesheet links
        css_refs = re.findall(r'href=["\']([^"\']+\.css)["\']', html)
        # Find local scripts
        js_refs = re.findall(r'src=["\']([^"\']+\.js)["\']', html)
        # Find image links (src attributes)
        img_refs = re.findall(r'src=["\']([^"\']+\.(?:png|jpg|jpeg|gif|svg|webp))["\']', html)
        
        # Filter out external/http references
        local_css = [c for c in css_refs if not c.startswith("http") and not c.startswith("//")]
        local_js = [j for j in js_refs if not j.startswith("http") and not j.startswith("//")]
        local_img = [i for i in img_refs if not i.startswith("http") and not i.startswith("//")]
        
        brand_dir = os.path.join(websites_dir, brand)
        
        # Verify CSS
        for css in local_css:
            path = os.path.join(brand_dir, css.split("?")[0])
            if not os.path.exists(path):
                print(f"  [ERROR] BROKEN STYLESHEET: {css} (Not found at {path})")
                
        # Verify JS
        for js in local_js:
            path = os.path.join(brand_dir, js.split("?")[0])
            if not os.path.exists(path):
                print(f"  [ERROR] BROKEN SCRIPT: {js} (Not found at {path})")
                
        # Verify Images
        broken_imgs = 0
        for img in local_img:
            path = os.path.join(brand_dir, img.split("?")[0])
            if not os.path.exists(path):
                print(f"  [ERROR] BROKEN IMAGE: {img} (Not found at {path})")
                broken_imgs += 1
                
        if broken_imgs == 0:
            print("  [SUCCESS] All local image assets exist on disk.")
            
if __name__ == "__main__":
    test_ui_ux()
