from unittest.mock import patch

import stripe
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient


class CreateCheckoutSessionViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username="tester",
            email="tester@example.com",
            password="12345678",
        )
        self.client.force_authenticate(self.user)
        self.url = "/api/billing/checkout/session/"

    @patch("billing.views.create_checkout_session")
    def test_returns_400_when_stripe_configuration_is_missing(self, mock_create_checkout):
        from billing.services import BillingConfigurationError

        mock_create_checkout.side_effect = BillingConfigurationError("Configuração Stripe incompleta")

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["detail"], "Configuração Stripe incompleta")

    @patch("billing.views.create_checkout_session")
    def test_returns_502_when_stripe_api_fails(self, mock_create_checkout):
        mock_create_checkout.side_effect = stripe.error.APIError("Stripe down")

        response = self.client.post(self.url)

        self.assertEqual(response.status_code, 502)
        self.assertIn("Erro ao criar sessão de checkout no Stripe", response.data["detail"])