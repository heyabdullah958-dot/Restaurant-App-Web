import uuid
import urllib.parse
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from orders.models import Order
from restaurants.models import Restaurant, Branch, BranchRider, MenuCategory, MenuItem

User = get_user_model()


class EmpiricalChallengerM2TestCase(APITestCase):
    """
    Empirical Challenge Test Suite for Milestone 2:
    1. Delivery Radius enforcement (Out of bounds, boundary inside, boundary outside, exact 0km, fallback coords)
    2. Rider Creation & Assignment via API endpoints (CRUD, state transition to ON_DELIVERY / out_for_delivery, inactive rider, unassignment)
    3. WhatsApp dispatch URL generation and parameter encoding verification
    """

    def setUp(self):
        # Create test restaurant (Open all day)
        self.restaurant = Restaurant.objects.create(
            name="Jushh PK",
            slug="jushhpk",
            opens_at="00:00:00",
            closes_at="23:59:59",
            min_order_amount=Decimal("100.00"),
            delivery_fee=Decimal("150.00"),
            is_active=True
        )
        self.category = MenuCategory.objects.create(
            restaurant=self.restaurant,
            name="Burgers",
            is_active=True
        )
        self.menu_item = MenuItem.objects.create(
            category=self.category,
            name="Zinger Deluxe Burger",
            price=Decimal("650.00"),
            is_available=True
        )

        # Create branch with specific location: Johar Town Lahore (31.4697, 74.2728), 5.0 km radius
        self.branch = Branch.objects.create(
            restaurant=self.restaurant,
            name="Johar Town Branch",
            address="G-3 Commercial Area, Johar Town, Lahore",
            phone="04235551111",
            latitude=Decimal("31.469700"),
            longitude=Decimal("74.272800"),
            delivery_radius_km=Decimal("5.0"),
            is_active=True
        )

        # Staff user for admin API calls
        self.staff_user = User.objects.create_user(
            username="manager_jushh",
            email="manager@jushh.pk",
            password="Password123!",
            is_staff=True,
            is_superuser=True
        )

    # =========================================================================
    # TASK 1: DELIVERY RADIUS ENFORCEMENT TESTS
    # =========================================================================

    def test_task1_order_beyond_delivery_radius_returns_400(self):
        """Test placing an order with coordinates > 5.0km from branch (Kasur ~45km away)"""
        payload = {
            "restaurant": self.restaurant.id,
            "branch": self.branch.id,
            "guest_name": "Far Customer",
            "guest_phone": "03009998877",
            "payment_method": "cod",
            "delivery_address": "Main Bazaar, Kasur",
            "delivery_lat": 31.1179,
            "delivery_lng": 74.4459,
            "items": [{"menu_item": self.menu_item.id, "quantity": 1}]
        }
        response = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        error_msg = str(response.data)
        self.assertIn("outside our service area", error_msg)
        self.assertIn("maximum radius is 5.0 km", error_msg)

    def test_task1_order_just_outside_radius_returns_400(self):
        """Test placing an order just outside radius (~5.1km away)"""
        # 31.5156, 74.2728 is ~5.1 km north of 31.4697, 74.2728
        payload = {
            "restaurant": self.restaurant.id,
            "branch": self.branch.id,
            "guest_name": "Boundary Outside Customer",
            "guest_phone": "03009998877",
            "payment_method": "cod",
            "delivery_address": "Gulberg III Near Campus",
            "delivery_lat": 31.5156,
            "delivery_lng": 74.2728,
            "items": [{"menu_item": self.menu_item.id, "quantity": 1}]
        }
        response = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("outside our service area", str(response.data))

    def test_task1_order_just_inside_radius_succeeds(self):
        """Test placing an order just inside radius (~4.8km away)"""
        # 31.5130, 74.2728 is ~4.8 km north of 31.4697, 74.2728
        payload = {
            "restaurant": self.restaurant.id,
            "branch": self.branch.id,
            "guest_name": "Boundary Inside Customer",
            "guest_phone": "03009998877",
            "payment_method": "cod",
            "delivery_address": "Ferozepur Road Near Model Town",
            "delivery_lat": 31.5130,
            "delivery_lng": 74.2728,
            "items": [{"menu_item": self.menu_item.id, "quantity": 1}]
        }
        response = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("tracking_token", response.data.get("data", {}))

    def test_task1_order_exact_branch_coordinates_succeeds(self):
        """Test placing an order at exact branch coordinates (0.0 km)"""
        payload = {
            "restaurant": self.restaurant.id,
            "branch": self.branch.id,
            "guest_name": "At Branch Customer",
            "guest_phone": "03009998877",
            "payment_method": "cod",
            "delivery_address": "G-3 Commercial Area, Johar Town, Lahore",
            "delivery_lat": 31.4697,
            "delivery_lng": 74.2728,
            "items": [{"menu_item": self.menu_item.id, "quantity": 1}]
        }
        response = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_task1_fallback_coordinates_enforcement(self):
        """Test delivery radius check when branch.latitude and longitude are None but name matches BRANCH_COORDINATES"""
        null_branch = Branch.objects.create(
            restaurant=self.restaurant,
            name="johar town",
            address="Johar Town Phase 2",
            latitude=None,
            longitude=None,
            delivery_radius_km=Decimal("5.0"),
            is_active=True
        )
        payload = {
            "restaurant": self.restaurant.id,
            "branch": null_branch.id,
            "guest_name": "Fallback Radius Customer",
            "guest_phone": "03009998877",
            "payment_method": "cod",
            "delivery_address": "Kasur Outer Ring",
            "delivery_lat": 31.1179,
            "delivery_lng": 74.4459,
            "items": [{"menu_item": self.menu_item.id, "quantity": 1}]
        }
        response = self.client.post("/api/orders/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("outside our service area", str(response.data))

    # =========================================================================
    # TASK 2: RIDER CREATION AND ASSIGNMENT VIA API ENDPOINT TESTS
    # =========================================================================

    def test_task2_rider_creation_via_api(self):
        """Test rider creation via POST /api/admin/riders/"""
        self.client.force_authenticate(user=self.staff_user)
        payload = {
            "branch": self.branch.id,
            "name": "Usman Tariq",
            "phone": "03001234567",
            "vehicle_type": "BIKE",
            "status": "AVAILABLE"
        }
        response = self.client.post("/api/admin/riders/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Usman Tariq")
        self.assertEqual(response.data["status"], "AVAILABLE")
        self.assertTrue(response.data["is_active"])

    def test_task2_rider_assignment_updates_order_and_rider_status(self):
        """Test assigning a rider to an order in 'preparing' status updates order to 'out_for_delivery' and rider to 'ON_DELIVERY'"""
        rider = BranchRider.objects.create(
            branch=self.branch,
            name="Hamza Sheikh",
            phone="03218889900",
            vehicle_type="BIKE",
            status="AVAILABLE",
            is_active=True
        )
        order = Order.objects.create(
            restaurant=self.restaurant,
            branch=self.branch,
            guest_name="Test Recipient",
            guest_phone="03001112233",
            delivery_address="Block H3 Johar Town",
            subtotal=Decimal("650.00"),
            total=Decimal("800.00"),
            status="preparing"
        )

        self.client.force_authenticate(user=self.staff_user)
        url = f"/api/orders/{order.id}/assign-rider/"
        response = self.client.post(url, {"rider_id": rider.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])

        order.refresh_from_db()
        rider.refresh_from_db()

        self.assertEqual(order.rider_id, rider.id)
        self.assertEqual(order.status, "out_for_delivery")
        self.assertEqual(rider.status, "ON_DELIVERY")

    def test_task2_assign_inactive_rider_fails(self):
        """Test assigning an inactive rider returns HTTP 400"""
        inactive_rider = BranchRider.objects.create(
            branch=self.branch,
            name="Inactive Rider",
            phone="03210000000",
            vehicle_type="BIKE",
            status="AVAILABLE",
            is_active=False
        )
        order = Order.objects.create(
            restaurant=self.restaurant,
            branch=self.branch,
            guest_name="Test Customer",
            guest_phone="03001112233",
            delivery_address="Johar Town",
            subtotal=Decimal("650.00"),
            total=Decimal("800.00"),
            status="received"
        )
        self.client.force_authenticate(user=self.staff_user)
        url = f"/api/orders/{order.id}/assign-rider/"
        response = self.client.post(url, {"rider_id": inactive_rider.id}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Rider is inactive", response.data.get("error", ""))

    def test_task2_rider_unassignment(self):
        """Test unassigning rider by passing rider_id: null"""
        rider = BranchRider.objects.create(
            branch=self.branch,
            name="Active Rider",
            phone="03211112222",
            vehicle_type="BIKE",
            status="ON_DELIVERY",
            is_active=True
        )
        order = Order.objects.create(
            restaurant=self.restaurant,
            branch=self.branch,
            rider=rider,
            guest_name="Test Customer",
            guest_phone="03001112233",
            delivery_address="Johar Town",
            subtotal=Decimal("650.00"),
            total=Decimal("800.00"),
            status="out_for_delivery"
        )
        self.client.force_authenticate(user=self.staff_user)
        url = f"/api/orders/{order.id}/assign-rider/"
        response = self.client.post(url, {"rider_id": None}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertIsNone(order.rider)

    # =========================================================================
    # TASK 3: WHATSAPP DISPATCH LINK STRING FORMAT & PARAMETER ENCODING TESTS
    # =========================================================================

    def test_task3_whatsapp_url_format_and_parameter_encoding(self):
        """
        Simulate the exact logic used in Admin triggerRiderWhatsApp:
        Target phone normalization, URL template, parameter URL encoding, special characters decoding.
        """
        # Test case 1: Pakistani local phone number formatting (03001234567 -> 923001234567)
        raw_phone = "03001234567"
        target_phone = raw_phone.replace("-", "").replace(" ", "")
        if target_phone.startswith("03") and len(target_phone) == 11:
            target_phone = "92" + target_phone[1:]
        self.assertEqual(target_phone, "923001234567")

        # Test case 2: Order with complex special characters (&, #, /, spaces)
        order_dict = {
            "id": 9924,
            "restaurant_name": "Jushh PK & Grill",
            "guest_name": "M. Ali & Sons",
            "guest_phone": "0300-9876543",
            "delivery_address": "House #45-B, Lane / Street 12 & Main Blvd, Johar Town",
            "items": [
                {"quantity": 2, "menu_item_name": "Zinger Burger & Cheese"},
                {"quantity": 1, "menu_item_name": "Fries (Large / Crispy)"}
            ],
            "total": Decimal("1450.00"),
            "payment_method": "cod"
        }

        address = order_dict["delivery_address"]
        location_link = f"https://maps.google.com/?q={urllib.parse.quote(address)}"
        items_list = "\n".join([f"• {i['quantity']}x {i['menu_item_name']}" for i in order_dict["items"]])

        message = (
            f"🛵 *FOODSPHERE DISPATCH ORDER #{order_dict['id']}*\n\n"
            f"*Restaurant:* {order_dict['restaurant_name']}\n"
            f"*Customer:* {order_dict['guest_name']}\n"
            f"*Phone:* {order_dict['guest_phone']}\n"
            f"*Delivery Address:* {address}\n"
            f"*Map Location:* {location_link}\n\n"
            f"*Items:*\n{items_list}\n\n"
            f"*Total Collection Amount:* Rs. {order_dict['total']} ({order_dict['payment_method'].upper()})\n\n"
            f"Please deliver promptly!"
        )

        encoded_message = urllib.parse.quote(message)
        whatsapp_url = f"https://wa.me/{target_phone}?text={encoded_message}"

        # Assertions
        self.assertTrue(whatsapp_url.startswith("https://wa.me/923001234567?text="))
        self.assertNotIn(" ", whatsapp_url)  # No unencoded spaces
        self.assertNotIn("\n", whatsapp_url) # No unencoded newlines

        # Verify decoded message accurately reconstructs exact text
        decoded_text = urllib.parse.unquote(encoded_message)
        self.assertIn("🛵 *FOODSPHERE DISPATCH ORDER #9924*", decoded_text)
        self.assertIn("*Customer:* M. Ali & Sons", decoded_text)
        self.assertIn("*Delivery Address:* House #45-B, Lane / Street 12 & Main Blvd, Johar Town", decoded_text)
        self.assertIn("https://maps.google.com/?q=House%20%2345-B%2C%20Lane%20/%20Street%2012%20%26%20Main%20Blvd%2C%20Johar%20Town", decoded_text)
        self.assertIn("• 2x Zinger Burger & Cheese", decoded_text)
        self.assertIn("*Total Collection Amount:* Rs. 1450.00 (COD)", decoded_text)
