from django.db import models
from cards.services.liga_url import gerar_liga_url


class Set(models.Model):
    nome = models.CharField(max_length=100)
    codigo_liga = models.CharField(max_length=10, unique=True)

    def __str__(self):
        return self.nome


class Card(models.Model):
    # Identificação
    nome = models.CharField(max_length=200)

    numero = models.PositiveIntegerField()
    total_set = models.PositiveIntegerField()
    numero_completo = models.CharField(max_length=20)

    liga_num = models.CharField(max_length=20)

    # Metadados
    raridade = models.CharField(max_length=50, blank=True, null=True)
    imagem = models.URLField(blank=True, null=True)

    # URL oficial da Liga Pokémon (gerada automaticamente)
    liga_url = models.URLField(blank=True, null=True)

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

    # Relacionamento
    set = models.ForeignKey(Set, on_delete=models.CASCADE, related_name="cartas")

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
