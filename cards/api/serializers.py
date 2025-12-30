from rest_framework import serializers
from cards.models import Card, Set
from cards.models import CardAdminLog


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


class CardAdminLogSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()

    class Meta:
        model = CardAdminLog
        fields = ["id", "action", "user", "created_at", "note"]


