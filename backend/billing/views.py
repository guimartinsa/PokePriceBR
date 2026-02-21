import stripe

from django.conf import settings
from django.views.decorators.csrf import csrf_exempt

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.services import get_or_create_profile
from billing.services import (
    BillingConfigurationError,
    StripeWebhookError,
    create_checkout_session,
    handle_checkout_completed,
    handle_invoice_paid,
    handle_subscription_updated,
    handle_subscription_deleted,
)
from core_permissions.services import PlanLimitError, apply_trial


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_checkout_session_view(request):
    profile = get_or_create_profile(request.user)
    try:
        checkout = create_checkout_session(profile)
    except BillingConfigurationError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except stripe.error.StripeError as exc:
        return Response(
            {"detail": f"Erro ao criar sessão de checkout no Stripe: {exc.user_message or str(exc)}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )
    return Response({"checkout_url": checkout.url}, status=status.HTTP_201_CREATED)


@csrf_exempt
@api_view(["POST"])
def stripe_webhook_view(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE")

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=sig_header,
            secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except ValueError:
        return Response({"detail": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)
    except stripe.error.SignatureVerificationError:
        return Response({"detail": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

    event_type = event.get("type")
    data = event.get("data", {}).get("object", {})

    try:
        if event_type == "checkout.session.completed":
            handle_checkout_completed(data)
        elif event_type == "invoice.paid":
            handle_invoice_paid(data)
        elif event_type == "customer.subscription.updated":
            handle_subscription_updated(data)
        elif event_type == "customer.subscription.deleted":
            handle_subscription_deleted(data)
    except StripeWebhookError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    return Response({"received": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def activate_trial_view(request):
    profile = get_or_create_profile(request.user)
    try:
        apply_trial(profile)
    except PlanLimitError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"status": "ok", "plan": profile.plan, "trial_until": profile.subscription_end_date})