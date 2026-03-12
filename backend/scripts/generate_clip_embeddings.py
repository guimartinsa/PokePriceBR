from __future__ import annotations

import argparse
import os
import sys
from io import BytesIO
from pathlib import Path

import numpy as np
import requests
import torch
from PIL import Image
from transformers import CLIPModel, CLIPProcessor

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pokepricebr.settings")

import django  # noqa: E402

django.setup()

from cards.models import Card  # noqa: E402

MODEL_ID = "openai/clip-vit-base-patch32"
REQUEST_TIMEOUT_SECONDS = 20
EXPECTED_EMBEDDING_DIMENSION = 512


def resolve_image_url(card: Card) -> str | None:
    return card.imagem_grande or card.imagem


def l2_normalize(values: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(values)
    if not np.isfinite(norm) or norm <= 0:
        raise ValueError("Falha ao normalizar embedding CLIP.")
    return (values / norm).astype(np.float32)


def load_clip() -> tuple[CLIPProcessor, CLIPModel, torch.device]:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    processor = CLIPProcessor.from_pretrained(MODEL_ID, use_fast=False)
    model = CLIPModel.from_pretrained(MODEL_ID)
    model.eval()
    model.to(device)
    return processor, model, device


@torch.inference_mode()
def generate_clip_embedding(
    image: Image.Image,
    processor: CLIPProcessor,
    model: CLIPModel,
    device: torch.device,
) -> np.ndarray:
    inputs = processor(images=image, return_tensors="pt")
    inputs = {name: tensor.to(device) for name, tensor in inputs.items()}

    image_features = model.get_image_features(**inputs)
    array = image_features.detach().cpu().numpy().astype(np.float32)

    # Alguns ambientes retornam shape [1, 1, 512].
    if array.ndim == 1:
        vector = array.reshape(-1)
    else:
        vector = array[0].reshape(-1)

    if vector.size != EXPECTED_EMBEDDING_DIMENSION:
        raise ValueError(
            f"Dimensao inesperada do embedding: shape={array.shape}, size={vector.size}. "
            f"Esperado: {EXPECTED_EMBEDDING_DIMENSION}."
        )

    return l2_normalize(vector)


def fetch_image(image_url: str) -> Image.Image:
    response = requests.get(image_url, timeout=REQUEST_TIMEOUT_SECONDS)
    response.raise_for_status()
    return Image.open(BytesIO(response.content)).convert("RGB")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Regenera embeddings CLIP (512) para cartas no banco.",
    )
    parser.add_argument(
        "--only-missing",
        action="store_true",
        help="Processa apenas cartas sem embedding.",
    )
    parser.add_argument(
        "--clear-first",
        action="store_true",
        help="Limpa embeddings existentes antes de gerar novamente.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Limita a quantidade de cartas processadas.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Nao salva no banco, apenas valida geracao.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if args.clear_first:
        removed = Card.objects.exclude(embedding__isnull=True).update(embedding=None)
        print(f"[INFO] embeddings removidos: {removed}")

    queryset = Card.objects.all().order_by("id")
    if args.only_missing or args.clear_first:
        queryset = queryset.filter(embedding__isnull=True)
    if args.limit is not None:
        queryset = queryset[: args.limit]

    processor, model, device = load_clip()
    print(f"[INFO] modelo CLIP carregado em {device}")

    total = 0
    updated = 0
    skipped = 0
    failed = 0

    for card in queryset.iterator(chunk_size=100):
        total += 1
        image_url = resolve_image_url(card)

        if not image_url:
            skipped += 1
            print(f"[SKIP] card_id={card.id} sem imagem")
            continue

        try:
            image = fetch_image(image_url)
            embedding = generate_clip_embedding(image, processor, model, device)

            if not args.dry_run:
                card.embedding = embedding.tolist()
                card.save(update_fields=["embedding"])

            updated += 1
            print(f"[OK] card_id={card.id} nome={card.nome}")
        except Exception as error:  # pragma: no cover - script operacional
            failed += 1
            print(f"[ERROR] card_id={card.id} nome={card.nome} erro={error}")

    print(
        "[SUMMARY] "
        f"total={total} updated={updated} skipped={skipped} failed={failed} "
        f"dry_run={args.dry_run}"
    )

    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
