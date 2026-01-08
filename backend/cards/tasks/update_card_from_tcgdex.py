from celery import shared_task
import requests

from cards.models import Card

TCGDEX_CARD_API = "https://api.tcgdex.net/v2/en/cards"


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=10,
    retry_kwargs={"max_retries": 3},
)
def update_card_from_tcgdex_task(self, card_id: int):
    card = Card.objects.get(id=card_id)

    if not card.tcgdex_id:
        return {"error": "Carta sem tcgdex_id"}

    url = f"{TCGDEX_CARD_API}/{card.tcgdex_id}"
    response = requests.get(url, timeout=30)
    response.raise_for_status()

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

    if official_total:
        card.total_set = official_total
        card.numero_completo = f"{card.numero}/{official_total}"
        updated_fields.append("total_set")

    if updated_fields:
        card.detalhes_atualizados = True
        updated_fields.append("detalhes_atualizados")

        card.save(update_fields=updated_fields)


    return {
        "card": card.nome,
        "tcgdex_id": card.tcgdex_id,
        "updated_fields": updated_fields,
    }
