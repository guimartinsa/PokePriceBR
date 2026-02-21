from django.urls import path

from billing.views import activate_trial_view, confirm_checkout_session_view, create_checkout_session_view, stripe_webhook_view


urlpatterns = [
    path("checkout/session/", create_checkout_session_view, name="billing-checkout-session"),
    path("checkout/confirm/", confirm_checkout_session_view, name="billing-checkout-confirm"),
    path("webhooks/stripe/", stripe_webhook_view, name="billing-stripe-webhook"),
    path("trial/activate/", activate_trial_view, name="billing-trial-activate"),
]
