import stripe
from django.conf import settings
from django.utils import timezone

from cards.models import Profile


stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")


class StripeWebhookError(Exception):
    pass


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


def handle_checkout_completed(event_data: dict):
    customer_id = event_data.get("customer")
    subscription_id = event_data.get("subscription")

    profile = Profile.objects.filter(stripe_customer_id=customer_id).first()
    if not profile:
        raise StripeWebhookError("Profile não encontrado para customer informado.")

    profile.plan = Profile.PlanChoices.PRO
    profile.stripe_subscription_id = subscription_id or ""
    profile.is_trial_active = False
    profile.save(update_fields=["plan", "stripe_subscription_id", "is_trial_active"])


def handle_invoice_paid(event_data: dict):
    customer_id = event_data.get("customer")
    period_end = event_data.get("lines", {}).get("data", [{}])[0].get("period", {}).get("end")

    profile = Profile.objects.filter(stripe_customer_id=customer_id).first()
    if not profile:
        raise StripeWebhookError("Profile não encontrado para invoice informado.")

    profile.plan = Profile.PlanChoices.PRO
    if period_end:
        profile.subscription_end_date = timezone.datetime.fromtimestamp(period_end, tz=timezone.utc)
    profile.save(update_fields=["plan", "subscription_end_date"])


def handle_subscription_deleted(event_data: dict):
    customer_id = event_data.get("customer")
    ended_at = event_data.get("current_period_end")

    profile = Profile.objects.filter(stripe_customer_id=customer_id).first()
    if not profile:
        raise StripeWebhookError("Profile não encontrado para subscription informada.")

    # grace period: mantém PRO até o fim do período
    if ended_at:
        profile.subscription_end_date = timezone.datetime.fromtimestamp(ended_at, tz=timezone.utc)
    profile.save(update_fields=["subscription_end_date"])