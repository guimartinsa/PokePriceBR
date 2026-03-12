from django.core.management.base import BaseCommand

from cards.scripts.generate_embeddings import run


class Command(BaseCommand):
    help = "Regenera embeddings das cartas com o mesmo pipeline do frontend."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear-first",
            action="store_true",
            help="Limpa todos os embeddings antes de gerar novamente.",
        )
        parser.add_argument(
            "--all",
            action="store_true",
            help="Força regeneração para todas as cartas (mesmo com embedding já preenchido).",
        )

    def handle(self, *args, **options):
        run(
            clear_existing=options["clear_first"],
            process_all=options["all"],
        )
