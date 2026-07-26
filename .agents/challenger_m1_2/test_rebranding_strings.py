import os
import json
import re

def test_rebranding_strings():
    print("=== TASK 2: EMPIRICAL REBRANDING STRING AUDIT ===")
    
    app_json_path = r"d:\sitesdata\Resturent App\app\app.json"
    screens_dir = r"d:\sitesdata\Resturent App\app\src"
    
    # 1. Verify app.json
    assert os.path.exists(app_json_path), f"app.json missing at {app_json_path}"
    with open(app_json_path, 'r', encoding='utf-8') as f:
        app_config = json.load(f)
        
    expo_cfg = app_config.get('expo', {})
    assert expo_cfg.get('name') == 'GetFood', f"Expected name GetFood, got {expo_cfg.get('name')}"
    assert expo_cfg.get('displayName') == 'GetFood', f"Expected displayName GetFood, got {expo_cfg.get('displayName')}"
    assert expo_cfg.get('slug') == 'getfood', f"Expected slug getfood, got {expo_cfg.get('slug')}"
    
    with open(app_json_path, 'r', encoding='utf-8') as f:
        raw_app_json = f.read()
    assert 'FoodSphere' not in raw_app_json, "Found FoodSphere in app.json"
    print("[PASS] app.json configuration updated to GetFood / getfood with zero FoodSphere references.")
    
    # 2. Verify Mobile App Screen Files
    foodsphere_matches = []
    for root, _, files in os.walk(screens_dir):
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                filepath = os.path.join(root, file)
                with open(filepath, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    for idx, line in enumerate(lines, start=1):
                        # Allow Cloudflare admin deployment URLs if present
                        clean_line = re.sub(r'https?://foodsphere-admin\.pages\.dev[^\s\'"]*', '', line)
                        if 'FoodSphere' in clean_line:
                            foodsphere_matches.append((filepath, idx, line.strip()))
                            
    print(f"Total UI FoodSphere occurrences found in app/src/: {len(foodsphere_matches)}")
    if foodsphere_matches:
        for m in foodsphere_matches:
            print(f"  MATCH: {m[0]}:{m[1]} -> {m[2]}")
            
    assert len(foodsphere_matches) == 0, f"Found {len(foodsphere_matches)} remaining FoodSphere strings in app/src/ UI code!"
    print("[PASS] Zero remaining FoodSphere display strings found across app/src screens and components.")
    print("=== TASK 2 AUDIT COMPLETE: ALL PASS ===")

if __name__ == '__main__':
    test_rebranding_strings()
