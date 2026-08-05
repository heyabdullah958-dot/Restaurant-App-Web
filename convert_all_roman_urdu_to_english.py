import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Dictionary of exact string replacements
REPLACEMENTS = [
    # Cart Drawer WhatsApp & Status Messages
    ("Assalam o Alaikum! I am checking on my order", "Hello! I am checking on my order"),
    ("Please confirm latest status. Shukriya!", "Please confirm latest status. Thank you!"),
    
    # Form Confirmation & Success Messages
    ("Shukriya! Aapka order humein mil gaya hai.", "Thank you! Your order has been received."),
    ("Hum jald hi confirm karenge — phone ready rakhein!", "We will confirm shortly — please keep your phone ready!"),
    ("Hum jald hi confirm karenge - phone ready rakhein!", "We will confirm shortly — please keep your phone ready!"),
    ("Hum jald hi confirm karenge -- phone ready rakhein!", "We will confirm shortly — please keep your phone ready!"),
    ("Hum jald hi confirm karenge", "We will confirm shortly"),
    ("phone ready rakhein!", "please keep your phone ready!"),
    ("Hum jald hi confirm karenge — phone ready rakhein!", "We will confirm shortly — please keep your phone ready!"),

    # Headings & Subheadings
    ("Hum Kab <span class=\"highlight\">Open</span> Hain", "Opening <span class=\"highlight\">Hours</span>"),
    ("Hum Kab Open Hain", "Opening Hours"),
    ("Hamare <span style=\"color:var(--fire2)\">3 Branches</span>", "Our <span style=\"color:var(--fire2)\">3 Outlets</span>"),
    ("Menu Dekhein", "View Menu"),
    ("Order Karo 🛵", "Place Your Order 🛵"),
    ("🔥 Order Karo", "🔥 Place Order"),
    ("🥙 Order Karo", "🥙 Place Your Order"),
    ("Order Karo", "Place Order"),
    
    # Form Descriptions & Labels
    ("Form fill karo — WhatsApp pe 5 min mein confirm!", "Fill out the form — we will confirm via WhatsApp within 5 minutes!"),
    ("Form fill karo — COD delivery, no card needed!", "Fill out the form — Cash on Delivery available, no card needed!"),
    ("Form fill karo — hum 5 minute mein WhatsApp pe confirm karenge.", "Fill out the form — we will confirm via WhatsApp within 5 minutes."),
    ("Form fill karo — 5 minute mein confirmation aayegi.", "Fill out the form — confirmation will be sent within 5 minutes."),
    ("Form fill karo", "Fill out the form"),
    ("5 minute mein confirmation aayegi", "confirmation will be sent within 5 minutes"),
    ("WhatsApp pe 5 min mein confirm", "confirm via WhatsApp within 5 minutes"),
    
    # Input Placeholders & Labels
    ("placeholder=\"Ghar ka pura address\"", "placeholder=\"Complete delivery address\""),
    ("placeholder='Ghar ka pura address'", "placeholder='Complete delivery address'"),
    ("Ghar ka pura address", "Complete delivery address"),
    ("<label class=\"f-label\">Apna Order</label>", "<label class=\"f-label\">YOUR ORDER SUMMARY</label>"),
    ("Apna Order", "YOUR ORDER SUMMARY"),
    ("APNA ORDER", "YOUR ORDER SUMMARY"),
    ("placeholder=\"Aapka naam\"", "placeholder=\"Your full name\""),
    ("placeholder='Aapka naam'", "placeholder='Your full name'"),
    ("<label class=\"f-label\">Naam</label>", "<label class=\"f-label\">Full Name</label>"),
    ("Branch Choose Karo", "Select Branch"),
    
    # Payment Notes
    ("Delivery par pay karo", "Pay upon delivery"),
    ("Order milne par pay karo", "Pay upon delivery"),
    ("Delivery par pay", "Pay upon delivery"),
    
    # Submit Buttons
    ("Shhh... Order Place Karo 🥙", "Place Your Order 🥙"),
    ("🥪 Order Place Karo", "🥪 Place Order"),
    ("✅ Order Confirm Karo", "✅ Confirm Order"),
    ("🔥 Order Place Karo", "🔥 Place Order"),
    ("Order Place Karo", "Place Order"),
    
    # WhatsApp Message Prefixes
    ("Assalam o Alaikum! I want to place an order from BirdmanFoods Website", "Hello! I want to place an order from BirdmanFoods Website"),
    ("Assalam o Alaikum! I want to place an order from DineAtBlue Website", "Hello! I want to place an order from DineAtBlue Website"),
    ("Assalam o Alaikum! I want to place an order from GetAFomo Website", "Hello! I want to place an order from GetAFomo Website"),
    ("Assalam o Alaikum! I want to place an order from Jushh Website", "Hello! I want to place an order from Jushh Website"),
    ("Assalam o Alaikum! I want to place an order from SandMelts Website", "Hello! I want to place an order from SandMelts Website"),
    ("Assalam o Alaikum! I want to place an order from Seen Banao Website", "Hello! I want to place an order from Seen Banao Website"),
    ("Assalam o Alaikum! I want to place an order from Tandoori Stop Website", "Hello! I want to place an order from Tandoori Stop Website"),
    ("Assalam o Alaikum!", "Hello!"),
    
    # Hero & Section Descriptions (SeenBanao & TandooriStop)
    ("Lahore ki asli BBQ ka maza — charcoal par seekh kabab, juicy tikka aur slow-cooked handi.", "Experience authentic Lahore BBQ — charcoal grilled seekh kababs, juicy tikka, and slow-cooked handi."),
    ("Apni pasand ki category select karein aur hamare lazeez aur authentic items ka maza lein.", "Select your favorite category and enjoy our delicious, authentic menu items."),
]

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()

    new_content = content
    changes_count = 0
    for target, replacement in REPLACEMENTS:
        if target in new_content:
            count = new_content.count(target)
            new_content = new_content.replace(target, replacement)
            changes_count += count

    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"  [UPDATED] {filepath} ({changes_count} replacements made)")
        return True
    return False

def main():
    print("==================================================")
    print(" 🚀 Universal English UI Conversion Engine        ")
    print("==================================================")
    
    base_dir = r'websites'
    modified_files = 0
    
    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith(('.html', '.js', '.jsx', '.tsx', '.ts')):
                filepath = os.path.join(root, file)
                if process_file(filepath):
                    modified_files += 1

    print(f"\n[OK] Conversion Complete! Modified {modified_files} files in websites directory.")

if __name__ == "__main__":
    main()
