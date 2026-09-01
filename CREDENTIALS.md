# 🔑 FoodSphere — Official Credentials & Manager Logins Directory

This document contains all login credentials for the **FoodSphere Admin Dashboard** (Super-Admin HQ and Branch Managers).

---

## 🌐 Dashboard Access URLs
- **Live Cloudflare Admin Dashboard**: [https://foodsphere-admin.pages.dev](https://foodsphere-admin.pages.dev)
- **Live Vercel Admin Dashboard**: [https://admin-orpin-psi.vercel.app](https://admin-orpin-psi.vercel.app)
- **Live Heroku Backend API**: [https://getfoodpk-fd9b20442fcf.herokuapp.com](https://getfoodpk-fd9b20442fcf.herokuapp.com)

---

## 👑 1. Super-Admin (HQ Control Center)

| Role | Username | Default Password | Access Level |
|---|---|---|---|
| **Super Admin HQ** | `admin` | `admin123` | Full access to all 7 brands, analytics, user loyalty, and system settings |

---

## 🏪 2. Brand Manager Accounts (Restaurant Level)

These accounts allow brand-level managers to control their respective restaurant menus, pricing, and store availability across all branches.

| # | Brand Name | Brand Handle | Manager Username | Default Password | Shortcut Login |
|---|---|---|---|---|---|
| 1 | **SeenBanao** | `seenbanao` | `manager_seenbanao` | `seenbanao123` | `seenbanao_mgr` |
| 2 | **DineAtBlue** | `dineatblue` | `manager_dineatblue` | `dineatblue123` | `dineatblue_mgr` |
| 3 | **Jush PK** | `jushhpk` | `manager_jushhpk` | `jushhpk123` | `jushhpk_mgr` |
| 4 | **Tandoori Stop** | `tandooristoppk` | `manager_tandooristoppk` | `tandooristoppk@2025` | `tandooristoppk_mgr` |
| 5 | **SandMelts** | `sandmelts` | `manager_sandmelts` | `sandmelts123` | `sandmelts_mgr` |
| 6 | **Birdman Foods** | `birdmanfoodspk` | `manager_birdmanfoodspk` | `birdmanfoodspk123` | `birdmanfoodspk_mgr` |
| 7 | **Get A Fomo** | `getafomo` | `manager_getafomo` | `getafomo123` | `getafomo_mgr` |

---

## 📍 3. Specific Branch Manager Accounts (Phase 1 Active Outlets)

These accounts grant branch-specific order management and order status tracking for individual locations.

### 🍔 Jush PK Branches
| Branch Name | Location / Address | Username | Default Password | Contact Phone |
|---|---|---|---|---|
| **DHA Phase 1** | Sector H, DHA Phase 1, Lahore | `manager_jushhpk_dha_phase_1` | `Branch@Jushhp2025!` | `03257217221` |
| **Johar Town** | Block R2, Phase 2 Johar Town, Lahore | `manager_jushhpk_johar_town` | `admin123` | `03269946142` |
| **Lake City** | Business Bay M1, Lake City, Lahore | `manager_jushhpk_lake_city` | `Branch@Jushhp2025!` | `03244441735` |

### ☕ Get A Fomo Branches
| Branch Name | Location / Address | Username | Default Password | Contact Phone |
|---|---|---|---|---|
| **Gulberg III** | 65, Block D1 Gulberg III, Lahore | `manager_getafomo_gulberg_iii` | `Branch@Getafo2025!` | `03212784841` |

### 🍗 Tandoori Stop Branches
| Branch Name | Location / Address | Username | Default Password | Contact Phone |
|---|---|---|---|---|
| **Lake City** | Sector M7 Lake City, Lahore | `manager_tandooristoppk_lake_city` | `admin123` / `Branch@Tandoo2025!` | `0324-4441735` |
| **Mozang Chungi** | 16-B Temple Road, Shoukat Plaza, Mozang Chungi | `manager_tandooristoppk_mozang_chungi` | `admin123` / `Branch@Tandoo2025!` | `0327-4945947` |
| **Baghbanpura** | Ghass Mandi Stop, Baghbanpura, Lahore | `manager_tandooristoppk_baghbanpura` | `admin123` / `Branch@Tandoo2025!` | `0326-6811177` |
| **Johar Town** | PIA Road, Hakim Chowk, Johar Town | `manager_tandooristoppk_johar_town` | `admin123` / `Branch@Tandoo2025!` | `0327-4945947` |

---

## 🛠️ Management Command for Re-seeding Passwords
To recreate or reset manager accounts on the Django backend (Heroku/Local), run:
```bash
python manage.py create_admin
python manage.py create_restaurant_managers
```
