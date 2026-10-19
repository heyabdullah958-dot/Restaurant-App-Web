from playwright.sync_api import sync_playwright
from PIL import Image

with sync_playwright() as p:
    browser = p.chromium.launch()
    
    # 1. Mobile 360x780
    page = browser.new_page(viewport={'width': 360, 'height': 780})
    page.add_init_script("localStorage.setItem('ts_mode_confirmed', 'true'); localStorage.setItem('blue_mode_confirmed', 'true'); localStorage.setItem('jushh_mode_confirmed', 'true');")
    
    for brand, path in [('ts', 'tandooristoppk'), ('blue', 'dineatblue'), ('jushh', 'jushhpk')]:
        page.goto(f'http://127.0.0.1:8092/websites/{path}/index.html')
        page.wait_for_timeout(300)
        page.screenshot(path=f'websites/clean_{brand}_mobile.png')
        # Crop header
        im = Image.open(f'websites/clean_{brand}_mobile.png')
        im.crop((0, 0, 360, 75)).save(f'websites/clean_{brand}_mobile_header.png')
    
    # 2. PC 1280x800
    pc_page = browser.new_page(viewport={'width': 1280, 'height': 800})
    pc_page.add_init_script("localStorage.setItem('ts_mode_confirmed', 'true'); localStorage.setItem('blue_mode_confirmed', 'true'); localStorage.setItem('jushh_mode_confirmed', 'true');")
    
    for brand, path in [('ts', 'tandooristoppk'), ('blue', 'dineatblue'), ('jushh', 'jushhpk')]:
        pc_page.goto(f'http://127.0.0.1:8092/websites/{path}/index.html')
        pc_page.wait_for_timeout(300)
        pc_page.screenshot(path=f'websites/clean_{brand}_pc.png')
        # Crop header
        im = Image.open(f'websites/clean_{brand}_pc.png')
        im.crop((0, 0, 1280, 80)).save(f'websites/clean_{brand}_pc_header.png')
        
    browser.close()

print('All clean screenshots and header crops generated successfully!')
