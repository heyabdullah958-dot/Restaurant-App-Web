# 📋 FoodSphere — Client Se Jo Kuch Chahiye
> Meeting mein yeh list share karo — simple aur seedha

---

## 💳 1. PAYMENT (Payments Kaam Karne Ke Liye)

> Abhi app mein **COD (Cash on Delivery) aur PayFast** hai — Stripe nahi hai

### PayFast (Online Payment)
- [ ] **PayFast account banana** — `payfast.co.za` pe register karo
- [ ] **Merchant ID** — PayFast account se milega
- [ ] **Merchant Key** — PayFast account se milega
- [ ] **Passphrase** — PayFast account setup ke waqt set hota hai
- [ ] **Batao** — abhi testing mode mein hai, kab live karna hai?

### Bank Account
- [ ] **Konsa bank account** PayFast se linked hoga?
- [ ] **Sab 7 restaurants ka ek account** ya alag alag?

---

## 🔔 2. FIREBASE (Order Notifications Ke Liye)

> Bina is ke customers ko **koi bhi notification nahi milegi** — na "Order Ready", na "Out for Delivery"

**Client ko kya karna hai (5 minute ka kaam):**
1. `console.firebase.google.com` kholein
2. Apne Google account se **"Add Project"** click karein
3. Project ban jayega — phir **"Project Settings"** mein jayein
4. **"Service Accounts"** tab mein jayein
5. **"Generate new private key"** click karein — ek JSON file download hogi
6. Woh JSON file hamein bhej dein

- [ ] **Firebase project banana** — apne Gmail se
- [ ] **JSON file send karna** — step 5 ke baad

---

## 🌐 3. BACKEND AUR HOSTING

### Render.com (Jahan Server Chalta Hai)
- [ ] **Kya client khud Render account banana chahta hai?** Ya developer ke account pe hi rakha jaye?
- [ ] **Paid plan lena hai?** — Free plan 15 min mein so jata hai (server slow ho jata hai). Paid plan $7/month

### Database
- [ ] **Supabase account** — abhi developer ka hai, client ke naam pe transfer karna hai?

### Cloudinary (Jahan Photos Save Hoti Hain)
- [ ] **Cloudinary account banana** — free hai, `cloudinary.com` pe
- [ ] **Account credentials** (Cloud Name, API Key, Secret) share karna

---

## 🔗 4. DOMAIN NAMES

- [ ] **Koi domain khareeda hai?** Jaise `foodsphere.pk`, `seenbanao.pk` wagera
- [ ] **Agar haan** — domain registrar ka login chahiye (GoDaddy/Namecheap/PKNIC)
- [ ] **Kaunsi websites pe custom domain lagana hai?** Saatoun pe ya kuch pe?
- [ ] **Admin panel ka domain?** Jaise `admin.foodsphere.pk`

---

## 📞 5. PHONE NUMBERS — URGENT 🚨

> **Yeh ab bhi fake numbers lage hain code mein — order koi bhi kare to kisi ke paas nahi jayega!**

| Restaurant | Problem | Kya Chahiye |
|---|---|---|
| **GetAFomo** | `+92 300 0000000` laga hai ← FAKE | ✅ Real WhatsApp number |
| **TandooriStopPK** | `+92 300 1234567` laga hai ← FAKE | ✅ Johar Town branch ka number |
| **TandooriStopPK** | ← FAKE | ✅ Lake City branch ka number |
| **SeenBanao** | Koi number nahi | ✅ WhatsApp number |
| **DineAtBlue** | Koi number nahi | ✅ Phone/WhatsApp number |
| **SandMelts** | Koi number nahi | ✅ WhatsApp number |
| **BirdManFoodsPK** | Koi number nahi | ✅ WhatsApp number |

---

## 📱 6. SOCIAL MEDIA LINKS

> Websites pe kuch links guessed hain — confirm karo

### SeenBanao
- [ ] Instagram handle kya hai?
- [ ] Facebook page link kya hai?

### DineAtBlue
- [ ] Instagram handle kya hai?
- [ ] Facebook page link kya hai?

### JushhPK
- [ ] Instagram `@jushhpk` — sahi hai?
- [ ] Facebook page link confirm karo
- [ ] Johar Town WhatsApp `+92 326 9946142` — sahi hai?
- [ ] Lake City WhatsApp `+92 324 4441735` — sahi hai?

### TandooriStopPK
- [ ] Instagram `@tandooristoppk` — sahi hai?
- [ ] Facebook page link confirm karo

### SandMelts
- [ ] Instagram handle kya hai?
- [ ] Facebook page link kya hai?

### BirdManFoodsPK
- [ ] Instagram handle kya hai?
- [ ] Facebook page link kya hai?
- [ ] Catering inquiry ka email kya hai?

### GetAFomo *(Special Case)*
- [ ] Instagram `@getafomo` — sahi hai?
- [ ] Facebook page link confirm karo
- [ ] **Instagram feed** website pe dikhani hai — client ko Instagram account ko Facebook se connect karna hoga *(developer guide karega)*

---

## 🍽️ 7. MENU DATA

> JushhPK, TandooriStopPK, GetAFomo — **in 3 ka menu already hai** ✅ kuch nahi chahiye
> **Yeh 4 ka menu abhi ZERO hai:**

- [ ] **SeenBanao** — poora menu bhejo (item name, price, category)
- [ ] **DineAtBlue** — poora menu bhejo (item name, price, category)
- [ ] **SandMelts** — poora menu + har item ki **calories** (yeh feature client ne manga tha)
- [ ] **BirdManFoodsPK** — poora menu + catering package pricing

### Formspree (Form Submissions)
- [ ] **WhatsApp pe notification chahiye ya email pe?** — jab website se order form bhara jaye

---

## 📸 8. PHOTOS AUR LOGOS

- [ ] Har restaurant ka **logo** — PNG, clear background
- [ ] **FoodSphere app icon** (1024×1024px) — jo Play Store/App Store pe dikhega
- [ ] **App splash screen** — jo app kholne pe dikhta hai
- [ ] Har restaurant ki **main banner photo** — jo app mein restaurant card pe dikhegi
- [ ] **Menu item photos** — SeenBanao, DineAtBlue, SandMelts, BirdManFoodsPK ke liye
- [ ] **TandooriStopPK gallery photos** — restaurant ki real photos chahiye (abhi Unsplash ki random photos lagi hain)
- [ ] **GetAFomo ambiance photos** — café ki interior/vibe photos

---

## 📍 9. RESTAURANT INFO

- [ ] Har branch ka **poora address** — gali, mohalla, sheher
- [ ] Ya **Google Maps link** paste kar do — simple hai
- [ ] Har branch ki **opening aur closing time**
- [ ] **Delivery fee** kya hai? (flat rate ya kuch aur)
- [ ] **Minimum order** kitna hai?
- [ ] **Estimated delivery time** — app mein kya dikhayein? (jaise "30-45 mins")

---

## ⭐ 10. LOYALTY POINTS RULES

- [ ] **Order pe kitne points milenge?** (jaise Rs. 100 pe 10 points)
- [ ] **Points se kya discount milega?** (jaise 100 points = Rs. 10 off)
- [ ] **Points expire hote hain?** Kitne mahine baad?
- [ ] **Naya user join kare to welcome bonus milega?**
- [ ] **Tier names kya hain?** (Bronze / Silver / Gold / Platinum — ya kuch aur?)

---

## ⚖️ 11. LEGAL

- [ ] **Privacy Policy** — Google Play bina is ke app reject karega *(hum likh denge, client approve karega)*
- [ ] **Terms & Conditions** — websites ke footer ke liye
- [ ] **Refund Policy** — agar order cancel ho to kya hoga?

---

## 🌐 12. GETAFOMO — RESERVATION

- [ ] Table booking — **form se hogi ya WhatsApp pe?**
- [ ] **Kitne log** ek baar mein book kar sakte hain? (max party size)
- [ ] Events (Open Mic, Latte Art Workshop, Dessert Night) — **yeh real recurring events hain ya sirf examples hain?**

---

## 🌿 13. SANDMELTS — NUTRITION INFO

- [ ] Har item ki **calories, protein, carbs, fat** chahiye
- [ ] **Allergen warnings?** (gluten, dairy, nuts wagera)
- [ ] Koi items "healthy" badge ke liye mark karne hain?

---

## 🍗 14. BIRDMANFOODSPK — CATERING

- [ ] **Catering inquiries** kahan jayengi — email ya WhatsApp?
- [ ] **Minimum order** catering ke liye? (kitne log, kitna amount)
- [ ] Catering menu **regular menu se alag hai** ya same?
- [ ] **Kitne din pehle** book karna hoga?

---

## 🔵 15. ABHI BROKEN HAIN — CLIENT INPUT CHAHIYE

- [ ] **JushhPK** restaurant ka `cover_image` database mein NULL hai — real photo upload karni hai
- [ ] Kai restaurants ki **opening/closing time** database mein NULL hai — app crash kar sakta hai
- [ ] **GetAFomo Instagram section** mein abhi colored boxes hain, real photos nahi

---

## 📅 PRIORITY — PEHLE KYA KARO

| Urgency | Kya | Kyun |
|---|---|---|
| 🚨 **Aaj** | Section 5 (fake phone numbers) | Orders kisi ke paas nahi ja rahe |
| 🔴 **Is hafte** | Section 1 (PayFast), Section 2 (Firebase) | Payments aur notifications band hain |
| 🟠 **Agla hafta** | Sections 3, 4, 6 | Hosting transfer + social links |
| 🟡 **2 hafte mein** | Sections 7, 8, 9, 10 | Menu, photos, addresses, loyalty |
| 🟢 **3–4 hafte mein** | Sections 11–15 | Legal, special features |

---

### ✅ Jo Pehle Se Tayyar Hai (Client Se Kuch Nahi Chahiye)
- JushhPK — menu ✅
- TandooriStopPK — menu ✅
- GetAFomo — menu ✅
- Stripe — **hata diya** ✅ (COD + PayFast hi use hoga)
- Firebase integration code — **ready hai** ✅ (sirf client ka account chahiye)

---
*Last Updated: 30 June 2026*
