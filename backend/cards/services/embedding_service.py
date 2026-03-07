from __future__ import annotations

from io import BytesIO
from threading import Lock

import numpy as np
from PIL import Image

_MODEL = None
_PREPROCESS = None
_MODEL_LOCK = Lock()


class EmbeddingServiceError(RuntimeError):
    """Erro controlado para geração de embeddings."""


def _load_clip_model():
    global _MODEL, _PREPROCESS

    if _MODEL is not None and _PREPROCESS is not None:
        return _MODEL, _PREPROCESS

    with _MODEL_LOCK:
        if _MODEL is not None and _PREPROCESS is not None:
            return _MODEL, _PREPROCESS

        try:
            import open_clip
            import torch
        except ImportError as exc:
            raise EmbeddingServiceError(
                "Dependências de embedding indisponíveis. Instale open-clip-torch e torch."
            ) from exc

        model, _, preprocess = open_clip.create_model_and_transforms(
            "ViT-B-32",
            pretrained="laion2b_s34b_b79k",
        )
        model.eval()

        _MODEL = model
        _PREPROCESS = preprocess

    return _MODEL, _PREPROCESS


def load_image_from_upload(image_file) -> Image.Image:
    try:
        return Image.open(image_file).convert("RGB")
    except Exception as exc:
        raise EmbeddingServiceError("Arquivo enviado não é uma imagem válida.") from exc


def load_image_from_bytes(image_bytes: bytes) -> Image.Image:
    try:
        return Image.open(BytesIO(image_bytes)).convert("RGB")
    except Exception as exc:
        raise EmbeddingServiceError("Não foi possível abrir os bytes da imagem.") from exc


def generate_embedding(image: Image.Image) -> np.ndarray:
    model, preprocess = _load_clip_model()

    try:
        import torch
    except ImportError as exc:
        raise EmbeddingServiceError("Dependência torch indisponível para gerar embedding.") from exc

    image_tensor = preprocess(image).unsqueeze(0)

    with torch.no_grad():
        embedding = model.encode_image(image_tensor)

    normalized_embedding = embedding / embedding.norm(dim=-1, keepdim=True)
    return normalized_embedding[0].cpu().numpy().astype(np.float32)