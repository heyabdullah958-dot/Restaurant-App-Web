import os
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Expanded Roman Urdu patterns
URDU_PATTERNS = [
    r'\bmenu dekhein\b', r'\bhum kab open hain\b', r'\border karo\b', r'\bapka order\b',
    r'\bshukriya\b', r'\bshukria\b', r'\bform fill karo\b', r'\bphone ready rakhein\b',
    r'\baapka naam\b', r'\bbranch choose karo\b', r'\bpay karo\b', r'\border confirm karo\b',
    r'\bpasand ki\b', r'\bhamein mil gaya\b', r'\bhum jald hi\b', r'\bconfirm karenge\b',
    r'\bassalam o alaikum\b', r'\blazeez\b', r'\bmaza\b', r'\bhamare\b', r'\bapni\b',
    r'\baayegi\b', r'\bpe 5 min\b', r'\bmein confirm\b', r'\bdelivery par\b', r'\border place karo\b'
]

compiled = [re.compile(p, re.IGNORECASE) for p in URDU_PATTERNS]

def scan_all():
    matches = []
    base_dir = r'websites'
    for root, dirs, files in os.walk(base_dir):
        for f in files:
            if f.endswith(('.html', '.js', '.css', '.json')):
                filepath = os.path.join(root, f)
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as fp:
                    for line_no, line in enumerate(fp, 1):
                        for cp in compiled:
                            if cp.search(line):
                                matches.append((filepath, line_no, line.strip()))
                                break
    print(f"Total matching lines in website files: {len(matches)}")
    for filepath, line_no, line in matches:
        print(f"[{filepath}:{line_no}] {line}")

if __name__ == "__main__":
    scan_all()
