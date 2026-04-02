from celery import shared_task
import requests

from cards.models import Card

TCGDEX_CARD_API_PT = "https://api.tcgdex.net/v2/pt/cards"

VARIANT_LABELS = {
    "firstEdition": "Primeira Edição",
    "holo": "Holo",
    "normal": "Normal",
    "reverse": "Reverse",
    "wPromo": "Promo",
}


def _raridade_from_variants(variants: dict) -> str | None:
    if not isinstance(variants, dict):
        return None

    variantes_ativas = [
        VARIANT_LABELS[chave]
        for chave, ativo in variants.items()
        if ativo and chave in VARIANT_LABELS
    ]

    if not variantes_ativas:
        return None

    return " / ".join(variantes_ativas)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=10,
    retry_kwargs={"max_retries": 3},
)
def update_card_rarity_from_tcgdex_task(self, card_id: int):
    card = Card.objects.get(id=card_id)

    if not card.tcgdex_id:
        return {"error": "Carta sem tcgdex_id"}

    response = requests.get(f"{TCGDEX_CARD_API_PT}/{card.tcgdex_id}", timeout=30)
    response.raise_for_status()
    data = response.json()

    rarity = data.get("rarity")
    if isinstance(rarity, dict):
        rarity = rarity.get("name")

    if not rarity:
        rarity = _raridade_from_variants(data.get("variants"))

    if not rarity:
        return {
            "card": card.nome,
            "tcgdex_id": card.tcgdex_id,
            "updated": False,
            "message": "Raridade/variants não encontrados no payload da TCGdex",
        }

    if card.raridade == rarity:
        return {
            "card": card.nome,
            "tcgdex_id": card.tcgdex_id,
            "updated": False,
            "message": "Raridade já estava atualizada",
        }

    card.raridade = rarity
    card.save(update_fields=["raridade"])

    return {
        "card": card.nome,
        "tcgdex_id": card.tcgdex_id,
        "updated": True,
        "raridade": rarity,
    }
