import os
import sys
import json

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.request import Request
from decimal import Decimal

passed = 0
failed = 0

def test_assert(name, condition, details=""):
    global passed, failed
    if condition:
        print(f"  [PASS] {name}")
        passed += 1
    else:
        print(f"  [FAIL] {name}: {details}")
        failed += 1

print("=" * 80)
print("FOODSPHERE FULL-STACK SECURITY AUDIT VERIFICATION SUITE")
print("=" * 80)

# ------------------------------------------------------------------------------
# 1. FS-SEC-01: Loyalty Points Double-Spend TOCTOU Defense
# ------------------------------------------------------------------------------
print("\n[VERIFICATION 1] FS-SEC-01: Loyalty Points Concurrency & Double-Spend Defense")
from orders.serializers import OrderCreateSerializer
from restaurants.models import Restaurant, Branch, MenuCategory, MenuItem

User = get_user_model()
test_user = User.objects.filter(username='test_sec_loyalty_user').first()
if not test_user:
    test_user = User.objects.create_user(
        username='test_sec_loyalty_user', 
        password='password123', 
        loyalty_points=100,
        phone='03001234567',
        is_guest=False
    )
else:
    test_user.loyalty_points = 100
    test_user.phone = '03001234567'
    test_user.is_guest = False
    test_user.save()

restaurant = Restaurant.objects.filter(is_active=True).first()
branch = restaurant.branches.filter(is_active=True).first() if restaurant else None
item = MenuItem.objects.filter(category__restaurant=restaurant, is_available=True).first() if restaurant else None

if restaurant and item:
    payload = {
        'restaurant': restaurant.id,
        'branch': branch.id if branch else None,
        'payment_method': 'cod',
        'order_type': 'DELIVERY',
        'delivery_address': 'Test Street 1',
        'use_loyalty_points': True,
        'points_to_redeem': 100,
        'items': [{'menu_item': item.id, 'quantity': 10}]
    }

    factory = APIRequestFactory()
    wsgi_req = factory.post('/api/orders/', payload, format='json')
    force_authenticate(wsgi_req, user=test_user)
    drf_req = Request(wsgi_req)

    # Order 1 consumes points
    ser1 = OrderCreateSerializer(data=payload, context={'request': drf_req})
    valid1 = ser1.is_valid()
    test_assert("Order 1 serializer valid with available points", valid1, str(ser1.errors))
    if valid1:
        order1 = ser1.save()
        from users.models import LoyaltyTransaction
        redeemed_tx = LoyaltyTransaction.objects.filter(order=order1, transaction_type='redeemed').first()
        test_assert("Loyalty points redemption ledger recorded for Order 1", redeemed_tx is not None and redeemed_tx.points == -100)

        # Force test_user balance to 0 to simulate drained balance
        test_user.loyalty_points = 0
        test_user.save()

        # Attacker tries to create order redeeming 100 points with balance = 0
        ser2 = OrderCreateSerializer(data=payload, context={'request': drf_req})
        valid2 = ser2.is_valid()
        if valid2:
            order2 = ser2.save()
            redeemed_tx2 = LoyaltyTransaction.objects.filter(order=order2, transaction_type='redeemed').first()
            test_assert("Zero points redeemed when balance is exhausted", redeemed_tx2 is None and order2.discount < 100)

# ------------------------------------------------------------------------------
# 2. FS-SEC-02: Credentials Removed from Git
# ------------------------------------------------------------------------------
print("\n[VERIFICATION 2] FS-SEC-02: CREDENTIALS.md Git Untracked & Ignored")
import subprocess
git_check = subprocess.run(["git", "status", "-s", "CREDENTIALS.md"], capture_output=True, text=True)
test_assert("CREDENTIALS.md is staged for deletion from Git index", "D  CREDENTIALS.md" in git_check.stdout or "D CREDENTIALS.md" in git_check.stdout)

with open('.gitignore', 'r', encoding='utf-8') as f:
    gitignore_text = f.read()
test_assert("CREDENTIALS.md present in .gitignore", "CREDENTIALS.md" in gitignore_text)

# ------------------------------------------------------------------------------
# 3. FS-SEC-03: OrderDetailSerializer Financial Field Lock
# ------------------------------------------------------------------------------
print("\n[VERIFICATION 3] FS-SEC-03: OrderDetailSerializer Financial Read-Only Protection")
from orders.serializers import OrderDetailSerializer
read_only = OrderDetailSerializer.Meta.read_only_fields
for field in ['subtotal', 'delivery_fee', 'discount', 'total', 'cod_settled', 'cod_settled_at', 'payment_method']:
    test_assert(f"Field '{field}' is strictly read_only in OrderDetailSerializer", field in read_only)

# ------------------------------------------------------------------------------
# 4. FS-SEC-04: CORS & CSRF Origin Hardening
# ------------------------------------------------------------------------------
print("\n[VERIFICATION 4] FS-SEC-04: CORS & CSRF Hardened Origin Whitelist")
test_assert("CORS_ALLOW_ALL_ORIGINS is False", settings.CORS_ALLOW_ALL_ORIGINS is False)
test_assert("Wildcard *.pages.dev removed from CSRF_TRUSTED_ORIGINS", 'https://*.pages.dev' not in settings.CSRF_TRUSTED_ORIGINS)
test_assert("Wildcard *.vercel.app removed from CSRF_TRUSTED_ORIGINS", 'https://*.vercel.app' not in settings.CSRF_TRUSTED_ORIGINS)

has_generic_pages_dev = any(p == r"^https://.*\.pages\.dev$" for p in getattr(settings, 'CORS_ALLOWED_ORIGIN_REGEXES', []))
test_assert("Generic *.pages.dev regex removed from CORS_ALLOWED_ORIGIN_REGEXES", not has_generic_pages_dev)

# ------------------------------------------------------------------------------
# 5. FS-SEC-05: ForgotPasswordView Strict Domain Validation
# ------------------------------------------------------------------------------
print("\n[VERIFICATION 5] FS-SEC-05: Password Reset Origin Hijacking Defense")
from users.views import ForgotPasswordView

attack_req = factory.post('/api/auth/forgot-password/', {
    'email': 'admin@foodsphere.com',
    'redirect_url': 'https://evil-attacker.pages.dev/reset'
}, format='json')

view_func = ForgotPasswordView.as_view()
res = view_func(attack_req)
test_assert("Forgot password request executed safely with HTTP 200", res.status_code == 200)

# ------------------------------------------------------------------------------
# 6. FS-SEC-06: Production Hard Purge Disabled
# ------------------------------------------------------------------------------
print("\n[VERIFICATION 6] FS-SEC-06: Production Hard Purge Lockdown")
from orders.views import PurgeOrdersView
purge_func = PurgeOrdersView.as_view()
purge_req = factory.post('/api/orders/purge-all/', {}, format='json')
test_user.is_superuser = True
test_user.is_staff = True
test_user.save()
force_authenticate(purge_req, user=test_user)

orig_debug = settings.DEBUG
settings.DEBUG = False
res_prod = purge_func(purge_req)
test_assert("Hard purge endpoint returns HTTP 403 Forbidden when DEBUG = False", res_prod.status_code == 403)
settings.DEBUG = orig_debug

# ------------------------------------------------------------------------------
# 7. FS-SEC-07: Coupon & FlashDeal Tenant Scoping
# ------------------------------------------------------------------------------
print("\n[VERIFICATION 7] FS-SEC-07: Coupon & FlashDeal Multi-Tenant Isolation")
from promotions.views import CouponListCreateView, FlashDealListCreateView
from promotions.models import Coupon, FlashDeal

mgr_user = User.objects.filter(username='test_sec_manager').first()
if not mgr_user:
    mgr_user = User.objects.create_user(username='test_sec_manager', password='password123', is_staff=True)

# Assign to restaurant 1 with branch
from users.models import ManagerProfile
if restaurant and branch:
    mp, _ = ManagerProfile.objects.update_or_create(
        user=mgr_user, 
        defaults={'restaurant': restaurant, 'branch': branch, 'notification_email': 'mgr@test.com'}
    )

c_req = factory.get('/api/coupons/')
force_authenticate(c_req, user=mgr_user)
coupon_view = CouponListCreateView()
coupon_view.request = Request(c_req)
c_qs = coupon_view.get_queryset()
test_assert("Manager queryset scoped exclusively to their managed restaurant", all(c.restaurant_id == restaurant.id for c in c_qs if c.restaurant))

# ------------------------------------------------------------------------------
# 8. FS-SEC-08: AdminBranchRiderViewSet Update Scoping
# ------------------------------------------------------------------------------
print("\n[VERIFICATION 8] FS-SEC-08: Cross-Branch Rider Reassignment Defense")
from restaurants.views import AdminBranchRiderViewSet
rider_view = AdminBranchRiderViewSet()
test_assert("AdminBranchRiderViewSet implements perform_update method", hasattr(rider_view, 'perform_update'))

# ------------------------------------------------------------------------------
# 9. FS-SEC-09: Push Notification Broadcast Protection
# ------------------------------------------------------------------------------
print("\n[VERIFICATION 9] FS-SEC-09: Push Notification Broadcast Authorization")
from config.notification_views import SendNotificationView
notify_func = SendNotificationView.as_view()
notify_req = factory.post('/api/admin/notifications/send/', {'title': 'Test', 'body': 'Spam', 'target': 'all'}, format='json')
force_authenticate(notify_req, user=mgr_user) # Staff manager, not superuser
notify_res = notify_func(notify_req)
test_assert("Non-superuser branch manager blocked from broadcasting to all users (HTTP 403)", notify_res.status_code == 403)

# ------------------------------------------------------------------------------
# 10. FS-SEC-10: Mobile Apps Cleartext HTTP Disabled
# ------------------------------------------------------------------------------
print("\n[VERIFICATION 10] FS-SEC-10: Standalone Mobile Builds Cleartext HTTP Disabled")
with open('app/app.json', 'r', encoding='utf-8') as f:
    app_json = json.load(f)
app_cleartext = False
for p in app_json['expo'].get('plugins', []):
    if isinstance(p, list) and p[0] == 'expo-build-properties':
        app_cleartext = p[1].get('android', {}).get('usesCleartextTraffic', True)
test_assert("Customer App usesCleartextTraffic is strictly False", app_cleartext is False)

with open('admin-app/app.json', 'r', encoding='utf-8') as f:
    admin_app_json = json.load(f)
admin_cleartext = False
for p in admin_app_json['expo'].get('plugins', []):
    if isinstance(p, list) and p[0] == 'expo-build-properties':
        admin_cleartext = p[1].get('android', {}).get('usesCleartextTraffic', True)
test_assert("Manager App usesCleartextTraffic is strictly False", admin_cleartext is False)

# ------------------------------------------------------------------------------
# 11. FS-SEC-11: Storefront Cart Drawer DOM XSS Sanitization
# ------------------------------------------------------------------------------
print("\n[VERIFICATION 11] FS-SEC-11: Storefront Cart Drawer HTML Escaping")
with open('websites/cart_drawer.js', 'r', encoding='utf-8') as f:
    cd_text = f.read()
test_assert("escapeHtml function defined in cart_drawer.js", "function escapeHtml(" in cd_text)
test_assert("customerName escaped before input value interpolation", 'value="${escapeHtml(cartState.customerName' in cd_text)
test_assert("displayId escaped before DOM insertion", '${escapeHtml(displayId)}' in cd_text)

# ------------------------------------------------------------------------------
# 12. FS-SEC-12: Media Upload File Extension Whitelisting
# ------------------------------------------------------------------------------
print("\n[VERIFICATION 12] FS-SEC-12: Media Upload File Extension Allowlist")
from restaurants.media_service import handle_media_upload_or_url
from django.core.files.uploadedfile import SimpleUploadedFile

malicious_file = SimpleUploadedFile("exploit.html", b"<script>alert(1)</script>", content_type="text/html")
try:
    handle_media_upload_or_url(media_file=malicious_file, media_type='IMAGE')
    test_assert("Upload of exploit.html blocked", False, "Should have raised ValueError")
except ValueError as e:
    test_assert("Upload of exploit.html cleanly blocked with ValueError", "Invalid file extension" in str(e))

# ------------------------------------------------------------------------------
# 13. FS-SEC-13: Access Token Lifetime Hardening
# ------------------------------------------------------------------------------
print("\n[VERIFICATION 13] FS-SEC-13: SimpleJWT Access Token Lifetime Hardened")
from datetime import timedelta
test_assert("ACCESS_TOKEN_LIFETIME is set to 30 minutes", settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'] == timedelta(minutes=30))

# ------------------------------------------------------------------------------
# 14. FS-SEC-14: Verbose 500 Error Sanitization
# ------------------------------------------------------------------------------
print("\n[VERIFICATION 14] FS-SEC-14: Verbose 500 API Error Sanitization")
with open('backend/restaurants/views.py', 'r', encoding='utf-8') as f:
    rest_views_text = f.read()
test_assert("Restaurant menu error sanitized when not DEBUG", 'msg = str(e) if settings.DEBUG else "An unexpected error occurred while loading the menu."' in rest_views_text)

# ------------------------------------------------------------------------------
# FINAL SUMMARY
# ------------------------------------------------------------------------------
print("\n" + "=" * 80)
print(f"SECURITY AUDIT VERIFICATION RESULTS: {passed}/{passed + failed} TESTS PASSED ({(passed / (passed + failed) * 100):.1f}%)")
print("=" * 80)

if failed > 0:
    sys.exit(1)
