import numpy as np
from unittest import TestCase
from PIL import Image

from cards.services.embedding_service import (
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
        values = pixels.reshape(-1)

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
