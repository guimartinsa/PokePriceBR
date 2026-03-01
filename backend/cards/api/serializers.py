from rest_framework import serializers
from cards.models import Avatar, Card, CardAdminLog, Collection, CollectionCard, Profile, Series, Set, UserCard



class SetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Set
        fields = ["id", "nome", "codigo_liga", "logo", "release_date", "serie_id", "serie_nome", "tcgdex_id"]

class SeriesSetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Set
        fields = ["id", "nome", "codigo_liga", "logo", "release_date", "serie_id", "serie_nome", "tcgdex_id"]


class SeriesSerializer(serializers.ModelSerializer):
    sets = serializers.SerializerMethodField()

    class Meta:
        model = Series
        fields = ["id", "tcgdex_id", "nome", "logo", "sets"]

    def get_sets(self, obj):
        queryset = Set.objects.filter(serie_id=obj.tcgdex_id).order_by("nome")
        return SeriesSetSerializer(queryset, many=True).data



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
            "imagem_grande",
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
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Avatar
        fields = ["id", "name", "image_url"]
    def get_image_url(self, obj):
        if obj.image_upload:
            request = self.context.get("request")
            url = obj.image_upload.url
            return request.build_absolute_uri(url) if request else url
        return obj.image_url


class ProfileSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    name = serializers.CharField(source="user.first_name", required=False, allow_blank=True)
    avatar_url = serializers.SerializerMethodField(read_only=True)
    badge = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Profile
        fields = [
            "email",
            "name",
            "avatar",
            "avatar_upload",
            "avatar_option",
            "avatar_url",
            "bio",
            "plan",
            "badge",
            "trial_used",
            "subscription_end_date",
            "api_usage_count",
            "api_usage_reset_date",
        ]
        read_only_fields = [
            "plan",
            "trial_used",
            "subscription_end_date",
            "api_usage_count",
            "api_usage_reset_date",
        ]

    def get_avatar_url(self, obj):
        if obj.avatar_upload:
            request = self.context.get("request")
            url = obj.avatar_upload.url
            return request.build_absolute_uri(url) if request else url
        if obj.avatar_option:
            if obj.avatar_option.image_upload:
                request = self.context.get("request")
                url = obj.avatar_option.image_upload.url
                return request.build_absolute_uri(url) if request else url
            return obj.avatar_option.image_url
        return obj.avatar

    def get_badge(self, obj):
        return "PRO" if obj.can_access_pro_features else None

    def validate_avatar_upload(self, avatar_upload):
        profile = self.instance
        if profile and not profile.can_access_pro_features and not profile.is_admin_plan:
            raise serializers.ValidationError("Upload de avatar personalizado exige plano PRO.")

        max_size = 2 * 1024 * 1024
        if avatar_upload.size > max_size:
            raise serializers.ValidationError("Avatar excede 2MB.")

        valid_types = {"image/jpeg", "image/png", "image/webp"}
        content_type = getattr(avatar_upload, "content_type", "")
        if content_type not in valid_types:
            raise serializers.ValidationError("Tipo de arquivo inválido. Use JPG, PNG ou WEBP.")

        return avatar_upload

    def validate(self, attrs):
        profile = self.instance
        if profile and not profile.can_access_pro_features and attrs.get("avatar"):
            raise serializers.ValidationError(
                {"avatar": "Plano FREE permite apenas avatares predefinidos."}
            )

        avatar_option = attrs.get("avatar_option")
        if avatar_option is not None and not avatar_option.is_active:
            raise serializers.ValidationError(
                {"avatar_option": "Avatar selecionado está inativo."}
            )

        if attrs.get("avatar_upload"):
            attrs["avatar"] = ""
            attrs["avatar_option"] = None
        elif avatar_option is not None:
            attrs["avatar"] = ""
            attrs["avatar_upload"] = None

        return attrs

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", None)
        if user_data:
            instance.user.first_name = user_data.get("first_name", instance.user.first_name)
            instance.user.save(update_fields=["first_name"])
            
        if not instance.can_access_pro_features and validated_data.get("avatar_option") is None:
            validated_data.pop("avatar", None)
        return super().update(instance, validated_data)

class UserCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserCard
        fields = "__all__"
        read_only_fields = ["user"]


#coleção
class CollectionSerializer(serializers.ModelSerializer):
    cover_card_id = serializers.IntegerField(source="cover_card.id", read_only=True)
    cover_image = serializers.CharField(source="cover_card.imagem", read_only=True)

    class Meta:
        model = Collection
        fields = ["id", "name", "is_public", "created_at", "cover_card", "cover_card_id", "cover_image"]
        extra_kwargs = {
            "cover_card": {"write_only": True, "required": False, "allow_null": True},
        }


class CollectionCardSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(source="card.id")
    nome = serializers.CharField(source="card.nome")
    imagem = serializers.CharField(source="card.imagem")
    imagem_grande = serializers.CharField(source="card.imagem_grande", allow_null=True)
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
            "imagem_grande"
            "numero_completo",
            "raridade",
            "set",
            "liga_url",
            "preco_min",
            "preco_med",
            "preco_max",
            "owned",
            "custom_photo",
        ]
