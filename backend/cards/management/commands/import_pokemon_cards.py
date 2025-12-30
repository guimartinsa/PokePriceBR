import requests
from django.core.management.base import BaseCommand
from cards.models import Set, Card
from cards.services.liga_url import gerar_url_liga

API_URL = "https://api.pokemontcg.io/v2/cards"


class Command(BaseCommand):
    help = "Importa cartas Pokémon via Pokémon TCG API (até 2019) e prepara para a Liga Pokémon"

    def add_arguments(self, parser):
        parser.add_argument(
            "--set-code",
            type=str,
            required=True,
            help="Código do set na Pokémon TCG API (ex: xy5)"
        )

    def handle(self, *args, **options):
        set_code = options["set_code"]

        try:
            pokemon_set = Set.objects.get(codigo_api=set_code)
        except Set.DoesNotExist:
            self.stderr.write("Set não encontrado no banco.")
            return

        page = 1
        page_size = 250
        total = 0

        self.stdout.write(f"Importando cartas do set {pokemon_set.nome}")

        while True:
            params = {
                "q": f"set.id:{set_code}",
                "page": page,
                "pageSize": page_size
            }

            response = requests.get(API_URL, params=params, timeout=30)
            response.raise_for_status()

            data = response.json().get("data", [])
            if not data:
                break

            for c in data:
                number_raw = c.get("number", "").strip()

                # Ex: 125/094
                if "/" in number_raw:
                    numero, total_set = number_raw.split("/")
                else:
                    continue  # ignora cartas sem numeração válida

                try:
                    numero = int(numero)
                    total_set = int(total_set)
                except ValueError:
                    continue

                card, created = Card.objects.update_or_create(
                    numero=numero,
                    total_set=total_set,
                    set=pokemon_set,
                    defaults={
                        "nome": c.get("name"),
                        "numero_completo": f"{numero}/{total_set}",
                        "liga_num": str(numero),
                        "imagem": c.get("images", {}).get("large"),
                    }
                )

                # gera e salva URL da Liga
                card.liga_url = gerar_url_liga(card)
                card.save(update_fields=["liga_url"])

                total += 1

            page += 1

        self.stdout.write(self.style.SUCCESS(
            f"Importação concluída: {total} cartas"
        ))
