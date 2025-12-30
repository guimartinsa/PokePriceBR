from celery import shared_task
from cards.models import Card
from cards.services.liga_scraper import atualizar_preco_carta


@shared_task(bind=True)
def atualizar_todas_cartas(self):
    cartas = Card.objects.exclude(liga_num__isnull=True)

    atualizadas = 0
    erros = []

    total = cartas.count()

    for carta in cartas:
        try:
            atualizar_preco_carta(carta)
            atualizadas += 1
        except Exception as e:
            erros.append({
                "carta": carta.nome,
                "erro": str(e),
            })

        # Atualiza progresso (opcional)
        self.update_state(
            state="PROGRESS",
            meta={
                "atualizadas": atualizadas,
                "total": total,
            },
        )

    return {
        "status": "finalizado",
        "atualizadas": atualizadas,
        "erros": erros,
    }
