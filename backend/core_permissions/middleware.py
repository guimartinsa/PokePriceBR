from django.http import JsonResponse

from accounts.services import get_or_create_profile
from core_permissions.services import refresh_subscription_status

class SubscriptionStateMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            profile = get_or_create_profile(request.user)
            refresh_subscription_status(profile)
            if profile.is_suspended:
                return JsonResponse({"detail": "Usuário suspenso."}, status=403)
        return self.get_response(request)