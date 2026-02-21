from unittest.mock import patch

import stripe
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from billing.services import (
    handle_checkout_completed,
    handle_invoice_paid,
    handle_subscription_updated,
)
from cards.models import Profile


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


class CheckoutCompletedWebhookTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="webhook-user",
            email="webhook@example.com",
            password="12345678",
        )
        self.profile = Profile.objects.create(user=self.user)

    def test_updates_plan_by_metadata_user_id_when_customer_not_mapped(self):
        event_data = {
            "customer": "cus_test_123",
            "subscription": "sub_test_123",
            "metadata": {"user_id": self.user.id},
            "customer_email": self.user.email,
        }

        handle_checkout_completed(event_data)

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.plan, Profile.PlanChoices.PRO)
        self.assertEqual(self.profile.stripe_subscription_id, "sub_test_123")
        self.assertEqual(self.profile.stripe_customer_id, "cus_test_123")


class InvoicePaidWebhookTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="invoice-user",
            email="invoice@example.com",
            password="12345678",
        )
        self.profile = Profile.objects.create(
            user=self.user,
            stripe_customer_id="cus_invoice_123",
            is_trial_active=True,
        )

    def test_updates_subscription_and_disables_trial(self):
        event_data = {
            "customer": "cus_invoice_123",
            "subscription": "sub_invoice_123",
            "lines": {"data": [{"period": {"end": 1735689600}}]},
        }

        handle_invoice_paid(event_data)

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.plan, Profile.PlanChoices.PRO)
        self.assertEqual(self.profile.stripe_subscription_id, "sub_invoice_123")
        self.assertFalse(self.profile.is_trial_active)
        self.assertIsNotNone(self.profile.subscription_end_date)

    def test_matches_profile_by_subscription_id_when_customer_is_missing(self):
        self.profile.stripe_subscription_id = "sub_invoice_999"
        self.profile.save(update_fields=["stripe_subscription_id"])

        event_data = {
            "subscription": "sub_invoice_999",
            "period_end": 1735689600,
        }

        handle_invoice_paid(event_data)

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.plan, Profile.PlanChoices.PRO)
        self.assertIsNotNone(self.profile.subscription_end_date)


class SubscriptionUpdatedWebhookTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="subscription-user",
            email="subscription@example.com",
            password="12345678",
        )
        self.profile = Profile.objects.create(
            user=self.user,
            stripe_customer_id="cus_sub_123",
            is_trial_active=True,
        )

    def test_updates_profile_plan_and_period_end(self):
        event_data = {
            "id": "sub_sub_123",
            "customer": "cus_sub_123",
            "current_period_end": 1735689600,
        }

        handle_subscription_updated(event_data)

        self.profile.refresh_from_db()
        self.assertEqual(self.profile.plan, Profile.PlanChoices.PRO)
        self.assertEqual(self.profile.stripe_subscription_id, "sub_sub_123")
        self.assertFalse(self.profile.is_trial_active)
        self.assertIsNotNone(self.profile.subscription_end_date)