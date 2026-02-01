from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from ..models import UserCard
from ..serializers import UserCardSerializer

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def collection_view(request):
    if request.method == "GET":
        cards = UserCard.objects.filter(user=request.user)
        return Response(UserCardSerializer(cards, many=True).data)

    serializer = UserCardSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    serializer.save(user=request.user)

    return Response(serializer.data)
