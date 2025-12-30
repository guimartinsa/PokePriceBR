from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Carta
from .serializers import CartaSerializer


class CartaDetailView(APIView):
    def get(self, request, carta_id):
        carta = Carta.objects.get(id=carta_id)
        serializer = CartaSerializer(carta)
        return Response(serializer.data)
