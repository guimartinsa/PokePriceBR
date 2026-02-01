from google.oauth2 import id_token
from google.auth.transport import requests
from django.contrib.auth import get_user_model
from django.conf import settings

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

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

    refresh = RefreshToken.for_user(user)

    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "user": {
            "email": user.email,
            "name": user.first_name,
            "avatar": picture,
        },
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def me(request):
    user = request.user
    return Response({
        "email": user.email,
        "name": user.first_name,
    })
