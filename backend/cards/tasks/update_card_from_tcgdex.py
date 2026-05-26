from celery import shared_task
import requests
import logging

from cards.models import Card

TCGDEX_CARD_API = "https://api.tcgdex.net/v2/en/cards"
logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=10,
    retry_kwargs={"max_retries": 3},
)
def update_card_from_tcgdex_task(self, card_id: int):
    logger.info("update_card_from_tcgdex_task.start task_id=%s card_id=%s", self.request.id, card_id)
    card = Card.objects.get(id=card_id)

    if not card.tcgdex_id:
        return {"error": "Carta sem tcgdex_id"}

    url = f"{TCGDEX_CARD_API}/{card.tcgdex_id}"
    logger.info("update_card_from_tcgdex_task.http_begin task_id=%s url=%s", self.request.id, url)
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    logger.info("update_card_from_tcgdex_task.http_end task_id=%s status=%s", self.request.id, response.status_code)

    data = response.json()

    # -------- IMAGEM BASE --------
    imagem_base = data.get("image")

    # -------- ILUSTRADOR --------
    ilustrador = data.get("illustrator")

    # -------- TOTAL OFICIAL DO SET --------
    official_total = (
        data.get("set", {})
        .get("cardCount", {})
        .get("official")
    )

    variants = data.get("variants") or {}
    
    updated_fields = []

    if ilustrador:
        card.ilustrador = ilustrador
        updated_fields.append("ilustrador")

    # -------- IMAGENS (NORMALIZADAS) --------
    imagem_base = data.get("image")
    if imagem_base:
        imagem_low = f"{imagem_base}/low.webp"
        imagem_high = f"{imagem_base}/high.webp"

        card.imagem = imagem_low
        card.imagem_grande = imagem_high

        updated_fields.extend(["imagem", "imagem_grande"])


    # -------- VARIANTES --------
    possui_foil = bool(variants.get("holo"))
    possui_normal = bool(variants.get("normal"))
    possui_reverse_foil = bool(variants.get("reverse"))

    if card.possui_foil != possui_foil:
        card.possui_foil = possui_foil
        updated_fields.append("possui_foil")

    if card.possui_normal != possui_normal:
        card.possui_normal = possui_normal
        updated_fields.append("possui_normal")

    if card.possui_reverse_foil != possui_reverse_foil:
        card.possui_reverse_foil = possui_reverse_foil
        updated_fields.append("possui_reverse_foil")

    if official_total:
        card.total_set = official_total
        card.numero_completo = f"{card.numero}/{official_total}"
        updated_fields.append("total_set")

    if updated_fields:
        card.detalhes_atualizados = True
        updated_fields.append("detalhes_atualizados")

        logger.info("update_card_from_tcgdex_task.db_save task_id=%s card_id=%s fields=%s", self.request.id, card_id, updated_fields)
        card.save(update_fields=updated_fields)

    logger.info("update_card_from_tcgdex_task.success task_id=%s card_id=%s", self.request.id, card_id)

    return {
        "card": card.nome,
        "tcgdex_id": card.tcgdex_id,
        "updated_fields": updated_fields,
    }
