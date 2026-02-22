from django.db import models
from cards.services.liga_url import gerar_liga_url
from django.conf import settings
from django.utils import timezone


class Set(models.Model):
    nome = models.CharField(max_length=100)
    codigo_liga = models.CharField(max_length=10, db_index=True, null=True, blank=True)
    logo = models.URLField(blank=True, null=True)
    release_date = models.DateField(blank=True, null=True)
    serie_id = models.CharField(max_length=50, blank=True, null=True)
    serie_nome = models.CharField(max_length=100, blank=True, null=True)

    tcgdex_id = models.CharField(max_length=50, db_index=True, null=True, blank=True)

    def __str__(self):
        return self.nome


class Card(models.Model):
    tcgdex_id = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        null=True,
        blank=True,
    )

    # Identificação
    nome = models.CharField(max_length=200)
    ilustrador = models.CharField(max_length=200, blank=True, null=True)
    numero = models.CharField(max_length=20)
    total_set = models.PositiveIntegerField()
    numero_completo = models.CharField(max_length=20)
    liga_num = models.CharField(max_length=20)
    # Metadados
    raridade = models.CharField(max_length=50, blank=True, null=True)
    imagem = models.URLField(blank=True, null=True)
    imagem_grande = models.URLField(blank=True, null=True)

    # URL oficial da Liga Pokémon (gerada automaticamente)
    liga_url = models.URLField(blank=True, null=True)
    # Relacionamento
    set = models.ForeignKey(Set, on_delete=models.CASCADE, related_name="cartas")

    ativa = models.BooleanField(default=True)  # 👈 NOVO
    last_price_update = models.DateTimeField(null=True, blank=True)
    is_updating = models.BooleanField(default=False)
    class Meta:
        indexes = [
            models.Index(fields=["set", "ativa"]),
            models.Index(fields=["raridade"]),
            models.Index(fields=["tcgdex_id"]),
        ]


    # Preços NORMAL
    preco_min = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    preco_med = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    preco_max = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    # Preços FOIL
    preco_min_foil = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    preco_med_foil = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    preco_max_foil = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    # Preços reverse FOIL
    preco_min_reverse_foil = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    preco_med_reverse_foil = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    preco_max_reverse_foil = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    # Preços master
    preco_min_master_ball = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    preco_med_master_ball = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    preco_max_master_ball = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    # Preços pokebalFOIL
    preco_min_pokeball_foil = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    preco_med_pokeball_foil = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )
    preco_max_pokeball_foil = models.DecimalField(
        max_digits=10, decimal_places=2, blank=True, null=True
    )

    detalhes_atualizados = models.BooleanField(default=False)

    # -------- IMAGENS DERIVADAS -------- #

    @property
    def imagem_low(self):
        return f"{self.imagem}/low.webp" if self.imagem else None

    @property
    def imagem_high(self):
        return f"{self.imagem}/high.webp" if self.imagem else None


    def save(self, *args, **kwargs):
        """
        Gera automaticamente a URL da Liga Pokémon
        """
        if not self.liga_url:
            try:
                self.liga_url = gerar_liga_url(self)
            except Exception as e:
                print(f"[WARN] Falha ao gerar liga_url para card {self.id}: {e}")

        super().save(*args, **kwargs)

    @property
    def is_over_number(self):
        try:
            return int(self.numero) > int(self.total_set)
        except (TypeError, ValueError):
            return False


    def __str__(self):
        return f"{self.nome} ({self.numero_completo})"


class CardAdminLog(models.Model):
    ACTION_CHOICES = [
        ("delete", "Excluir"),
        ("restore", "Restaurar"),
        ("update_price", "Atualizar Preço"),
    ]

    card = models.ForeignKey(
        Card,
        on_delete=models.CASCADE,
        related_name="admin_logs",
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )

    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    note = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.card.nome} | {self.action} | {self.created_at}"


##-----------##-------------##
##---------user----------##
##-----------##-------------##

#user_profile
User = settings.AUTH_USER_MODEL

class Profile(models.Model):
    class PlanChoices(models.TextChoices):
        FREE = "FREE", "Free"
        PRO = "PRO", "Pro"
        ADMIN = "ADMIN", "Admin"

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    avatar = models.URLField(blank=True, null=True)
    avatar_upload = models.ImageField(upload_to="avatars/", blank=True, null=True)
    avatar_option = models.ForeignKey(
        "Avatar",
        on_delete=models.SET_NULL,
        related_name="profiles",
        blank=True,
        null=True,
    )
    bio = models.TextField(blank=True)

    plan = models.CharField(max_length=20, choices=PlanChoices.choices, default=PlanChoices.FREE)
    stripe_customer_id = models.CharField(max_length=100, blank=True, default="")
    stripe_subscription_id = models.CharField(max_length=100, blank=True, default="")
    trial_used = models.BooleanField(default=False)
    is_trial_active = models.BooleanField(default=False)
    subscription_end_date = models.DateTimeField(blank=True, null=True)
    api_usage_count = models.PositiveIntegerField(default=0)
    api_usage_reset_date = models.DateField(default=timezone.localdate)
    is_suspended = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.email
    
    @property
    def is_admin_plan(self):
        return self.plan == self.PlanChoices.ADMIN or self.user.is_staff or self.user.is_superuser

    @property
    def can_access_pro_features(self):
        if self.is_admin_plan:
            return True
        if self.plan != self.PlanChoices.PRO:
            return False
        if not self.subscription_end_date:
            return True
        return timezone.now() <= self.subscription_end_date
    
class Avatar(models.Model):
    name = models.CharField(max_length=80, unique=True)
    image_url = models.URLField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name

#user card
class UserCard(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="collection",
    )

    card = models.ForeignKey(
        Card,
        on_delete=models.CASCADE,
        related_name="owners",
    )

    quantity = models.PositiveIntegerField(default=1)

    is_favorite = models.BooleanField(default=False)

    foil_type = models.CharField(
        max_length=30,
        blank=True,
        null=True,
        help_text="Ex: normal, foil, reverse, master, pokeball",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # 🔧 ALTERAÇÃO: impede duplicar a mesma carta para o mesmo usuário
        unique_together = ("user", "card", "foil_type")

    def __str__(self):
        return f"{self.user} - {self.card} ({self.foil_type})"

class Collection(models.Model):
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="collections"
    )
    name = models.CharField(max_length=120)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.user})"


class CollectionCard(models.Model):
    collection = models.ForeignKey(
        Collection,
        on_delete=models.CASCADE,
        related_name="cards"
    )
    card = models.ForeignKey(
        "cards.Card",
        on_delete=models.CASCADE
    )
    custom_photo = models.ImageField(upload_to="collection-cards/", blank=True, null=True)
    owned = models.BooleanField(default=False)

    class Meta:
        unique_together = ("collection", "card")
