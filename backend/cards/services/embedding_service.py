from __future__ import annotations

from io import BytesIO
import os
import sys
from threading import Lock

import numpy as np
from PIL import Image

_MODEL = None
_PREPROCESS = None
_MODEL_INIT_ERROR: EmbeddingServiceError | None = None
_MODEL_LOCK = Lock()


class EmbeddingServiceError(RuntimeError):
    """Erro controlado para geração de embeddings."""

    def __init__(self, message: str, *, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


def _load_clip_model():
    global _MODEL, _PREPROCESS, _MODEL_INIT_ERROR

    if _MODEL is not None and _PREPROCESS is not None:
        return _MODEL, _PREPROCESS

    if _MODEL_INIT_ERROR is not None:
        raise _MODEL_INIT_ERROR

    with _MODEL_LOCK:
        if _MODEL is not None and _PREPROCESS is not None:
            return _MODEL, _PREPROCESS

        if _MODEL_INIT_ERROR is not None:
            raise _MODEL_INIT_ERROR

        if os.getenv("DISABLE_EMBEDDING_MODEL", "").strip().lower() in {"1", "true", "yes", "on"}:
            _MODEL_INIT_ERROR = EmbeddingServiceError(
                "Busca por imagem está desativada no ambiente atual.",
                status_code=503,
            )
            raise _MODEL_INIT_ERROR

        if sys.version_info >= (3, 13):
            _MODEL_INIT_ERROR = EmbeddingServiceError(
                "Busca por imagem indisponível com Python 3.13+. Configure o servidor com Python 3.11 ou 3.12.",
                status_code=503,
            )
            raise _MODEL_INIT_ERROR

        os.environ.setdefault("TORCH_DISABLE_DYNAMO", "1")

        try:
            import open_clip
            import torch  # noqa: F401 — valida disponibilidade do torch
        except ImportError as exc:
            _MODEL_INIT_ERROR = EmbeddingServiceError(
                "Dependências de embedding indisponíveis. Instale open-clip-torch e torch."
            )
            raise _MODEL_INIT_ERROR from exc

        try:
            model, _, preprocess = open_clip.create_model_and_transforms(
                "ViT-B-32",
                pretrained="laion2b_s34b_b79k",
            )
        except Exception as exc:
            _MODEL_INIT_ERROR = EmbeddingServiceError(
                "Não foi possível inicializar o modelo de busca por imagem no servidor.",
                status_code=503,
            )
            raise _MODEL_INIT_ERROR from exc

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