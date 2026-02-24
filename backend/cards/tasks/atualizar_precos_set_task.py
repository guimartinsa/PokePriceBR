from celery import shared_task
from celery.utils.log import get_task_logger

from cards.models import Card
from cards.services.liga_scraper import atualizar_preco_carta


logger = get_task_logger(__name__)


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=10, retry_kwargs={"max_retries": 3})
def atualizar_precos_set_task(self, set_id: int):
    """
    Atualiza os preços de todas as cartas ativas de um set.
    """
    cartas = Card.objects.filter(set_id=set_id, ativa=True)
    total = cartas.count()

    atualizadas = 0
    erros = []

    logger.info("Iniciando atualização de preços do set %s (%s cartas)", set_id, total)
    self.update_state(
        state="STARTED",
        meta={
            "set_id": set_id,
            "total": total,
            "atualizadas": atualizadas,
            "erros": erros,
        },
    )

    for card in cartas:
        try:
            if atualizar_preco_carta(card):
                atualizadas += 1
        except Exception as e:
            erros.append({
                "carta": card.nome,
                "erro": str(e),
            })

        self.update_state(
            state="STARTED",
            meta={
                "set_id": set_id,
                "total": total,
                "atualizadas": atualizadas,
                "erros": erros,
            },
        )

    logger.info(
        "Finalizada atualização de preços do set %s: %s/%s cartas atualizadas (%s erros)",
        set_id,
        atualizadas,
        total,
        len(erros),
    )

    return {
        "set_id": set_id,
        "total": total,
        "atualizadas": atualizadas,
        "erros": erros,
    }
