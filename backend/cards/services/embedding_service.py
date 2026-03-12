from __future__ import annotations

from io import BytesIO

import numpy as np
from PIL import Image

TARGET_WIDTH = 32
TARGET_HEIGHT = 32
TARGET_DIMENSION = 512
EPSILON = 1e-6
_RGB_CHANNELS = 3
_EXPECTED_RAW_SIZE = TARGET_WIDTH * TARGET_HEIGHT * _RGB_CHANNELS


class EmbeddingServiceError(RuntimeError):
    """Erro controlado para geração de embeddings."""

    def __init__(self, message: str, *, status_code: int = 400):
        super().__init__(message)
        self.status_code = status_code


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


def _reduce_to_fixed_size(values: np.ndarray, target_size: int) -> np.ndarray:
    if values.size < target_size:
        raise EmbeddingServiceError("Dimensão insuficiente para gerar embedding.")

    stride = values.size / target_size
    reduced = np.zeros(target_size, dtype=np.float32)

    for index in range(target_size):
        start = int(np.floor(index * stride))
        end = max(start + 1, int(np.floor((index + 1) * stride)))
        reduced[index] = np.mean(values[start:end], dtype=np.float32)

    return reduced


def _l2_normalize(values: np.ndarray) -> np.ndarray:
    norm = np.linalg.norm(values)
    if not np.isfinite(norm) or norm <= 0:
        raise EmbeddingServiceError("Falha ao normalizar embedding da imagem.")
    return (values / norm).astype(np.float32)


def _compute_robust_features(pixels: np.ndarray) -> np.ndarray:
    total_pixels = TARGET_WIDTH * TARGET_HEIGHT

    red = pixels[:, :, 0].reshape(total_pixels)
    green = pixels[:, :, 1].reshape(total_pixels)
    blue = pixels[:, :, 2].reshape(total_pixels)

    mean_red = float(np.mean(red, dtype=np.float32))
    mean_green = float(np.mean(green, dtype=np.float32))
    mean_blue = float(np.mean(blue, dtype=np.float32))

    global_mean = (mean_red + mean_green + mean_blue) / 3.0
    gain_red = global_mean / max(mean_red, EPSILON)
    gain_green = global_mean / max(mean_green, EPSILON)
    gain_blue = global_mean / max(mean_blue, EPSILON)

    red = np.clip(red * gain_red, 0.0, 1.0)
    green = np.clip(green * gain_green, 0.0, 1.0)
    blue = np.clip(blue * gain_blue, 0.0, 1.0)

    luminance = (0.299 * red + 0.587 * green + 0.114 * blue).reshape(TARGET_HEIGHT, TARGET_WIDTH)

    gradients = np.zeros((TARGET_HEIGHT, TARGET_WIDTH), dtype=np.float32)
    gradients[1:-1, 1:-1] = np.sqrt(
        (luminance[1:-1, 2:] - luminance[1:-1, :-2]) ** 2
        + (luminance[2:, 1:-1] - luminance[:-2, 1:-1]) ** 2
    )

    return np.stack(
        [red, green, blue, gradients.reshape(total_pixels)],
        axis=1,
    ).astype(np.float32).reshape(-1)


def generate_embedding(image: Image.Image) -> np.ndarray:
    resized_image = image.convert("RGB").resize((TARGET_WIDTH, TARGET_HEIGHT), resample=Image.BILINEAR)

    pixels = np.asarray(resized_image, dtype=np.float32) / 255.0
    flattened_values = pixels.reshape(-1)

    if flattened_values.size != _EXPECTED_RAW_SIZE:
        raise EmbeddingServiceError("Dimensão inesperada ao processar a imagem.")

    robust_features = _compute_robust_features(pixels)

    reduced = _reduce_to_fixed_size(robust_features, TARGET_DIMENSION)
    return _l2_normalize(reduced)
