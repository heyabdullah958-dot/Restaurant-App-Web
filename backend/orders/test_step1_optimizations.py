from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase
from orders.models import Order
from orders.views import OrderTrackView, _notification_executor
from restaurants.models import Restaurant, Branch, MenuCategory, MenuItem

User = get_user_model()


class Step1OptimizationsTestCase(APITestCase):
    def setUp(self):
        self.restaurant = Restaurant.objects.create(
            name="Tandoori Stop",
            slug="tandooristoppk",
            opens_at="00:00:00",
            closes_at="23:59:59",
            is_active=True
        )
        self.branch_lc = Branch.objects.create(
            restaurant=self.restaurant,
            name="Lake City",
            address="Opposite Lake City Mall",
            phone="0324-4441735",
            is_active=True
        )
        self.branch_jt = Branch.objects.create(
            restaurant=self.restaurant,
            name="Johar Town",
            address="PIA Road, Johar Town",
            phone="0327-4945947",
            is_active=True
        )
        self.category = MenuCategory.objects.create(
            restaurant=self.restaurant,
            name="BBQ",
            is_active=True
        )
        self.menu_item = MenuItem.objects.create(
            category=self.category,
            name="Chicken Tikka",
            price=450.00,
            is_available=True
        )
        self.user = User.objects.create_user(
            username="step1_customer",
            email="customer@example.com",
            password="pass123password"
        )
        self.client.force_authenticate(user=self.user)

    def test_display_order_id_indexed_generation(self):
        """Verify display_order_id creates scoped sequential IDs starting at 1001."""
        order1 = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            branch=self.branch_lc,
            subtotal=450.00,
            total=450.00,
            delivery_address="Lake City Sector M1"
        )
        self.assertEqual(order1.display_order_id, "TS-LC-1001")

        order2 = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            branch=self.branch_lc,
            subtotal=900.00,
            total=900.00,
            delivery_address="Lake City Sector M2"
        )
        self.assertEqual(order2.display_order_id, "TS-LC-1002")

        # Check Johar Town branch gets independent sequence
        order_jt = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            branch=self.branch_jt,
            subtotal=450.00,
            total=450.00,
            delivery_address="Johar Town Block R"
        )
        self.assertEqual(order_jt.display_order_id, "TS-JT-1001")

    def test_display_order_id_collision_resistance(self):
        """Verify collision guard prevents duplicate display order IDs."""
        order1 = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            branch=self.branch_lc,
            subtotal=450.00,
            total=450.00,
            delivery_address="Address 1"
        )
        # Even if an order exists with TS-LC-1002 already manually, next order gets TS-LC-1003
        Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            branch=self.branch_lc,
            display_order_id="TS-LC-1002",
            subtotal=500.00,
            total=500.00,
            delivery_address="Manual collision dummy"
        )
        order3 = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            branch=self.branch_lc,
            subtotal=450.00,
            total=450.00,
            delivery_address="Address 3"
        )
        self.assertEqual(order3.display_order_id, "TS-LC-1003")

    def test_order_track_view_throttle_exempt(self):
        """Verify OrderTrackView has empty throttle_classes to prevent HTTP 429 on live polling."""
        self.assertEqual(OrderTrackView.throttle_classes, [])

        order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            branch=self.branch_lc,
            subtotal=450.00,
            total=450.00,
            delivery_address="Tracking Test St"
        )

        # Anonymous client request
        anon_client = self.client_class()
        res = anon_client.get(f"/api/orders/{order.display_order_id}/track/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(res.data['data']['display_order_id'], order.display_order_id)

    def test_order_creation_with_background_notifications(self):
        """Verify order creation API returns 201 immediately with async thread pool."""
        payload = {
            "restaurant": self.restaurant.id,
            "branch": self.branch_lc.id,
            "guest_name": "Step1 Customer",
            "guest_phone": "03001234567",
            "order_type": "DELIVERY",
            "delivery_address": "House 12, Lake City, Lahore",
            "payment_method": "cod",
            "items": [
                {
                    "menu_item": self.menu_item.id,
                    "quantity": 2
                }
            ]
        }
        res = self.client.post("/api/orders/", payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(res.data['success'])
        created_id = res.data['data']['id']
        order = Order.objects.get(id=created_id)
        self.assertEqual(order.branch_id, self.branch_lc.id)
        self.assertTrue(order.display_order_id.startswith("TS-LC-"))

    def test_display_order_id_highest_sequence_preservation(self):
        """Verify display_order_id finds the true max sequence even when order IDs and sequence numbers deviate."""
        Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            branch=self.branch_lc,
            display_order_id="TS-LC-1025",
            subtotal=450.00,
            total=450.00,
            delivery_address="Address 1"
        )
        # An order with a higher PK id but lower sequence number (e.g. from branch transfer or manual entry)
        Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            branch=self.branch_lc,
            display_order_id="TS-LC-1005",
            subtotal=450.00,
            total=450.00,
            delivery_address="Address 2"
        )
        # Next order MUST be TS-LC-1026, NOT TS-LC-1006
        new_order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            branch=self.branch_lc,
            subtotal=450.00,
            total=450.00,
            delivery_address="Address 3"
        )
        self.assertEqual(new_order.display_order_id, "TS-LC-1026")

    def test_order_track_view_multiple_objects_returned_resilience(self):
        """Verify OrderTrackView safely handles ambiguous pk lookups without throwing 500 MultipleObjectsReturned."""
        # Create order 1 with a specific display_order_id that matches another order's numeric ID
        order_num = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            branch=self.branch_lc,
            subtotal=450.00,
            total=450.00,
            delivery_address="Num Address"
        )
        Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            branch=self.branch_lc,
            display_order_id=str(order_num.id),
            subtotal=450.00,
            total=450.00,
            delivery_address="Disp Address"
        )
        anon_client = self.client_class()
        # Querying with pk=order_num.id matches BOTH orders
        res = anon_client.get(f"/api/orders/{order_num.id}/track/")
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_display_order_id_fallback_inspects_all_recent_orders(self):
        """Verify fallback scans all recent orders without prematurely breaking on the first match."""
        Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            branch=self.branch_lc,
            display_order_id="OLD-LC-1002",
            subtotal=450.00,
            total=450.00,
            delivery_address="Legacy 1"
        )
        Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            branch=self.branch_lc,
            display_order_id="OLD-LC-1020",
            subtotal=450.00,
            total=450.00,
            delivery_address="Legacy 2"
        )
        new_order = Order.objects.create(
            user=self.user,
            restaurant=self.restaurant,
            branch=self.branch_lc,
            subtotal=450.00,
            total=450.00,
            delivery_address="New 1"
        )
        self.assertEqual(new_order.display_order_id, "TS-LC-1021")

    def test_rapid_sequential_display_order_id_generation(self):
        """Verify rapid order creation generates unique, strictly increasing sequence IDs."""
        orders = [
            Order.objects.create(
                user=self.user,
                restaurant=self.restaurant,
                branch=self.branch_lc,
                subtotal=450.00,
                total=450.00,
                delivery_address=f"Rapid {i}"
            )
            for i in range(10)
        ]
        display_ids = [o.display_order_id for o in orders]
        expected_ids = [f"TS-LC-{1001 + i}" for i in range(10)]
        self.assertEqual(display_ids, expected_ids)
