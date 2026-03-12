from __future__ import annotations

from io import BytesIO

import requests
from PIL import Image

from cards.models import Card
from cards.services.embedding_service import generate_embedding

REQUEST_TIMEOUT_SECONDS = 20


def _resolve_image_url(card: Card) -> str | None:
    return card.imagem_grande or card.imagem


def run(*, clear_existing: bool = False, only_missing: bool = True, process_all: bool = False) -> None:
    if clear_existing:
        updated = Card.objects.exclude(embedding__isnull=True).update(embedding=None)
        print(f"embeddings removidos: {updated}")

    queryset = Card.objects.all()
    should_filter_missing = clear_existing or (only_missing and not process_all)
    if should_filter_missing:
        queryset = queryset.filter(embedding__isnull=True)

    for card in queryset.iterator():
        image_url = _resolve_image_url(card)
        if not image_url:
            print(f"sem imagem para card id={card.id} nome={card.nome}")
            continue

        try:
            response = requests.get(image_url, timeout=REQUEST_TIMEOUT_SECONDS)
            response.raise_for_status()

            image = Image.open(BytesIO(response.content)).convert("RGB")
            embedding = generate_embedding(image)

            card.embedding = embedding.tolist()
            card.save(update_fields=["embedding"])
            print(f"embedding criado: {card.nome}")
        except Exception as exc:  # pragma: no cover - script operacional
            print(f"erro ao gerar embedding para {card.nome}: {exc}")
