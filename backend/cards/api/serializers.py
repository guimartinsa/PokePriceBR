from rest_framework import serializers
from cards.models import Card, Set
from cards.models import CardAdminLog
from cards.models import UserCard, Profile, Avatar
from cards.models import Collection, CollectionCard



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
            "liga_url",
            "set",
        ]


class CardAdminLogSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()

    class Meta:
        model = CardAdminLog
        fields = ["id", "action", "user", "created_at", "note"]

#users
class AvatarSerializer(serializers.ModelSerializer):
    class Meta:
        model = Avatar
        fields = ["id", "name", "image_url"]

class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    name = serializers.CharField(source="user.first_name", required=False, allow_blank=True)
    avatar_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Profile
        fields = ["email", "name", "avatar", "avatar_option", "avatar_url", "bio"]

        def get_avatar_url(self, obj):
            if obj.avatar_option:
                return obj.avatar_option.image_url
            return obj.avatar

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", None)
        if user_data:
            instance.user.first_name = user_data.get("first_name", instance.user.first_name)
            instance.user.save(update_fields=["first_name"])
        return super().update(instance, validated_data)

class UserCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCard
        fields = "__all__"
        read_only_fields = ["user"]


#coleção
class CollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Collection
        fields = ["id", "name", "created_at"]


class CollectionCardSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="card.id")
    nome = serializers.CharField(source="card.nome")
    imagem = serializers.CharField(source="card.imagem")
    numero_completo = serializers.CharField(source="card.numero_completo")
    raridade = serializers.CharField(source="card.raridade", allow_null=True)
    liga_url = serializers.CharField(source="card.liga_url", allow_null=True)
    set = SetSerializer(source="card.set", read_only=True)

    preco_min = serializers.DecimalField(
        source="card.preco_min",
        max_digits=10,
        decimal_places=2,
        allow_null=True,
    )

    preco_med = serializers.DecimalField(
        source="card.preco_med",
        max_digits=10,
        decimal_places=2,
        allow_null=True,
    )

    preco_max = serializers.DecimalField(
        source="card.preco_max",
        max_digits=10,
        decimal_places=2,
        allow_null=True,
    )

    class Meta:
        model = CollectionCard
        fields = [
            "id",
            "nome",
            "imagem",
            "numero_completo",
            "raridade",
            "set",
            "liga_url",
            "preco_min",
            "preco_med",
            "preco_max",
            "owned",
        ]