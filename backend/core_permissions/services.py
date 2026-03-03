from datetime import timedelta

from django.utils import timezone

from cards.models import Collection, CollectionCard


FREE_COLLECTION_LIMIT = 1
FREE_COLLECTION_CARDS_LIMIT = 250
PRO_COLLECTION_CARDS_LIMIT = 400
FREE_API_DAILY_LIMIT = 100


class PlanLimitError(Exception):
    pass


def enforce_collection_creation_limit(profile):
    if profile.is_admin_plan or profile.can_access_pro_features:
        return

    current_count = Collection.objects.filter(user=profile.user).count()
    if current_count >= FREE_COLLECTION_LIMIT:
        raise PlanLimitError("Plano FREE permite apenas 1 coleção.")


def enforce_card_creation_limit(profile, collection):
    if profile.is_admin_plan:
        return

    limit = PRO_COLLECTION_CARDS_LIMIT if profile.can_access_pro_features else FREE_COLLECTION_CARDS_LIMIT
    total_cards = CollectionCard.objects.filter(collection=collection).count()

    if total_cards >= limit:
        plan_name = "PREMIUM" if profile.can_access_pro_features else "FREE"
        raise PlanLimitError(f"Plano {plan_name} atingiu o limite de {limit} cartas nesta coleção.")


def enforce_public_collection_limit(profile, is_public):
    if not is_public:
        return
    if profile.is_admin_plan or profile.can_access_pro_features:
        return
    raise PlanLimitError("Coleções públicas exigem plano PRO.")


def enforce_export_limit(profile):
    if profile.is_admin_plan or profile.can_access_pro_features:
        return
    raise PlanLimitError("Exportação disponível apenas no plano PRO.")


def enforce_card_photo_upload_limit(profile):
    if profile.is_admin_plan or profile.can_access_pro_features:
        return
    raise PlanLimitError("Upload de foto da carta disponível apenas no plano PRO.")


def consume_external_api_usage(profile):
    if profile.is_admin_plan or profile.can_access_pro_features:
        return

    now = timezone.now().date()
    if profile.api_usage_reset_date != now:
        profile.api_usage_count = 0
        profile.api_usage_reset_date = now

    if profile.api_usage_count >= FREE_API_DAILY_LIMIT:
        raise PlanLimitError("Limite diário de buscas externas atingido (100).")

    profile.api_usage_count += 1
    profile.save(update_fields=["api_usage_count", "api_usage_reset_date"])


def apply_trial(profile):
    if profile.trial_used:
        raise PlanLimitError("Trial já utilizado.")

    now = timezone.now()
    profile.plan = profile.PlanChoices.PRO
    profile.trial_used = True
    profile.is_trial_active = True
    profile.subscription_end_date = now + timedelta(days=7)
    profile.save(
        update_fields=[
            "plan",
            "trial_used",
            "is_trial_active",
            "subscription_end_date",
        ]
    )


def refresh_subscription_status(profile):
    if profile.is_admin_plan:
        return

    now = timezone.now()
    if profile.plan == profile.PlanChoices.PRO and profile.subscription_end_date and now > profile.subscription_end_date:
        profile.plan = profile.PlanChoices.FREE
        profile.is_trial_active = False
        profile.subscription_end_date = None
        profile.stripe_subscription_id = ""
        profile.save(
            update_fields=[
                "plan",
                "is_trial_active",
                "subscription_end_date",
                "stripe_subscription_id",
            ]
        )
