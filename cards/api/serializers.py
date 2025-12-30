from rest_framework import serializers
from cards.models import Card


class CardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Card
        fields = [
            "id",
            "nome",
            "numero_completo",
            "raridade",
            "preco_min",
            "preco_med",
            "preco_max",
            "imagem",
        ]
