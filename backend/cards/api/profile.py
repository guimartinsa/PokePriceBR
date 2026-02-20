from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from cards.models import Avatar, Profile
from .serializers import AvatarSerializer, ProfileSerializer


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def profile_view(request):
    profile, _ = Profile.objects.get_or_create(user=request.user)

    if request.method == "GET":
        return Response(ProfileSerializer(profile).data)

    if request.method == "PUT":
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    request.user.delete()
    return Response(status=204)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def avatars_view(request):
    avatars = Avatar.objects.filter(is_active=True).order_by("name")
    return Response(AvatarSerializer(avatars, many=True).data)
