import uuid
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from datetime import timedelta
from django.utils import timezone
from orders.models import Order
from restaurants.models import Restaurant, Branch, BranchRider, MenuCategory, MenuItem
from promotions.models import Coupon, CouponUsage

User = get_user_model()


class OrderPIISecurityTestCase(APITestCase):

    def setUp(self):
        # Create test restaurant
        self.restaurant = Restaurant.objects.create(
            name="Test Restaurant",
            slug="testrest",
            opens_at="00:00:00",
            closes_at="23:59:59",
            is_active=True
        )
        self.category = MenuCategory.objects.create(
            restaurant=self.restaurant,
            name="Main Courses",
            is_active=True
        )
        self.menu_item = MenuItem.objects.create(
            category=self.category,
            name="Test Burger",
            price=500.00,
            is_available=True
        )

        # Create test users
        self.owner_user = User.objects.create_user(
            username="owner_user",
            email="owner@example.com",
            password="password123"
        )
        self.other_user = User.objects.create_user(
            username="other_user",
            email="other@example.com",
            password="password123"
        )
        self.staff_user = User.objects.create_user(
            username="staff_user",
            email="staff@example.com",
            password="password123",
            is_staff=True,
            is_superuser=True
        )

        # Create test order owned by owner_user
        self.order = Order.objects.create(
            user=self.owner_user,
            restaurant=self.restaurant,
            guest_name="Owner User",
            guest_phone="03001112233",
            delivery_address="123 Street",
            subtotal=500.00,
            total=500.00,
            status="received"
        )

        # Create guest order
        self.guest_order = Order.objects.create(
            user=None,
            restaurant=self.restaurant,
            guest_name="Guest Customer",
            guest_phone="03009998877",
            delivery_address="456 Guest Ave",
            subtotal=500.00,
            total=500.00,
            status="received"
        )

    def test_order_creation_returns_tracking_token(self):
        url = "/api/orders/"
        payload = {
            "restaurant": self.restaurant.id,
            "guest_name": "New Guest",
            "guest_phone": "03001234567",
            "payment_method": "cod",
            "delivery_address": "Test Street 10",
            "items": [
                {
                    "menu_item": self.menu_item.id,
                    "quantity": 1
                }
            ]
        }
        response = self.client.post(url, payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order_data = response.data.get("data", response.data)
        self.assertIn("tracking_token", order_data)
        self.assertTrue(uuid.UUID(str(order_data["tracking_token"])))

    def test_unauthenticated_get_order_detail_without_token_denied(self):
        url = f"/api/orders/{self.order.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_get_order_detail_with_valid_tracking_token(self):
        url = f"/api/orders/{self.order.id}/?tracking_token={self.order.tracking_token}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.order.id)
        self.assertEqual(str(response.data["tracking_token"]), str(self.order.tracking_token))

    def test_unauthenticated_get_order_detail_with_invalid_tracking_token_denied(self):
        url = f"/api/orders/{self.order.id}/?tracking_token={uuid.uuid4()}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_authenticated_owner_get_order_detail(self):
        self.client.force_authenticate(user=self.owner_user)
        url = f"/api/orders/{self.order.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.order.id)

    def test_authenticated_non_owner_get_order_detail_denied(self):
        self.client.force_authenticate(user=self.other_user)
        url = f"/api/orders/{self.order.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_user_get_order_detail(self):
        self.client.force_authenticate(user=self.staff_user)
        url = f"/api/orders/{self.order.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthenticated_my_orders_list_returns_401(self):
        url = "/api/orders/my-orders/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_unauthenticated_my_orders_list_with_phone_returns_401(self):
        url = f"/api/orders/my-orders/?phone={self.order.guest_phone}"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_my_orders_list(self):
        self.client.force_authenticate(user=self.owner_user)
        url = "/api/orders/my-orders/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get("results", response.data)
        self.assertGreaterEqual(len(results), 1)
        self.assertIn("tracking_token", results[0])

    def test_assign_rider_to_order(self):
        branch = Branch.objects.create(
            restaurant=self.restaurant,
            name="Johar Town",
            address="PIA Road, Lahore",
            phone="03001234567",
            is_active=True
        )
        rider = BranchRider.objects.create(
            branch=branch,
            name="Ali Raza",
            phone="03009876543",
            vehicle_type="BIKE",
            status="AVAILABLE"
        )
        self.client.force_authenticate(user=self.staff_user)
        url = f"/api/orders/{self.order.id}/assign-rider/"
        response = self.client.post(url, {"rider_id": rider.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.order.refresh_from_db()
        rider.refresh_from_db()
        self.assertEqual(self.order.rider_id, rider.id)
        self.assertEqual(rider.status, "ON_DELIVERY")

    def test_delivery_radius_enforcement(self):
        branch = Branch.objects.create(
            restaurant=self.restaurant,
            name="Gulberg Branch",
            address="Main Boulevard",
            latitude=31.5204,
            longitude=74.3587,
            delivery_radius_km=5.0,
            is_active=True
        )
        # Coordinates ~50km away in Kasur (31.1179, 74.4459)
        payload = {
            "restaurant": self.restaurant.id,
            "branch": branch.id,
            "guest_name": "Far Away Guest",
            "guest_phone": "03001234567",
            "payment_method": "cod",
            "delivery_address": "Kasur City Center",
            "delivery_lat": 31.1179,
            "delivery_lng": 74.4459,
            "items": [{"menu_item": self.menu_item.id, "quantity": 1}]
        }
        response = self.client.post("/api/orders/", payload, format="json")
        self.assertIn("outside our service area", str(response.data))

    def test_coupon_usage_limit_and_atomic_increment(self):
        coupon = Coupon.objects.create(
            code="TEST20",
            discount_type="PERCENTAGE",
            discount_value=20.0,
            usage_limit=1,
            times_used=0,
            is_active=True,
            valid_from=timezone.now() - timedelta(days=1),
            valid_to=timezone.now() + timedelta(days=1)
        )
        payload = {
            "restaurant": self.restaurant.id,
            "guest_name": "Coupon Guest",
            "guest_phone": "03001234567",
            "payment_method": "cod",
            "delivery_address": "Test Street 10",
            "coupon_code": "TEST20",
            "items": [{"menu_item": self.menu_item.id, "quantity": 1}]
        }
        response = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        coupon.refresh_from_db()
        self.assertEqual(coupon.times_used, 1)

        # Second attempt should fail due to usage limit
        response2 = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(response2.status_code, status.HTTP_400_BAD_REQUEST)
