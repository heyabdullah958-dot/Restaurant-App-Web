import os
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Comprehensive list of Roman Urdu keywords commonly used in UI strings
URDU_KEYWORDS = [
    'dekhein', 'dekho', 'karo', 'karen', 'karein', 'apka', 'aapka', 'shukriya', 'shukria',
    'khana', 'banao', 'tayyar', 'tayaar', 'rabta', 'rabitah', 'humari', 'hamaray', 'hum',
    'khas', 'bara', 'chota', 'taza', 'zaiqa', 'pakwan', 'manpasand', 'dukan', 'pata',
    'layein', 'khaein', 'mangaayein', 'mangao', 'rakhein', 'rakho', 'jald', 'walo', 'chahiaye',
    'kijiye', 'shuru', 'bano', 'mangwayein', 'mangwaye', 'bhejain', 'bhejo', 'gaye'
]

pattern = re.compile(r'\b(' + '|'.join(URDU_KEYWORDS) + r')\b', re.IGNORECASE)

def scan_directory(dir_path):
    print(f"=== SCANNING FOR ROMAN URDU IN: {dir_path} ===")
    matches = []
    for root, dirs, files in os.walk(dir_path):
        if any(skip in root for skip in ['node_modules', '.git', '.wrangler', 'chrome_temp_profile', '.netlify', 'logs', 'venv']):
            continue
        for f in files:
            if f.endswith(('.html', '.js', '.jsx', '.tsx', '.ts', '.py', '.json', '.txt')):
                full_path = os.path.join(root, f)
                try:
                    with open(full_path, 'r', encoding='utf-8', errors='ignore') as fp:
                        for line_no, line in enumerate(fp, 1):
                            if pattern.search(line):
                                # Exclude code variables/imports if they match by coincidence (e.g. seenbanao)
                                clean_line = line.strip()
                                matches.append((full_path, line_no, clean_line))
                except Exception as e:
                    pass
    return matches

def main():
    target_dirs = [
        r'websites',
        r'app\src',
        r'admin\src',
        r'backend'
    ]
    total_found = 0
    for d in target_dirs:
        if os.path.exists(d):
            results = scan_directory(d)
            total_found += len(results)
            for path, line_no, line in results:
                print(f"[{path}:{line_no}] {line}")
            print(f"Subtotal for {d}: {len(results)} matches.\n")
    print(f"Total Roman Urdu matches found across project: {total_found}")

if __name__ == "__main__":
    main()
