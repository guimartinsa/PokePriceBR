import base64
import json
import os
import re
from decimal import Decimal

import requests
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from cards.models import Card


VISION_API_URL = os.getenv("SCAN_VISION_API_URL", "https://api.openai.com/v1/chat/completions")
VISION_API_KEY = os.getenv("SCAN_VISION_API_KEY")
VISION_MODEL = os.getenv("SCAN_VISION_MODEL", "gpt-4o-mini")
VISION_TIMEOUT_SECONDS = int(os.getenv("SCAN_VISION_TIMEOUT_SECONDS", "25"))


def _extract_json_from_text(content: str) -> dict:
    content = content.strip()

    fenced_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, flags=re.DOTALL)
    if fenced_match:
        return json.loads(fenced_match.group(1))

    object_match = re.search(r"\{.*\}", content, flags=re.DOTALL)
    if object_match:
        return json.loads(object_match.group(0))

    return json.loads(content)


def _identify_card_with_vision(image_bytes: bytes, content_type: str) -> dict:
    if not VISION_API_KEY:
        raise RuntimeError("Serviço de reconhecimento não configurado.")

    image_b64 = base64.b64encode(image_bytes).decode("utf-8")

    prompt = (
        "Identifique a carta Pokémon da imagem e retorne SOMENTE JSON válido com as chaves: "
        "name (string), number (string), confidence (number de 0 a 1). "
        "Não inclua texto adicional."
    )

    payload = {
        "model": VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{content_type};base64,{image_b64}"},
                    },
                ],
            }
        ],
        "temperature": 0,
    }

    response = requests.post(
        VISION_API_URL,
        headers={
            "Authorization": f"Bearer {VISION_API_KEY}",
            "Content-Type": "application/json",
        },
        json=payload,
        timeout=VISION_TIMEOUT_SECONDS,
    )

    if response.status_code >= 400:
        raise RuntimeError("Falha no serviço de reconhecimento de imagem.")

    data = response.json()
    content = (
        data.get("choices", [{}])[0]
        .get("message", {})
        .get("content", "")
    )

    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("Resposta inválida do serviço de reconhecimento.")

    parsed = _extract_json_from_text(content)

    name = str(parsed.get("name", "")).strip()
    number = str(parsed.get("number", "")).strip()
    confidence = parsed.get("confidence", 0)

    if not name or not number:
        raise RuntimeError("Não foi possível extrair dados da carta.")

    try:
        confidence = float(confidence)
    except (ValueError, TypeError):
        confidence = 0.0

    return {
        "name": name,
        "number": number,
        "confidence": max(0.0, min(confidence, 1.0)),
    }


def _normalize_number(value: str) -> str:
    normalized = value.strip().upper().replace(" ", "")
    return normalized


def _find_card(name: str, number: str) -> Card | None:
    normalized_number = _normalize_number(number)

    candidates = Card.objects.filter(ativa=True).filter(numero__iexact=normalized_number)

    exact_name = candidates.filter(nome__iexact=name).first()
    if exact_name:
        return exact_name

    startswith_name = candidates.filter(nome__istartswith=name).first()
    if startswith_name:
        return startswith_name

    contains_name = candidates.filter(nome__icontains=name).first()
    if contains_name:
        return contains_name

    loose_by_name = (
        Card.objects.filter(ativa=True)
        .filter(nome__icontains=name)
        .order_by("id")
        .first()
    )
    return loose_by_name


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


@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def scan_card_view(request):
    image = request.FILES.get("image")

    if image is None:
        return Response(
            {
                "success": False,
                "error": "Arquivo de imagem é obrigatório no campo 'image'.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    if image.size > 5 * 1024 * 1024:
        return Response(
            {
                "success": False,
                "error": "Imagem muito grande. Máximo permitido: 5MB.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    content_type = image.content_type or "image/jpeg"

    try:
        identified = _identify_card_with_vision(image.read(), content_type)
    except requests.RequestException:
        return Response(
            {
                "success": False,
                "error": "Serviço de reconhecimento temporariamente indisponível.",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except RuntimeError as exc:
        return Response(
            {
                "success": False,
                "error": str(exc),
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    except Exception:
        return Response(
            {
                "success": False,
                "error": "Erro interno no processamento da imagem.",
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    card = _find_card(name=identified["name"], number=identified["number"])

    if not card:
        return Response(
            {
                "success": False,
                "error": "Carta não encontrada no catálogo.",
                "detected": identified,
            },
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response(
        {
            "success": True,
            "card": _serialize_card(card),
            "detected": identified,
        },
        status=status.HTTP_200_OK,
    )
