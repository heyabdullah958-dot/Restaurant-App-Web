import os
from PIL import Image, ImageFilter, ImageEnhance, ImageDraw
import numpy as np

def enhance_blue_logo():
    src_path = 'New Data/logo.jpeg'
    out_dir = 'websites/dineatblue/images'
    os.makedirs(out_dir, exist_ok=True)

    print(f"Loading official logo from {src_path}...")
    orig = Image.open(src_path).convert('RGB')
    w, h = orig.size
    print(f"Source image dimensions: {w}x{h}")

    # 1. Square crop centered on the circle
    # Height is 722, Width is 727 -> center at w/2, h/2
    min_dim = min(w, h) # 722
    left = (w - min_dim) // 2
    top = (h - min_dim) // 2
    square_img = orig.crop((left, top, left + min_dim, top + min_dim))
    print(f"Square crop: {min_dim}x{min_dim}")

    # 2. Resize to 1024x1024 using high-quality Lanczos resampling (4x over original)
    target_size = 1024
    upscaled = square_img.resize((target_size, target_size), Image.Resampling.LANCZOS)

    # 3. Apply Edge Enhancement & Contrast Cleanup
    # Unsharp mask for crisp typography and seahorse/crab details
    sharpened = upscaled.filter(ImageFilter.UnsharpMask(radius=1.8, percent=140, threshold=2))
    
    # Slight contrast boost to clean up JPEG compression artifacts
    contrast_enhancer = ImageEnhance.Contrast(sharpened)
    enhanced = contrast_enhancer.enhance(1.06)

    # Slight saturation richness for the deep Ocean Teal (#16384C) and Warm Sand (#EFE6D5)
    color_enhancer = ImageEnhance.Color(enhanced)
    enhanced = color_enhancer.enhance(1.04)

    # 4. Generate supersampled antialiased circular alpha mask
    # We render at 4x (4096) and downsample to 1024 for ultra-smooth sub-pixel edge blending
    mask_mult = 4
    super_dim = target_size * mask_mult
    super_mask = Image.new('L', (super_dim, super_dim), 0)
    draw = ImageDraw.Draw(super_mask)

    # In original 722x722, the teal circle extends almost to radius 360 (edge at ~1-2px from border)
    # At 1024, radius is ~ 510-511
    radius_ratio = 360.0 / 361.0 # ~ 0.9972
    super_radius = (super_dim / 2.0) * radius_ratio
    super_center = super_dim / 2.0

    bbox = [
        super_center - super_radius,
        super_center - super_radius,
        super_center + super_radius,
        super_center + super_radius
    ]
    draw.ellipse(bbox, fill=255)

    # Downsample mask to 1024x1024
    alpha_mask = super_mask.resize((target_size, target_size), Image.Resampling.LANCZOS)

    # 5. Combine into RGBA image
    enhanced_rgba = enhanced.convert('RGBA')
    enhanced_rgba.putalpha(alpha_mask)

    # 6. Save as crisp 1024x1024 PNG and WebP
    png_path = os.path.join(out_dir, 'logo.png')
    webp_path = os.path.join(out_dir, 'logo.webp')
    emblem_path = os.path.join(out_dir, 'logo_emblem.png')

    enhanced_rgba.save(png_path, format='PNG', optimize=True)
    enhanced_rgba.save(webp_path, format='WEBP', quality=95)
    enhanced_rgba.save(emblem_path, format='PNG', optimize=True)

    print(f"[OK] Enhanced logo saved to:\n  -> {png_path}\n  -> {webp_path}\n  -> {emblem_path}")

    # 7. Delete fake gold-crown and old horizontal logos
    stale_files = [
        os.path.join(out_dir, 'logo.svg'),
        os.path.join(out_dir, 'logo_emblem.svg'),
        os.path.join(out_dir, 'logo_horizontal.png')
    ]
    for sf in stale_files:
        if os.path.exists(sf):
            try:
                os.remove(sf)
                print(f"[PURGED] Removed fake/stale logo: {sf}")
            except Exception as e:
                print(f"[WARN] Could not remove {sf}: {e}")

if __name__ == '__main__':
    enhance_blue_logo()
