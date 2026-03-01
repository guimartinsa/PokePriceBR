from google.oauth2 import id_token
from google.auth.transport import requests
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from django.conf import settings
from cards.models import Profile
from core_permissions.services import refresh_subscription_status

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def _resolve_avatar(profile, fallback=""):
    if profile.avatar_upload:
        return profile.avatar_upload.url
    if profile.avatar_option:
        if profile.avatar_option.image_upload:
            return profile.avatar_option.image_upload.url
        return profile.avatar_option.image_url
    return profile.avatar or fallback


def _build_auth_response(user, avatar=""):
    
    profile, _ = Profile.objects.get_or_create(user=user)
    refresh_subscription_status(profile)
    final_avatar = _resolve_avatar(profile, avatar)

    refresh = RefreshToken.for_user(user)

    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {
            "email": user.email,
            "name": user.first_name,
            "avatar": final_avatar,
            "plan": profile.plan,
            "badge": "PRO" if profile.can_access_pro_features else None,
        },
    }

@api_view(["POST"])
def google_login(request):
    token = request.data.get("token")

    if not token:
        return Response({"error": "Token ausente"}, status=400)

    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
            clock_skew_in_seconds=10,  # 🛡️ tolerância de tempo
        )
    except ValueError as e:
        print("GOOGLE TOKEN ERROR:", e)
        return Response({"error": "Token inválido"}, status=401)

    email = idinfo.get("email")
    name = idinfo.get("name", "")
    picture = idinfo.get("picture", "")

    if not email:
        return Response({"error": "Email não encontrado"}, status=400)

    user, _ = User.objects.get_or_create(
        email=email,
        defaults={
            "username": email,
            "first_name": name,
        },
    )

    return Response(_build_auth_response(user, picture))


@api_view(["POST"])
def register_with_email(request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""
    name = (request.data.get("name") or "").strip()

    if not email or not password:
        return Response({"error": "Email e senha são obrigatórios"}, status=400)

    if len(password) < 6:
        return Response({"error": "A senha deve ter pelo menos 6 caracteres"}, status=400)

    if User.objects.filter(email=email).exists():
        return Response({"error": "Já existe uma conta com este email"}, status=400)

    user = User.objects.create_user(
        username=email,
        email=email,
        password=password,
        first_name=name,
    )

    return Response(_build_auth_response(user), status=201)


@api_view(["POST"])
def login_with_email(request):
    email = (request.data.get("email") or "").strip().lower()
    password = request.data.get("password") or ""

    if not email or not password:
        return Response({"error": "Email e senha são obrigatórios"}, status=400)

    user = authenticate(username=email, password=password)
    if not user:
        return Response({"error": "Credenciais inválidas"}, status=401)

    return Response(_build_auth_response(user))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    profile, _ = Profile.objects.get_or_create(user=user)
    refresh_subscription_status(profile)
    avatar = _resolve_avatar(profile)
    return Response({
        "email": user.email,
        "name": user.first_name,
        "avatar": avatar,
        "plan": profile.plan,
        "badge": "PRO" if profile.can_access_pro_features else None,
    })
