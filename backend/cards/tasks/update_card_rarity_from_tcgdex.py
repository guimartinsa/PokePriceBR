from celery import shared_task
import requests
import logging

from cards.models import Card

TCGDEX_CARD_API_PT = "https://api.tcgdex.net/v2/pt/cards"
logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=10,
    retry_kwargs={"max_retries": 3},
)
def update_card_rarity_from_tcgdex_task(self, card_id: int):
    logger.info("update_card_rarity_from_tcgdex_task.start task_id=%s card_id=%s", self.request.id, card_id)
    card = Card.objects.get(id=card_id)

    if not card.tcgdex_id:
        return {"error": "Carta sem tcgdex_id"}

    url = f"{TCGDEX_CARD_API_PT}/{card.tcgdex_id}"
    logger.info("update_card_rarity_from_tcgdex_task.http_begin task_id=%s url=%s", self.request.id, url)
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    logger.info(
        "update_card_rarity_from_tcgdex_task.http_end task_id=%s status=%s",
        self.request.id,
        response.status_code,
    )
    data = response.json()

    rarity = data.get("rarity")
    if isinstance(rarity, dict):
        rarity = rarity.get("name")

    if not rarity:
        return {
            "card": card.nome,
            "tcgdex_id": card.tcgdex_id,
            "updated": False,
            "message": "Raridade não encontrada no payload da TCGdex",
        }

    if card.raridade == rarity:
        return {
            "card": card.nome,
            "tcgdex_id": card.tcgdex_id,
            "updated": False,
            "message": "Raridade já estava atualizada",
        }

    card.raridade = rarity
    logger.info("update_card_rarity_from_tcgdex_task.db_save task_id=%s card_id=%s", self.request.id, card_id)
    card.save(update_fields=["raridade"])
    logger.info("update_card_rarity_from_tcgdex_task.success task_id=%s card_id=%s", self.request.id, card_id)

    return {
        "card": card.nome,
        "tcgdex_id": card.tcgdex_id,
        "updated": True,
        "raridade": rarity,
    }
