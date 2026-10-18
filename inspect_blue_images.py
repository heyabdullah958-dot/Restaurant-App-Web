import os
from PIL import Image

print("--- NEW DATA FILES ---")
for f in os.listdir('New Data'):
    p = os.path.join('New Data', f)
    if os.path.isfile(p):
        try:
            im = Image.open(p)
            print(f"{f}: size={im.size}, mode={im.mode}")
        except:
            pass

print("\n--- DINE AT BLUE IMAGES ---")
for f in os.listdir('websites/dineatblue/images'):
    p = os.path.join('websites/dineatblue/images', f)
    if os.path.isfile(p):
        try:
            im = Image.open(p)
            print(f"{f}: size={im.size}, mode={im.mode}")
        except:
            pass
