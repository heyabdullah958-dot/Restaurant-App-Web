import os
import sys
import datetime
import django
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()

class DineInPostsTestSuite(TestCase):
    def setUp(self):
        self.client = APIClient()
        from restaurants.models import Restaurant, MenuCategory, MenuItem, RestaurantMediaPost, Branch
        from users.models import ManagerProfile

        # Setup 2 restaurants
        self.dab = Restaurant.objects.create(
            name="Dine At Blue Test",
            slug="dab-test",
            is_active=True,
            opens_at=datetime.time(11, 0),
            closes_at=datetime.time(23, 0)
        )
        self.ts = Restaurant.objects.create(
            name="Tandoori Stop Test",
            slug="ts-test",
            is_active=True,
            opens_at=datetime.time(11, 0),
            closes_at=datetime.time(23, 0)
        )

        self.dab_branch = Branch.objects.create(
            restaurant=self.dab,
            name="DAB Gulberg Branch",
            address="Gulberg III, Lahore",
            phone="03001234567"
        )
        self.ts_branch = Branch.objects.create(
            restaurant=self.ts,
            name="TS Johar Town Branch",
            address="Johar Town, Lahore",
            phone="03001234568"
        )

        # Setup menu item
        self.dab_cat = MenuCategory.objects.create(restaurant=self.dab, name="Seafood")
        self.dab_item = MenuItem.objects.create(
            category=self.dab_cat,
            name="Test Steam Prawns",
            price=1200.00,
            is_available=True
        )

        # Superadmin
        self.superadmin = User.objects.create_superuser('superadmin', 'admin@example.com', 'AdminPass123!')

        # DAB Manager
        self.dab_manager = User.objects.create_user('dab_mgr', 'dab@example.com', 'ManagerPass123!')
        ManagerProfile.objects.create(user=self.dab_manager, restaurant=self.dab, branch=self.dab_branch)

        # TS Manager
        self.ts_manager = User.objects.create_user('ts_mgr', 'ts@example.com', 'ManagerPass123!')
        ManagerProfile.objects.create(user=self.ts_manager, restaurant=self.ts, branch=self.ts_branch)

        # Regular customer
        self.customer = User.objects.create_user('customer_jane', 'jane@example.com', 'CustomerPass123!')

    def test_01_public_feed_retrieves_active_posts_with_linked_item(self):
        from restaurants.models import RestaurantMediaPost
        # Create an active post and an inactive post
        RestaurantMediaPost.objects.create(
            restaurant=self.dab,
            title="DAB Active Highlight",
            caption="Delicious live sizzle",
            media_type="VIDEO",
            media_url="https://example.com/video1.mp4",
            linked_menu_item=self.dab_item,
            is_active=True
        )
        RestaurantMediaPost.objects.create(
            restaurant=self.dab,
            title="DAB Inactive Highlight",
            caption="Old draft",
            media_type="VIDEO",
            media_url="https://example.com/video2.mp4",
            is_active=False
        )

        # Public unauthenticated request
        response = self.client.get('/api/dine-in-posts/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        posts = response.data
        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0]['title'], "DAB Active Highlight")
        self.assertIsNotNone(posts[0]['linked_item_details'])
        self.assertEqual(posts[0]['linked_item_details']['name'], "Test Steam Prawns")
        self.assertEqual(posts[0]['linked_item_details']['price'], 1200.0)

    def test_02_customer_cannot_create_or_delete_posts(self):
        self.client.force_authenticate(user=self.customer)
        create_res = self.client.post('/api/dine-in-posts/', {
            'restaurant': self.dab.id,
            'title': 'Hacker Post',
            'media_url': 'https://example.com/hacked.mp4',
            'media_type': 'VIDEO'
        })
        self.assertEqual(create_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_03_manager_creates_and_scoping_enforced(self):
        self.client.force_authenticate(user=self.dab_manager)
        response = self.client.post('/api/dine-in-posts/', {
            'title': 'DAB Manager Reel',
            'caption': 'Fresh fish in butter sauce',
            'media_type': 'VIDEO',
            'media_url': 'https://example.com/manager.mp4',
            'linked_menu_item': self.dab_item.id,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['restaurant'], self.dab.id)
        self.assertEqual(response.data['quota_message'], '1 / 10 slots used')

    def test_04_cross_tenant_isolation(self):
        from restaurants.models import RestaurantMediaPost
        # DAB Manager creates a post
        dab_post = RestaurantMediaPost.objects.create(
            restaurant=self.dab,
            title="DAB Exclusive Video",
            media_url="https://example.com/dab.mp4",
            is_active=True
        )

        # TS Manager tries to update DAB's post -> HTTP 403
        self.client.force_authenticate(user=self.ts_manager)
        update_res = self.client.patch(f'/api/dine-in-posts/{dab_post.id}/', {
            'title': 'Hijacked Title'
        })
        self.assertEqual(update_res.status_code, status.HTTP_403_FORBIDDEN)

        # TS Manager tries to delete DAB's post -> HTTP 403
        del_res = self.client.delete(f'/api/dine-in-posts/{dab_post.id}/')
        self.assertEqual(del_res.status_code, status.HTTP_403_FORBIDDEN)

        # DAB Manager deletes own post -> HTTP 204
        self.client.force_authenticate(user=self.dab_manager)
        own_del = self.client.delete(f'/api/dine-in-posts/{dab_post.id}/')
        self.assertEqual(own_del.status_code, status.HTTP_204_NO_CONTENT)

    def test_05_fifo_auto_cleanup_at_10_posts(self):
        from restaurants.models import RestaurantMediaPost
        self.client.force_authenticate(user=self.dab_manager)

        # Create 12 posts sequentially
        post_ids = []
        for i in range(1, 13):
            res = self.client.post('/api/dine-in-posts/', {
                'title': f'DAB Video Reel #{i}',
                'media_url': f'https://example.com/video_{i}.mp4',
                'media_type': 'VIDEO'
            })
            self.assertEqual(res.status_code, status.HTTP_201_CREATED)
            post_ids.append(res.data['id'])

        # Total remaining in DB for DAB must be exactly 10
        dab_posts = list(RestaurantMediaPost.objects.filter(restaurant=self.dab).order_by('id'))
        self.assertEqual(len(dab_posts), 10)

        # The first 2 created posts (#1 and #2) must have been purged
        remaining_ids = [p.id for p in dab_posts]
        self.assertNotIn(post_ids[0], remaining_ids)
        self.assertNotIn(post_ids[1], remaining_ids)
        self.assertIn(post_ids[10], remaining_ids)
        self.assertIn(post_ids[11], remaining_ids)
