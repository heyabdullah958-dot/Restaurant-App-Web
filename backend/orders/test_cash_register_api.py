from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APIRequestFactory, force_authenticate
from decimal import Decimal
from restaurants.models import Restaurant, Branch, BranchRider, MenuCategory, MenuItem
from orders.models import Order, OrderItem, CashSettlementLog
from orders.serializers import OrderCreateSerializer

User = get_user_model()

class CashRegisterAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.superadmin = User.objects.create_superuser(
            username='admin_boss', email='admin@test.com', password='password123'
        )
        self.restaurant = Restaurant.objects.create(
            name='Jushh PK', slug='jushhpk', cuisine_type='Burgers',
            address='DHA', city='Lahore', phone='03001234567',
            opens_at='00:00:00', closes_at='23:59:59',
            delivery_fee=Decimal('100.00'), min_order_amount=Decimal('500.00')
        )
        self.branch1 = Branch.objects.create(
            restaurant=self.restaurant, name='DHA Phase 1',
            address='Sector H', phone='03007654321', is_active=True,
            latitude=Decimal('31.470000'), longitude=Decimal('74.410000'),
            delivery_radius_km=Decimal('15.00')
        )
        self.branch2 = Branch.objects.create(
            restaurant=self.restaurant, name='Johar Town',
            address='R2 Phase 2', phone='03269946142', is_active=True,
            latitude=Decimal('31.460000'), longitude=Decimal('74.280000'),
            delivery_radius_km=Decimal('15.00')
        )
        self.rider1 = BranchRider.objects.create(
            branch=self.branch1, name='Ali Rider', phone='03211112233', status='AVAILABLE'
        )
        self.rider2 = BranchRider.objects.create(
            branch=self.branch2, name='Usman Rider', phone='03214445566', status='AVAILABLE'
        )
        self.category = MenuCategory.objects.create(
            restaurant=self.restaurant, name='Burgers'
        )
        self.menu_item = MenuItem.objects.create(
            category=self.category, name='Classic Smash',
            price=Decimal('850.00'), is_available=True,
            options=[
                {"name": "Extra Wagyu Smash Patty", "price_modifier": 350.0},
                {"name": "Smoked Cheddar Cheese Slice", "price_modifier": 90.0}
            ]
        )

        # Create branch manager user and linked ManagerProfile
        self.manager1 = User.objects.create_user(
            username='manager_jushhpk_dha_phase_1',
            email='manager.dha@foodsphere.com',
            password='password123',
            is_staff=True
        )
        from users.models import ManagerProfile
        ManagerProfile.objects.create(
            user=self.manager1,
            restaurant=self.restaurant,
            branch=self.branch1
        )

    def test_cash_register_flow_and_rider_settlement(self):
        self.client.force_authenticate(user=self.superadmin)

        # 1. Place order with valid options and kitchen notes
        order = Order.objects.create(
            restaurant=self.restaurant,
            branch=self.branch1,
            rider=self.rider1,
            guest_name='Test Customer',
            guest_phone='03009998877',
            payment_method='cod',
            status='delivered',
            subtotal=Decimal('1200.00'),
            delivery_fee=Decimal('100.00'),
            discount=Decimal('0.00'),
            total=Decimal('1300.00'),
            cod_settled=False
        )
        OrderItem.objects.create(
            order=order,
            menu_item=self.menu_item,
            quantity=1,
            unit_price=Decimal('1200.00'),
            total_price=Decimal('1200.00'),
            special_notes="Less spicy please",
            selected_options=[{"name": "Extra Wagyu Smash Patty", "price_modifier": 350.0}]
        )

        # 2. Query Cash Register API
        res = self.client.get('/api/admin/cash-register/')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn('summary', data)
        self.assertEqual(data['summary']['unsettled_rider_cash'], 1300.0)
        self.assertEqual(data['summary']['total_drawer_cash'], 0.0)
        rider_entry = next((r for r in data['riders'] if r['id'] == self.rider1.id), None)
        self.assertIsNotNone(rider_entry)
        self.assertEqual(rider_entry['unsettled_amount'], 1300.0)

        # 3. Settle Rider Cash
        settle_res = self.client.post('/api/admin/cash-register/settle/', {
            'rider_id': self.rider1.id,
            'notes': 'End of day handover from Ali'
        }, format='json')
        self.assertEqual(settle_res.status_code, 200)
        settle_data = settle_res.json()
        self.assertTrue(settle_data['success'])
        self.assertEqual(settle_data['amount_settled'], 1300.0)

        # Re-fetch order and assert settled
        order.refresh_from_db()
        self.assertTrue(order.cod_settled)
        self.assertIsNotNone(order.cod_settled_at)

        # Check CashSettlementLog created
        log = CashSettlementLog.objects.filter(rider=self.rider1).first()
        self.assertIsNotNone(log)
        self.assertEqual(log.amount_settled, Decimal('1300.00'))
        self.assertEqual(log.settled_by, self.superadmin)

        # Check register summary again: unsettled should now be 0, drawer cash should be 1300
        res2 = self.client.get('/api/admin/cash-register/')
        data2 = res2.json()
        self.assertEqual(data2['summary']['unsettled_rider_cash'], 0.0)
        self.assertEqual(data2['summary']['total_drawer_cash'], 1300.0)
        rider_entry2 = next((r for r in data2['riders'] if r['id'] == self.rider1.id), None)
        self.assertEqual(rider_entry2['unsettled_amount'], 0.0)

    def test_settle_unassigned_order_without_rider_no_integrity_error(self):
        """
        Verify that direct counter orders or self-pickup orders (where rider is None)
        can be settled via order_ids without throwing NOT NULL constraint IntegrityError.
        """
        self.client.force_authenticate(user=self.superadmin)

        direct_order = Order.objects.create(
            restaurant=self.restaurant,
            branch=self.branch1,
            rider=None,  # No rider assigned (walk-in / counter order)
            guest_name='Walkin Customer',
            guest_phone='03001122334',
            payment_method='cod',
            status='delivered',
            subtotal=Decimal('850.00'),
            delivery_fee=Decimal('0.00'),
            discount=Decimal('0.00'),
            total=Decimal('850.00'),
            cod_settled=False
        )

        # Settle via order_ids directly
        settle_res = self.client.post('/api/admin/cash-register/settle/', {
            'order_ids': [direct_order.id],
            'notes': 'Direct walk-in counter settlement'
        }, format='json')
        self.assertEqual(settle_res.status_code, 200)
        self.assertTrue(settle_res.json()['success'])

        direct_order.refresh_from_db()
        self.assertTrue(direct_order.cod_settled)

        # Assert CashSettlementLog exists with rider=None
        log = CashSettlementLog.objects.filter(amount_settled=Decimal('850.00')).first()
        self.assertIsNotNone(log)
        self.assertIsNone(log.rider)
        self.assertEqual(log.amount_settled, Decimal('850.00'))
        self.assertIn(direct_order.id, log.order_ids)

    def test_unassigned_direct_orders_surfaced_in_cash_register_riders_list(self):
        """
        Verify that unassigned/direct COD orders are surfaced in riders_list
        so managers can see and 1-click settle them.
        """
        self.client.force_authenticate(user=self.superadmin)

        Order.objects.create(
            restaurant=self.restaurant,
            branch=self.branch1,
            rider=None,
            guest_name='Dine In Customer',
            guest_phone='03001122334',
            payment_method='cod',
            order_type='DINE_IN',
            status='delivered',
            subtotal=Decimal('940.00'),
            delivery_fee=Decimal('0.00'),
            discount=Decimal('0.00'),
            total=Decimal('940.00'),
            cod_settled=False
        )

        res = self.client.get(f'/api/admin/cash-register/?branch_id={self.branch1.id}')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        direct_entry = next((r for r in data['riders'] if r['id'] is None), None)
        self.assertIsNotNone(direct_entry, "Direct / Counter Orders entry must appear in riders list")
        self.assertEqual(direct_entry['unsettled_amount'], 940.0)
        self.assertEqual(direct_entry['unsettled_orders_count'], 1)

    def test_order_create_serializer_anti_tampering_enforces_db_prices(self):
        """
        Verify that OrderCreateSerializer strictly validates selected_options against
        database MenuItem.options, rejecting or overwriting client-tampered prices.
        """
        customer = User.objects.create_user(
            username='tamper_tester', email='tamper@test.com', password='password123',
            phone='03009991122'
        )
        factory = APIRequestFactory()
        req = factory.post('/api/orders/')
        req.user = customer

        # Attempt to pass a negative price_modifier and an unregistered option
        payload = {
            'restaurant': self.restaurant.id,
            'branch': self.branch1.id,
            'order_type': 'DELIVERY',
            'delivery_address': 'Sector H, DHA Phase 1, Lahore',
            'delivery_lat': 31.470000,
            'delivery_lng': 74.410000,
            'guest_phone': '03009991122',
            'items': [
                {
                    'menu_item': self.menu_item.id,
                    'quantity': 1,
                    'selected_options': [
                        # Spoofed price: client claims it costs Rs. 10 instead of DB Rs. 350
                        {'name': 'Extra Wagyu Smash Patty', 'price_modifier': 10.0},
                        # Malicious spoof: negative price
                        {'name': 'Smoked Cheddar Cheese Slice', 'price_modifier': -500.0},
                        # Non-existent option
                        {'name': 'Free Diamond Topping', 'price_modifier': -999.0}
                    ],
                    'special_notes': 'Please pack separately'
                }
            ]
        }

        serializer = OrderCreateSerializer(data=payload, context={'request': req})
        self.assertTrue(serializer.is_valid(), serializer.errors)
        order = serializer.save()

        # Check calculated subtotal:
        # Base price: 850.00
        # Extra Wagyu Smash Patty (from DB): +350.00
        # Smoked Cheddar Cheese Slice (from DB): +90.00
        # Free Diamond Topping (not in DB): +0.00
        # Expected Item Unit Price: 850 + 350 + 90 = 1290.00
        order_item = order.items.first()
        self.assertEqual(order_item.unit_price, Decimal('1290.00'))
        self.assertEqual(order.subtotal, Decimal('1290.00'))
        self.assertEqual(order_item.special_notes, 'Please pack separately')

        # Check sanitized_selected_options stored on OrderItem
        stored_opts = order_item.selected_options
        patty_opt = next((o for o in stored_opts if o['name'] == 'Extra Wagyu Smash Patty'), None)
        self.assertIsNotNone(patty_opt)
        self.assertEqual(patty_opt['price_modifier'], 350.0)

        cheese_opt = next((o for o in stored_opts if o['name'] == 'Smoked Cheddar Cheese Slice'), None)
        self.assertIsNotNone(cheese_opt)
        self.assertEqual(cheese_opt['price_modifier'], 90.0)

        diamond_opt = next((o for o in stored_opts if o['name'] == 'Free Diamond Topping'), None)
        self.assertIsNotNone(diamond_opt)
        self.assertEqual(diamond_opt['price_modifier'], 0.0)

    def test_branch_manager_cannot_settle_other_branch_orders(self):
        """
        Verify that a branch manager cannot settle orders or riders belonging to another branch.
        """
        self.client.force_authenticate(user=self.manager1)

        other_branch_order = Order.objects.create(
            restaurant=self.restaurant,
            branch=self.branch2,  # Belongs to branch2, but manager1 manages branch1
            rider=self.rider2,
            guest_name='Other Branch Customer',
            guest_phone='03009998877',
            payment_method='cod',
            status='delivered',
            subtotal=Decimal('850.00'),
            delivery_fee=Decimal('100.00'),
            discount=Decimal('0.00'),
            total=Decimal('950.00'),
            cod_settled=False
        )

        # Manager1 attempts to settle rider2 from branch2
        res = self.client.post('/api/admin/cash-register/settle/', {
            'rider_id': self.rider2.id,
            'notes': 'Malicious cross-branch attempt'
        }, format='json')
        self.assertEqual(res.status_code, 403)

        # Manager1 attempts to settle other branch's order by order_ids
        res2 = self.client.post('/api/admin/cash-register/settle/', {
            'order_ids': [other_branch_order.id],
            'notes': 'Malicious order IDOR attempt'
        }, format='json')
        # Since orders_to_settle is filtered by branch1, no matching orders are found
        self.assertEqual(res2.status_code, 400)
        other_branch_order.refresh_from_db()
        self.assertFalse(other_branch_order.cod_settled)
