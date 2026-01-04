from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework import status

from django.shortcuts import get_object_or_404
from django.db import models

from cards.models import Card, CardAdminLog
from cards.models import Set
from cards.services.liga_scraper import atualizar_preco_carta
from cards.services.admin_log import log_admin_action
from .serializers import SetSerializer

from cards.tasks.atualizar_todas_cartas import atualizar_todas_cartas
from cards.tasks.atualizar_preco_carta import atualizar_preco_carta_task
from cards.tasks.import_sets import import_sets_from_tcgdex_task
from cards.tasks.import_cards import import_cards_from_set_task


from .serializers import CardAdminLogSerializer, CardSerializer
from cards.api.serializers import SetSerializer


from django.db.models import Count

class CardListView(ListAPIView):
    serializer_class = CardSerializer

    def get_queryset(self):
        qs = Card.objects.select_related("set").filter(ativa=True)
        search = self.request.query_params.get("search")
        set_code = self.request.query_params.get("set")
        raridade = self.request.query_params.get("raridade")
        over = self.request.query_params.get("over")

        if search:
            qs = qs.filter(nome__icontains=search)

        if set_code:
            qs = qs.filter(set__codigo_liga__iexact=set_code)

        if raridade:
            qs = qs.filter(raridade__icontains=raridade)

        if over == "true":
            qs = qs.filter(numero__gt=models.F("total_set"))
        elif over == "false":
            qs = qs.filter(numero__lte=models.F("total_set"))

        return qs
        #return Card.objects.select_related("set").all()

class CardDetailView(RetrieveAPIView):
    queryset = Card.objects.select_related("set").filter(ativa=True)
    serializer_class = CardSerializer

class AtualizarPrecoCartaView(APIView):
    def post(self, request, pk):
        atualizar_preco_carta_task(pk)

        return Response(
            {
                "status": "accepted",
                "message": "Atualização enviada para processamento",
                "card_id": pk,
            },
            status=status.HTTP_202_ACCEPTED,
        )

class AtualizarTodasCartasView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        task = atualizar_todas_cartas.delay()

        return Response(
            {
                "status": "ok",
                "message": "Atualização iniciada",
                "task_id": task.id,
            },
            status=status.HTTP_202_ACCEPTED,
        )
    
class ExcluirCartaView(APIView):
    permission_classes = [IsAdminUser]

    def delete(self, request, pk):
        card = get_object_or_404(Card, pk=pk)

        if not card.ativa:
            return Response(
                {"message": "Carta já está excluída"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        card.ativa = False
        card.save()

        log_admin_action(
            card=card,
            user=request.user,
            action="delete",
            note="Carta excluída via API",
        )

        return Response(
            {
                "status": "ok",
                "message": "Carta excluída com sucesso",
                "card_id": card.id,
            },
            status=status.HTTP_200_OK,
        )

class RestaurarCartaView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        card = get_object_or_404(Card, pk=pk)

        if card.ativa:
            return Response(
                {"message": "Carta já está ativa"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        card.ativa = True
        card.save()

        log_admin_action(
            card=card,
            user=request.user,
            action="restore",
            note="Carta restaurada via API",
        )

        return Response(
            {
                "status": "ok",
                "message": "Carta restaurada com sucesso",
                "card_id": card.id,
            }
        )

class CardAdminLogView(ListAPIView):
    serializer_class = CardAdminLogSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        card_id = self.kwargs["pk"]
        return CardAdminLog.objects.filter(card_id=card_id).order_by("-created_at")

class ImportCardsFromSetView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, codigo):
        import_cards_from_set_task.delay(codigo)
        return Response({"status": "Importação de cartas iniciada"})


#----sets-----#

from django.db.models import Q


class SetListView(ListAPIView):
    serializer_class = SetSerializer

    def get_queryset(self):
        qs = Set.objects.all().order_by("nome")

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(nome__icontains=search) |
                Q(codigo__icontains=search)
            )

        return qs

class SetDetailView(RetrieveAPIView):
    queryset = Set.objects.name
    serializer_class = SetSerializer

class SetAutocompleteView(APIView):
    def get(self, request):
        q = request.query_params.get("q", "").strip()

        qs = Set.objects.all()

        if q:
            qs = qs.filter(nome__icontains=q) | qs.filter(codigo_liga__icontains=q)

        qs = qs.order_by("nome")[:10]  # limite para autocomplete

        return Response([
            {
                "id": s.id,
                "nome": s.nome,
                "codigo": s.codigo_liga,
            }
            for s in qs
        ])

class ImportSetsFromTCGDexView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        task = import_sets_from_tcgdex_task.delay()

        return Response(
            {
                "status": "ok",
                "message": "Importação de sets iniciada",
                "task_id": task.id,
            },
            status=status.HTTP_202_ACCEPTED,
        )
