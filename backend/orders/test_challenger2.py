import uuid
from datetime import timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase
from orders.models import Order
from restaurants.models import Restaurant, Branch, MenuCategory, MenuItem
from promotions.models import Coupon, CouponUsage

User = get_user_model()


class Challenger2OperationsTestCase(APITestCase):

    def setUp(self):
        # Create base test restaurant
        self.restaurant = Restaurant.objects.create(
            name="Challenger Grill",
            slug="challenger-grill",
            opens_at="00:00:00",
            closes_at="23:59:59",
            is_active=True,
            is_force_closed=False,
            min_order_amount=100.00,
            delivery_fee=50.00
        )

        self.branch = Branch.objects.create(
            restaurant=self.restaurant,
            name="Main Branch",
            address="123 Test St",
            latitude=31.5204,
            longitude=74.3587,
            delivery_radius_km=10.0,
            is_active=True
        )

        self.category = MenuCategory.objects.create(
            restaurant=self.restaurant,
            name="Burgers",
            is_active=True
        )

        self.menu_item = MenuItem.objects.create(
            category=self.category,
            name="Classic Burger",
            price=500.00,
            is_available=True
        )

        self.user = User.objects.create_user(
            username="testuser_m2",
            email="testuser_m2@example.com",
            password="Password123!",
            phone="03001234567"
        )
        self.client.force_authenticate(user=self.user)

        self.valid_order_payload = {
            "restaurant": self.restaurant.id,
            "branch": self.branch.id,
            "guest_name": "Test Customer",
            "guest_phone": "03001234567",
            "payment_method": "cod",
            "delivery_address": "Near Main Branch",
            "delivery_lat": 31.5210,
            "delivery_lng": 74.3590,
            "items": [
                {
                    "menu_item": self.menu_item.id,
                    "quantity": 1
                }
            ]
        }

    # ==========================================
    # TASK 1: Operating Hours & Status Enforcement
    # ==========================================

    def test_open_restaurant_allows_order_creation(self):
        """Verify order creation succeeds when restaurant is open."""
        response = self.client.post("/api/orders/", self.valid_order_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_force_closed_restaurant_blocks_order_creation(self):
        """Verify is_force_closed=True blocks order creation with HTTP 400."""
        self.restaurant.is_force_closed = True
        self.restaurant.save()

        response = self.client.post("/api/orders/", self.valid_order_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("closed", str(response.data))

    def test_inactive_restaurant_blocks_order_creation(self):
        """Verify is_active=False blocks order creation with HTTP 400."""
        self.restaurant.is_active = False
        self.restaurant.save()

        response = self.client.post("/api/orders/", self.valid_order_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("closed", str(response.data))

    def test_closed_by_operating_hours_blocks_order_creation(self):
        """Verify outside operating hours window blocks order creation with HTTP 400."""
        now_time = timezone.localtime()
        # Set opens_at and closes_at to 2-3 hours in the future
        future_start = (now_time + timedelta(hours=2)).time()
        future_end = (now_time + timedelta(hours=4)).time()

        self.restaurant.opens_at = future_start
        self.restaurant.closes_at = future_end
        self.restaurant.save()

        response = self.client.post("/api/orders/", self.valid_order_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("currently closed and not accepting orders", str(response.data))


    # ==========================================
    # TASK 2: Coupon Validation
    # ==========================================

    def test_coupon_validate_endpoint_valid_code(self):
        """Test POST /api/coupons/validate/ returns valid response for valid coupon."""
        coupon = Coupon.objects.create(
            code="SAVE10",
            discount_type="percentage",
            discount_value=Decimal('10.00'),
            min_subtotal=Decimal('300.00'),
            valid_from=timezone.now() - timedelta(days=1),
            valid_to=timezone.now() + timedelta(days=1),
            usage_limit=10,
            times_used=0,
            is_active=True
        )

        payload = {
            "code": "SAVE10",
            "subtotal": 500.00,
            "restaurant_id": self.restaurant.id
        }
        response = self.client.post("/api/coupons/validate/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data.get("valid"))
        self.assertEqual(Decimal(str(response.data.get("discount"))), Decimal('50.00'))

    def test_coupon_validation_expired_code(self):
        """Test expired coupon is rejected by validate endpoint and order creation."""
        coupon = Coupon.objects.create(
            code="EXPIRED20",
            discount_type="percentage",
            discount_value=Decimal('20.00'),
            valid_from=timezone.now() - timedelta(days=10),
            valid_to=timezone.now() - timedelta(days=1),  # Expired yesterday
            usage_limit=10,
            times_used=0,
            is_active=True
        )

        # 1. Check validate endpoint
        val_response = self.client.post(
            "/api/coupons/validate/",
            {"code": "EXPIRED20", "subtotal": 500.00, "restaurant_id": self.restaurant.id},
            format="json"
        )
        self.assertEqual(val_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", str(val_response.data).lower())

        # 2. Check order placement
        order_payload = dict(self.valid_order_payload, coupon_code="EXPIRED20")
        order_response = self.client.post("/api/orders/", order_payload, format="json")
        self.assertEqual(order_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("expired", str(order_response.data).lower())

    def test_coupon_validation_maxed_out_usage(self):
        """Test maxed-out usage limit code is rejected."""
        coupon = Coupon.objects.create(
            code="MAXEDOUT",
            discount_type="flat",
            discount_value=Decimal('100.00'),
            valid_from=timezone.now() - timedelta(days=1),
            valid_to=timezone.now() + timedelta(days=1),
            usage_limit=5,
            times_used=5,  # Equal to limit
            is_active=True
        )

        # 1. Check validate endpoint
        val_response = self.client.post(
            "/api/coupons/validate/",
            {"code": "MAXEDOUT", "subtotal": 500.00, "restaurant_id": self.restaurant.id},
            format="json"
        )
        self.assertEqual(val_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("usage limit has been reached", str(val_response.data))

        # 2. Check order placement
        order_payload = dict(self.valid_order_payload, coupon_code="MAXEDOUT")
        order_response = self.client.post("/api/orders/", order_payload, format="json")
        self.assertEqual(order_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("usage limit has been reached", str(order_response.data))

    def test_coupon_validation_subtotal_below_minimum(self):
        """Test coupon requiring higher minimum subtotal is rejected when subtotal is lower."""
        coupon = Coupon.objects.create(
            code="MIN1000",
            discount_type="flat",
            discount_value=Decimal('200.00'),
            min_subtotal=Decimal('1000.00'),
            valid_from=timezone.now() - timedelta(days=1),
            valid_to=timezone.now() + timedelta(days=1),
            usage_limit=10,
            times_used=0,
            is_active=True
        )

        # Subtotal is 500.00 (below min 1000.00)
        val_response = self.client.post(
            "/api/coupons/validate/",
            {"code": "MIN1000", "subtotal": 500.00, "restaurant_id": self.restaurant.id},
            format="json"
        )
        self.assertEqual(val_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Minimum subtotal", str(val_response.data))

        order_payload = dict(self.valid_order_payload, coupon_code="MIN1000")
        order_response = self.client.post("/api/orders/", order_payload, format="json")
        self.assertEqual(order_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Minimum subtotal", str(order_response.data))

    def test_coupon_validation_per_user_limit(self):
        """Test per-user limit enforcement for authenticated users."""
        coupon = Coupon.objects.create(
            code="ONCEONLY",
            discount_type="flat",
            discount_value=Decimal('50.00'),
            valid_from=timezone.now() - timedelta(days=1),
            valid_to=timezone.now() + timedelta(days=1),
            usage_limit=10,
            times_used=0,
            per_user_limit=1,
            is_active=True
        )

        self.client.force_authenticate(user=self.user)
        order_payload = dict(self.valid_order_payload, coupon_code="ONCEONLY")

        # First order succeeds
        res1 = self.client.post("/api/orders/", order_payload, format="json")
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)

        # Second order fails
        res2 = self.client.post("/api/orders/", order_payload, format="json")
        self.assertEqual(res2.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("maximum allowed times", str(res2.data))


    # ==========================================
    # TASK 3: Server-Side Atomic Counter Increment
    # ==========================================

    def test_atomic_counter_increment_single_order(self):
        """Verify times_used in database increases by exactly 1 per valid order placement."""
        coupon = Coupon.objects.create(
            code="ATOMIC50",
            discount_type="flat",
            discount_value=Decimal('50.00'),
            valid_from=timezone.now() - timedelta(days=1),
            valid_to=timezone.now() + timedelta(days=1),
            usage_limit=10,
            times_used=0,
            is_active=True
        )

        initial_times_used = coupon.times_used
        self.assertEqual(initial_times_used, 0)

        order_payload = dict(self.valid_order_payload, coupon_code="ATOMIC50")
        response = self.client.post("/api/orders/", order_payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        coupon.refresh_from_db()
        self.assertEqual(coupon.times_used, 1)

        # Verify CouponUsage record was created
        order_data = response.data.get("data", response.data)
        order_id = order_data.get("id")
        usage_exists = CouponUsage.objects.filter(coupon=coupon, order_id=order_id).exists()
        self.assertTrue(usage_exists)

    def test_atomic_counter_increment_multiple_sequential_orders(self):
        """Verify times_used increments accurately across multiple sequential orders."""
        coupon = Coupon.objects.create(
            code="MULTI20",
            discount_type="percentage",
            discount_value=Decimal('20.00'),
            valid_from=timezone.now() - timedelta(days=1),
            valid_to=timezone.now() + timedelta(days=1),
            usage_limit=3,
            per_user_limit=10,
            times_used=0,
            is_active=True
        )

        order_payload = dict(self.valid_order_payload, coupon_code="MULTI20")

        # Order 1
        res1 = self.client.post("/api/orders/", order_payload, format="json")
        self.assertEqual(res1.status_code, status.HTTP_201_CREATED)
        coupon.refresh_from_db()
        self.assertEqual(coupon.times_used, 1)

        # Order 2
        res2 = self.client.post("/api/orders/", order_payload, format="json")
        self.assertEqual(res2.status_code, status.HTTP_201_CREATED)
        coupon.refresh_from_db()
        self.assertEqual(coupon.times_used, 2)

        # Order 3
        res3 = self.client.post("/api/orders/", order_payload, format="json")
        self.assertEqual(res3.status_code, status.HTTP_201_CREATED)
        coupon.refresh_from_db()
        self.assertEqual(coupon.times_used, 3)

        # Order 4 (Exceeds limit) -> Blocks creation with 400, times_used stays 3
        res4 = self.client.post("/api/orders/", order_payload, format="json")
        self.assertEqual(res4.status_code, status.HTTP_400_BAD_REQUEST)
        coupon.refresh_from_db()
        self.assertEqual(coupon.times_used, 3)
