import numpy as np
from unittest import TestCase
from PIL import Image

from cards.services.embedding_service import (
    EPSILON,
    TARGET_DIMENSION,
    TARGET_HEIGHT,
    TARGET_WIDTH,
    generate_embedding,
)


class EmbeddingServiceTests(TestCase):
    def _make_test_image(self) -> Image.Image:
        width, height = 80, 120
        array = np.zeros((height, width, 3), dtype=np.uint8)

        for y in range(height):
            for x in range(width):
                array[y, x] = [
                    (x * 7 + y * 3) % 256,
                    (x * 5 + y * 11) % 256,
                    (x * 13 + y * 17) % 256,
                ]

        return Image.fromarray(array, mode="RGB")

    def _frontend_reference_embedding(self, image: Image.Image) -> np.ndarray:
        resized = image.convert("RGB").resize((TARGET_WIDTH, TARGET_HEIGHT), resample=Image.BILINEAR)
        pixels = np.asarray(resized, dtype=np.float32) / 255.0

        total_pixels = TARGET_WIDTH * TARGET_HEIGHT
        red = pixels[:, :, 0].reshape(total_pixels)
        green = pixels[:, :, 1].reshape(total_pixels)
        blue = pixels[:, :, 2].reshape(total_pixels)

        mean_red = float(np.mean(red, dtype=np.float32))
        mean_green = float(np.mean(green, dtype=np.float32))
        mean_blue = float(np.mean(blue, dtype=np.float32))

        global_mean = (mean_red + mean_green + mean_blue) / 3.0
        red = np.clip(red * (global_mean / max(mean_red, EPSILON)), 0.0, 1.0)
        green = np.clip(green * (global_mean / max(mean_green, EPSILON)), 0.0, 1.0)
        blue = np.clip(blue * (global_mean / max(mean_blue, EPSILON)), 0.0, 1.0)

        luminance = (0.299 * red + 0.587 * green + 0.114 * blue).reshape(TARGET_HEIGHT, TARGET_WIDTH)
        gradients = np.zeros((TARGET_HEIGHT, TARGET_WIDTH), dtype=np.float32)
        gradients[1:-1, 1:-1] = np.sqrt(
            (luminance[1:-1, 2:] - luminance[1:-1, :-2]) ** 2
            + (luminance[2:, 1:-1] - luminance[:-2, 1:-1]) ** 2
        )

        values = np.stack([red, green, blue, gradients.reshape(total_pixels)], axis=1).reshape(-1)

        stride = values.size / TARGET_DIMENSION
        reduced = np.zeros(TARGET_DIMENSION, dtype=np.float32)

        for index in range(TARGET_DIMENSION):
            start = int(np.floor(index * stride))
            end = max(start + 1, int(np.floor((index + 1) * stride)))
            reduced[index] = np.mean(values[start:end], dtype=np.float32)

        norm = np.linalg.norm(reduced)
        return (reduced / norm).astype(np.float32)

    def test_generate_embedding_returns_512_dimensions(self):
        embedding = generate_embedding(self._make_test_image())
        self.assertEqual(embedding.shape, (TARGET_DIMENSION,))

    def test_generate_embedding_returns_l2_normalized_vector(self):
        embedding = generate_embedding(self._make_test_image())
        self.assertAlmostEqual(float(np.linalg.norm(embedding)), 1.0, places=6)

    def test_generate_embedding_is_deterministic_for_same_image(self):
        image = self._make_test_image()
        embedding_a = generate_embedding(image)
        embedding_b = generate_embedding(image)

        np.testing.assert_allclose(embedding_a, embedding_b, rtol=0.0, atol=0.0)

    def test_generate_embedding_matches_frontend_reference_pipeline(self):
        image = self._make_test_image()
        backend_embedding = generate_embedding(image)
        frontend_embedding = self._frontend_reference_embedding(image)

        cosine_similarity = float(np.dot(backend_embedding, frontend_embedding))
        self.assertGreaterEqual(cosine_similarity, 0.999999)
