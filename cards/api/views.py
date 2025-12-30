from rest_framework.generics import ListAPIView, RetrieveAPIView

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.db import models


from cards.models import Card
from cards.services.liga_scraper import atualizar_preco_carta
from .serializers import CardSerializer



class CardListView(ListAPIView):
    serializer_class = CardSerializer

    def get_queryset(self):
        qs = Card.objects.select_related("set").all()

        set_code = self.request.query_params.get("set")
        raridade = self.request.query_params.get("raridade")
        over = self.request.query_params.get("over")

        if set_code:
            qs = qs.filter(set__codigo_liga__iexact=set_code)

        if raridade:
            qs = qs.filter(raridade__icontains=raridade)

        if over == "true":
            qs = qs.filter(numero__gt=models.F("total_set"))
        elif over == "false":
            qs = qs.filter(numero__lte=models.F("total_set"))

        return qs


class CardDetailView(RetrieveAPIView):
    queryset = Card.objects.select_related("set").all()
    serializer_class = CardSerializer

class AtualizarPrecoCartaView(APIView):
    def post(self, request, pk):
        card = get_object_or_404(Card, pk=pk)

        try:
            atualizar_preco_carta(card)
            return Response(
                {
                    "status": "ok",
                    "message": "Preço atualizado com sucesso",
                    "card": CardSerializer(card).data,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

class AtualizarTodasCartasView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        cartas = Card.objects.exclude(liga_num__isnull=True)
        atualizadas = 0
        erros = []

        for carta in cartas:
            print(f"Atualizando {carta.nome}")

            try:
                atualizar_preco_carta(carta)
                atualizadas += 1
            except Exception as e:
                erros.append(
                    {
                        "carta": carta.nome,
                        "erro": str(e),
                    }
                )

        return Response(
            {
                "status": "ok",
                "atualizadas": atualizadas,
                "erros": erros,
            }
        )
