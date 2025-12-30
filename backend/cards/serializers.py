from rest_framework import serializers
from .models import Carta
from .services import gerar_link_liga


class CartaSerializer(serializers.ModelSerializer):
    link_liga = serializers.SerializerMethodField()

    class Meta:
        model = Carta
        fields = ['id', 'nome', 'numero', 'liga_num', 'link_liga']

    def get_link_liga(self, obj):
        return gerar_link_liga(obj)
