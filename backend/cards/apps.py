# backend/cards/apps.py
from django.apps import AppConfig


class CardsConfig(AppConfig):
    name = 'cards'

    def ready(self):
        try:
            from .services.embedding_service import _load_clip_model
            _load_clip_model()
        except Exception:
            pass  # erro já fica cacheado em _MODEL_INIT_ERROR