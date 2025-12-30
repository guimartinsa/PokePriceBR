from rest_framework import serializers
from cards.models import Card, Set


class SetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Set
        fields = ["id", "nome", "codigo_liga"]


class CardSerializer(serializers.ModelSerializer):
    set = SetSerializer(read_only=True)
    is_over_number = serializers.ReadOnlyField()

    class Meta:
        model = Card
        fields = [
            "id",
            "nome",
            "numero",
            "total_set",
            "numero_completo",
            "liga_num",
            "raridade",
            "imagem",

            "preco_min",
            "preco_med",
            "preco_max",

            "is_over_number",
            "set",
        ]
