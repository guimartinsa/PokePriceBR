from django.db import models
from cards.services.liga_url import gerar_liga_url
from django.conf import settings


class Set(models.Model):
    nome = models.CharField(max_length=100)
    codigo_liga = models.CharField(max_length=10, db_index=True, null=True, blank=True)

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
    # URL oficial da Liga Pokémon (gerada automaticamente)
    liga_url = models.URLField(blank=True, null=True)
    # Relacionamento
    set = models.ForeignKey(Set, on_delete=models.CASCADE, related_name="cartas")

    ativa = models.BooleanField(default=True)  # 👈 NOVO

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
            except Exception:
                pass

        super().save(*args, **kwargs)

    @property
    def is_over_number(self):
        """
        Retorna True se a carta for over number (ex: 125/094)
        """
        return self.numero > self.total_set

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
##---------TCG_DEX----------##
##-----------##-------------##
