from django.test import TestCase
from django.contrib.auth import get_user_model
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
