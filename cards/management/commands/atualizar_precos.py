from django.core.management.base import BaseCommand
from cards.models import Card
from cards.services.liga_scraper import atualizar_preco_carta


class Command(BaseCommand):
    help = "Atualiza preços das cartas via Liga Pokémon"

    def handle(self, *args, **options):
        cartas = Card.objects.exclude(liga_url__isnull=True).exclude(liga_url="")

        for carta in cartas:
            try:
                atualizar_preco_carta(carta)
                self.stdout.write(
                    self.style.SUCCESS(f"✔ {carta.nome} atualizado")
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"✖ Erro em {carta.nome}: {e}")
                )
