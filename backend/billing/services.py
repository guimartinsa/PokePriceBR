import stripe
from django.conf import settings
from django.utils import timezone

from cards.models import Profile


stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")


class StripeWebhookError(Exception):
    pass


class BillingConfigurationError(Exception):
    pass


def validate_stripe_configuration():
    required_settings = {
        "STRIPE_SECRET_KEY": settings.STRIPE_SECRET_KEY,
        "STRIPE_PRO_PRICE_ID": settings.STRIPE_PRO_PRICE_ID,
        "STRIPE_SUCCESS_URL": settings.STRIPE_SUCCESS_URL,
        "STRIPE_CANCEL_URL": settings.STRIPE_CANCEL_URL,
    }

    missing = [name for name, value in required_settings.items() if not value]
    if missing:
        raise BillingConfigurationError(
            "Configuração Stripe incompleta. Defina: " + ", ".join(missing)
        )


def create_or_get_stripe_customer(profile: Profile):
    if profile.stripe_customer_id:
        return profile.stripe_customer_id

    customer = stripe.Customer.create(
        email=profile.user.email,
        name=profile.user.first_name,
        metadata={"user_id": profile.user_id},
    )
    profile.stripe_customer_id = customer["id"]
    profile.save(update_fields=["stripe_customer_id"])
    return profile.stripe_customer_id


def create_checkout_session(profile: Profile):
    validate_stripe_configuration()
    customer_id = create_or_get_stripe_customer(profile)

    return stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        payment_method_types=["card"],
        line_items=[{"price": settings.STRIPE_PRO_PRICE_ID, "quantity": 1}],
        success_url=settings.STRIPE_SUCCESS_URL,
        cancel_url=settings.STRIPE_CANCEL_URL,
        metadata={"user_id": profile.user_id},
    )


def _resolve_profile_from_event(event_data: dict, event_name: str):
    customer_id = event_data.get("customer")
    metadata = event_data.get("metadata") or {}
    user_id = metadata.get("user_id")
    customer_details = event_data.get("customer_details") or {}
    customer_email = customer_details.get("email") or event_data.get("customer_email")

    profile = None
    if customer_id:
        profile = Profile.objects.filter(stripe_customer_id=customer_id).first()

    if not profile and user_id:
        profile = Profile.objects.filter(user_id=user_id).first()

    if not profile and customer_email:
        profile = Profile.objects.filter(user__email__iexact=customer_email).first()

    if not profile:
        raise StripeWebhookError(
            f"Profile não encontrado para evento {event_name}. customer={customer_id}, user_id={user_id}, email={customer_email}"
        )

    if customer_id and profile.stripe_customer_id != customer_id:
        profile.stripe_customer_id = customer_id
        profile.save(update_fields=["stripe_customer_id"])

    return profile


def handle_checkout_completed(event_data: dict):
    profile = _resolve_profile_from_event(event_data, "checkout.session.completed")
    subscription_id = event_data.get("subscription")

    profile.plan = Profile.PlanChoices.PRO
    profile.stripe_subscription_id = subscription_id or ""
    profile.is_trial_active = False
    profile.subscription_end_date = None
    profile.save(
        update_fields=[
            "plan",
            "stripe_subscription_id",
            "is_trial_active",
            "subscription_end_date",
        ]
    )


def handle_invoice_paid(event_data: dict):
    profile = _resolve_profile_from_event(event_data, "invoice.paid")
    period_end = event_data.get("lines", {}).get("data", [{}])[0].get("period", {}).get("end")
    subscription_id = event_data.get("subscription")

    profile.plan = Profile.PlanChoices.PRO
    profile.is_trial_active = False
    if subscription_id:
        profile.stripe_subscription_id = subscription_id
    if period_end:
        profile.subscription_end_date = timezone.datetime.fromtimestamp(period_end, tz=timezone.utc)
    profile.save(
        update_fields=[
            "plan",
            "subscription_end_date",
            "is_trial_active",
            "stripe_subscription_id",
        ]
    )


def handle_subscription_deleted(event_data: dict):
    profile = _resolve_profile_from_event(event_data, "customer.subscription.deleted")
    ended_at = event_data.get("current_period_end")

    # grace period: mantém PRO até o fim do período
    if ended_at:
        profile.subscription_end_date = timezone.datetime.fromtimestamp(ended_at, tz=timezone.utc)
    profile.save(update_fields=["subscription_end_date"])
