import logging
import re
import unicodedata
from difflib import SequenceMatcher
from decimal import Decimal
from io import BytesIO

from PIL import Image, ImageOps
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from cards.models import Card

logger = logging.getLogger(__name__)

_CV2_MODULE = None
_CV2_IMPORT_ATTEMPTED = False
_PYTESSERACT_MODULE = None
_PYTESSERACT_IMPORT_ATTEMPTED = False
_TESSERACT_BINARY_AVAILABLE: bool | None = None
_TESSERACT_CHECK_ERROR: str | None = None


def _scan_log_context(request, *, mode: str) -> dict[str, object]:
    user = getattr(request, "user", None)
    user_id = getattr(user, "id", None) if user and getattr(user, "is_authenticated", False) else None

    return {
        "mode": mode,
        "path": request.path,
        "method": request.method,
        "content_type": request.content_type,
        "user_id": user_id,
    }


def _get_cv2_module():
    global _CV2_MODULE, _CV2_IMPORT_ATTEMPTED

    if _CV2_IMPORT_ATTEMPTED:
        return _CV2_MODULE

    _CV2_IMPORT_ATTEMPTED = True
    try:
        import cv2
    except ImportError:  # pragma: no cover - depends on deployment image
        _CV2_MODULE = None
    else:
        _CV2_MODULE = cv2

    return _CV2_MODULE


def _get_pytesseract_module():
    global _PYTESSERACT_MODULE, _PYTESSERACT_IMPORT_ATTEMPTED

    if _PYTESSERACT_IMPORT_ATTEMPTED:
        return _PYTESSERACT_MODULE

    _PYTESSERACT_IMPORT_ATTEMPTED = True
    try:
        import pytesseract
    except ImportError:  # pragma: no cover - depends on deployment image
        _PYTESSERACT_MODULE = None
    else:
        _PYTESSERACT_MODULE = pytesseract

    return _PYTESSERACT_MODULE


NUMBER_PATTERN = re.compile(r"\b([A-Z]{0,4}\d{1,3}\s*/\s*\d{2,3}|[A-Z]{0,4}\d{1,3})\b")

def _extract_card_regions(image: Image.Image) -> list[Image.Image]:
    cv2 = _get_cv2_module()
    if cv2 is None:
        return []

    import numpy as np

    image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
    height, width, _ = image_cv.shape

    name_region = image_cv[
        int(height * 0.03):int(height * 0.14),
        int(width * 0.12):int(width * 0.76),
    ]
    number_region = image_cv[
        int(height * 0.92):int(height * 0.995),
        int(width * 0.06):int(width * 0.36),
    ]

    extracted_regions = []
    for region in (name_region, number_region):
        if region.size == 0:
            continue

        gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
        scaled = cv2.resize(gray, None, fx=2.0, fy=2.0, interpolation=cv2.INTER_CUBIC)
        denoised = cv2.GaussianBlur(scaled, (3, 3), 0)
        binary = cv2.adaptiveThreshold(
            denoised,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY,
            31,
            11,
        )
        extracted_regions.append(Image.fromarray(binary))

    return extracted_regions

def _normalize_text(value: str) -> str:
    no_accents = "".join(
        char
        for char in unicodedata.normalize("NFD", value)
        if unicodedata.category(char) != "Mn"
    )
    return re.sub(r"\s+", " ", no_accents).strip().upper()

def _extract_number_candidates(text: str) -> list[str]:
    matches = NUMBER_PATTERN.findall(text.upper())
    normalized = []


    for match in matches:
        candidate = match.replace(" ", "")
        if candidate not in normalized:
            normalized.append(candidate)

    return normalized

def _score_name_similarity(candidate_name: str, ocr_lines: list[str]) -> float:
    normalized_name = _normalize_text(candidate_name)
    if not normalized_name:
        return 0.0

    best_score = 0.0
    for line in ocr_lines:
        normalized_line = _normalize_text(line)
        if not normalized_line:
            continue

        score = SequenceMatcher(None, normalized_name, normalized_line).ratio()
        if normalized_name in normalized_line:
            score = max(score, 0.92)

        best_score = max(best_score, score)

    return best_score



def _is_tesseract_binary_available() -> tuple[bool, str | None]:
    global _TESSERACT_BINARY_AVAILABLE, _TESSERACT_CHECK_ERROR

    if _TESSERACT_BINARY_AVAILABLE is not None:
        return _TESSERACT_BINARY_AVAILABLE, _TESSERACT_CHECK_ERROR

    pytesseract = _get_pytesseract_module()
    if pytesseract is None:
        _TESSERACT_BINARY_AVAILABLE = False
        _TESSERACT_CHECK_ERROR = "Dependência pytesseract não está instalada."
        return _TESSERACT_BINARY_AVAILABLE, _TESSERACT_CHECK_ERROR

    try:
        pytesseract.get_tesseract_version()
    except Exception as exc:  # pragma: no cover - depende do ambiente de execução
        tesseract_error_cls = getattr(pytesseract, "TesseractNotFoundError", None)
        if tesseract_error_cls and isinstance(exc, tesseract_error_cls):
            _TESSERACT_BINARY_AVAILABLE = False
            _TESSERACT_CHECK_ERROR = "Binário tesseract-ocr não encontrado no PATH."
            return _TESSERACT_BINARY_AVAILABLE, _TESSERACT_CHECK_ERROR

        _TESSERACT_BINARY_AVAILABLE = False
        _TESSERACT_CHECK_ERROR = f"Falha ao validar tesseract: {type(exc).__name__}"
        return _TESSERACT_BINARY_AVAILABLE, _TESSERACT_CHECK_ERROR

    _TESSERACT_BINARY_AVAILABLE = True
    _TESSERACT_CHECK_ERROR = None
    return _TESSERACT_BINARY_AVAILABLE, _TESSERACT_CHECK_ERROR

def _extract_ocr_texts(image_bytes: bytes) -> tuple[str, list[str]]:
    pytesseract = _get_pytesseract_module()
    if pytesseract is None:
        raise RuntimeError(
            "OCR indisponível: instale a dependência pytesseract no backend."
        )

    image = Image.open(BytesIO(image_bytes)).convert("RGB")
    gray = ImageOps.grayscale(image)
    high_contrast = gray.point(lambda p: 255 if p > 150 else 0)
    card_regions = _extract_card_regions(image)


    configs = ["--psm 6", "--psm 11"]
    focused_configs = ["--psm 7", "--psm 8"]
    variants = [image, gray, high_contrast]
    snippets = []

    for variant in variants:
        for config in configs:
            text = pytesseract.image_to_string(variant, lang="eng", config=config)
            cleaned = text.strip()
            if cleaned:
                snippets.append(cleaned)

    for region in card_regions:
        for config in focused_configs:
            text = pytesseract.image_to_string(region, lang="eng", config=config)
            cleaned = text.strip()
            if cleaned:
                snippets.append(cleaned)

    full_text = "\n".join(snippets)
    lines = [line.strip() for line in full_text.splitlines() if len(line.strip()) >= 3]

    if not lines:
        raise RuntimeError("Não foi possível ler texto suficiente da imagem da carta.")

    return full_text, lines


def _identify_by_number_and_name(lines: list[str], number_candidates: list[str]) -> dict | None:
    best_card = None
    best_score = 0.0

    for number in number_candidates:
        cards = Card.objects.filter(ativa=True, numero__iexact=number)[:40]
        for card in cards:
            score = _score_name_similarity(card.nome, lines)
            if score > best_score:
                best_score = score
                best_card = card

    if best_card and best_score >= 0.45:
        return {
            "name": best_card.nome,
            "number": best_card.numero,
            "confidence": round(best_score, 4),
        }

    return None


def _identify_by_name_candidates(lines: list[str]) -> dict | None:
    tokens = []
    for line in lines:
        for token in re.findall(r"[A-Za-z][A-Za-z'\-]{2,}", line):
            normalized = token.strip().lower()
            if len(normalized) >= 4 and normalized not in tokens:
                tokens.append(normalized)

    if not tokens:
        return None

    # Limita tokens para evitar query muito ampla.
    selected_tokens = tokens[:6]

    candidate_qs = Card.objects.filter(ativa=True)
    token_filtered = candidate_qs.none()
    for token in selected_tokens:
        token_filtered = token_filtered | candidate_qs.filter(nome__icontains=token)

    best_card = None
    best_score = 0.0
    for card in token_filtered.distinct()[:300]:
        score = _score_name_similarity(card.nome, lines)
        if score > best_score:
            best_score = score
            best_card = card

    if best_card and best_score >= 0.70:
        return {
            "name": best_card.nome,
            "number": best_card.numero,
            "confidence": round(best_score, 4),
        }

    return None


def _identify_card_with_ocr(image_bytes: bytes) -> dict:
    full_text, lines = _extract_ocr_texts(image_bytes)
    number_candidates = _extract_number_candidates(full_text)

    number_match = _identify_by_number_and_name(lines, number_candidates)
    if number_match:
        return number_match

    name_match = _identify_by_name_candidates(lines)
    if name_match:
        return name_match

    raise RuntimeError("Não foi possível identificar nome e número da carta via OCR.")

def _normalize_number(value: str) -> str:
    return value.strip().upper().replace(" ", "")


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

    return (
        Card.objects.filter(ativa=True)
        .filter(nome__icontains=name)
        .order_by("id")
        .first()
    )



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


def _resolve_identified_card_response(identified: dict):
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


def _resolve_payload_identification(request) -> dict | None:
    name = request.data.get("name")
    number = request.data.get("number")

    if not isinstance(name, str) or not isinstance(number, str):
        return None

    normalized_name = name.strip()
    normalized_number = _normalize_number(number)

    if not normalized_name or not normalized_number:
        return None

    return {
        "name": normalized_name,
        "number": normalized_number,
        "confidence": 1.0,
    }





@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def scan_card_view(request):
    image = request.FILES.get("image")

    if image is None:
        context = _scan_log_context(request, mode="payload")
        identified_from_payload = _resolve_payload_identification(request)
        if identified_from_payload is not None:
            logger.info(
                "Scan payload recebido com sucesso",
                extra={
                    **context,
                    "detected_number": identified_from_payload["number"],
                },
            )
            return _resolve_identified_card_response(identified_from_payload)

        logger.warning("Scan payload inválido: name/number ausentes", extra=context)
        return _error_response(
            "Envie uma imagem no campo 'image' ou informe 'name' e 'number' no corpo da requisição.",
            status.HTTP_400_BAD_REQUEST,
        )

    context = _scan_log_context(request, mode="image")

    tesseract_available, tesseract_error = _is_tesseract_binary_available()
    if not tesseract_available:
        logger.warning(
            "OCR indisponível por dependência de ambiente",
            extra={**context, "tesseract_error": tesseract_error},
        )
        return _error_response(
            "OCR indisponível no servidor: binário tesseract-ocr não encontrado.",
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    if image.size > 5 * 1024 * 1024:
        logger.warning("Scan rejeitado por tamanho de imagem", extra={**context, "image_size": image.size})
        return _error_response(
            "Imagem muito grande. Máximo permitido: 5MB.",
            status.HTTP_400_BAD_REQUEST,
        )

    try:
        image_content = image.read()
        logger.info("Iniciando OCR do scan", extra={**context, "image_size": len(image_content)})
        identified = _identify_card_with_ocr(image_content)
        logger.info(
            "OCR concluído com sucesso",
            extra={
                **context,
                "detected_name": identified.get("name"),
                "detected_number": identified.get("number"),
                "confidence": identified.get("confidence"),
            },
        )
    except RuntimeError as exc:
        logger.warning("Falha de OCR em scan", extra=context, exc_info=True)
        return _error_response(str(exc), status.HTTP_422_UNPROCESSABLE_ENTITY)
    except Exception as exc:
        is_tesseract_missing = False
        pytesseract = _get_pytesseract_module()
        if pytesseract:
            tesseract_error_cls = getattr(pytesseract, "TesseractNotFoundError", None)
            if tesseract_error_cls and isinstance(exc, tesseract_error_cls):
                is_tesseract_missing = True

        if is_tesseract_missing:
            logger.warning("Tesseract não encontrado no ambiente de execução", extra=context)
            return _error_response(
                "OCR indisponível no servidor: binário tesseract-ocr não encontrado.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        logger.exception("Erro interno inesperado no scan", extra=context)
        return _error_response(
            "Erro interno no processamento da imagem.",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    return _resolve_identified_card_response(identified)
