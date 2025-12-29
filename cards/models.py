from django.db import models
from decimal import Decimal


class Set(models.Model):
    nome = models.CharField(max_length=100)
    codigo_liga = models.CharField(max_length=10, unique=True)

    def __str__(self):
        return self.nome


class Card(models.Model):
    nome = models.CharField(max_length=200)

    numero = models.PositiveIntegerField()
    total_set = models.PositiveIntegerField()
    numero_completo = models.CharField(max_length=20)

    liga_num = models.CharField(max_length=20)

    raridade = models.CharField(max_length=50, blank=True, null=True)
    imagem = models.URLField(blank=True, null=True)

    # 👇 NOVO — URL da Liga Pokémon
    liga_url = models.URLField(blank=True, null=True)

    # 👇 Preços NORMAL
    preco_min = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    preco_med = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    preco_max = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )

    # 👇 Preços FOIL
    preco_min_foil = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    preco_med_foil = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    preco_max_foil = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )

    set = models.ForeignKey(Set, on_delete=models.CASCADE, related_name="cartas")

    @property
    def is_over_number(self):
        return self.numero > self.total_set
