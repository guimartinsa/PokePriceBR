import re
from collections import defaultdict
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework import status

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from core_permissions.decorators import require_admin, require_pro
from core_permissions.services import (
    PlanLimitError,
    enforce_card_creation_limit,
    enforce_collection_creation_limit,
    enforce_public_collection_limit,
    refresh_subscription_status,
    consume_external_api_usage,
)
from accounts.services import get_or_create_profile

from django.shortcuts import get_object_or_404
from django.db import models

from cards.models import Card, CardAdminLog
from cards.models import Series, Set
from cards.models import Collection, CollectionCard, UserCard

from cards.services.liga_scraper import atualizar_preco_carta
from cards.services.admin_log import log_admin_action
from cards.tasks.atualizar_todas_cartas import atualizar_todas_cartas
from cards.tasks.atualizar_preco_carta import atualizar_preco_carta_task
from cards.tasks.import_sets import import_series_from_tcgdex_task, import_sets_from_tcgdex_task
from cards.tasks.import_cards import import_cards_from_set_task
from cards.tasks.price_updates import atualizar_colecao_task

from .serializers import CardAdminLogSerializer, CardSerializer
from .serializers import CollectionSerializer, CollectionCardSerializer

from cards.api.serializers import SeriesSerializer, SetSerializer


from django.db.models import Count
from django.db.models import Q
from celery.result import AsyncResult

class CardListView(ListAPIView):
    serializer_class = CardSerializer

    CARD_SEARCH_WITH_NUMBER_PATTERN = re.compile(
        r"^(?P<name>.+?)\s*\(\s*(?P<number>[^/]+)\s*/\s*(?P<total>\d+)\s*\)\s*$"
    )

    @classmethod
    def _build_exact_card_query(cls, raw_search_term: str):
        """
        Permite busca no formato "Nome (001/159)" para filtrar exatamente a carta.
        """
        match = cls.CARD_SEARCH_WITH_NUMBER_PATTERN.match(raw_search_term.strip())
        if not match:
            return None

        card_name = match.group("name").strip()
        card_number = match.group("number").strip()
        set_total = int(match.group("total"))
        normalized_number = card_number.lstrip("0") or "0"

        return Q(nome__iexact=card_name) & Q(total_set=set_total) & (
            Q(numero=card_number)
            | Q(numero=normalized_number)
            | Q(numero_completo__iexact=f"{card_number}/{set_total}")
            | Q(numero_completo__iexact=f"{normalized_number}/{set_total}")
        )

    def get_queryset(self):
        qs = Card.objects.select_related("set").filter(ativa=True)
        
        # Busca por nome (aceita 'search' ou 'nome')
        search = self.request.query_params.get("search")
        nome = self.request.query_params.get("nome")
        search_term = search or nome
        
        if search_term:
            if self.request.user.is_authenticated:
                profile = get_or_create_profile(self.request.user)
                refresh_subscription_status(profile)
                try:
                    consume_external_api_usage(profile)
                except PlanLimitError:
                    return Card.objects.none()

            exact_card_query = self._build_exact_card_query(search_term)
            if exact_card_query is not None:
                qs = qs.filter(exact_card_query)
            else:
                qs = qs.filter(nome__icontains=search_term)

        # Filtro por set (vinculo exato por ID quando informado)
        set_id = self.request.query_params.get("set_id")
        if set_id:
            qs = qs.filter(set_id=set_id)

        # Filtro por set (codigo/nome)
        set_code = self.request.query_params.get("set")
        if set_code:
            qs = qs.filter(
                Q(set__codigo_liga__iexact=set_code)
                | Q(set__nome__icontains=set_code)
            )

        # Filtro por raridade
        raridade = self.request.query_params.get("raridade")
        if raridade:
            qs = qs.filter(raridade__icontains=raridade)

        # Filtro por over-number
        over = self.request.query_params.get("over")
        if over == "true":
            qs = qs.filter(numero__gt=models.F("total_set"))
        elif over == "false":
            qs = qs.filter(numero__lte=models.F("total_set"))

        # 🆕 NOVO: Filtro por ilustrador
        ilustrador = self.request.query_params.get("ilustrador")
        if ilustrador:
            qs = qs.filter(ilustrador__icontains=ilustrador)

        # 🆕 NOVO: Filtro por número específico
        numero = self.request.query_params.get("numero")
        if numero:
            qs = qs.filter(numero=numero)

        # 🆕 NOVO: Filtro por range de preço
        preco_min = self.request.query_params.get("preco_min")
        preco_max = self.request.query_params.get("preco_max")
        
        if preco_min:
            qs = qs.filter(preco_med__gte=preco_min)
        
        if preco_max:
            qs = qs.filter(preco_med__lte=preco_max)

        ordenar = self.request.query_params.get("ordenar")
        ordering_map = {
            "nome": ["nome", "id"],
            "numero": ["total_set", "numero", "id"],
            "preco": ["preco_med", "id"],
            "lancamento": ["-set__release_date", "id"],
        }

        if ordenar in ordering_map:
            return qs.order_by(*ordering_map[ordenar])

        return qs.order_by('id')  # Ordem consistente para paginação

class CardDetailView(RetrieveAPIView):
    queryset = Card.objects.select_related("set").filter(ativa=True)
    serializer_class = CardSerializer

class AtualizarPrecoCartaView(APIView):
    def post(self, request, pk):
        task = atualizar_preco_carta_task.delay(pk)

        return Response(
            {
                "status": "accepted",
                "message": "Atualização enviada para processamento",
                "card_id": pk,
                "task_id": task.id,
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
    
class TaskStatusView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, task_id):
        result = AsyncResult(task_id)
        payload = {
            "task_id": task_id,
            "state": result.state,
        }

        if isinstance(result.info, dict):
            payload["meta"] = result.info

            total = result.info.get("total")
            atualizadas = result.info.get("atualizadas")
            if total and isinstance(total, int) and isinstance(atualizadas, int):
                payload["progress"] = min(round((atualizadas / total) * 100, 2), 100.0)
        elif result.info:
            payload["meta"] = str(result.info)

        if result.successful():
            payload["result"] = result.result

        return Response(payload)
    

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

    def post(self, request, pk):
        set_obj = Set.objects.get(pk=pk)

        import_cards_from_set_task.delay(set_obj.id)

        return Response(
            {
                "status": "importacao_disparada",
                "set": set_obj.nome,
            },
            status=status.HTTP_202_ACCEPTED,
        )


#----sets-----#

class SeriesListView(ListAPIView):
    serializer_class = SeriesSerializer

    def get_queryset(self):
        qs = Series.objects.all().order_by("nome")

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(nome__icontains=search)

        return qs

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        series_items = list(page) if page is not None else list(queryset)

        sets_by_series = defaultdict(list)
        series_ids = [item.tcgdex_id for item in series_items if item.tcgdex_id]
        if series_ids:
            set_queryset = (
                Set.objects
                .filter(serie_id__in=series_ids)
                .annotate(cards_total=Count("cartas", filter=Q(cartas__ativa=True)))
                .order_by("nome")
            )
            for set_item in set_queryset:
                sets_by_series[set_item.serie_id].append(set_item)

        serializer = self.get_serializer(
            series_items,
            many=True,
            context={**self.get_serializer_context(), "sets_by_series": sets_by_series},
        )

        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)


class ImportSeriesFromTCGDexView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        task = import_series_from_tcgdex_task.delay()

        return Response(
            {
                "status": "ok",
                "message": "Importação de séries iniciada",
                "task_id": task.id,
            },
            status=status.HTTP_202_ACCEPTED,
        )

class SetListView(ListAPIView):
    serializer_class = SetSerializer

    def get_queryset(self):
        qs = Set.objects.all().order_by("nome")

        codigo = self.request.query_params.get("codigo")
        if codigo:
            qs = qs.filter(codigo_liga__iexact=codigo)

        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(
                Q(nome__icontains=search) |
                Q(codigo_liga__icontains=search)
            )

        return qs

class SetDetailView(RetrieveAPIView):
    queryset = Set.objects.all()
    serializer_class = SetSerializer

class SetAutocompleteView(APIView):
    def get(self, request):
        q = request.query_params.get("q", "").strip()

        qs = Set.objects.all()

        if q:
            qs = qs.filter(
                Q(nome__icontains=q) | Q(codigo_liga__icontains=q)
            )

        qs = qs.order_by("nome")[:10]

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

# 🆕 NOVO: Endpoint para listar raridades disponíveis
class RaridadesListView(APIView):
    def get(self, request):
        """
        Retorna lista única de raridades disponíveis
        """
        raridades = (
            Card.objects
            .filter(ativa=True, raridade__isnull=False)
            .exclude(raridade="")
            .values_list("raridade", flat=True)
            .distinct()
            .order_by("raridade")
        )
        
        return Response(list(raridades))

# 🆕 NOVO: Endpoint para listar ilustradores disponíveis
class IlustradoresAutocompleteView(APIView):
    def get(self, request):
        """
        Autocomplete para ilustradores
        """
        q = request.query_params.get("q", "").strip()
        
        qs = Card.objects.filter(ativa=True, ilustrador__isnull=False).exclude(ilustrador="")
        
        if q:
            qs = qs.filter(ilustrador__icontains=q)
        
        ilustradores = (
            qs.values_list("ilustrador", flat=True)
            .distinct()
            .order_by("ilustrador")[:10]
        )
        
        return Response(list(ilustradores))
    
#coleções

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def collections_view(request):
    """
    GET: Lista todas as coleções do usuário
    POST: Cria uma nova coleção
    """
    if request.method == "GET":
        profile = get_or_create_profile(request.user)
        refresh_subscription_status(profile)
        collections = Collection.objects.filter(user=request.user)
        serializer = CollectionSerializer(collections, many=True)
        return Response(serializer.data)

    if request.method == "POST":
        profile = get_or_create_profile(request.user)
        refresh_subscription_status(profile)
        name = request.data.get("name")
        is_public = bool(request.data.get("is_public", False))
        cover_card_id = request.data.get("cover_card_id")
        if not name:
            return Response(
                {"error": "Nome é obrigatório"},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            enforce_collection_creation_limit(profile)
            enforce_public_collection_limit(profile, is_public)
        except PlanLimitError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_403_FORBIDDEN)

        cover_card = None
        if cover_card_id:
            cover_card = get_object_or_404(Card, id=cover_card_id)

        collection = Collection.objects.create(
            user=request.user,
            name=name,
            is_public=is_public,
            cover_card=cover_card,
        )

        serializer = CollectionSerializer(collection)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def collection_delete_view(request, collection_id):
    """
    DELETE: Deleta uma coleção do usuário
    """
    collection = get_object_or_404(
        Collection,
        id=collection_id,
        user=request.user
    )

    collection.delete()

    return Response(
        {"message": "Coleção deletada com sucesso"},
        status=status.HTTP_204_NO_CONTENT
    )

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def collection_cards_view(request, collection_id):
    """
    GET: Lista todas as cartas de uma coleção
    """

    collection = get_object_or_404(
        Collection,
        id=collection_id,
        user=request.user
    )

    cards = (
        CollectionCard.objects
        .filter(collection=collection)
        .select_related("card__set")  # Evita N+1 no serializer de card.set
    )
    serializer = CollectionCardSerializer(cards, many=True)
    return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def collection_progress_by_set_view(request, collection_id):
    collection = get_object_or_404(
        Collection,
        id=collection_id,
        user=request.user,
    )

    rows = (
        CollectionCard.objects
        .filter(collection=collection, owned=True, card__set_id__isnull=False)
        .values("card__set_id")
        .annotate(owned=Count("id"))
    )

    payload = [
        {
            "set_id": row["card__set_id"],
            "owned": row["owned"],
        }
        for row in rows
    ]

    return Response(payload)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def collection_card_delete_view(request, collection_id, card_id):
    collection = get_object_or_404(
        Collection,
        id=collection_id,
        user=request.user,
    )

    collection_card = get_object_or_404(
        CollectionCard,
        collection=collection,
        card_id=card_id,
    )
    collection_card.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def atualizar_colecao_view(request, collection_id):
    collection = get_object_or_404(
        Collection,
        id=collection_id,
        user=request.user,
    )

    atualizar_colecao_task.delay(collection.id)

    return Response({"status": "Atualização iniciada"}, status=status.HTTP_202_ACCEPTED)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_card_owned(request, collection_id):
    """
    POST: Marca/desmarca uma carta em uma coleção personalizada.
    """
    collection = get_object_or_404(
        Collection,
        id=collection_id,
        user=request.user
    )

    profile = get_or_create_profile(request.user)
    refresh_subscription_status(profile)

    card_id = request.data.get("card_id")
    owned = bool(request.data.get("owned", False))
    variation = request.data.get("variation")

    variation_to_field = {
        "normal": "owned_normal",
        "foil": "owned_foil",
        "reverse_foil": "owned_reverse_foil",
        "master_ball": "owned_master_ball",
        "pokeball_foil": "owned_pokeball_foil",
    }

    if not card_id:
        return Response(
            {"error": "card_id é obrigatório"},
            status=status.HTTP_400_BAD_REQUEST
        )

    collection_card = CollectionCard.objects.filter(collection=collection, card_id=card_id).first()
    if not collection_card and owned:
        try:
            enforce_card_creation_limit(profile, collection)
        except PlanLimitError as exc:
            return Response({"error": str(exc)}, status=status.HTTP_403_FORBIDDEN)

    collection_card, _ = CollectionCard.objects.get_or_create(
        collection=collection,
        card_id=card_id,
        defaults={"owned": owned}
    )

    if variation in variation_to_field:
        setattr(collection_card, variation_to_field[variation], owned)
        collection_card.owned = any(
            getattr(collection_card, field_name)
            for field_name in variation_to_field.values()
        )
        collection_card.save(update_fields=[variation_to_field[variation], "owned"])
    else:
        collection_card.owned = owned
        for field_name in variation_to_field.values():
            setattr(collection_card, field_name, owned)
        collection_card.save(update_fields=["owned", *variation_to_field.values()])

    return Response({"ok": True, "owned": collection_card.owned})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def owned_cards_view(request):
    cards = UserCard.objects.filter(user=request.user)
    variation_map = {
        "normal": "owned_normal",
        "foil": "owned_foil",
        "reverse_foil": "owned_reverse_foil",
        "master_ball": "owned_master_ball",
        "pokeball_foil": "owned_pokeball_foil",
    }

    owned_by_card_id = {}
    for item in cards:
        card_id = item.card_id
        state = owned_by_card_id.setdefault(
            card_id,
            {
                "id": card_id,
                "owned": False,
                "owned_normal": False,
                "owned_foil": False,
                "owned_reverse_foil": False,
                "owned_master_ball": False,
                "owned_pokeball_foil": False,
            },
        )

        field_name = variation_map.get((item.foil_type or "").lower() or "normal")
        if field_name:
            state[field_name] = True
            state["owned"] = True

    return Response(list(owned_by_card_id.values()))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_owned_card_view(request):
    card_id = request.data.get("card_id")
    owned = bool(request.data.get("owned", False))
    variation = (request.data.get("variation") or "normal").lower()

    if not card_id:
        return Response({"error": "card_id é obrigatório"}, status=status.HTTP_400_BAD_REQUEST)

    valid_variations = {"normal", "foil", "reverse_foil", "master_ball", "pokeball_foil"}
    if variation not in valid_variations:
        return Response({"error": "variation inválida"}, status=status.HTTP_400_BAD_REQUEST)

    if owned:
        UserCard.objects.get_or_create(
            user=request.user,
            card_id=card_id,
            foil_type=variation,
            defaults={"quantity": 1},
        )
    else:
        UserCard.objects.filter(
            user=request.user,
            card_id=card_id,
            foil_type=variation,
        ).delete()

    has_any = UserCard.objects.filter(user=request.user, card_id=card_id).exists()
    return Response({"ok": True, "owned": has_any})

api_view(["POST"])
@permission_classes([IsAuthenticated])
@require_admin
def admin_suspend_user_view(request, user_id):
    from django.contrib.auth import get_user_model

    user = get_object_or_404(get_user_model(), id=user_id)
    profile = get_or_create_profile(user)
    profile.is_suspended = True
    profile.save(update_fields=["is_suspended"])
    return Response({"status": "ok", "suspended": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
@require_admin
def admin_force_downgrade_view(request, user_id):
    from django.contrib.auth import get_user_model
    from cards.models import Profile

    user = get_object_or_404(get_user_model(), id=user_id)
    profile = get_or_create_profile(user)
    profile.plan = Profile.PlanChoices.FREE
    profile.subscription_end_date = None
    profile.stripe_subscription_id = ""
    profile.save(update_fields=["plan", "subscription_end_date", "stripe_subscription_id"])
    return Response({"status": "ok", "plan": profile.plan})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
@require_pro
def export_collection_view(request, collection_id):
    collection = get_object_or_404(Collection, id=collection_id, user=request.user)
    format_type = (request.query_params.get("format") or "json").lower()

    cards = CollectionCard.objects.filter(collection=collection).select_related("card")
    payload = [
        {
            "id": item.card.id,
            "nome": item.card.nome,
            "numero_completo": item.card.numero_completo,
            "owned": item.owned,
        }
        for item in cards
    ]

    if format_type == "csv":
        import csv
        from io import StringIO

        output = StringIO()
        writer = csv.DictWriter(output, fieldnames=["id", "nome", "numero_completo", "owned"])
        writer.writeheader()
        writer.writerows(payload)
        return Response({"format": "csv", "content": output.getvalue()})

    return Response({"format": "json", "content": payload})

