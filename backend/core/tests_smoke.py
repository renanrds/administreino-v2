"""Smoke tests mínimos para CI — não fingem cobertura de domínio."""

from django.conf import settings
from django.test import SimpleTestCase, TestCase


class SettingsSmokeTests(SimpleTestCase):
    def test_auth_user_model(self):
        self.assertEqual(settings.AUTH_USER_MODEL, 'users.User')

    def test_secret_key_present(self):
        self.assertTrue(settings.SECRET_KEY)


class DbSmokeTests(TestCase):
    def test_database_roundtrip(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = User.objects.create_user(
            username='ci_smoke',
            email='ci_smoke@example.com',
            password='test-pass-not-secret',
        )
        self.assertEqual(User.objects.filter(pk=user.pk).count(), 1)
