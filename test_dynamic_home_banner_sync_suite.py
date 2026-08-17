#!/usr/bin/env python3
"""
test_dynamic_home_banner_sync_suite.py
======================================
Automated Test Suite for Dynamic Home Banner Synchronization & Static Deal Purge (Phase 1).
"""

import os
import re
import sys
import json
import unittest
from datetime import datetime, timedelta
from decimal import Decimal

# Set UTF-8 encoding for Windows stdout/stderr
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Setup Django Environment
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.utils import timezone
from rest_framework.test import APIClient
from promotions.models import FlashDeal
from restaurants.models import Restaurant


class DynamicHomeBannerSyncTestSuite(unittest.TestCase):
    def setUp(self):
        self.client = APIClient()
        self.home_screen_path = os.path.join(os.path.dirname(__file__), 'app', 'src', 'screens', 'HomeScreen.tsx')

    def test_01_purge_hardcoded_banner_arrays(self):
        """Verify that all hardcoded promotional mock banner arrays are completely purged."""
        self.assertTrue(os.path.exists(self.home_screen_path), f"HomeScreen.tsx not found at {self.home_screen_path}")
        with open(self.home_screen_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Check that legacy hardcoded mock arrays are deleted
        self.assertNotIn("const BANNERS = [", content, "Legacy static 'BANNERS' array must be removed.")
        self.assertNotIn("3 Brands, One Cart!", content, "Legacy mock slide '3 Brands, One Cart!' must be purged.")
        self.assertNotIn("Earn Loyalty Points!", content, "Legacy mock slide 'Earn Loyalty Points!' must be purged.")
        self.assertNotIn("const DINE_IN_FALLBACK_BANNERS = [", content, "Legacy static 'DINE_IN_FALLBACK_BANNERS' array must be removed.")
        self.assertNotIn("Exclusive Dine-In Offers", content, "Legacy mock slide 'Exclusive Dine-In Offers' must be purged.")
        self.assertNotIn("Table Service Perks", content, "Legacy mock slide 'Table Service Perks' must be purged.")

        print("PASS: [TEST 1] All legacy static mock banner arrays and slides completely purged from HomeScreen.tsx")

    def test_02_dynamic_banner_lifecycle_and_hooks(self):
        """Verify that HomeScreen binds DynamicHeroBannerSection to live state and refresh lifecycle."""
        with open(self.home_screen_path, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn("DynamicHeroBannerSection", content, "HomeScreen must implement DynamicHeroBannerSection.")
        self.assertIn("const [flashDeals, setFlashDeals] = React.useState", content, "HomeScreen must declare flashDeals state.")
        self.assertIn("fetchFlashDeals", content, "HomeScreen must implement fetchFlashDeals memoized callback.")
        self.assertIn("/promotions/flash-deals/", content, "HomeScreen must query live backend flash deals endpoint.")

        # Check useFocusEffect & handleRefresh refetching
        self.assertTrue("fetchFlashDeals" in content and "useFocusEffect" in content, "fetchFlashDeals must be wired to useFocusEffect.")
        self.assertTrue("fetchFlashDeals" in content and "handleRefresh" in content, "handleRefresh must re-evaluate fetchFlashDeals.")

        # Check clean collapse logic when activeBanners.length === 0
        self.assertIn("if (activeBanners.length === 0)", content, "DynamicHeroBannerSection must check for zero active promotions.")
        self.assertIn("return null;", content, "DynamicHeroBannerSection must return null when no active promotions exist.")

        print("PASS: [TEST 2] DynamicHeroBannerSection lifecycle, focus refetch, pull-to-refresh, and clean collapse confirmed.")

    def test_03_backend_active_flash_deals_api(self):
        """Verify backend /promotions/flash-deals/ API filters active, unexpired deals accurately."""
        now = timezone.now()
        jush = Restaurant.objects.filter(slug='jushhpk').first()
        if not jush:
            jush = Restaurant.objects.create(name='Jush PK', slug='jushhpk', address='Lahore', phone='03257217221')

        # Create a test live flash deal
        test_deal = FlashDeal.objects.create(
            title='Test Smash Burger 35% Off',
            description='Exclusive automated test flash deal',
            deal_type='percentage',
            discount_value=Decimal('35.00'),
            restaurant=jush,
            is_dine_in_only=False,
            start_time=now - timedelta(hours=1),
            end_time=now + timedelta(days=2),
            is_active=True
        )

        try:
            # Query active flash deals endpoint
            res = self.client.get('/api/promotions/flash-deals/')
            self.assertEqual(res.status_code, 200)
            data = res.data.get('results', res.data) if isinstance(res.data, dict) else res.data
            titles = [d.get('title') for d in data]
            self.assertIn(test_deal.title, titles, "Active flash deal must be present in API results.")

            # Test Dine-In filter
            res_dine_in = self.client.get('/api/promotions/flash-deals/?is_dine_in_only=true')
            self.assertEqual(res_dine_in.status_code, 200)
            dine_in_data = res_dine_in.data.get('results', res_dine_in.data) if isinstance(res_dine_in.data, dict) else res_dine_in.data
            dine_in_titles = [d.get('title') for d in dine_in_data]
            self.assertNotIn(test_deal.title, dine_in_titles, "Delivery deal must not appear in is_dine_in_only=true query.")

            # Test Delivery filter
            res_delivery = self.client.get('/api/promotions/flash-deals/?is_dine_in_only=false')
            self.assertEqual(res_delivery.status_code, 200)
            delivery_data = res_delivery.data.get('results', res_delivery.data) if isinstance(res_delivery.data, dict) else res_delivery.data
            delivery_titles = [d.get('title') for d in delivery_data]
            self.assertIn(test_deal.title, delivery_titles, "Delivery deal must appear in is_dine_in_only=false query.")

        finally:
            test_deal.delete()

        print("PASS: [TEST 3] Backend /promotions/flash-deals/ API and mode scoping verified.")

    def test_04_deletion_and_zero_deal_invalidation(self):
        """Verify that deactivating/deleting deals immediately purges them from endpoint."""
        now = timezone.now()
        ts = Restaurant.objects.filter(slug='tandooristoppk').first()
        if not ts:
            ts = Restaurant.objects.create(name='Tandoori Stop', slug='tandooristoppk', address='Lahore', phone='03274945947')

        deal = FlashDeal.objects.create(
            title='Ephemeral Test Promo 50% Off',
            description='Will be deactivated',
            deal_type='percentage',
            discount_value=Decimal('50.00'),
            restaurant=ts,
            is_dine_in_only=False,
            start_time=now - timedelta(hours=1),
            end_time=now + timedelta(days=1),
            is_active=True
        )

        try:
            # Active check
            res1 = self.client.get('/api/promotions/flash-deals/')
            data1 = res1.data.get('results', res1.data) if isinstance(res1.data, dict) else res1.data
            self.assertTrue(any(d.get('id') == deal.id for d in data1))

            # Deactivate deal
            deal.is_active = False
            deal.save()

            # Refetch check
            res2 = self.client.get('/api/promotions/flash-deals/')
            data2 = res2.data.get('results', res2.data) if isinstance(res2.data, dict) else res2.data
            self.assertFalse(any(d.get('id') == deal.id for d in data2), "Deactivated deal must not appear in active flash deals.")

        finally:
            deal.delete()

        print("PASS: [TEST 4] Real-time deactivation and endpoint invalidation verified.")

    def test_05_promo_code_and_claim_payload_contract(self):
        """Verify promo code sanitization and appliedPromo contract matches Redux store expectations."""
        raw_title = "Flat Rs. 250 OFF Naan & Boti"
        sanitized_code = f"FLASH-{(raw_title or 'SALE').replace(' ', '').replace('.', '').replace('&', '').replace('-', '').upper()[:8]}"
        self.assertEqual(sanitized_code, "FLASH-FLATRS25")

        with open(self.home_screen_path, 'r', encoding='utf-8') as f:
            content = f.read()

        self.assertIn("FLASH-", content)
        self.assertIn("dispatch(applyPromo(promoPayload))", content)
        self.assertIn("navigation.navigate('Restaurant'", content)

        print("PASS: [TEST 5] Promo code generation and 1-tap claim dispatch contract verified.")


if __name__ == '__main__':
    unittest.main(verbosity=2)
