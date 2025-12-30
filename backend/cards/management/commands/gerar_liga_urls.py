from django.core.management.base import BaseCommand
from cards.models import Card
from cards.services.liga_url import gerar_liga_url


class Command(BaseCommand):
    help = "Gera liga_url para cartas antigas que ainda não possuem"

    def handle(self, *args, **options):
        cartas = Card.objects.filter(liga_url__isnull=True)

        total = cartas.count()
        atualizadas = 0

        for carta in cartas:
            try:
                carta.liga_url = gerar_liga_url(carta)
                carta.save()
                atualizadas += 1
                self.stdout.write(
                    self.style.SUCCESS(f"✔ {carta.nome} atualizado")
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"✖ Erro em {carta.nome}: {e}")
                )

        self.stdout.write(
            self.style.WARNING(
                f"Finalizado: {atualizadas}/{total} cartas atualizadas"
            )
        )
