from cards.models import CardAdminLog

def log_admin_action(card, user, action, note=None):
    CardAdminLog.objects.create(
        card=card,
        user=user,
        action=action,
        note=note,
    )
