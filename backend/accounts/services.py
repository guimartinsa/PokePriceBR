from cards.models import Profile


def get_or_create_profile(user):
    profile, _ = Profile.objects.get_or_create(user=user)
    return profile


def is_admin_user(user):
    if not user.is_authenticated:
        return False
    profile = get_or_create_profile(user)
    return profile.is_admin_plan