from celery import shared_task
from cards.models import Card
from cards.services.liga_scraper import atualizar_preco_carta


@shared_task(bind=True, autoretry_for=(Exception,), retry_backoff=10, retry_kwargs={"max_retries": 3})
def atualizar_precos_set_task(self, set_id: int):
    """
    Atualiza os preços de todas as cartas ativas de um set.
    """
    cartas = Card.objects.filter(set_id=set_id, ativa=True)

    atualizadas = 0
    erros = []

    for card in cartas:
        try:
            if atualizar_preco_carta(card):
                atualizadas += 1
        except Exception as e:
            erros.append({
                "carta": card.nome,
                "erro": str(e),
            })

    return {
        "set_id": set_id,
        "total": cartas.count(),
        "atualizadas": atualizadas,
        "erros": erros,
    }
