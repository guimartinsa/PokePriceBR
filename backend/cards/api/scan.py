import base64
import hashlib
import json
import logging
import os
import re
from decimal import Decimal
from typing import TypedDict

import requests
from django.core.cache import cache
from django.db.models import Q
from pgvector.django import CosineDistance
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import JSONParser
from rest_framework.response import Response

from cards.models import Card

logger = logging.getLogger(__name__)

EXPECTED_EMBEDDING_DIMENSION = 512
MIN_SIMILARITY_THRESHOLD = 0.75
NVIDIA_INVOKE_URL = os.getenv("NVIDIA_INVOKE_URL", "https://integrate.api.nvidia.com/v1/chat/completions")
NVIDIA_OCR_MODEL = os.getenv("NVIDIA_OCR_MODEL", "mistralai/mistral-small-4-119b-2603")
OCR_TIMEOUT_SECONDS = 6
OCR_CACHE_TTL_SECONDS = 60 * 60 * 24
MAX_BASE64_SIZE_BYTES = 10 * 1024 * 1024
OCR_MAX_TOKENS = 256


class OcrResult(TypedDict, total=False):
    name: str | None
    number: str | None
    debug: dict[str, object]


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


def _serialize_match(card: Card, similarity: float) -> dict[str, object]:
    return {
        **_serialize_card(card),
        "similarity": round(similarity, 4),
    }


def _error_response(message: str, code: int, extra: dict[str, object] | None = None):
    payload: dict[str, object] = {
        "success": False,
        "detail": message,
        "error": message,
    }
    if extra:
        payload.update(extra)
    return Response(payload, status=code)


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


def _parse_image_base64(payload: object) -> str | None:
    if not isinstance(payload, str):
        return None

    normalized = payload.strip()
    if not normalized:
        return None

    if normalized.startswith("data:"):
        _, _, normalized = normalized.partition(",")

    if not normalized:
        return None

    if len(normalized.encode("utf-8")) > MAX_BASE64_SIZE_BYTES:
        return None

    return normalized


def _is_valid_base64(payload: str) -> bool:
    try:
        base64.b64decode(payload, validate=True)
        return True
    except Exception:  # noqa: BLE001
        return False


def _extract_json_from_text(text: str) -> dict[str, object]:
    cleaned = text.strip()
    if not cleaned:
        return {}

    try:
        data = json.loads(cleaned)
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", cleaned)
    if not match:
        return {}

    try:
        data = json.loads(match.group(0))
        return data if isinstance(data, dict) else {}
    except json.JSONDecodeError:
        return {}


def _extract_name(text: str) -> str | None:
    if not text.strip():
        return None

    for line in (line.strip() for line in text.splitlines()):
        if not line:
            continue
        cleaned = re.sub(r"\b(Stage\s*\d+|Basic|HP\s*\d+)\b", "", line, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s+", " ", cleaned).strip(" -")
        if cleaned:
            return cleaned

    return None


def _extract_number(text: str) -> str | None:
    match = re.search(r"\d+/\d+", text)
    return match.group(0) if match else None


def _ocr_card_fields_from_base64(image_b64: str, debug: bool = False) -> OcrResult:
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        logger.warning("NVIDIA_API_KEY nao configurada")
        return {"name": None, "number": None, "debug": {"raw_response": ""}}

    payload = {
        "model": NVIDIA_OCR_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Extraia APENAS estes campos da carta Pokémon e retorne SOMENTE um JSON válido: "
                            '{"nome":"", "numero_completo":""}. '
                            "Se não achar algum campo, retorne string vazia."
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"},
                    },
                ],
            }
        ],
        "max_tokens": OCR_MAX_TOKENS,
        "temperature": 0,
        "top_p": 1.0,
        "stream": False,
    }

    response = requests.post(
        NVIDIA_INVOKE_URL,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        },
        json=payload,
        timeout=OCR_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    response_data = response.json()

    choices = response_data.get("choices", [])
    first_choice = choices[0] if isinstance(choices, list) and choices else {}
    message = first_choice.get("message", {}) if isinstance(first_choice, dict) else {}
    raw_content = message.get("content", "") if isinstance(message, dict) else ""
    raw_text = raw_content if isinstance(raw_content, str) else ""

    parsed = _extract_json_from_text(raw_text)
    name = _extract_name(str(parsed.get("nome") or parsed.get("name") or ""))
    number = _extract_number(
        str(parsed.get("numero_completo") or parsed.get("number") or parsed.get("numero") or "")
    )

    result: OcrResult = {"name": name, "number": number, "debug": {"raw_response": raw_text}}
    if not debug:
        result.pop("debug", None)
    return result


def _ocr_from_cache_or_vision(image_b64: str, debug: bool = False) -> OcrResult:
    digest = hashlib.sha256(image_b64.encode("utf-8")).hexdigest()
    cache_key = f"scan:ocr:{digest}"
    cached = cache.get(cache_key)
    if isinstance(cached, dict):
        debug_payload = cached.get("debug")
        return {
            "name": cached.get("name") if isinstance(cached.get("name"), str) else None,
            "number": cached.get("number") if isinstance(cached.get("number"), str) else None,
            "debug": debug_payload if isinstance(debug_payload, dict) else {},
        }

    ocr_result = _ocr_card_fields_from_base64(image_b64, debug=debug)
    cache.set(cache_key, ocr_result, OCR_CACHE_TTL_SECONDS)
    return ocr_result


def _find_top_matches(embedding: list[float], limit: int = 5) -> list[dict[str, object]]:
    cards = (
        Card.objects.filter(ativa=True, embedding__isnull=False)
        .annotate(distance=CosineDistance("embedding", embedding))
        .order_by("distance")[:limit]
    )

    return [_serialize_match(card, 1 - float(getattr(card, "distance", 1.0))) for card in cards]


def _find_matches_from_ocr(ocr_result: OcrResult, limit: int = 5) -> list[dict[str, object]]:
    number = (ocr_result.get("number") or "").strip()
    name = (ocr_result.get("name") or "").strip()

    queryset = Card.objects.filter(ativa=True)
    matches: list[dict[str, object]] = []

    if number and name:
        cards = list(
            queryset.filter(numero_completo=number, nome__icontains=name).order_by("id")[:limit]
        )
        matches.extend(_serialize_match(card, 0.98) for card in cards)
        if matches:
            return matches

    if number:
        cards = list(queryset.filter(numero_completo=number).order_by("id")[:limit])
        matches.extend(_serialize_match(card, 0.9) for card in cards)
        if matches:
            return matches

    if name:
        cards = list(
            queryset.filter(
                Q(nome__iexact=name)
                | Q(nome__istartswith=name)
                | Q(nome__icontains=name)
            )
            .order_by("id")[:limit]
        )
        if cards:
            for card in cards:
                if card.nome.lower() == name.lower():
                    similarity = 0.9
                elif card.nome.lower().startswith(name.lower()):
                    similarity = 0.82
                else:
                    similarity = 0.75
                matches.append(_serialize_match(card, similarity))

    return matches


@api_view(["POST"])
@parser_classes([JSONParser])
def scan_card_view(request):
    context = _scan_log_context(request)

    embedding_payload = request.data.get("embedding")
    embedding = (
        _parse_embedding(embedding_payload)
        if embedding_payload is not None
        else None
    )
    if embedding_payload is not None and embedding is None:
        logger.warning("Scan com embedding inválido (ignorado)", extra=context)

    image_payload = request.data.get("image")
    image_b64 = _parse_image_base64(image_payload)
    if image_b64 is None:
        image_present = image_payload is not None
        logger.warning(
            "Scan sem imagem base64 válida",
            extra={**context, "image_present": image_present},
        )
        return _error_response(
            "A imagem nao chegou corretamente no backend. Envie o campo 'image' em base64.",
            status.HTTP_400_BAD_REQUEST,
            extra={"image_received": image_present},
        )

    if not _is_valid_base64(image_b64):
        logger.warning("Campo image recebido, mas base64 inválido", extra=context)
        return _error_response(
            "O backend recebeu o campo 'image', mas o base64 esta invalido.",
            status.HTTP_400_BAD_REQUEST,
            extra={"image_received": True},
        )

    logger.info("Imagem recebida no backend para scan", extra={**context, "image_received": True})

    debug_mode = bool(request.data.get("debug", False))

    ocr_result: OcrResult = {"name": None, "number": None}
    try:
        ocr_result = _ocr_from_cache_or_vision(image_b64, debug=debug_mode)
    except requests.Timeout:
        logger.warning("Timeout no OCR", extra=context)
    except requests.RequestException as exc:
        logger.warning("Erro HTTP no OCR", extra={**context, "error": str(exc)})
    except Exception as exc:  # noqa: BLE001
        logger.exception("Falha inesperada no OCR", extra={**context, "error": str(exc)})

    if embedding is not None:
        matches = _find_top_matches(embedding)
    else:
        matches = _find_matches_from_ocr(ocr_result)

    if not matches:
        logger.warning("Nenhuma carta encontrada a partir do scan", extra=context)
        return _error_response(
            "Nao foi possivel localizar carta com os dados extraidos.",
            status.HTTP_404_NOT_FOUND,
            extra={"ocr": ocr_result},
        )

    best = matches[0]
    similarity = float(best["similarity"])

    logger.info(
        "Scan híbrido concluído",
        extra={
            **context,
            "ocr_name": ocr_result.get("name"),
            "ocr_number": ocr_result.get("number"),
            "best_match_id": best["id"],
            "similarity": similarity,
        },
    )

    success = similarity >= MIN_SIMILARITY_THRESHOLD

    return Response(
        {
            "success": success,
            "ocr": ocr_result,
            "embedding": embedding,
            "matches": matches,
            "card": best,
            "similarity": round(similarity, 4),
            "threshold": MIN_SIMILARITY_THRESHOLD,
        },
        status=status.HTTP_200_OK if success else status.HTTP_422_UNPROCESSABLE_ENTITY,
    )
