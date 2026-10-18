import re

with open('websites/jushhpk/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Each product card has an img and h3
cards = re.findall(r'<div class="product-card.*?</div>\s*</div>\s*</div>', content, re.DOTALL)
print(f"Found {len(cards)} cards in Jushh PK index.html")

card_matches = re.findall(r'<img src="([^"]+)".*?<h3[^>]*>([^<]+)</h3>', content, re.DOTALL)
print(f"Found {len(card_matches)} img+h3 matches in Jushh PK")
for src, title in card_matches:
    print(f"{title.strip()} -> {src.strip()}")
