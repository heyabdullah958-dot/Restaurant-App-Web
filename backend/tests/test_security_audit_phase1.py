import uuid
from datetime import time
from decimal import Decimal
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from django.db.utils import IntegrityError
from django.db import transaction

from restaurants.models import Restaurant, Branch, MenuCategory, MenuItem, RestaurantReview
from orders.models import Order, OrderItem
from users.models import ManagerProfile, LoyaltyTransaction
from config.throttles import OrderTrackingThrottle, RegistrationRateThrottle, PasswordResetRateThrottle
from config.permissions import IsReviewAuthorOrReadOnly

User = get_user_model()


class FullStackSecurityRemediationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.restaurant = Restaurant.objects.create(
            name="Test Grill & BBQ",
            slug="testgrill",
            delivery_fee=Decimal('150.00'),
            opens_at=time(9, 0),
            closes_at=time(23, 0),
            is_active=True
        )
        self.branch_a = Branch.objects.create(
            restaurant=self.restaurant,
            name="Johar Town",
            phone="03001234567",
            is_active=True
        )
        self.branch_b = Branch.objects.create(
            restaurant=self.restaurant,
            name="Lake City",
            phone="03007654321",
            is_active=True
        )

        self.category = MenuCategory.objects.create(
            restaurant=self.restaurant,
            name="Burgers",
            order=1
        )
        self.menu_item = MenuItem.objects.create(
            category=self.category,
            name="Smash Burger",
            price=Decimal('750.00'),
            is_available=True
        )

        # Users
        self.author_user = User.objects.create_user(
            username="reviewer_alice",
            email="alice@test.com",
            password="alicepassword123",
            loyalty_points=0
        )
        self.attacker_user = User.objects.create_user(
            username="attacker_bob",
            email="bob@test.com",
            password="bobpassword123",
            loyalty_points=50
        )
        self.super_user = User.objects.create_superuser(
            username="admin_super",
            email="admin@test.com",
            password="adminpassword123"
        )

        # Branch Manager for Branch A
        self.manager_a = User.objects.create_user(
            username="manager_johar",
            email="mgr_johar@test.com",
            password="mgrpassword123",
            is_staff=True
        )
        ManagerProfile.objects.create(
            user=self.manager_a,
            restaurant=self.restaurant,
            branch=self.branch_a
        )
        from django.contrib.auth.models import Group
        grp, _ = Group.objects.get_or_create(name=f"manager_{self.restaurant.slug}")
        self.manager_a.groups.add(grp)

    # --------------------------------------------------------------------------
    # FS-SEC-17: Broken Object-Level Authorization (IDOR) on Reviews
    # --------------------------------------------------------------------------
    def test_fs_sec_17_review_bola_protection(self):
        """Verify non-authors and attackers cannot update or delete other users' reviews."""
        review = RestaurantReview.objects.create(
            restaurant=self.restaurant,
            user=self.author_user,
            rating=5,
            comment="Amazing burgers by Alice!"
        )

        # 1. Attacker Bob attempts to edit Alice's review -> 403 Forbidden
        self.client.force_authenticate(user=self.attacker_user)
        response = self.client.patch(f"/api/reviews/{review.id}/", {
            "comment": "Defaced by Bob!",
            "rating": 1
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        review.refresh_from_db()
        self.assertEqual(review.comment, "Amazing burgers by Alice!")
        self.assertEqual(review.rating, 5)

        # 2. Attacker Bob attempts to delete Alice's review -> 403 Forbidden
        del_response = self.client.delete(f"/api/reviews/{review.id}/")
        self.assertEqual(del_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(RestaurantReview.objects.filter(id=review.id).exists())

        # 3. Author Alice can update her own review -> 200 OK
        self.client.force_authenticate(user=self.author_user)
        alice_response = self.client.patch(f"/api/reviews/{review.id}/", {
            "comment": "Updated review by Alice."
        })
        self.assertEqual(alice_response.status_code, status.HTTP_200_OK)
        review.refresh_from_db()
        self.assertEqual(review.comment, "Updated review by Alice.")

    # --------------------------------------------------------------------------
    # FS-SEC-18: Non-Negative Loyalty Points & Database Constraint
    # --------------------------------------------------------------------------
    def test_fs_sec_18_loyalty_points_underflow_prevention(self):
        """Verify loyalty reversal on cancellation clamps to zero and never creates negative balance."""
        user = User.objects.create_user(
            username="shopper_sam",
            email="sam@test.com",
            password="sampassword123",
            loyalty_points=0  # User has zero points left
        )

        order = Order.objects.create(
            restaurant=self.restaurant,
            branch=self.branch_a,
            user=user,
            subtotal=Decimal('1000.00'),
            delivery_fee=Decimal('150.00'),
            total=Decimal('1150.00'),
            delivery_address="Test Address",
            status='preparing'
        )

        # Simulate earned loyalty transaction of 100 points
        LoyaltyTransaction.objects.create(
            user=user,
            order=order,
            points=100,
            transaction_type='earned',
            description="Earned 100 pts"
        )

        # Admin cancels order
        self.client.force_authenticate(user=self.super_user)
        response = self.client.patch(f"/api/orders/{order.id}/", {
            "status": "cancelled",
            "cancellation_reason": "Customer changed mind"
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        user.refresh_from_db()
        # Verify points did not drop to -100, but clamped to 0
        self.assertGreaterEqual(user.loyalty_points, 0)
        self.assertEqual(user.loyalty_points, 0)

    def test_fs_sec_18_db_check_constraint_enforced(self):
        """Verify database-level CheckConstraint rejects negative loyalty points."""
        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                User.objects.create(
                    username="negative_user",
                    email="neg@test.com",
                    loyalty_points=-50
                )

    # --------------------------------------------------------------------------
    # FS-SEC-20: OrderTrackView PII Redaction
    # --------------------------------------------------------------------------
    def test_fs_sec_20_order_track_pii_redaction(self):
        """Verify public tracking without a valid token masks customer name and phone."""
        order = Order.objects.create(
            restaurant=self.restaurant,
            branch=self.branch_a,
            guest_name="Tariq Mehmood",
            guest_phone="03211234567",
            subtotal=Decimal('500.00'),
            total=Decimal('650.00'),
            delivery_address="House 123, Block R2, Johar Town",
            status='preparing'
        )

        # Anonymous request without token
        self.client.force_authenticate(user=None)
        response = self.client.get(f"/api/orders/{order.id}/track/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data['data']

        # Verify PII is masked/redacted
        self.assertNotEqual(data['guest_name'], "Tariq Mehmood")
        self.assertIn("***", data['guest_name'])
        self.assertIsNone(data['guest_phone'])
        self.assertEqual(data['delivery_address'], "[Protected]")

        # Request WITH matching tracking token reveals full details
        token_response = self.client.get(f"/api/orders/{order.id}/track/?token={order.tracking_token}")
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        token_data = token_response.data['data']
        self.assertEqual(token_data['guest_name'], "Tariq Mehmood")
        self.assertEqual(token_data['guest_phone'], "03211234567")

    # --------------------------------------------------------------------------
    # FS-SEC-21: Multi-Tenant Analytics Branch Scoping
    # --------------------------------------------------------------------------
    def test_fs_sec_21_branch_manager_analytics_scoping(self):
        """Verify branch managers cannot see financial metrics of sibling branches."""
        # Authenticate as Johar Town branch manager
        self.client.force_authenticate(user=self.manager_a)
        response = self.client.get(f"/api/analytics/restaurant/{self.restaurant.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        branch_stats = response.data['branches']
        # Johar manager must only see 1 branch (Johar Town), Lake City must be excluded
        self.assertEqual(len(branch_stats), 1)
        self.assertEqual(branch_stats[0]['id'], self.branch_a.id)
        self.assertEqual(branch_stats[0]['name'], "Johar Town")

        # Super-admin must see both branches
        self.client.force_authenticate(user=self.super_user)
        admin_response = self.client.get(f"/api/analytics/restaurant/{self.restaurant.id}/")
        self.assertEqual(admin_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(admin_response.data['branches']), 2)

    # --------------------------------------------------------------------------
    # FS-SEC-22: Registration & Password Reset Throttle Classes
    # --------------------------------------------------------------------------
    def test_fs_sec_22_throttle_classes_attached(self):
        """Verify throttle classes are configured on registration and password reset views."""
        from users.views import UserRegisterView, ForgotPasswordView
        from orders.views import OrderTrackView

        self.assertIn(RegistrationRateThrottle, UserRegisterView.throttle_classes)
        self.assertIn(PasswordResetRateThrottle, ForgotPasswordView.throttle_classes)
        self.assertIn(OrderTrackingThrottle, OrderTrackView.throttle_classes)
