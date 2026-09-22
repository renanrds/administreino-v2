from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from users.access import user_has_moneyger_access

User = get_user_model()


class AdminUsersApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(
            username='root', email='root@example.com', password='x',
        )
        self.other = User.objects.create_user(
            username='ana', email='ana@example.com', password='x', first_name='Ana',
        )

    def test_non_superuser_forbidden(self):
        self.client.force_authenticate(self.other)
        listing = self.client.get('/api/auth/admin/users/')
        self.assertEqual(listing.status_code, 403)
        update = self.client.patch(
            f'/api/auth/admin/users/{self.other.id}/',
            {'moneyger_enabled': True},
            format='json',
        )
        self.assertEqual(update.status_code, 403)

    def test_enable_moneyger_for_another_user(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(
            f'/api/auth/admin/users/{self.other.id}/',
            {'moneyger_enabled': True},
            format='json',
        )
        self.assertEqual(res.status_code, 200)
        self.other.refresh_from_db()
        self.assertTrue(self.other.moneyger_enabled)
        self.assertTrue(res.data['moneyger'])

        self.client.force_authenticate(self.other)
        profile = self.client.get('/api/auth/profile/')
        self.assertEqual(profile.status_code, 200)
        self.assertTrue(profile.data['apps']['moneyger'])

    def test_allowlist_still_grants_access_without_flag(self):
        listed = User.objects.create_user(
            username='renanrds', email='renan@example.com', password='x',
        )
        self.assertFalse(listed.moneyger_enabled)
        self.assertTrue(user_has_moneyger_access(listed))

    def test_cannot_deactivate_own_account(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(
            f'/api/auth/admin/users/{self.admin.id}/',
            {'is_active': False},
            format='json',
        )
        self.assertEqual(res.status_code, 400)
        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)
