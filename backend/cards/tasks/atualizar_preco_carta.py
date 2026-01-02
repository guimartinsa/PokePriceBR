from celery import shared_task
from cards.models import Card
from cards.services.liga_scraper import atualizar_preco_carta


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 30},
    retry_backoff=True,
)
def atualizar_preco_carta_task(self, card_id: int):
    """
    Atualiza o preço de UMA carta específica via Liga Pokémon
    """

    try:
        carta = Card.objects.get(id=card_id)
    except Card.DoesNotExist:
        return {
            "status": "erro",
            "mensagem": "Carta não encontrada",
            "card_id": card_id,
        }

    try:
        atualizar_preco_carta(carta)

        return {
            "status": "finalizado",
            "card_id": carta.id,
            "nome": carta.nome,
        }

    except Exception as e:
        # Celery vai lidar com retry automático
        raise e
