from functools import wraps

from rest_framework import status
from rest_framework.response import Response

from accounts.services import get_or_create_profile


def require_pro(view_func):
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        profile = get_or_create_profile(request.user)
        if not profile.can_access_pro_features:
            return Response(
                {"detail": "Plano PRO obrigatório."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return view_func(request, *args, **kwargs)

    return _wrapped


def require_admin(view_func):
    @wraps(view_func)
    def _wrapped(request, *args, **kwargs):
        profile = get_or_create_profile(request.user)
        if not profile.is_admin_plan:
            return Response(
                {"detail": "Acesso restrito para ADMIN."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return view_func(request, *args, **kwargs)

    return _wrapped