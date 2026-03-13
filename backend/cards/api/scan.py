import logging
from decimal import Decimal

from pgvector.django import CosineDistance
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import JSONParser
from rest_framework.response import Response

from cards.models import Card

logger = logging.getLogger(__name__)

EXPECTED_EMBEDDING_DIMENSION = 512
MIN_SIMILARITY_THRESHOLD = 0.75


def _scan_log_context(request) -> dict[str, object]:
    user = getattr(request, "user", None)
    user_id = getattr(user, "id", None) if user and getattr(user, "is_authenticated", False) else None

    return {
        "path": request.path,
        "method": request.method,
        "content_type": request.content_type,
        "user_id": user_id,
    }


def _serialize_card(card: Card) -> dict:
    price = card.preco_med if card.preco_med is not None else None
    if isinstance(price, Decimal):
        price_value = float(price)
    else:
        price_value = price

    return {
        "id": card.id,
        "name": card.nome,
        "number": card.numero,
        "set": card.set.nome if card.set else None,
        "price": price_value,
    }


def _error_response(message: str, code: int):
    return Response(
        {
            "success": False,
            "detail": message,
            "error": message,
        },
        status=code,
    )


def _parse_embedding(payload: object) -> list[float] | None:
    if not isinstance(payload, list) or len(payload) != EXPECTED_EMBEDDING_DIMENSION:
        return None

    values: list[float] = []
    for value in payload:
        if not isinstance(value, (int, float)):
            return None
        casted = float(value)
        if not (casted == casted and casted not in (float("inf"), float("-inf"))):
            return None
        values.append(casted)

    return values


def _find_most_similar_card(embedding: list[float]):
    return (
        Card.objects.filter(ativa=True, embedding__isnull=False)
        .annotate(distance=CosineDistance("embedding", embedding))
        .order_by("distance")
        .first()
    )


@api_view(["POST"])
@parser_classes([JSONParser])
def scan_card_view(request):
    context = _scan_log_context(request)
    embedding = _parse_embedding(request.data.get("embedding"))

    if embedding is None:
        logger.warning("Scan com embedding inválido", extra=context)
        return _error_response(
            f"Envie 'embedding' com {EXPECTED_EMBEDDING_DIMENSION} valores numéricos.",
            status.HTTP_400_BAD_REQUEST,
        )

    card = _find_most_similar_card(embedding)
    if not card:
        logger.warning("Nenhuma carta com embedding disponível", extra=context)
        return _error_response(
            "Nenhuma carta com embedding foi encontrada no catálogo.",
            status.HTTP_404_NOT_FOUND,
        )

    similarity = 1 - float(getattr(card, "distance", 1.0))
    if similarity < MIN_SIMILARITY_THRESHOLD:
        logger.info("Scan sem confiança suficiente", extra={**context, "similarity": similarity})
        return Response(
            {
                "success": False,
                "error": "Carta não identificada com confiança suficiente.",
                "similarity": round(similarity, 4),
                "threshold": MIN_SIMILARITY_THRESHOLD,
            },
            status=status.HTTP_422_UNPROCESSABLE_ENTITY,
        )

    logger.info(
        "Scan por embedding concluído",
        extra={
            **context,
            "card_id": card.id,
            "detected_name": card.nome,
            "detected_number": card.numero,
            "similarity": similarity,
        },
    )

    return Response(
        {
            "success": True,
            "card": _serialize_card(card),
            "similarity": round(similarity, 4),
        },
        status=status.HTTP_200_OK,
    )
