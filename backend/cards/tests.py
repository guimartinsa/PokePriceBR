from django.test import TestCase
from unittest import mock
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from cards.models import Card, Set


class CardListViewSearchByFullNumberTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.set_obj = Set.objects.create(nome="Scarlet & Violet", codigo_liga="sv1")

        Card.objects.create(
            nome="Caterpie",
            numero="001",
            total_set=159,
            numero_completo="",
            liga_num="",
            set=self.set_obj,
            ativa=True,
        )
        Card.objects.create(
            nome="Caterpie",
            numero="172",
            total_set=159,
            numero_completo="",
            liga_num="",
            set=self.set_obj,
            ativa=True,
        )
        Card.objects.create(
            nome="Pikachu",
            numero="001",
            total_set=159,
            numero_completo="",
            liga_num="",
            set=self.set_obj,
            ativa=True,
        )

    def test_search_with_name_and_full_number_returns_exact_card(self):
        response = self.client.get("/api/cards/", {"search": "Caterpie (001/159)"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["nome"], "Caterpie")
        self.assertEqual(response.data["results"][0]["numero_completo"], "001/159")

    def test_search_with_name_only_keeps_partial_name_behavior(self):
        response = self.client.get("/api/cards/", {"search": "Caterpie"})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 2)




class ScanCardEmbeddingViewTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user_model = get_user_model()

    def test_scan_card_requires_image_file_for_anonymous_user(self):
        response = self.client.post("/api/scan-card/", data={}, format="multipart")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["success"], False)
        self.assertIn("image", response.data["error"].lower())

    def test_scan_card_requires_image_file_for_admin(self):
        admin = self.user_model.objects.create_user(
            username="admin",
            email="admin@example.com",
            password="123456",
            is_staff=True,
        )
        self.client.force_authenticate(user=admin)

        response = self.client.post("/api/scan-card/", data={}, format="multipart")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.data["success"], False)
        self.assertIn("error", response.data)


class ScanCardEmbeddingRuntimeGuardTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        from cards.services import embedding_service
        embedding_service._MODEL = None
        embedding_service._PREPROCESS = None
        embedding_service._MODEL_INIT_ERROR = None

    def test_scan_card_returns_503_when_embedding_is_unavailable_in_python_313(self):
        png_bytes = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00"
            b"\x03\x01\x01\x00\xc9\xfe\x92\xef\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        image = SimpleUploadedFile("card.png", png_bytes, content_type="image/png")

        with mock.patch("cards.services.embedding_service.sys.version_info", (3, 13, 0)):
            response = self.client.post("/api/scan-card/", data={"image": image}, format="multipart")

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.data["success"], False)
        self.assertIn("python 3.13", response.data["error"].lower())

        from cards.services import embedding_service
        embedding_service._MODEL = None
        embedding_service._PREPROCESS = None
        embedding_service._MODEL_INIT_ERROR = None
