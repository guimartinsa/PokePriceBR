import re
import unicodedata
from difflib import SequenceMatcher
from decimal import Decimal
from io import BytesIO

import numpy as np
from PIL import Image, ImageOps
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from cards.models import Card


try:
    import cv2
except ImportError:  # pragma: no cover - depends on deployment image
    cv2 = None


try:
    import pytesseract
except ImportError:  # pragma: no cover - depends on deployment image
    pytesseract = None


NUMBER_PATTERN = re.compile(r"\b([A-Z]{0,4}\d{1,3}\s*/\s*\d{2,3}|[A-Z]{0,4}\d{1,3})\b")

def _extract_card_regions(image: Image.Image) -> list[Image.Image]:
    if cv2 is None:
        return []

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

def _extract_ocr_texts(image_bytes: bytes) -> tuple[str, list[str]]:
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





@api_view(["POST"])
@parser_classes([MultiPartParser, FormParser])
def scan_card_view(request):
    image = request.FILES.get("image")

    if image is None:
        return _error_response(
            "Arquivo de imagem é obrigatório no campo 'image'.",
            status.HTTP_400_BAD_REQUEST,
        )

    if image.size > 5 * 1024 * 1024:
        return _error_response(
            "Imagem muito grande. Máximo permitido: 5MB.",
            status.HTTP_400_BAD_REQUEST,
        )


# Processamento do OCR
    try:
        # Lê o conteúdo da imagem
        image_content = image.read()
        identified = _identify_card_with_ocr(image_content)
    except RuntimeError as exc:
        # Erros controlados (ex: texto não encontrado na imagem)
        return _error_response(str(exc), status.HTTP_422_UNPROCESSABLE_ENTITY)
    except Exception as exc:
        # Verifica se o erro é a falta do binário do Tesseract no sistema
        tesseract_missing = False
        if pytesseract:
            tesseract_err = getattr(pytesseract, "TesseractNotFoundError", None)
            if tesseract_err and isinstance(exc, tesseract_err):
                tesseract_missing = True

        if tesseract_missing:
            return _error_response(
                "OCR indisponível no servidor: binário tesseract-ocr não encontrado.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        
        # Loga o erro real no terminal do servidor para você debugar
        print(f"--- ERRO NO PROCESSAMENTO DE SCAN ---")
        print(f"Tipo: {type(exc).__name__} | Detalhe: {exc}")
        import traceback
        traceback.print_exc()

        return _error_response(
            "Erro interno no processamento da imagem.",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    # A partir daqui, 'identified' existe com segurança
    card = _find_card(name=identified["name"], number=identified["number"])

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
